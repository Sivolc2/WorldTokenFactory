import httpx
import os
from fastapi import Request, HTTPException

UNKEY_API_ID = os.getenv("UNKEY_API_ID", "")
UNKEY_ROOT_KEY = os.getenv("UNKEY_ROOT_KEY", "")


async def verify_api_key(request: Request) -> dict:
    """Verify an API key via Unkey. Returns key metadata if valid.

    When UNKEY_API_ID is not set (dev mode), verification is skipped and
    all requests are considered valid — so this is always a safe dependency.
    """
    api_key = request.headers.get("X-API-Key") or request.query_params.get("api_key")
    if not api_key:
        # In dev mode (no UNKEY_API_ID), skip verification
        if not UNKEY_API_ID:
            return {"valid": True, "dev_mode": True}
        raise HTTPException(status_code=401, detail="Missing API key")

    if not UNKEY_API_ID:
        return {"valid": True, "dev_mode": True}

    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.post(
            "https://api.unkey.dev/v1/keys.verifyKey",
            json={"apiId": UNKEY_API_ID, "key": api_key}
        )
        data = r.json()
        if not data.get("valid"):
            raise HTTPException(status_code=403, detail="Invalid or expired API key")
        return data
