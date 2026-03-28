"""
Railtracks-based multi-agent orchestration for World Token Factory.
Provides a fan-out agent pattern for parallel risk assessment using
multimodal data: DEMs, satellite imagery, PDFs, video, weather APIs.
"""
import os
import glob
from pathlib import Path
from typing import Optional

try:
    import railtracks as rt
    RAILTRACKS_AVAILABLE = True
except ImportError:
    RAILTRACKS_AVAILABLE = False

# Project data root
DATA_ROOT = Path(__file__).parent.parent.parent.parent / "data"


# LLM setup — prefer Gemini if available, fallback to OpenAI
def get_llm(stream: bool = False):
    if not RAILTRACKS_AVAILABLE:
        return None
    if os.getenv("GEMINI_API_KEY"):
        return rt.llm.GeminiLLM("gemini-2.5-flash", stream=stream)
    elif os.getenv("OPENAI_API_KEY"):
        return rt.llm.OpenAILLM("gpt-4o-mini", stream=stream)
    elif os.getenv("OPENROUTER_API_KEY"):
        return rt.llm.OpenAILLM(
            os.getenv("OPENROUTER_MODEL_NAME", "anthropic/claude-3.5-sonnet"),
            stream=stream,
        )
    return None


# ── Artifact registry ────────────────────────────────────────────────

ARTIFACT_CATALOG = {
    "oil": {
        "sites": {
            "permian_fields": {
                "dem": "oil/sites/permian_fields/dem_30m.tif",
                "optical": "oil/sites/permian_fields/optical_modis_truecolor.tif",
                "coords": {"lat": 31.5, "lng": -102.5},
                "description": "Permian Basin / Delaware Basin, West Texas",
            },
            "gom_offshore": {
                "bathymetry": "oil/sites/gom_offshore/bathymetry_gebco.tif",
                "optical": "oil/sites/gom_offshore/optical_modis_truecolor.tif",
                "coords": {"lat": 28.17, "lng": -88.49},
                "description": "Thunder Horse PDQ, Mississippi Canyon, Gulf of Mexico",
            },
            "midstream_egress": {
                "dem": "oil/sites/midstream_egress/dem_30m.tif",
                "optical": "oil/sites/midstream_egress/optical_modis_truecolor.tif",
                "coords": {"lat": 31.5, "lng": -100.5},
                "description": "Midstream pipeline egress corridor, West Texas",
            },
        },
        "artifacts": {
            "cushing_dem": {"file": "oil/artifacts/cushing_oklahoma_dem_30m.tif", "type": "geotiff", "description": "Copernicus DEM 30m — Cushing, OK pipeline corridor"},
            "pipeline_risk_gis": {"file": "oil/artifacts/pipeline_risk_gis_ml.pdf", "type": "pdf", "description": "GIS + ML pipeline risk analysis (arXiv 2025)"},
            "texas_city_disaster": {"file": "oil/artifacts/csb_bp_texas_city_anatomy_of_disaster.mp4", "type": "video", "description": "CSB investigation — BP Texas City refinery explosion"},
            "permian_dem": {"file": "oil/artifacts/permian_basin_midland_dem_30m.tif", "type": "geotiff", "description": "Copernicus DEM 30m — Permian Basin, West Texas"},
            "wastewater_seismicity": {"file": "oil/artifacts/texas_wastewater_injection_seismicity_azle_natcomms2015.pdf", "type": "pdf", "description": "Wastewater injection → seismicity (Nature Comms 2015)"},
            "eia_permian": {"file": "oil/artifacts/eia_drilling_productivity_report_permian.pdf", "type": "pdf", "description": "EIA Drilling Productivity Report — Permian Basin"},
            "permian_grid_risk": {"file": "oil/artifacts/permian_power_grid_risk.mkv", "type": "video", "description": "Permian Basin power grid risk analysis"},
        },
        "docs": [
            "oil/pipeline_integrity_2023.md",
            "oil/gulf_subsidence_report.md",
            "oil/offshore_hurricane_exposure.md",
            "oil/regulatory_compliance_2022.md",
            "oil/permian_basin_risk_brief.md",
        ],
    },
    "lemming": {
        "sites": {
            "yamal": {
                "satellite": "geo/yamal_cliff_farm_map.jpg",
                "coords": {"lat": 70.0, "lng": 68.0},
                "description": "Yamal Peninsula — Tundra Lemming Range, Research Station Alpha, Western Coastal Bluff",
            },
        },
        "artifacts": {
            "hardangervidda_dem": {"file": "lemming/artifacts/hardangervidda_lemming_habitat_dem_30m.tif", "type": "geotiff", "description": "Copernicus DEM 30m — Hardangervidda National Park, Norway"},
            "population_cycles": {"file": "lemming/artifacts/lemming_population_cycles_hardangervidda.pdf", "type": "pdf", "description": "Lemming population cycles analysis (Scientific Reports 2016)"},
            "bbc_lemming": {"file": "lemming/artifacts/bbc_norway_lemming_fearless_attack.webm", "type": "video", "description": "BBC — Fearless lemming attack documentary"},
        },
        "docs": [
            "lemming/arctic_climate_trends.md",
            "lemming/lemming_habitat_survey.md",
        ],
    },
}


def get_domain_artifacts(domain: str) -> dict:
    """Get the full artifact catalog for a domain."""
    return ARTIFACT_CATALOG.get(domain, {})


def find_relevant_artifacts(domain: str, risk_factor_name: str) -> list[dict]:
    """Find artifacts relevant to a specific risk factor based on keyword matching."""
    catalog = ARTIFACT_CATALOG.get(domain, {})
    results = []
    rf_lower = risk_factor_name.lower()

    # Search artifacts
    for key, art in catalog.get("artifacts", {}).items():
        desc_lower = art["description"].lower()
        if any(word in desc_lower for word in rf_lower.split()):
            results.append({
                "id": key,
                "file": art["file"],
                "type": art["type"],
                "description": art["description"],
                "path": str(DATA_ROOT / art["file"]),
            })

    # Search docs
    for doc_path in catalog.get("docs", []):
        doc_name = Path(doc_path).stem.replace("_", " ").lower()
        if any(word in doc_name for word in rf_lower.split()):
            results.append({
                "id": Path(doc_path).stem,
                "file": doc_path,
                "type": "document",
                "description": f"Risk document: {Path(doc_path).stem.replace('_', ' ').title()}",
                "path": str(DATA_ROOT / doc_path),
            })

    # Search sites
    for site_key, site in catalog.get("sites", {}).items():
        if any(word in site["description"].lower() for word in rf_lower.split()):
            for asset_type, asset_path in site.items():
                if asset_type in ("coords", "description"):
                    continue
                results.append({
                    "id": f"{site_key}_{asset_type}",
                    "file": asset_path,
                    "type": "geospatial",
                    "description": f"{site['description']} — {asset_type}",
                    "path": str(DATA_ROOT / asset_path),
                    "coords": site.get("coords"),
                })

    return results


# ── Tool nodes ──────────────────────────────────────────────────────

if RAILTRACKS_AVAILABLE:
    @rt.function_node
    def search_risk_data(query: str, domain: str = "general") -> dict:
        """Search for risk-relevant data from Senso KB and local artifact catalog.

        Args:
            query (str): The risk factor or topic to search for.
            domain (str): The business domain (e.g., 'oil', 'lemming', 'general').
        """
        results = {"sources": []}

        # 1. Local artifact catalog
        artifacts = find_relevant_artifacts(domain, query)
        if artifacts:
            results["sources"].append({
                "source": "artifact_catalog",
                "count": len(artifacts),
                "artifacts": artifacts,
            })

        # 2. Local document content
        catalog = ARTIFACT_CATALOG.get(domain, {})
        doc_snippets = []
        for doc_path in catalog.get("docs", []):
            full_path = DATA_ROOT / doc_path
            if full_path.exists():
                try:
                    content = full_path.read_text(encoding="utf-8")[:2000]
                    if any(word in content.lower() for word in query.lower().split()[:3]):
                        doc_snippets.append({
                            "file": doc_path,
                            "snippet": content[:500],
                        })
                except Exception:
                    pass
        if doc_snippets:
            results["sources"].append({
                "source": "local_docs",
                "count": len(doc_snippets),
                "documents": doc_snippets,
            })

        # 3. Senso RAG KB
        import httpx
        senso_key = os.getenv("SENSO_API_KEY", "")
        if senso_key:
            try:
                r = httpx.post(
                    "https://apiv2.senso.ai/api/v1/org/search",
                    headers={"X-API-Key": senso_key},
                    json={"query": query, "top_k": 3},
                    timeout=15,
                )
                if r.status_code in (200, 202):
                    results["sources"].append({
                        "source": "senso_rag",
                        "results": r.json(),
                    })
            except Exception:
                pass

        if not results["sources"]:
            results["sources"].append({"source": "none", "note": f"No data found for: {query}"})

        return results

    @rt.function_node
    def list_domain_artifacts(domain: str) -> dict:
        """List all available multimodal artifacts for a business domain.

        Args:
            domain (str): The business domain (e.g., 'oil', 'lemming').
        """
        catalog = get_domain_artifacts(domain)
        if not catalog:
            return {"domain": domain, "available": False, "artifacts": []}

        summary = {
            "domain": domain,
            "available": True,
            "sites": [],
            "artifacts": [],
            "documents": [],
        }

        for site_key, site in catalog.get("sites", {}).items():
            assets = {k: v for k, v in site.items() if k not in ("coords", "description")}
            summary["sites"].append({
                "id": site_key,
                "description": site["description"],
                "coords": site.get("coords"),
                "assets": list(assets.keys()),
                "asset_types": [Path(v).suffix for v in assets.values()],
            })

        for key, art in catalog.get("artifacts", {}).items():
            summary["artifacts"].append({
                "id": key,
                "type": art["type"],
                "description": art["description"],
                "file": art["file"],
            })

        for doc in catalog.get("docs", []):
            summary["documents"].append({
                "file": doc,
                "name": Path(doc).stem.replace("_", " ").title(),
            })

        return summary

    @rt.function_node
    def fetch_geospatial_context(lat: float, lng: float, risk_type: str) -> dict:
        """Fetch geospatial context for a location: weather data + matching site artifacts.

        Args:
            lat (float): Latitude of the location.
            lng (float): Longitude of the location.
            risk_type (str): Type of risk to assess (e.g., 'flood', 'seismic', 'hurricane').
        """
        result = {"lat": lat, "lng": lng, "risk_type": risk_type, "data": []}

        # Open-Meteo weather data (free, no key)
        import httpx
        try:
            r = httpx.get(
                f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}"
                f"&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max"
                f"&timezone=auto&past_days=30",
                timeout=10,
            )
            if r.status_code == 200:
                result["data"].append({"source": "open-meteo", "weather": r.json()})
        except Exception:
            pass

        # Find matching site data from artifact catalog
        for domain in ARTIFACT_CATALOG:
            for site_key, site in ARTIFACT_CATALOG[domain].get("sites", {}).items():
                coords = site.get("coords", {})
                if coords:
                    dist = abs(coords["lat"] - lat) + abs(coords["lng"] - lng)
                    if dist < 5:  # within ~5 degrees
                        assets = {k: str(DATA_ROOT / v) for k, v in site.items() if k not in ("coords", "description")}
                        result["data"].append({
                            "source": "site_catalog",
                            "site": site_key,
                            "description": site["description"],
                            "distance_deg": round(dist, 2),
                            "available_assets": list(assets.keys()),
                        })

        if not result["data"]:
            result["data"].append({"source": "none", "note": f"No geospatial data near ({lat}, {lng})"})

        return result

    @rt.function_node
    def read_risk_document(file_path: str, max_chars: int = 3000) -> dict:
        """Read the text content of a risk document from the data directory.

        Args:
            file_path (str): Relative path within the data directory (e.g., 'oil/pipeline_integrity_2023.md').
            max_chars (int): Maximum characters to return (default 3000).
        """
        full_path = DATA_ROOT / file_path
        if not full_path.exists():
            return {"error": f"File not found: {file_path}", "content": ""}
        if full_path.suffix not in (".md", ".csv", ".txt"):
            return {"error": f"Cannot read binary file: {file_path}", "type": full_path.suffix, "content": ""}
        try:
            content = full_path.read_text(encoding="utf-8")[:max_chars]
            return {"file": file_path, "chars": len(content), "content": content}
        except Exception as e:
            return {"error": str(e), "content": ""}

    @rt.function_node
    def calculate_risk_metrics(
        failure_rate: float,
        uncertainty: float,
        loss_low: int,
        loss_high: int,
        evidence_count: int
    ) -> dict:
        """Calculate and validate risk metrics for a risk factor.

        Args:
            failure_rate (float): Estimated probability of failure (0.0-1.0).
            uncertainty (float): Confidence uncertainty (0.0-1.0, higher = less certain).
            loss_low (int): Lower bound of potential loss in dollars.
            loss_high (int): Upper bound of potential loss in dollars.
            evidence_count (int): Number of evidence artifacts supporting the assessment.
        """
        fr = max(0.0, min(1.0, failure_rate))
        un = max(0.0, min(1.0, uncertainty))
        ll = max(0, loss_low)
        lh = max(ll, loss_high)

        severity = "LOW"
        if fr > 0.6 or un > 0.6:
            severity = "CRITICAL"
        elif fr > 0.3 or un > 0.4:
            severity = "HIGH"
        elif fr > 0.1:
            severity = "MEDIUM"

        return {
            "failure_rate": round(fr, 3),
            "uncertainty": round(un, 3),
            "loss_range_low": ll,
            "loss_range_high": lh,
            "loss_range_note": f"${ll:,} – ${lh:,} estimated exposure",
            "severity": severity,
            "evidence_strength": "strong" if evidence_count >= 3 else "moderate" if evidence_count >= 1 else "weak",
        }


def create_risk_analyst_agent():
    """Create a Railtracks agent configured for multimodal risk analysis."""
    if not RAILTRACKS_AVAILABLE:
        return None

    llm = get_llm()
    if not llm:
        return None

    return rt.agent_node(
        name="Risk Analyst",
        tool_nodes=[
            search_risk_data,
            list_domain_artifacts,
            fetch_geospatial_context,
            read_risk_document,
            calculate_risk_metrics,
        ],
        llm=llm,
        system_message=(
            "You are a senior risk analyst for World Token Factory. "
            "You have access to a rich multimodal evidence base including: "
            "Copernicus DEM elevation data (GeoTIFFs), satellite imagery (MODIS, Sentinel-2), "
            "academic research papers (PDFs), video investigations (CSB, BBC), "
            "weather data (Open-Meteo), and a Senso RAG knowledge base with regulatory documents.\n\n"
            "For each risk factor, you MUST:\n"
            "1) list_domain_artifacts to see what evidence exists for this domain\n"
            "2) search_risk_data to find relevant artifacts and documents\n"
            "3) read_risk_document to get full text of relevant .md files\n"
            "4) fetch_geospatial_context if coordinates are available\n"
            "5) calculate_risk_metrics with specific numbers backed by evidence\n\n"
            "Reference specific artifacts in your analysis (e.g., 'per the EIA Drilling Productivity Report...'). "
            "Failure rate and uncertainty are SEPARATE metrics — don't conflate them. "
            "The width of the loss range is itself a signal about information quality."
        ),
    )


async def run_railtracks_analysis(
    business_name: str,
    risk_factor_name: str,
    risk_factor_description: str,
    domain: str = "general",
    lat: Optional[float] = None,
    lng: Optional[float] = None,
) -> dict:
    """
    Run a Railtracks-orchestrated risk analysis for a single risk factor.
    Uses a generate → validate → revise loop (max 3 iterations).
    Returns a dict compatible with the existing AnalysisResult schema.
    """
    if not RAILTRACKS_AVAILABLE:
        return {"error": "railtracks not installed", "available": False}

    agent = create_risk_analyst_agent()
    if not agent:
        return {"error": "No LLM configured for Railtracks", "available": False}

    # Create a validator agent for the validation loop
    validator = rt.agent_node(
        name="Risk Validator",
        llm=get_llm(),
        system_message=(
            "You are a risk assessment validator. Given a risk analysis, check:\n"
            "1. Are failure_rate and uncertainty between 0.0 and 1.0?\n"
            "2. Is loss_range_low <= loss_range_high?\n"
            "3. Are specific evidence sources cited (not generic statements)?\n"
            "4. Are knowledge gaps identified?\n"
            "If valid, respond with EXACTLY: VALID\n"
            "If invalid, respond with: INVALID: [what needs fixing]"
        ),
    )

    # Build prompt
    location_context = f" Location: ({lat}, {lng})." if lat and lng else ""
    prompt = (
        f"Business: {business_name}\n"
        f"Risk Factor: {risk_factor_name}\n"
        f"Description: {risk_factor_description}\n"
        f"Domain: {domain}\n"
        f"{location_context}\n\n"
        f"Analyse this risk factor using all available tools."
    )

    # Validation loop — generate → validate → revise (max 3 iterations)
    max_retries = 3
    analysis_text = ""
    validation_text = ""
    validation_feedback = ""

    for attempt in range(max_retries):
        # Generate analysis
        with rt.Session(name=f"WTF Risk Analysis (attempt {attempt+1})") as session:
            result = await rt.call(
                agent,
                prompt if attempt == 0 else
                f"Previous analysis was invalid. Fix these issues: {validation_feedback}\n\nOriginal request:\n{prompt}"
            )
            analysis_text = result.text or ""

        # Validate
        with rt.Session(name="WTF Validation") as session:
            validation = await rt.call(
                validator,
                f"Validate this risk analysis:\n\n{analysis_text}"
            )
            validation_text = validation.text or ""

        if "VALID" in validation_text and "INVALID" not in validation_text:
            break
        validation_feedback = validation_text

    return {
        "available": True,
        "text": analysis_text,
        "risk_factor_id": risk_factor_name,
        "summary": analysis_text[:500] if analysis_text else "No analysis generated",
        "tokens_used": 0,
        "engine": "railtracks",
        "domain": domain,
        "validation_attempts": attempt + 1,
        "validated": "VALID" in validation_text and "INVALID" not in validation_text,
        "artifacts_available": len(find_relevant_artifacts(domain, risk_factor_name)),
    }
