"""
Railtracks-based multi-agent orchestration for World Token Factory.
Provides a fan-out agent pattern for parallel risk assessment.
"""
import os
import asyncio
from typing import Optional

try:
    import railtracks as rt
    RAILTRACKS_AVAILABLE = True
except ImportError:
    RAILTRACKS_AVAILABLE = False

# LLM setup — prefer Gemini if available, fallback to OpenAI
def get_llm(stream: bool = False):
    if not RAILTRACKS_AVAILABLE:
        return None
    if os.getenv("GEMINI_API_KEY"):
        return rt.llm.GeminiLLM("gemini-2.5-flash", stream=stream)
    elif os.getenv("OPENAI_API_KEY"):
        return rt.llm.OpenAILLM("gpt-4o-mini", stream=stream)
    elif os.getenv("OPENROUTER_API_KEY"):
        # OpenRouter is OpenAI-compatible
        return rt.llm.OpenAILLM(
            os.getenv("OPENROUTER_MODEL_NAME", "anthropic/claude-3.5-sonnet"),
            stream=stream,
        )
    return None


# ── Tool nodes ──────────────────────────────────────────────────────

if RAILTRACKS_AVAILABLE:
    @rt.function_node
    def search_risk_data(query: str, domain: str = "general") -> dict:
        """Search for risk-relevant data from multiple sources.

        Args:
            query (str): The risk factor or topic to search for.
            domain (str): The business domain (e.g., 'oil', 'lemming', 'general').
        """
        # This would integrate with Senso, Nexla, or local file search
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
                if r.status_code == 200:
                    return {"source": "senso", "results": r.json()}
            except Exception:
                pass
        return {"source": "local", "results": f"No external data found for: {query}"}

    @rt.function_node
    def fetch_geospatial_context(lat: float, lng: float, risk_type: str) -> dict:
        """Fetch geospatial context for a location and risk type.

        Args:
            lat (float): Latitude of the location.
            lng (float): Longitude of the location.
            risk_type (str): Type of risk to assess (e.g., 'flood', 'seismic', 'hurricane').
        """
        import httpx
        # Open-Meteo weather data (free, no key)
        try:
            r = httpx.get(
                f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&daily=temperature_2m_max,precipitation_sum&timezone=auto&past_days=30",
                timeout=10,
            )
            if r.status_code == 200:
                return {"source": "open-meteo", "data": r.json()}
        except Exception:
            pass
        return {"source": "mock", "data": {"note": f"Mock geospatial data for {risk_type} at ({lat}, {lng})"}}

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
        # Clamp values
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
    """Create a Railtracks agent configured for risk analysis."""
    if not RAILTRACKS_AVAILABLE:
        return None

    llm = get_llm()
    if not llm:
        return None

    return rt.agent_node(
        name="Risk Analyst",
        tool_nodes=[search_risk_data, fetch_geospatial_context, calculate_risk_metrics],
        llm=llm,
        system_message=(
            "You are a senior risk analyst for World Token Factory. "
            "Given a business step and its risk factors, you: "
            "1) Search for relevant risk data using search_risk_data "
            "2) Fetch geospatial context if location data is available using fetch_geospatial_context "
            "3) Calculate precise risk metrics using calculate_risk_metrics "
            "Always provide specific numbers backed by evidence. "
            "Failure rate and uncertainty are SEPARATE metrics — don't conflate them."
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
    Returns a dict compatible with the existing AnalysisResult schema.
    """
    if not RAILTRACKS_AVAILABLE:
        return {"error": "railtracks not installed", "available": False}

    agent = create_risk_analyst_agent()
    if not agent:
        return {"error": "No LLM configured for Railtracks", "available": False}

    location_context = f" Location: ({lat}, {lng})." if lat and lng else ""
    prompt = (
        f"Business: {business_name}\n"
        f"Risk Factor: {risk_factor_name}\n"
        f"Description: {risk_factor_description}\n"
        f"Domain: {domain}\n"
        f"{location_context}\n\n"
        f"Analyse this risk factor. Search for relevant data, fetch geospatial context if applicable, "
        f"and calculate precise risk metrics. Provide a summary with specific numbers."
    )

    result = await rt.call(agent, prompt)

    return {
        "available": True,
        "text": result.text,
        "risk_factor_id": risk_factor_name,
        "summary": result.text[:500] if result.text else "No analysis generated",
        "tokens_used": 0,  # Railtracks doesn't expose token counts directly
        "engine": "railtracks",
    }
