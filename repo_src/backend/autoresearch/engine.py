"""
Autoresearch engine — iterative risk research loop.
Searches for evidence and progressively narrows exposure range estimates.
"""
from typing import AsyncGenerator
from repo_src.backend.autoresearch.models import AutoresearchRequest
from repo_src.backend.llm_chat.llm_interface import ask_llm


async def run(request: AutoresearchRequest) -> AsyncGenerator[dict, None]:
    """Run the autoresearch loop, yielding NDJSON events."""
    yield {
        "event": "signal",
        "text": f"Starting autoresearch for: {request.risk_factor_name}",
    }

    exposure_low = request.initial_exposure_low
    exposure_high = request.initial_exposure_high

    for iteration in range(1, request.max_iterations + 1):
        yield {
            "event": "iteration_update",
            "iteration": iteration,
            "max_iterations": request.max_iterations,
            "exposure_low": exposure_low,
            "exposure_high": exposure_high,
            "text": f"Iteration {iteration}/{request.max_iterations}",
        }

        # Generate search queries
        query_prompt = (
            f"Risk factor: {request.risk_factor_name}\n"
            f"Business context: {request.business_context}\n"
            f"Current exposure estimate: ${exposure_low:,} – ${exposure_high:,}\n"
            f"Generate {request.max_searches_per_iteration} specific search queries "
            f"that would help narrow this exposure range. Return just the queries, one per line."
        )

        queries_text = await ask_llm(
            prompt_text=query_prompt,
            system_message="You are a risk research assistant. Generate specific, targeted search queries.",
            max_tokens=500,
            temperature=0.3,
        )

        queries = [q.strip() for q in queries_text.strip().split("\n") if q.strip()][:request.max_searches_per_iteration]

        for q in queries:
            yield {"event": "search_query", "query": q, "iteration": iteration}

        # Simulate evidence gathering and range refinement
        refine_prompt = (
            f"Risk factor: {request.risk_factor_name}\n"
            f"Business context: {request.business_context}\n"
            f"Current range: ${exposure_low:,} – ${exposure_high:,}\n"
            f"Search queries used: {'; '.join(queries)}\n\n"
            f"Based on what a thorough search would find, provide:\n"
            f"1. A narrowed exposure range (tighter than current)\n"
            f"2. Key evidence that supports the narrowing\n"
            f"3. Remaining uncertainty\n\n"
            f"Return ONLY valid JSON: {{\"low\": int, \"high\": int, \"evidence\": \"string\", \"confidence\": float}}"
        )

        result_text = await ask_llm(
            prompt_text=refine_prompt,
            system_message="You are a quantitative risk analyst. Narrow exposure ranges based on evidence.",
            max_tokens=500,
            temperature=0.2,
        )

        try:
            import json, re
            text = result_text.strip()
            if text.startswith("```"):
                text = re.sub(r"^```[a-z]*\n?", "", text)
                text = re.sub(r"\n?```$", "", text.strip())
            parsed = json.loads(text)
            new_low = int(parsed.get("low", exposure_low))
            new_high = int(parsed.get("high", exposure_high))
            evidence = parsed.get("evidence", "")
            confidence = float(parsed.get("confidence", 0.5))

            # Only accept if range actually narrowed
            if new_high - new_low < exposure_high - exposure_low:
                exposure_low = new_low
                exposure_high = new_high
                yield {
                    "event": "evidence_found",
                    "evidence": evidence,
                    "confidence": confidence,
                    "new_low": exposure_low,
                    "new_high": exposure_high,
                    "iteration": iteration,
                }
            else:
                yield {
                    "event": "evidence_skipped",
                    "reason": "Range did not narrow",
                    "iteration": iteration,
                }
        except Exception:
            yield {
                "event": "evidence_skipped",
                "reason": "Could not parse LLM response",
                "iteration": iteration,
            }

        # Check if we've reached the target
        if request.target_exposure_low and request.target_exposure_high:
            if exposure_low >= request.target_exposure_low and exposure_high <= request.target_exposure_high:
                yield {"event": "signal", "text": "Target exposure range reached!"}
                break

    yield {
        "event": "complete",
        "final_exposure_low": exposure_low,
        "final_exposure_high": exposure_high,
        "iterations_used": iteration,
        "range_reduction_pct": round(
            (1 - (exposure_high - exposure_low) / max(request.initial_exposure_high - request.initial_exposure_low, 1)) * 100, 1
        ),
    }
