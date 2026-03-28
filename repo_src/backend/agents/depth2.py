import json
import re
from typing import AsyncGenerator
from repo_src.backend.models.risk import AnalysisResult, Artifact, RiskMetrics
from repo_src.backend.services.data_source import list_files, read_file
from repo_src.backend.agents.depth1 import analyse_depth1
from repo_src.backend.llm_chat.llm_interface import ask_llm

ANALYSE_SYSTEM = """You are a senior risk analyst. Given a risk factor and supporting documents, produce a structured risk assessment.

Return ONLY valid JSON with no markdown code blocks. Use this structure:
{
  "summary": "3-5 sentence summary of the risk, what evidence exists, and what is uncertain",
  "gaps": ["gap 1", "gap 2", "gap 3"],
  "metrics": {
    "failure_rate": 0.0,
    "uncertainty": 0.0,
    "loss_range_low": 0,
    "loss_range_high": 0,
    "loss_range_note": "explanation of range width"
  },
  "artifact_relevances": {
    "filename.ext": "one sentence explaining why this file was relevant"
  }
}

Rules:
- failure_rate: probability 0.0-1.0 based on evidence
- uncertainty: how uncertain is this estimate 0.0-1.0 (high = wide range, low = well-characterised)
- loss_range in USD integers
- gaps: 3-5 specific knowledge gaps that would reduce uncertainty
- Be specific to the business context provided"""


async def analyse_depth2(
    risk_factor_id: str,
    risk_factor_name: str,
    business_context: str,
    step_context: str,
    data_domains: list[str],
) -> AsyncGenerator[dict, None]:
    # Step 1: run depth-1 to get candidate files
    artifacts_from_d1 = []
    async for event in analyse_depth1(
        risk_factor_id, risk_factor_name, business_context, step_context, data_domains
    ):
        if event["event"] == "complete":
            artifacts_from_d1 = event["result"]["artifacts"]
        elif event["event"] != "complete":
            yield event  # forward step / file_found events

    yield {"event": "step", "text": "Reading file contents for matched artifacts"}

    doc_chunks: list[tuple[str, str, str]] = []  # (domain, filename, content)
    for art in artifacts_from_d1:
        if art["type"] in ("document", "data"):
            try:
                content = read_file(art["domain"], art["filename"])
                if isinstance(content, bytes):
                    content = content.decode("utf-8", errors="replace")
                # Truncate large files
                if len(content) > 4000:
                    content = content[:4000] + "\n... [truncated]"
                doc_chunks.append((art["domain"], art["filename"], content))
            except Exception as e:
                yield {"event": "signal", "text": f"Could not read {art['filename']}: {e}"}

    yield {"event": "step", "text": f"Analysing {len(doc_chunks)} document(s) with LLM"}

    if not doc_chunks:
        docs_text = "(No readable documents found for this risk factor — using context only)"
    else:
        docs_text = "\n\n".join(
            f"=== {domain}/{fname} ===\n{content}"
            for domain, fname, content in doc_chunks
        )

    prompt = (
        f"Risk Factor: {risk_factor_name}\n"
        f"Business Context: {business_context}\n"
        f"Step Context: {step_context}\n\n"
        f"Source Documents:\n{docs_text}"
    )

    yield {"event": "step", "text": "Generating risk assessment brief"}

    response_text = await ask_llm(
        prompt_text=prompt,
        system_message=ANALYSE_SYSTEM,
        max_tokens=1500,
        temperature=0.2,
    )

    # Parse LLM response
    try:
        text = response_text.strip()
        if text.startswith("```"):
            text = re.sub(r"^```[a-z]*\n?", "", text)
            text = re.sub(r"\n?```$", "", text.strip())
        parsed = json.loads(text)
    except Exception:
        parsed = {
            "summary": response_text[:500],
            "gaps": ["LLM response could not be parsed as JSON"],
            "metrics": {
                "failure_rate": 0.15,
                "uncertainty": 0.75,
                "loss_range_low": 1_000_000,
                "loss_range_high": 20_000_000,
                "loss_range_note": "Estimate unreliable — response parse error",
            },
            "artifact_relevances": {},
        }

    # Emit signals from gaps
    for gap in parsed.get("gaps", []):
        yield {"event": "signal", "text": gap}

    yield {"event": "step", "text": "Finalising result"}

    artifact_relevances = parsed.get("artifact_relevances", {})
    final_artifacts = []
    for art in artifacts_from_d1:
        relevance = artifact_relevances.get(art["filename"], art["relevance"])
        final_artifacts.append(Artifact(
            filename=art["filename"],
            domain=art["domain"],
            type=art["type"],
            relevance=relevance,
            url=art.get("url"),
        ))

    raw_metrics = parsed.get("metrics", {})
    metrics = RiskMetrics(
        failure_rate=float(raw_metrics.get("failure_rate", 0.15)),
        uncertainty=float(raw_metrics.get("uncertainty", 0.6)),
        loss_range_low=int(raw_metrics.get("loss_range_low", 1_000_000)),
        loss_range_high=int(raw_metrics.get("loss_range_high", 10_000_000)),
        loss_range_note=raw_metrics.get("loss_range_note", ""),
    )

    # Rough token estimate: prompt + response
    tokens_used = (len(prompt) + len(response_text)) // 4

    result = AnalysisResult(
        risk_factor_id=risk_factor_id,
        summary=parsed.get("summary", ""),
        gaps=parsed.get("gaps", []),
        metrics=metrics,
        artifacts=final_artifacts,
        tokens_used=tokens_used,
        depth=2,
    )
    yield {"event": "complete", "result": result.model_dump()}
