"""
Nexla integration for World Token Factory.
Uses Nexla REST API to manage data flows and retrieve processed datasets.
Falls back gracefully if Nexla is not configured.
"""
import os
import httpx
from typing import Optional

NEXLA_TOKEN = os.getenv("NEXLA_TOKEN", "")
NEXLA_BASE = "https://dataops.nexla.io/nexla-api"
NEXLA_PROJECT_ID = os.getenv("NEXLA_PROJECT_ID", "7796")

async def nexla_list_flows() -> dict:
    """List all data flows in the configured Nexla project."""
    if not NEXLA_TOKEN:
        return {"available": False, "error": "NEXLA_TOKEN not set"}

    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(
            f"{NEXLA_BASE}/data_flows",
            headers={"Authorization": f"Bearer {NEXLA_TOKEN}"}
        )
        if r.status_code == 200:
            return {"available": True, "flows": r.json()}
        return {"available": False, "error": f"HTTP {r.status_code}"}

async def nexla_get_project() -> dict:
    """Get project details from Nexla."""
    if not NEXLA_TOKEN:
        return {"available": False, "error": "NEXLA_TOKEN not set"}

    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(
            f"{NEXLA_BASE}/projects/{NEXLA_PROJECT_ID}",
            headers={"Authorization": f"Bearer {NEXLA_TOKEN}"}
        )
        if r.status_code == 200:
            return {"available": True, "project": r.json()}
        return {"available": False, "error": f"HTTP {r.status_code}"}

async def nexla_create_rest_connector(
    name: str,
    url: str,
    method: str = "GET",
    headers: Optional[dict] = None,
) -> dict:
    """Create a REST API connector in Nexla for geospatial data ingestion."""
    if not NEXLA_TOKEN:
        return {"available": False, "error": "NEXLA_TOKEN not set"}

    connector_config = {
        "name": name,
        "type": "rest_api",
        "config": {
            "url": url,
            "method": method,
            "headers": headers or {},
        },
        "project_id": int(NEXLA_PROJECT_ID),
    }

    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post(
            f"{NEXLA_BASE}/connectors",
            headers={
                "Authorization": f"Bearer {NEXLA_TOKEN}",
                "Content-Type": "application/json",
            },
            json=connector_config,
        )
        if r.status_code in (200, 201):
            return {"available": True, "connector": r.json()}
        return {"available": False, "error": f"HTTP {r.status_code}: {r.text[:200]}"}
