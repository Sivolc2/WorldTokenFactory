import json
import re
from typing import AsyncGenerator
from repo_src.backend.models.risk import AnalysisResult, Artifact, RiskMetrics
from repo_src.backend.services.data_source import list_files, read_file
from repo_src.backend.agents.depth1 import analyse_depth1
from repo_src.backend.llm_chat.llm_interface import ask_llm

THREAD_DECOMPOSE_SYSTEM = """You are a risk analyst. Given a risk factor, identify 3-5 sub-threads of analysis.
Return ONLY a JSON array of strings, e.g.:
["Historical incident record", "Regulatory compliance status", "Geospatial exposure", "Financial loss modelling"]
No markdown, no explanation."""

THREAD_ANALYSE_SYSTEM = """You are a specialist risk researcher. Analyse a specific sub-thread of a risk factor using the provided documents.
Return ONLY valid JSON (no markdown):
{
  "thread_name": "...",
  "findings": "2-4 sentences of specific findings from the documents",
  "gaps": ["gap 1", "gap 2"],
  "confidence": 0.0
}
confidence: 0.0-1.0 (how much evidence supports findings)"""

SYNTHESIS_SYSTEM = """You are a senior risk analyst. Synthesize thread-level findings into a final risk assessment.
Return ONLY valid JSON (no markdown):
{
  "summary": "comprehensive 4-6 sentence summary drawing on all threads",
  "gaps": ["gap 1", "gap 2", "gap 3", "gap 4"],
  "metrics": {
    "failure_rate": 0.0,
    "uncertainty": 0.0,
    "loss_range_low": 0,
    "loss_range_high": 0,
    "loss_range_note": "explanation"
  }
}"""


def _parse_json(text: str) -> any:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-z]*\n?", "", text)
        text = re.sub(r"\n?```$", "", text.strip())
    return json.loads(text)


async def analyse_depth3(
    risk_factor_id: str,
    risk_factor_name: str,
    business_context: str,
    step_context: str,
    data_domains: list[str],
    feedback: str | None = None,
) -> AsyncGenerator[dict, None]:
    # Step 1: get candidate files via depth-1
    artifacts_from_d1 = []
    async for event in analyse_depth1(
        risk_factor_id, risk_factor_name, business_context, step_context, data_domains
    ):
        if event["event"] == "complete":
            artifacts_from_d1 = event["result"]["artifacts"]
        else:
            yield event

    total_tokens = 0

    # Step 2: decompose into sub-threads
    yield {"event": "step", "text": "Decomposing risk factor into analysis sub-threads"}
    feedback_note = f"\nUser feedback to address: {feedback}" if feedback else ""
    decompose_prompt = f"Risk factor: {risk_factor_name}\nBusiness context: {business_context}{feedback_note}"
    threads_response = await ask_llm(
        prompt_text=decompose_prompt,
        system_message=THREAD_DECOMPOSE_SYSTEM,
        max_tokens=300,
        temperature=0.3,
    )
    total_tokens += (len(decompose_prompt) + len(THREAD_DECOMPOSE_SYSTEM) + len(threads_response)) // 4
    yield {"event": "token_update", "tokens": total_tokens}
    try:
        threads = _parse_json(threads_response)
        if not isinstance(threads, list):
            threads = [str(threads)]
    except Exception:
        threads = ["Historical data", "Regulatory compliance", "Financial exposure", "Geospatial analysis"]
    threads = threads[:5]

    # Read documents once
    doc_chunks: list[tuple[str, str, str]] = []
    for art in artifacts_from_d1:
        if art["type"] in ("document", "data"):
            try:
                content = read_file(art["domain"], art["filename"])
                if isinstance(content, bytes):
                    content = content.decode("utf-8", errors="replace")
                if len(content) > 3000:
                    content = content[:3000] + "\n... [truncated]"
                doc_chunks.append((art["domain"], art["filename"], content))
            except Exception:
                pass
    docs_text = "\n\n".join(
        f"=== {d}/{f} ===\n{c}" for d, f, c in doc_chunks
    ) or "(No documents available)"

    # Step 3: run each thread
    thread_results = []
    for i, thread_name in enumerate(threads):
        yield {"event": "step", "text": f"[Thread {i+1}/{len(threads)}] Analysing: {thread_name}"}
        thread_prompt = (
            f"Risk Factor: {risk_factor_name}\n"
            f"Business Context: {business_context}\n"
            f"Analysis Thread: {thread_name}\n\n"
            f"Documents:\n{docs_text}"
        )
        resp = await ask_llm(
            prompt_text=thread_prompt,
            system_message=THREAD_ANALYSE_SYSTEM,
            max_tokens=600,
            temperature=0.2,
        )
        try:
            parsed = _parse_json(resp)
        except Exception:
            parsed = {"thread_name": thread_name, "findings": resp[:300], "gaps": [], "confidence": 0.5}
        thread_results.append(parsed)
        total_tokens += (len(THREAD_ANALYSE_SYSTEM) + len(thread_prompt) + len(resp)) // 4
        yield {"event": "token_update", "tokens": total_tokens}
        for gap in parsed.get("gaps", []):
            yield {"event": "signal", "text": f"[{thread_name}] {gap}"}

    # Step 4: synthesise
    yield {"event": "step", "text": "Synthesising thread results into final assessment"}
    synthesis_input = json.dumps({
        "risk_factor": risk_factor_name,
        "business_context": business_context,
        "thread_findings": thread_results,
    })
    synth_resp = await ask_llm(
        prompt_text=synthesis_input,
        system_message=SYNTHESIS_SYSTEM,
        max_tokens=1000,
        temperature=0.2,
    )
    total_tokens += (len(SYNTHESIS_SYSTEM) + len(synthesis_input) + len(synth_resp)) // 4
    yield {"event": "token_update", "tokens": total_tokens}

    try:
        synth = _parse_json(synth_resp)
    except Exception:
        synth = {
            "summary": synth_resp[:400],
            "gaps": [t.get("gaps", [""])[0] for t in thread_results if t.get("gaps")],
            "metrics": {"failure_rate": 0.2, "uncertainty": 0.5, "loss_range_low": 2_000_000,
                        "loss_range_high": 40_000_000, "loss_range_note": "Synthesis parse error — estimate rough"},
        }

    raw_metrics = synth.get("metrics", {})
    metrics = RiskMetrics(
        failure_rate=float(raw_metrics.get("failure_rate", 0.2)),
        uncertainty=float(raw_metrics.get("uncertainty", 0.5)),
        loss_range_low=int(raw_metrics.get("loss_range_low", 2_000_000)),
        loss_range_high=int(raw_metrics.get("loss_range_high", 40_000_000)),
        loss_range_note=raw_metrics.get("loss_range_note", ""),
    )

    all_gaps = synth.get("gaps", [])
    if not all_gaps:
        for t in thread_results:
            all_gaps.extend(t.get("gaps", []))
        all_gaps = all_gaps[:6]

    final_artifacts = [Artifact(**{k: v for k, v in art.items()}) for art in artifacts_from_d1]

    result = AnalysisResult(
        risk_factor_id=risk_factor_id,
        summary=synth.get("summary", ""),
        gaps=all_gaps,
        metrics=metrics,
        artifacts=final_artifacts,
        tokens_used=total_tokens,
        depth=3,
    )
    yield {"event": "complete", "result": result.model_dump()}
