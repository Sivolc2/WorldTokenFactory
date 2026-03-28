import json
import uuid
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from repo_src.backend.models.business import AnalyseRequest
from repo_src.backend.services.token_counter import counter

router = APIRouter(prefix="/api", tags=["analyse"])


@router.post("/analyse")
async def analyse_endpoint(request: AnalyseRequest):
    request_id = str(uuid.uuid4())

    async def generate():
        if request.depth == 1:
            from repo_src.backend.agents.depth1 import analyse_depth1
            gen = analyse_depth1(
                request.risk_factor_id, request.risk_factor_name,
                request.business_context, request.step_context,
                request.data_domains,
            )
        elif request.depth == 2:
            from repo_src.backend.agents.depth2 import analyse_depth2
            gen = analyse_depth2(
                request.risk_factor_id, request.risk_factor_name,
                request.business_context, request.step_context,
                request.data_domains,
                feedback=request.feedback,
            )
        else:
            from repo_src.backend.agents.depth3 import analyse_depth3
            gen = analyse_depth3(
                request.risk_factor_id, request.risk_factor_name,
                request.business_context, request.step_context,
                request.data_domains,
                feedback=request.feedback,
            )

        async for event in gen:
            if event.get("event") == "complete" and event.get("result"):
                tokens = event["result"].get("tokens_used", 0)
                counter.record(request_id, tokens, request.depth)
            yield json.dumps(event) + "\n"

    return StreamingResponse(generate(), media_type="application/x-ndjson")
