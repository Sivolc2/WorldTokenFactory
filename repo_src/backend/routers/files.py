from fastapi import APIRouter
from repo_src.backend.services.data_source import list_files, list_domains

router = APIRouter(prefix="/api", tags=["files"])


@router.get("/files")
async def get_files():
    domains = list_domains()
    result = {}
    for domain in domains:
        files = list_files(domain)
        grouped: dict[str, list[str]] = {}
        for f in files:
            grouped.setdefault(f.type + "s", []).append(f.filename)
        result[domain] = grouped
    return {"domains": result}
