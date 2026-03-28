"""
World Token Factory — Master Orchestrator

Top-level reasoning agent that coordinates all sub-systems:
- Gemini 2.5 Pro for high-level reasoning over multimodal evidence
- Railtracks agent graph for structured risk analysis
- Senso RAG for regulatory/compliance context
- Nexla for live data pipeline queries
- Augment (auggie) for codebase context during development
- Model router for optimal model selection per sub-task
- Gemini multimodal service for native video/GeoTIFF/PDF understanding

This is the "brain" that a user talks to. It decides what tools to invoke,
what depth of analysis to run, and synthesizes everything into a coherent
risk assessment with cited evidence.
"""

import os
import json
import asyncio
from typing import Optional, AsyncGenerator
from pathlib import Path

from repo_src.backend.llm_chat.llm_interface import ask_llm, gemini_client
from repo_src.backend.services.model_router import route_model, detect_task_type
from repo_src.backend.services.live_data_sources import (
    fetch_usgs_earthquakes,
    fetch_nasa_eonet_events,
    fetch_noaa_weather_alerts,
    fetch_fema_disaster_declarations,
)

DATA_ROOT = Path(__file__).parent.parent.parent.parent / "data"


# ── Sub-system availability ──────────────────────────────────────────

def check_systems() -> dict:
    """Check which sub-systems are available."""
    systems = {
        "gemini": gemini_client is not None,
        "senso": bool(os.getenv("SENSO_API_KEY")),
        "nexla": bool(os.getenv("NEXLA_TOKEN")),
        "gradient": bool(os.getenv("DIGITAL_OCEAN_MODEL_ACCESS_KEY")),
        "railtracks": False,
        "multimodal": gemini_client is not None,
        "augment": False,
    }
    try:
        from repo_src.backend.agents.railtracks_orchestrator import RAILTRACKS_AVAILABLE
        systems["railtracks"] = RAILTRACKS_AVAILABLE
    except ImportError:
        pass
    try:
        from repo_src.backend.services.augment_service import AUGMENT_AVAILABLE
        systems["augment"] = AUGMENT_AVAILABLE
    except ImportError:
        pass
    return systems


# ── Live data fetchers ───────────────────────────────────────────────

async def fetch_live_weather(lat: float, lng: float) -> dict:
    """Fetch live weather data from Open-Meteo."""
    import httpx
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                f"https://api.open-meteo.com/v1/forecast"
                f"?latitude={lat}&longitude={lng}"
                f"&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,"
                f"wind_speed_10m_max,weather_code"
                f"&current=temperature_2m,wind_speed_10,precipitation"
                f"&timezone=auto&past_days=7&forecast_days=7"
            )
            if r.status_code == 200:
                return {"source": "open-meteo", "status": "ok", "data": r.json()}
    except Exception as e:
        return {"source": "open-meteo", "status": "error", "error": str(e)}
    return {"source": "open-meteo", "status": "error", "error": "request failed"}


async def fetch_senso_context(query: str) -> dict:
    """Search Senso KB for regulatory/risk context."""
    import httpx
    senso_key = os.getenv("SENSO_API_KEY", "")
    if not senso_key:
        return {"source": "senso", "status": "unavailable"}
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                "https://apiv2.senso.ai/api/v1/org/search",
                headers={"X-API-Key": senso_key, "Content-Type": "application/json"},
                json={"query": query, "top_k": 5},
            )
            if r.status_code in (200, 202):
                return {"source": "senso", "status": "ok", "results": r.json()}
    except Exception as e:
        return {"source": "senso", "status": "error", "error": str(e)}
    return {"source": "senso", "status": "error"}


async def fetch_nexla_flows() -> dict:
    """Check Nexla for available data flows."""
    import httpx
    token = os.getenv("NEXLA_TOKEN", "")
    if not token:
        return {"source": "nexla", "status": "unavailable"}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                "https://dataops.nexla.io/nexla-api/data_flows",
                headers={"Authorization": f"Bearer {token}"},
            )
            if r.status_code == 200:
                return {"source": "nexla", "status": "ok", "flows": r.json()}
    except Exception as e:
        return {"source": "nexla", "status": "error", "error": str(e)}
    return {"source": "nexla", "status": "error"}


async def fetch_augment_context(query: str) -> dict:
    """Use Augment Context Engine to retrieve semantically relevant codebase context."""
    try:
        from repo_src.backend.services.augment_service import augment_search_codebase
        result = await augment_search_codebase(query)
        result["source"] = "augment"
        if "error" not in result:
            result["status"] = "ok"
        else:
            result["status"] = "unavailable"
        return result
    except Exception as e:
        return {"source": "augment", "status": "error", "error": str(e)}


def get_local_evidence(domain: str, risk_factor: str) -> dict:
    """Scan local artifact catalog for relevant evidence."""
    try:
        from repo_src.backend.agents.railtracks_orchestrator import (
            find_relevant_artifacts, get_domain_artifacts,
        )
        artifacts = find_relevant_artifacts(domain, risk_factor)
        catalog = get_domain_artifacts(domain)
        return {
            "source": "local_catalog",
            "matched_artifacts": len(artifacts),
            "artifacts": artifacts[:10],
            "total_docs": len(catalog.get("docs", [])),
            "total_sites": len(catalog.get("sites", {})),
        }
    except ImportError:
        return {"source": "local_catalog", "status": "unavailable"}


# ── Orchestrator prompts ─────────────────────────────────────────────

ORCHESTRATOR_SYSTEM = """You are the World Token Factory master orchestrator — a Gemini 2.5 Pro-class reasoning agent.

Your job is to synthesize ALL available evidence into a precise risk assessment. You receive:
1. LIVE DATA: Current weather, climate conditions, active alerts
2. REGULATORY CONTEXT: Senso RAG results from compliance/regulatory knowledge base
3. LOCAL EVIDENCE: Multimodal artifacts (DEMs, satellite imagery, PDFs, videos, research papers)
4. DATA PIPELINES: Nexla flow status for live data ingestion
5. BUSINESS CONTEXT: What the business does, which step and risk factor we're assessing

You MUST:
- Reference specific evidence sources by name (e.g., "per the EIA Drilling Productivity Report...")
- Distinguish failure_rate (probability of bad outcome) from uncertainty (confidence in that estimate)
- Show your reasoning chain — what evidence supports what conclusion
- Identify the 3-5 most impactful knowledge gaps
- Calculate a loss range where the WIDTH of the range reflects information quality
- Note which modalities provided the strongest signals (text vs satellite vs weather vs video)

Return ONLY valid JSON:
{
    "summary": "4-6 sentence synthesis referencing specific evidence",
    "reasoning_chain": [
        {"step": 1, "action": "what you examined", "finding": "what you found", "source": "evidence name"},
        ...
    ],
    "evidence_sources": [
        {"name": "source name", "type": "pdf|dem|satellite|weather|regulatory|video", "contribution": "what it told us"}
    ],
    "gaps": ["specific gap 1", "specific gap 2", ...],
    "metrics": {
        "failure_rate": 0.0,
        "uncertainty": 0.0,
        "loss_range_low": 0,
        "loss_range_high": 0,
        "loss_range_note": "explanation of range width"
    },
    "model_used": "which model produced this",
    "data_sources_queried": ["senso", "open-meteo", "nexla", "local_catalog"],
    "strongest_signal_modality": "text|geospatial|weather|video|regulatory"
}"""


# ── Main orchestration ───────────────────────────────────────────────

async def orchestrate_risk_assessment(
    business_name: str,
    step_name: str,
    risk_factor_name: str,
    risk_factor_description: str,
    domain: str = "oil",
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    depth: int = 2,
) -> AsyncGenerator[dict, None]:
    """
    Master orchestration: fan out to all data sources in parallel,
    then synthesize with Gemini Pro.

    Yields SSE-compatible event dicts for the agent thread panel.
    """
    yield {"event": "step", "text": "Orchestrator initialising — checking available systems"}
    systems = check_systems()
    active = [k for k, v in systems.items() if v]
    yield {"event": "signal", "text": f"Active systems: {', '.join(active)}"}

    # ── Phase 1: Parallel data gathering ─────────────────────────────
    yield {"event": "step", "text": "Phase 1: Gathering evidence from all sources in parallel"}

    tasks = {}

    # Always: local evidence
    tasks["local"] = asyncio.create_task(
        asyncio.to_thread(get_local_evidence, domain, risk_factor_name)
    )

    # Weather if coordinates available
    if lat and lng:
        tasks["weather"] = asyncio.create_task(fetch_live_weather(lat, lng))

    # Senso RAG
    if systems["senso"]:
        tasks["senso"] = asyncio.create_task(
            fetch_senso_context(f"{risk_factor_name} {step_name} {domain} risk assessment")
        )

    # Nexla flows
    if systems["nexla"]:
        tasks["nexla"] = asyncio.create_task(fetch_nexla_flows())

    # Augment Context Engine — semantic codebase/data retrieval
    if systems["augment"]:
        tasks["augment"] = asyncio.create_task(
            fetch_augment_context(f"{risk_factor_name} {step_name} {domain}")
        )

    # USGS earthquake catalog — recent seismic activity near location
    if lat and lng:
        tasks["usgs_earthquakes"] = asyncio.create_task(
            fetch_usgs_earthquakes(lat, lng, radius_km=200, days=30)
        )

    # NASA EONET — active natural events globally
    tasks["nasa_events"] = asyncio.create_task(
        fetch_nasa_eonet_events(limit=5)
    )

    # NOAA NWS — active weather alerts near location
    if lat and lng:
        tasks["noaa_alerts"] = asyncio.create_task(
            fetch_noaa_weather_alerts(lat, lng)
        )

    # FEMA OpenFEMA — recent disaster declarations (default TX; caller can override)
    tasks["fema_history"] = asyncio.create_task(
        fetch_fema_disaster_declarations(state="TX", limit=10)
    )

    # Wait for all
    results = {}
    for name, task in tasks.items():
        try:
            results[name] = await asyncio.wait_for(task, timeout=15)
            status = results[name].get("status", "ok")
            yield {"event": "signal", "text": f"[{name}] {status} — data received"}
        except asyncio.TimeoutError:
            results[name] = {"status": "timeout"}
            yield {"event": "signal", "text": f"[{name}] timeout — skipping"}
        except Exception as e:
            results[name] = {"status": "error", "error": str(e)}
            yield {"event": "signal", "text": f"[{name}] error: {e}"}

    # ── Phase 2: Read local documents ────────────────────────────────
    yield {"event": "step", "text": "Phase 2: Reading local risk documents"}

    doc_contents = []
    local_data = results.get("local", {})
    artifacts = local_data.get("artifacts", [])

    for art in artifacts[:5]:
        path = art.get("path", "")
        if path and path.endswith(".md"):
            try:
                content = Path(path).read_text(encoding="utf-8")[:3000]
                doc_contents.append(f"=== {art['file']} ===\n{content}")
                yield {"event": "file_found", "filename": art["file"], "domain": domain}
            except Exception:
                pass

    yield {"event": "signal", "text": f"Read {len(doc_contents)} documents, found {len(artifacts)} artifacts"}

    # ── Phase 3: Route to optimal model + synthesize ─────────────────
    yield {"event": "step", "text": "Phase 3: Routing to optimal model for synthesis"}

    model_id, route_reason = route_model(
        f"{risk_factor_name} {risk_factor_description}",
        ORCHESTRATOR_SYSTEM,
        prefer_quality=(depth >= 3),
    )
    yield {"event": "signal", "text": f"Model router → {model_id} ({route_reason})"}

    # Build the mega-prompt with all gathered evidence
    evidence_sections = []

    # Local artifacts
    if artifacts:
        art_list = "\n".join(
            f"- [{a['type']}] {a['file']}: {a.get('description', '')}"
            for a in artifacts
        )
        evidence_sections.append(f"LOCAL ARTIFACTS ({len(artifacts)} found):\n{art_list}")

    # Document contents
    if doc_contents:
        evidence_sections.append(f"DOCUMENT CONTENTS:\n" + "\n\n".join(doc_contents[:3]))

    # Weather
    weather = results.get("weather", {})
    if weather.get("status") == "ok":
        wd = weather.get("data", {})
        current = wd.get("current", {})
        evidence_sections.append(
            f"LIVE WEATHER ({lat}, {lng}):\n"
            f"Current: {current.get('temperature_2m', '?')}°C, "
            f"wind {current.get('wind_speed_10', '?')} km/h, "
            f"precip {current.get('precipitation', '?')} mm"
        )

    # Senso regulatory context
    senso = results.get("senso", {})
    if senso.get("status") == "ok":
        senso_results = senso.get("results", {})
        if isinstance(senso_results, list):
            snippets = "\n".join(
                f"- {r.get('title', 'Untitled')}: {str(r.get('content', r.get('text', '')))[:300]}"
                for r in senso_results[:5]
            )
        elif isinstance(senso_results, dict):
            snippets = json.dumps(senso_results)[:1000]
        else:
            snippets = str(senso_results)[:500]
        evidence_sections.append(f"SENSO REGULATORY CONTEXT:\n{snippets}")

    # Nexla
    nexla = results.get("nexla", {})
    if nexla.get("status") == "ok":
        flows = nexla.get("flows", {})
        evidence_sections.append(f"NEXLA DATA PIPELINES: {json.dumps(flows)[:500]}")

    # Augment Context Engine
    augment = results.get("augment", {})
    if augment.get("status") == "ok":
        augment_results = augment.get("results", "")
        if augment_results:
            evidence_sections.append(f"AUGMENT CONTEXT ENGINE:\n{str(augment_results)[:1000]}")

    # USGS Earthquakes — GeoJSON features, properties contain mag/place/time
    usgs = results.get("usgs_earthquakes", {})
    if usgs.get("ok") and usgs.get("data"):
        quakes = usgs["data"][:5]
        quake_lines = []
        for q in quakes:
            props = q.get("properties", {}) if isinstance(q, dict) else {}
            mag = props.get("mag", "?")
            place = props.get("place", "?")
            ts = props.get("time", "")
            # USGS time is epoch ms; convert to readable date if possible
            if ts:
                try:
                    from datetime import datetime, timezone
                    readable = datetime.fromtimestamp(ts / 1000, tz=timezone.utc).strftime("%Y-%m-%d")
                except Exception:
                    readable = str(ts)
            else:
                readable = "?"
            quake_lines.append(f"- M{mag} at {place} ({readable})")
        evidence_sections.append(
            f"USGS EARTHQUAKES (nearby, last 30 days, {usgs.get('count', 0)} total):\n"
            + "\n".join(quake_lines)
        )

    # NASA EONET — active natural events
    nasa = results.get("nasa_events", {})
    if nasa.get("ok") and nasa.get("data"):
        events = nasa["data"][:5]
        event_lines = []
        for e in events:
            title = e.get("title", "?")
            cats = e.get("categories", [])
            cat_name = cats[0].get("title", "?") if cats else "?"
            event_lines.append(f"- {title} ({cat_name})")
        evidence_sections.append(
            f"NASA ACTIVE NATURAL EVENTS ({nasa.get('count', 0)} total):\n"
            + "\n".join(event_lines)
        )

    # NOAA NWS — active weather alerts, GeoJSON features
    noaa = results.get("noaa_alerts", {})
    if noaa.get("ok") and noaa.get("data"):
        alerts = noaa["data"][:5]
        alert_lines = []
        for a in alerts:
            props = a.get("properties", {}) if isinstance(a, dict) else {}
            headline = props.get("headline", props.get("event", "?"))
            alert_lines.append(f"- {headline}")
        evidence_sections.append(
            f"NOAA WEATHER ALERTS ({noaa.get('count', 0)} active):\n"
            + "\n".join(alert_lines)
        )
    elif noaa.get("ok"):
        evidence_sections.append("NOAA WEATHER ALERTS: No active alerts for this location.")

    # FEMA OpenFEMA — disaster declaration history
    fema = results.get("fema_history", {})
    if fema.get("ok") and fema.get("data"):
        declarations = fema["data"][:5]
        fema_lines = []
        for d in declarations:
            title = d.get("declarationTitle", "?")
            date_str = (d.get("declarationDate") or "")[:10]
            inc_type = d.get("incidentType", "")
            fema_lines.append(f"- {title} [{inc_type}] ({date_str})")
        evidence_sections.append(
            f"FEMA DISASTER HISTORY ({fema.get('count', 0)} records):\n"
            + "\n".join(fema_lines)
        )

    all_evidence = "\n\n".join(evidence_sections)

    prompt = (
        f"BUSINESS: {business_name}\n"
        f"OPERATIONAL STEP: {step_name}\n"
        f"RISK FACTOR: {risk_factor_name}\n"
        f"DESCRIPTION: {risk_factor_description}\n"
        f"DOMAIN: {domain}\n"
        f"DEPTH: {depth}\n"
        f"LOCATION: ({lat}, {lng})\n\n"
        f"GATHERED EVIDENCE:\n{all_evidence}\n\n"
        f"Synthesize all evidence into a comprehensive risk assessment. "
        f"Reference specific sources. Calculate precise metrics."
    )

    yield {"event": "step", "text": f"Phase 4: Synthesizing with {model_id}"}

    # Token estimate
    token_est = (len(prompt) + len(ORCHESTRATOR_SYSTEM)) // 4
    yield {"event": "token_update", "tokens": token_est}

    # Call the LLM
    response = await ask_llm(
        prompt_text=prompt,
        system_message=ORCHESTRATOR_SYSTEM,
        max_tokens=3000,
        temperature=0.2,
    )

    # Parse
    try:
        text = response.strip()
        if text.startswith("```"):
            import re
            text = re.sub(r"^```[a-z]*\n?", "", text)
            text = re.sub(r"\n?```$", "", text.strip())
        parsed = json.loads(text)
    except Exception:
        parsed = {
            "summary": response[:500],
            "reasoning_chain": [],
            "evidence_sources": [],
            "gaps": ["Response could not be parsed as JSON"],
            "metrics": {
                "failure_rate": 0.15,
                "uncertainty": 0.75,
                "loss_range_low": 1_000_000,
                "loss_range_high": 50_000_000,
                "loss_range_note": "Parse error — estimate unreliable",
            },
            "model_used": model_id,
            "data_sources_queried": list(results.keys()),
            "strongest_signal_modality": "unknown",
        }

    # Emit reasoning chain as signals
    for step in parsed.get("reasoning_chain", []):
        yield {"event": "signal", "text": f"[reasoning] {step.get('action', '?')}: {step.get('finding', '')[:100]}"}

    # Emit gaps
    for gap in parsed.get("gaps", []):
        yield {"event": "signal", "text": f"[gap] {gap}"}

    # Final token estimate
    total_tokens = (len(prompt) + len(response)) // 4
    yield {"event": "token_update", "tokens": total_tokens}

    # ── Phase 5: Push analysis result to Nexla for storage/querying ─────
    yield {"event": "step", "text": "Phase 5: Pushing analysis result to Nexla pipeline"}
    try:
        from repo_src.backend.services.nexla_service import nexla_push_records
        safe_name = risk_factor_name[:30].replace(" ", "-").lower()
        nexla_source_name = f"wtf-analysis-{safe_name}"
        push_payload = [
            {
                "business_name": business_name,
                "step_name": step_name,
                "risk_factor_name": risk_factor_name,
                "domain": domain,
                "lat": lat,
                "lng": lng,
                "summary": parsed.get("summary", ""),
                "metrics": parsed.get("metrics", {}),
                "gaps": parsed.get("gaps", []),
                "model_used": parsed.get("model_used", model_id),
                "data_sources_queried": list(results.keys()),
                "strongest_signal_modality": parsed.get("strongest_signal_modality", "unknown"),
            }
        ]
        push_result = await nexla_push_records(nexla_source_name, push_payload)
        if push_result.get("available"):
            yield {
                "event": "signal",
                "text": (
                    f"[nexla] Analysis result stored — source_id={push_result.get('source_id')}, "
                    f"records_pushed={push_result.get('records_pushed')}"
                ),
            }
        else:
            yield {"event": "signal", "text": f"[nexla] Push skipped: {push_result.get('error', 'unknown')}"}
    except Exception as e:
        yield {"event": "signal", "text": f"[nexla] Push error (non-blocking): {e}"}

    # Build result
    from repo_src.backend.models.risk import AnalysisResult, RiskMetrics, Artifact
    raw_metrics = parsed.get("metrics", {})
    metrics = RiskMetrics(
        failure_rate=float(raw_metrics.get("failure_rate", 0.15)),
        uncertainty=float(raw_metrics.get("uncertainty", 0.6)),
        loss_range_low=int(raw_metrics.get("loss_range_low", 1_000_000)),
        loss_range_high=int(raw_metrics.get("loss_range_high", 10_000_000)),
        loss_range_note=raw_metrics.get("loss_range_note", ""),
    )

    result_artifacts = []
    for art in artifacts[:10]:
        result_artifacts.append(Artifact(
            filename=art.get("file", ""),
            domain=domain,
            type=art.get("type", "document"),
            relevance=art.get("description", ""),
        ))

    result = AnalysisResult(
        risk_factor_id=risk_factor_name,
        summary=parsed.get("summary", ""),
        gaps=parsed.get("gaps", []),
        metrics=metrics,
        artifacts=result_artifacts,
        tokens_used=total_tokens,
        depth=depth,
    )

    yield {"event": "step", "text": "Orchestration complete"}
    yield {
        "event": "complete",
        "result": result.model_dump(),
        "orchestrator_meta": {
            "model_used": model_id,
            "route_reason": route_reason,
            "systems_queried": list(results.keys()),
            "evidence_sources": parsed.get("evidence_sources", []),
            "reasoning_chain": parsed.get("reasoning_chain", []),
            "strongest_signal": parsed.get("strongest_signal_modality", "unknown"),
        },
    }
