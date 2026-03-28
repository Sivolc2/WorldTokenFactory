from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse
from repo_src.backend.services.data_source import list_files, list_domains, read_file, file_exists

router = APIRouter(prefix="/api", tags=["files"])


@router.get("/document")
async def get_document(domain: str, file: str):
    # Reject path traversal
    if ".." in domain or ".." in file or file.startswith("/"):
        raise HTTPException(status_code=400, detail="Invalid path")
    if not file_exists(domain, file):
        raise HTTPException(status_code=404, detail="File not found")
    content = read_file(domain, file)
    if isinstance(content, bytes):
        raise HTTPException(status_code=400, detail="Binary file")
    return PlainTextResponse(content)


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
