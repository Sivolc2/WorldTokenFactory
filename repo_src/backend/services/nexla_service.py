"""
Nexla integration for World Token Factory.
Uses Nexla REST API to manage data flows and retrieve processed datasets.
Falls back gracefully if Nexla is not configured.

Confirmed working endpoints (2026-03-28):
  - POST   /data_sources         (only "name" required; "config" field is INVALID)
  - GET    /data_sources         (list all sources)
  - GET    /data_sources/{id}    (get single source)
  - PATCH  /data_sources/{id}    (update source; can set source_config dict)
  - POST   /data_sources/{id}/api_keys  (generate API key for push ingest)
  - POST   /flows                (create full flow: source + dataset in one call)
  - GET    /flows                (list flows)
  - GET    /data_sets            (list datasets)
  - GET    /projects/{id}        (get project)

NOTE: "connector_type_id", "config", and "rest_api" source_type are NOT valid fields.
Only "name" is required for data source creation. source_type defaults to "s3".
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
            f"{NEXLA_BASE}/flows",
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


async def nexla_list_data_sources() -> dict:
    """List all data sources."""
    if not NEXLA_TOKEN:
        return {"available": False, "error": "NEXLA_TOKEN not set"}

    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(
            f"{NEXLA_BASE}/data_sources",
            headers={"Authorization": f"Bearer {NEXLA_TOKEN}"}
        )
        if r.status_code == 200:
            return {"available": True, "data_sources": r.json()}
        return {"available": False, "error": f"HTTP {r.status_code}"}


async def nexla_create_data_source(
    name: str,
    description: Optional[str] = None,
    source_config: Optional[dict] = None,
    ingest_method: str = "API",
    source_format: str = "JSON",
) -> dict:
    """
    Create a Nexla data source.

    Only "name" is required. The API accepts a flat structure — do NOT use
    a nested "config" key (rejected as additional property).

    source_type defaults to "s3" on the server side regardless of what you pass
    for rest_api — only supported types are accepted.
    For REST/webhook ingestion, use ingest_method="API" (default) and set
    source_config to a dict with URL/auth metadata for documentation purposes.
    """
    if not NEXLA_TOKEN:
        return {"available": False, "error": "NEXLA_TOKEN not set"}

    payload: dict = {"name": name, "ingest_method": ingest_method, "source_format": source_format}
    if description:
        payload["description"] = description
    if source_config:
        payload["source_config"] = source_config

    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post(
            f"{NEXLA_BASE}/data_sources",
            headers={
                "Authorization": f"Bearer {NEXLA_TOKEN}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        if r.status_code in (200, 201):
            return {"available": True, "data_source": r.json()}
        return {"available": False, "error": f"HTTP {r.status_code}: {r.text[:200]}"}


async def nexla_generate_api_key(data_source_id: int) -> dict:
    """
    Generate an API key for push ingest on a data source.
    Returns the api_key string used to push records to the source.
    """
    if not NEXLA_TOKEN:
        return {"available": False, "error": "NEXLA_TOKEN not set"}

    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post(
            f"{NEXLA_BASE}/data_sources/{data_source_id}/api_keys",
            headers={
                "Authorization": f"Bearer {NEXLA_TOKEN}",
                "Content-Type": "application/json",
            },
            json={},
        )
        if r.status_code in (200, 201):
            return {"available": True, "api_key_info": r.json()}
        return {"available": False, "error": f"HTTP {r.status_code}: {r.text[:200]}"}


async def nexla_create_flow(name: str, description: Optional[str] = None) -> dict:
    """
    Create a complete Nexla flow (data source + dataset in one call).
    Returns the full flow graph with data_sources, data_sets, and flows arrays.
    """
    if not NEXLA_TOKEN:
        return {"available": False, "error": "NEXLA_TOKEN not set"}

    payload: dict = {"name": name}
    if description:
        payload["description"] = description

    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post(
            f"{NEXLA_BASE}/flows",
            headers={
                "Authorization": f"Bearer {NEXLA_TOKEN}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        if r.status_code in (200, 201):
            return {"available": True, "flow": r.json()}
        return {"available": False, "error": f"HTTP {r.status_code}: {r.text[:200]}"}


async def nexla_update_data_source(
    data_source_id: int,
    name: Optional[str] = None,
    description: Optional[str] = None,
    source_config: Optional[dict] = None,
) -> dict:
    """Update a Nexla data source via PATCH."""
    if not NEXLA_TOKEN:
        return {"available": False, "error": "NEXLA_TOKEN not set"}

    payload: dict = {}
    if name:
        payload["name"] = name
    if description is not None:
        payload["description"] = description
    if source_config is not None:
        payload["source_config"] = source_config

    if not payload:
        return {"available": False, "error": "No fields to update"}

    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.patch(
            f"{NEXLA_BASE}/data_sources/{data_source_id}",
            headers={
                "Authorization": f"Bearer {NEXLA_TOKEN}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        if r.status_code in (200, 201):
            return {"available": True, "data_source": r.json()}
        return {"available": False, "error": f"HTTP {r.status_code}: {r.text[:200]}"}


async def nexla_push_records(
    source_name: str,
    records: list,
) -> dict:
    """
    Push a list of JSON records into a Nexla data source for ingestion.

    Workflow:
      1. Create the data source (idempotent by name — Nexla creates a new one if it
         doesn't exist; the caller can deduplicate by checking the returned id).
      2. Generate an API key for push ingest on that source.
      3. POST the records to the Nexla ingest endpoint.

    Returns a summary dict with available, source_id, records_pushed, and any error.
    """
    if not NEXLA_TOKEN:
        return {"available": False, "error": "NEXLA_TOKEN not set"}

    # Step 1: Create (or re-create) the data source
    create_result = await nexla_create_data_source(
        name=source_name,
        description=f"WTF live data push — {source_name}",
        ingest_method="API",
        source_format="JSON",
    )
    if not create_result.get("available"):
        return {"available": False, "error": f"create_data_source failed: {create_result.get('error')}"}

    ds = create_result.get("data_source", {})
    source_id = ds.get("id") if isinstance(ds, dict) else None
    if not source_id:
        return {"available": False, "error": f"No id in data_source response: {ds}"}

    # Step 2: Generate API key for push ingest
    key_result = await nexla_generate_api_key(source_id)
    if not key_result.get("available"):
        return {"available": False, "error": f"generate_api_key failed: {key_result.get('error')}"}

    api_key_info = key_result.get("api_key_info", {})
    api_key = api_key_info.get("api_key") or api_key_info.get("key") or api_key_info.get("token")
    if not api_key:
        return {"available": False, "error": f"No api_key in response: {api_key_info}"}

    # Step 3: Push records to ingest endpoint
    ingest_url = f"https://ingest.nexla.io/ingest/{source_id}"
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            r = await client.post(
                ingest_url,
                headers={
                    "X-API-Key": api_key,
                    "Content-Type": "application/json",
                },
                json=records if isinstance(records, list) else [records],
            )
            if r.status_code in (200, 201, 202, 204):
                return {
                    "available": True,
                    "source_id": source_id,
                    "records_pushed": len(records),
                    "ingest_status": r.status_code,
                }
            return {
                "available": False,
                "source_id": source_id,
                "error": f"Ingest HTTP {r.status_code}: {r.text[:200]}",
            }
        except Exception as e:
            return {"available": False, "source_id": source_id, "error": str(e)}


# Keep old name for backward compatibility — now calls create_data_source correctly
async def nexla_create_rest_connector(
    name: str,
    url: str,
    method: str = "GET",
    headers: Optional[dict] = None,
) -> dict:
    """
    Create a data source configured for REST API ingestion.

    Note: Nexla's free tier does not support "rest_api" as a connector_type.
    This creates an API-ingest source with source_config documenting the REST
    endpoint. The actual pulling must be done externally or via Express assistant.
    """
    return await nexla_create_data_source(
        name=name,
        description=f"REST source: {method} {url}",
        source_config={
            "url": url,
            "method": method,
            "headers": headers or {},
        },
        ingest_method="API",
    )
