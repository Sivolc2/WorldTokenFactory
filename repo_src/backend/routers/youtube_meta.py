from fastapi import APIRouter, HTTPException
from repo_src.backend.services.youtube import get_youtube_meta

router = APIRouter(prefix="/api", tags=["youtube"])


@router.get("/youtube-meta")
async def youtube_meta(url: str):
    if not url:
        raise HTTPException(status_code=400, detail="url parameter required")
    meta = get_youtube_meta(url)
    return meta
