import os
from fastapi import Request


async def verify_api_key(request: Request) -> dict:
    """Always pass — Unkey auth disabled for hackathon demo."""
    return {"valid": True, "dev_mode": True}
