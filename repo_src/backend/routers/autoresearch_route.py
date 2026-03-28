"""
POST /api/autoresearch — streaming autoresearch loop.

Accepts a risk factor + exposure range target and streams iteration_update
events as the loop searches for evidence and re-estimates the range.

Stream format: NDJSON (one JSON object per line).

Events: search_query | search_result | evidence_found | evidence_skipped |
        iteration_update | signal | complete
"""
import json
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from repo_src.backend.autoresearch.models import AutoresearchRequest
from repo_src.backend.autoresearch import engine
from repo_src.backend.middleware.unkey_middleware import verify_api_key

router = APIRouter(prefix="/api", tags=["autoresearch"])


@router.post("/autoresearch")
async def autoresearch_endpoint(
    request: AutoresearchRequest,
    _auth: dict = Depends(verify_api_key),
):
    """
    Run the autoresearch loop and stream events back to the client.

    Example request:
    {
        "risk_factor_name": "Seismic / Geological",
        "business_context": "Gulf Coast oil operator with pipeline across Texas",
        "initial_exposure_low": 4200000,
        "initial_exposure_high": 67000000,
        "target_exposure_low": 10000000,
        "target_exposure_high": 25000000,
        "max_iterations": 6,
        "max_searches_per_iteration": 4
    }
    """
    async def generate():
        async for event in engine.run(request):
            yield json.dumps(event) + "\n"

    return StreamingResponse(generate(), media_type="application/x-ndjson")
