import httpx
import os

SENSO_BASE = "https://apiv2.senso.ai/api/v1"
SENSO_KEY = os.getenv("SENSO_API_KEY", "tgr_ytBzOdHEHzMRbAhwzg41Iet6whl5qaeOUIeFXd-50xM")


async def senso_search(query: str, top_k: int = 5) -> dict:
    """Search Senso knowledge base for risk/regulatory context."""
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(
            f"{SENSO_BASE}/org/search",
            headers={"X-API-Key": SENSO_KEY, "Content-Type": "application/json"},
            json={"query": query, "top_k": top_k}
        )
        if r.status_code == 200:
            return r.json()
        return {"error": f"Senso search failed: {r.status_code}", "results": []}


async def senso_ingest_text(content: str, title: str = "risk_doc") -> dict:
    """Ingest text into Senso knowledge base."""
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(
            f"{SENSO_BASE}/org/kb/raw",
            headers={"X-API-Key": SENSO_KEY, "Content-Type": "application/json"},
            json={"content": content, "title": title}
        )
        return r.json() if r.status_code == 200 else {"error": str(r.status_code)}


async def senso_configure_brand_kit() -> dict:
    """Configure the Senso Brand Kit with risk analyst persona."""
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.put(
            f"{SENSO_BASE}/org/brand-kit",
            headers={"X-API-Key": SENSO_KEY, "Content-Type": "application/json"},
            json={
                "brand_name": "World Token Factory",
                "brand_description": "Geospatial risk assessment platform that decomposes businesses into operational steps and quantifies risk factors with failure rates, uncertainty scores, and loss ranges.",
                "tone": "authoritative, precise, data-driven",
                "audience": "Risk officers, PE firms, infrastructure investors, insurance underwriters",
                "guidelines": "Always cite specific evidence sources. Distinguish failure_rate (probability) from uncertainty (confidence). Express loss ranges in USD. Flag knowledge gaps explicitly."
            }
        )
        return r.json() if r.status_code in (200, 202) else {"error": str(r.status_code)}


async def senso_create_risk_token_content_type() -> dict:
    """Create a RiskToken content type in Senso for structured output."""
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post(
            f"{SENSO_BASE}/org/content-types",
            headers={"X-API-Key": SENSO_KEY, "Content-Type": "application/json"},
            json={
                "name": "Risk Token",
                "description": "Structured risk assessment output with failure rate, uncertainty, and loss range",
                "template": "## Risk Assessment: {{risk_factor_name}}\n\n**Failure Rate**: {{failure_rate}}\n**Uncertainty**: {{uncertainty}}\n**Loss Range**: ${{loss_range_low}} – ${{loss_range_high}}\n\n### Summary\n{{summary}}\n\n### Knowledge Gaps\n{{gaps}}\n\n### Evidence Sources\n{{evidence_sources}}"
            }
        )
        return r.json() if r.status_code in (200, 201, 202) else {"error": str(r.status_code)}
