import re
import json
from typing import Optional
from urllib.parse import urlparse, parse_qs
from urllib.request import urlopen
from urllib.error import URLError


def extract_video_id(url: str) -> Optional[str]:
    try:
        parsed = urlparse(url.strip())
        if parsed.hostname in ("youtu.be",):
            return parsed.path.lstrip("/")
        if parsed.hostname in ("www.youtube.com", "youtube.com"):
            qs = parse_qs(parsed.query)
            if "v" in qs:
                return qs["v"][0]
        return None
    except Exception:
        return None


def get_youtube_meta(url: str) -> dict:
    video_id = extract_video_id(url)
    thumbnail_url = None
    if video_id:
        thumbnail_url = f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"

    title = None
    try:
        oembed_url = f"https://www.youtube.com/oembed?url={url}&format=json"
        with urlopen(oembed_url, timeout=5) as resp:
            data = json.loads(resp.read().decode())
            title = data.get("title")
    except Exception:
        title = f"YouTube video {video_id}" if video_id else "YouTube video"

    return {
        "title": title or "YouTube video",
        "thumbnail_url": thumbnail_url,
        "url": url.strip(),
    }
