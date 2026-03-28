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
