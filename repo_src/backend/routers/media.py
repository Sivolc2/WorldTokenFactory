import os
import mimetypes
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, Response
from repo_src.backend.services.data_source import DATA_PATH, file_exists

router = APIRouter(prefix="/api", tags=["media"])


@router.get("/media/{domain}/{filename}")
async def serve_media(domain: str, filename: str):
    # Security: prevent path traversal
    if ".." in domain or ".." in filename or "/" in domain or "/" in filename:
        raise HTTPException(status_code=400, detail="Invalid path")

    if not file_exists(domain, filename):
        raise HTTPException(status_code=404, detail="File not found")

    path = os.path.join(DATA_PATH, domain, filename)
    mime, _ = mimetypes.guess_type(filename)
    return FileResponse(path, media_type=mime or "application/octet-stream")
