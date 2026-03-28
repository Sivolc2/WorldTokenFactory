from fastapi import APIRouter

router = APIRouter(prefix="/api/nexla", tags=["nexla"])

@router.get("/status")
async def nexla_status():
    from repo_src.backend.services.nexla_service import nexla_get_project
    return await nexla_get_project()

@router.get("/flows")
async def nexla_flows():
    from repo_src.backend.services.nexla_service import nexla_list_flows
    return await nexla_list_flows()
