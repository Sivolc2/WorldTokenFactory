import copy
import csv
import json
import os
import re
from typing import AsyncGenerator
from repo_src.backend.models.risk import AnalysisResult, Artifact, RiskMetrics
from repo_src.backend.services.data_source import list_files, read_file, FileMetadata, DATA_PATH
from repo_src.backend.agents.depth1 import analyse_depth1
from repo_src.backend.agents.risk_evaluate import uncertainty_score, uncertainty_usd, format_score
from repo_src.backend.agents.risk_research_template import STRATEGY as _DEFAULT_STRATEGY
from repo_src.backend.llm_chat.llm_interface import ask_llm, gemini_client
from repo_src.backend.services.gemini_multimodal import multimodal_scan, select_multimodal_files

_PROGRAM_MD_PATH = os.path.join(os.path.dirname(__file__), "risk_program.md")
_ITERATIONS_TSV = os.path.join(DATA_PATH, "..", "risk_iterations.tsv")

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

LOOP_REFINE_SYSTEM = """You are an autonomous risk research loop agent.
Given the current research strategy and results, update the strategy to reduce uncertainty.
Return ONLY valid JSON (no markdown):
{
  "updated_strategy": {
    "threads": ["..."],
    "doc_focus_keywords": ["..."],
    "synthesis_emphasis": "...",
    "max_docs_per_thread": 3,
    "agent_reasoning": "..."
  },
  "iteration_rationale": "Why these changes should improve the score"
}"""


def _parse_json(text: str) -> any:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-z]*\n?", "", text)
        text = re.sub(r"\n?```$", "", text.strip())
    return json.loads(text)


def _load_program_md() -> str:
    try:
        with open(_PROGRAM_MD_PATH, "r") as f:
            return f.read()
    except Exception:
        return "Minimize uncertainty_score by refining the research strategy each iteration."


def _log_iteration(risk_factor_id: str, iteration: int, score: float, width_usd: int, reasoning: str) -> None:
    try:
        tsv_path = os.path.normpath(_ITERATIONS_TSV)
        write_header = not os.path.exists(tsv_path)
        with open(tsv_path, "a", newline="") as f:
            writer = csv.writer(f, delimiter="\t")
            if write_header:
                writer.writerow(["risk_factor_id", "iteration", "uncertainty_score", "width_usd", "reasoning"])
            writer.writerow([risk_factor_id, iteration, format_score(score), width_usd, reasoning[:200]])
    except Exception:
        pass


async def _run_single_pass(
    risk_factor_name: str,
    business_context: str,
    strategy: dict,
    docs_text: str,
) -> tuple[list[dict], dict]:
    """Run one full pass of thread analysis + synthesis. Returns (thread_results, synth_dict)."""
    threads = strategy.get("threads", ["Historical data", "Regulatory compliance", "Financial exposure"])[:5]
    thread_results = []
    for thread_name in threads:
        thread_prompt = (
            f"Risk Factor: {risk_factor_name}\n"
            f"Business Context: {business_context}\n"
            f"Analysis Thread: {thread_name}\n"
            f"Focus keywords: {', '.join(strategy.get('doc_focus_keywords', []))}\n\n"
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

    synthesis_payload = {
        "risk_factor": risk_factor_name,
        "business_context": business_context,
        "thread_findings": thread_results,
        "synthesis_emphasis": strategy.get("synthesis_emphasis", ""),
    }
    synth_input = json.dumps(synthesis_payload)
    synth_resp = await ask_llm(
        prompt_text=synth_input,
        system_message=SYNTHESIS_SYSTEM,
        max_tokens=1000,
        temperature=0.2,
    )
    try:
        synth = _parse_json(synth_resp)
    except Exception:
        synth = {
            "summary": synth_resp[:400],
            "gaps": [],
            "metrics": {
                "failure_rate": 0.2, "uncertainty": 0.5,
                "loss_range_low": 2_000_000, "loss_range_high": 40_000_000,
                "loss_range_note": "Synthesis parse error — estimate rough",
            },
        }
    return thread_results, synth


async def analyse_depth3(
    risk_factor_id: str,
    risk_factor_name: str,
    business_context: str,
    step_context: str,
    data_domains: list[str],
    feedback: str | None = None,
    max_iterations: int = 3,
) -> AsyncGenerator[dict, None]:
    # ── Step 1: get candidate files via depth-1 ──────────────────────────────
    artifacts_from_d1 = []
    async for event in analyse_depth1(
        risk_factor_id, risk_factor_name, business_context, step_context, data_domains
    ):
        if event["event"] == "complete":
            artifacts_from_d1 = event["result"]["artifacts"]
        else:
            yield event

    total_tokens = 0

    # ── Step 2: read documents once ──────────────────────────────────────────
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

    # ── Step 3: Gemini multimodal scan ───────────────────────────────────────
    multimodal_findings = ""
    if gemini_client is not None:
        yield {"event": "step", "text": "Gemini multimodal scan (video, GeoTIFF, imagery)"}
        available_domains = {art["domain"] for art in artifacts_from_d1}
        all_domain_files = []
        for domain in available_domains:
            all_domain_files.extend(list_files(domain))
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
            yield {"event": "signal", "text": f"Multimodal: {len(visual_files)} visual/geo file(s) — {', '.join(f.filename for f in visual_files)}"}
            try:
                multimodal_findings = await multimodal_scan(
                    gemini_client=gemini_client,
                    files=visual_files,
                    risk_factor_name=risk_factor_name,
                    business_context=business_context,
                )
            except Exception as exc:
                yield {"event": "signal", "text": f"Multimodal scan error (continuing): {exc}"}

    # ── Step 4: autoresearch-style iterative loop ─────────────────────────────
    program_instructions = _load_program_md()
    strategy = copy.deepcopy(_DEFAULT_STRATEGY)
    if feedback:
        strategy["agent_reasoning"] = f"User feedback to address: {feedback}"

    best_score: float = 1.0
    best_synth: dict = {}
    best_thread_results: list[dict] = []
    prev_scores: list[float] = []

    for iteration in range(1, max_iterations + 1):
        yield {"event": "step", "text": f"[Iteration {iteration}/{max_iterations}] Running research pass — strategy: {', '.join(strategy['threads'][:3])}…"}

        thread_results, synth = await _run_single_pass(
            risk_factor_name, business_context, strategy, docs_text
        )

        # Estimate token cost for this pass
        pass_tokens = sum(
            (len(THREAD_ANALYSE_SYSTEM) + len(docs_text) + 600) // 4
            for _ in strategy["threads"]
        ) + (len(SYNTHESIS_SYSTEM) + 1000) // 4
        total_tokens += pass_tokens
        yield {"event": "token_update", "tokens": total_tokens}

        # Score this iteration
        raw_metrics = synth.get("metrics", {})
        iter_metrics = RiskMetrics(
            failure_rate=float(raw_metrics.get("failure_rate", 0.2)),
            uncertainty=float(raw_metrics.get("uncertainty", 0.5)),
            loss_range_low=int(raw_metrics.get("loss_range_low", 2_000_000)),
            loss_range_high=int(raw_metrics.get("loss_range_high", 40_000_000)),
            loss_range_note=raw_metrics.get("loss_range_note", ""),
        )
        score = uncertainty_score(iter_metrics)
        width = uncertainty_usd(iter_metrics)

        _log_iteration(risk_factor_id, iteration, score, width, strategy.get("agent_reasoning", ""))

        # Emit iteration_update so the frontend TokenEfficiencyChart can plot real data
        yield {
            "event": "iteration_update",
            "iteration": iteration,
            "uncertainty_score": score,
            "uncertainty_usd": width,
            "loss_range_low": iter_metrics.loss_range_low,
            "loss_range_high": iter_metrics.loss_range_high,
            "tokens_so_far": total_tokens,
            "strategy_threads": strategy["threads"],
        }

        for gap in synth.get("gaps", []):
            yield {"event": "signal", "text": f"[iter {iteration}] {gap}"}

        if score < best_score:
            best_score = score
            best_synth = synth
            best_thread_results = thread_results

        prev_scores.append(score)

        # Stopping criteria
        if score < 0.05:
            yield {"event": "signal", "text": f"Converged: uncertainty_score={score:.4f} — stopping early"}
            break
        if len(prev_scores) >= 2 and (prev_scores[-2] - prev_scores[-1]) < 0.01:
            yield {"event": "signal", "text": f"Score plateau (Δ<0.01) — stopping at iteration {iteration}"}
            break
        if iteration == max_iterations:
            break

        # Refine strategy for next iteration
        yield {"event": "step", "text": f"[Iteration {iteration}] Refining research strategy"}
        refine_prompt = json.dumps({
            "program_instructions": program_instructions,
            "current_strategy": strategy,
            "iteration_results": {
                "thread_findings": thread_results,
                "uncertainty_score": score,
                "uncertainty_usd": width,
                "previous_scores": prev_scores,
            },
        })
        refine_resp = await ask_llm(
            prompt_text=refine_prompt,
            system_message=LOOP_REFINE_SYSTEM,
            max_tokens=600,
            temperature=0.4,
        )
        total_tokens += (len(LOOP_REFINE_SYSTEM) + len(refine_prompt) + len(refine_resp)) // 4
        yield {"event": "token_update", "tokens": total_tokens}

        try:
            refined = _parse_json(refine_resp)
            new_strategy = refined.get("updated_strategy", strategy)
            # Validate minimally before accepting
            if isinstance(new_strategy.get("threads"), list) and new_strategy["threads"]:
                strategy = new_strategy
                yield {"event": "signal", "text": f"Strategy updated: {refined.get('iteration_rationale', '')[:120]}"}
        except Exception:
            pass  # Keep previous strategy

    # ── Step 5: final synthesis incorporating multimodal findings ─────────────
    synth = best_synth
    thread_results = best_thread_results

    if multimodal_findings:
        yield {"event": "step", "text": "Incorporating multimodal findings into final synthesis"}
        final_payload = json.dumps({
            "risk_factor": risk_factor_name,
            "business_context": business_context,
            "thread_findings": thread_results,
            "multimodal_findings": multimodal_findings,
            "best_uncertainty_score": best_score,
        })
        final_resp = await ask_llm(
            prompt_text=final_payload,
            system_message=SYNTHESIS_SYSTEM,
            max_tokens=1000,
            temperature=0.2,
        )
        total_tokens += (len(SYNTHESIS_SYSTEM) + len(final_payload) + len(final_resp)) // 4
        yield {"event": "token_update", "tokens": total_tokens}
        try:
            synth = _parse_json(final_resp)
        except Exception:
            pass  # Keep best synth from loop

    # ── Build result ──────────────────────────────────────────────────────────
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
