import os
import mimetypes
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from repo_src.backend.services.data_source import DATA_PATH

router = APIRouter(prefix="/api", tags=["media"])


@router.get("/media/{domain}/{file_path:path}")
async def serve_media(domain: str, file_path: str):
    # Security: prevent path traversal
    parts = [domain] + file_path.split("/")
    if any(".." in p or p.startswith(".") or p == "" for p in parts):
        raise HTTPException(status_code=400, detail="Invalid path")

    path = os.path.join(DATA_PATH, domain, *file_path.split("/"))
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="File not found")

    filename = os.path.basename(file_path)
    mime, _ = mimetypes.guess_type(filename)
    return FileResponse(path, media_type=mime or "application/octet-stream")
