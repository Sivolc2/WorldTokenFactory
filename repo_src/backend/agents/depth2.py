import json
import re
from typing import AsyncGenerator
from repo_src.backend.models.risk import AnalysisResult, Artifact, RiskMetrics
from repo_src.backend.services.data_source import list_files, read_file
from repo_src.backend.agents.depth1 import analyse_depth1
from repo_src.backend.llm_chat.llm_interface import ask_llm, gemini_client
from repo_src.backend.services.gemini_multimodal import multimodal_scan, select_multimodal_files
from repo_src.backend.services.senso_service import senso_search

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
    feedback: str | None = None,
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

    # ── Multimodal scan (Gemini-native: video, GeoTIFF, images, PDFs) ─────────
    multimodal_findings = ""
    if gemini_client is not None:
        yield {"event": "step", "text": "Running Gemini multimodal scan (video, imagery, geospatial)"}

        # Collect all visual/geo files from each domain
        all_domain_files = []
        available_domains = set()
        for art in artifacts_from_d1:
            available_domains.add(art["domain"])
        for domain in available_domains:
            all_domain_files.extend(list_files(domain))

        # Files from depth-1 as FileMetadata objects (reconstruct from artifact dicts)
        from repo_src.backend.services.data_source import FileMetadata, DATA_PATH
        import os
        matched_file_meta = [
            FileMetadata(
                filename=art["filename"],
                domain=art["domain"],
                type=art["type"],
                path=os.path.join(DATA_PATH, art["domain"], art["filename"]),
            )
            for art in artifacts_from_d1
        ]

        visual_files = select_multimodal_files(
            all_domain_files=all_domain_files,
            keyword_matched=matched_file_meta,
            max_files=6,
        )

        if visual_files:
            yield {"event": "signal", "text": f"Multimodal scan: {len(visual_files)} file(s) — {', '.join(f.filename for f in visual_files)}"}
            try:
                multimodal_findings = await multimodal_scan(
                    gemini_client=gemini_client,
                    files=visual_files,
                    risk_factor_name=risk_factor_name,
                    business_context=business_context,
                )
                yield {"event": "signal", "text": "Multimodal scan complete — integrating visual/spatial findings"}
            except Exception as exc:
                yield {"event": "signal", "text": f"Multimodal scan error (continuing): {exc}"}
        else:
            yield {"event": "signal", "text": "No visual/geospatial files found for multimodal scan"}

    yield {"event": "step", "text": f"Analysing {len(doc_chunks)} document(s) with LLM"}

    # Enrich with Senso RAG context
    senso_context = ""
    try:
        yield {"event": "step", "text": "Fetching regulatory context from Senso"}
        senso_query = f"{risk_factor_name}: {step_context}"
        senso_result = await senso_search(senso_query, top_k=5)
        results = senso_result.get("results", [])
        if results:
            senso_snippets = "\n".join(
                f"- {r.get('title', 'Untitled')}: {r.get('content', r.get('text', ''))[:300]}"
                for r in results
            )
            senso_context = f"\nSenso Regulatory/Risk Context:\n{senso_snippets}\n"
            yield {"event": "signal", "text": f"Senso returned {len(results)} context snippet(s)"}
        elif senso_result.get("error"):
            yield {"event": "signal", "text": f"Senso unavailable: {senso_result['error']}"}
    except Exception as e:
        yield {"event": "signal", "text": f"Senso search skipped: {e}"}

    if not doc_chunks:
        docs_text = "(No readable documents found for this risk factor — using context only)"
    else:
        docs_text = "\n\n".join(
            f"=== {domain}/{fname} ===\n{content}"
            for domain, fname, content in doc_chunks
        )

    multimodal_section = (
        f"\nMultimodal Analysis (video, imagery, geospatial rasters):\n{multimodal_findings}\n"
        if multimodal_findings else ""
    )
    feedback_section = (
        f"\nUser feedback on the previous analysis (address these concerns):\n{feedback}\n"
        if feedback else ""
    )
    prompt = (
        f"Risk Factor: {risk_factor_name}\n"
        f"Business Context: {business_context}\n"
        f"Step Context: {step_context}\n"
        f"{feedback_section}"
        f"{multimodal_section}"
        f"{senso_context}\n"
        f"Source Documents:\n{docs_text}"
    )

    # Emit token estimate before LLM call (prompt tokens ~ chars/4)
    prompt_token_estimate = (len(prompt) + len(ANALYSE_SYSTEM)) // 4
    yield {"event": "token_update", "tokens": prompt_token_estimate}

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

    # Emit updated token count after LLM response received
    total_token_estimate = (len(prompt) + len(ANALYSE_SYSTEM) + len(response_text)) // 4
    yield {"event": "token_update", "tokens": total_token_estimate}

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
