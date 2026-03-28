"""
Orchestrator route — streams the master analysis pipeline to the frontend.
"""
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import json

router = APIRouter(prefix="/api/orchestrate", tags=["orchestrator"])


class OrchestrateRequest(BaseModel):
    business_name: str
    step_name: str
    risk_factor_name: str
    risk_factor_description: str
    domain: str = "oil"
    lat: Optional[float] = None
    lng: Optional[float] = None
    depth: int = 2


@router.get("/systems")
async def available_systems():
    """Check which sub-systems are active for the orchestrator."""
    from repo_src.backend.agents.orchestrator import check_systems
    return check_systems()


@router.post("/analyse")
async def orchestrate_analyse(req: OrchestrateRequest):
    """
    Run the full orchestrated risk analysis with streaming SSE events.
    Fans out to Senso, Nexla, Open-Meteo, local catalog in parallel,
    then synthesizes with the model router's selected model.
    """
    from repo_src.backend.agents.orchestrator import orchestrate_risk_assessment

    async def event_stream():
        async for event in orchestrate_risk_assessment(
            business_name=req.business_name,
            step_name=req.step_name,
            risk_factor_name=req.risk_factor_name,
            risk_factor_description=req.risk_factor_description,
            domain=req.domain,
            lat=req.lat,
            lng=req.lng,
            depth=req.depth,
        ):
            yield json.dumps(event) + "\n"

    return StreamingResponse(event_stream(), media_type="application/x-ndjson")
