from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/railtracks", tags=["railtracks"])


class RailTracksRequest(BaseModel):
    business_name: str
    risk_factor_name: str
    risk_factor_description: str
    domain: str = "general"
    lat: Optional[float] = None
    lng: Optional[float] = None


@router.get("/status")
async def railtracks_status():
    from repo_src.backend.agents.railtracks_orchestrator import RAILTRACKS_AVAILABLE
    return {"available": RAILTRACKS_AVAILABLE, "engine": "railtracks"}


@router.post("/analyse")
async def railtracks_analyse(req: RailTracksRequest):
    from repo_src.backend.agents.railtracks_orchestrator import run_railtracks_analysis
    result = await run_railtracks_analysis(
        business_name=req.business_name,
        risk_factor_name=req.risk_factor_name,
        risk_factor_description=req.risk_factor_description,
        domain=req.domain,
        lat=req.lat,
        lng=req.lng,
    )
    return result
