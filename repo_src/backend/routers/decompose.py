import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from repo_src.backend.models.business import DecomposeRequest
from repo_src.backend.agents.decomposer import decompose

router = APIRouter(prefix="/api", tags=["decompose"])


@router.post("/decompose")
async def decompose_endpoint(request: DecomposeRequest):
    async def generate():
        result = await decompose(request.description, request.max_steps)
        # Stream one step at a time
        for step in result.steps:
            yield json.dumps(step.model_dump()) + "\n"
        # Final summary line with token usage
        yield json.dumps({"business_name": result.business_name, "tokens_used": result.tokens_used, "done": True}) + "\n"

    return StreamingResponse(generate(), media_type="application/x-ndjson")
