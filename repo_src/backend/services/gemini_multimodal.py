"""
Gemini multimodal indexing service.

Sends a mixed bag of files — video, GeoTIFF rasters, satellite imagery, PDFs, CSV,
and plain text — to Gemini in a single context window, exploiting its native
multimodal understanding to surface risk signals that text-only scanning misses.

Large files (>5 MB) are uploaded via the Gemini Files API and cached within the
process lifetime to avoid redundant uploads across multiple analyses.
"""

import asyncio
import os
import time

from repo_src.backend.services.data_source import FileMetadata

# ── MIME types Gemini natively understands ───────────────────────────────────
GEMINI_MIME: dict[str, str] = {
    # Documents
    ".pdf":  "application/pdf",
    # Images (also covers GeoTIFF rasters)
    ".png":  "image/png",
    ".jpg":  "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif":  "image/gif",
    ".webp": "image/webp",
    ".tif":  "image/tiff",
    ".tiff": "image/tiff",
    # Video
    ".mp4":  "video/mp4",
    ".webm": "video/webm",
    ".mov":  "video/quicktime",
    ".avi":  "video/avi",
    ".mpg":  "video/mpeg",
    ".mpeg": "video/mpeg",
    # Audio
    ".mp3":  "audio/mp3",
    ".wav":  "audio/wav",
    ".ogg":  "audio/ogg",
    ".m4a":  "audio/aac",
}

TEXT_EXTS = {".txt", ".md", ".csv", ".json", ".tsv"}

# Files ≤ this are sent inline as base64; larger ones go via the Files API.
INLINE_LIMIT_BYTES = 5 * 1024 * 1024  # 5 MB

# Process-level cache so we don't re-upload the same large file in one session.
_upload_cache: dict[str, str] = {}  # absolute_path -> Gemini file URI


# ── Internal helpers ─────────────────────────────────────────────────────────

def _do_upload(gemini_client, path: str, mime: str, display_name: str) -> str | None:
    """
    Blocking: upload *path* to the Gemini Files API and wait until ACTIVE.
    Returns the file URI, or None on failure.
    """
    from google.genai import types

    if path in _upload_cache:
        return _upload_cache[path]

    try:
        uploaded = gemini_client.files.upload(
            file=path,
            config=types.UploadFileConfig(mime_type=mime, display_name=display_name),
        )
        # Videos need a few seconds to process; poll until state == ACTIVE.
        for _ in range(30):
            info = gemini_client.files.get(name=uploaded.name)
            if info.state.name == "ACTIVE":
                break
            time.sleep(2)
        uri = uploaded.uri
        _upload_cache[path] = uri
        return uri
    except Exception as exc:
        print(f"[multimodal] upload failed for {display_name}: {exc}")
        return None


def _build_parts(gemini_client, files: list[FileMetadata], loop) -> list:
    """
    Build the list of Gemini content Parts for the given files.
    Each file gets a label + its content representation.
    """
    from google.genai import types

    parts: list = []

    for f in files:
        ext = os.path.splitext(f.filename)[1].lower()
        path = f.path
        if not os.path.exists(path):
            continue

        label = f"\n--- {f.domain}/{f.filename} ---\n"

        # ── Plain text / structured data ──────────────────────────────────
        if ext in TEXT_EXTS:
            try:
                with open(path, "r", encoding="utf-8", errors="replace") as fh:
                    text = fh.read(8_000)  # cap per-file to keep prompt lean
                parts.append(types.Part.from_text(label + text))
            except Exception:
                pass
            continue

        mime = GEMINI_MIME.get(ext)
        if not mime:
            # Unknown format — skip silently
            continue

        file_size = os.path.getsize(path)
        parts.append(types.Part.from_text(label))

        if file_size <= INLINE_LIMIT_BYTES:
            # Small enough to embed inline as base64
            with open(path, "rb") as fh:
                data = fh.read()
            parts.append(types.Part.from_bytes(data=data, mime_type=mime))
        else:
            # Large file — upload via Files API (blocking call, run in executor)
            uri = loop.run_until_complete(
                asyncio.get_event_loop().run_in_executor(
                    None, _do_upload, gemini_client, path, mime, f.filename
                )
            ) if not asyncio.iscoroutinefunction(_do_upload) else None

            # Simpler synchronous path (called from within executor already):
            uri = _do_upload(gemini_client, path, mime, f.filename)
            if uri:
                parts.append(types.Part.from_uri(file_uri=uri, mime_type=mime))
            else:
                parts.append(types.Part.from_text(f"(upload failed — {f.filename} could not be processed)"))

    return parts


# ── Public API ───────────────────────────────────────────────────────────────

async def multimodal_scan(
    gemini_client,
    files: list[FileMetadata],
    risk_factor_name: str,
    business_context: str,
    model: str = "gemini-2.0-flash",
) -> str:
    """
    Send *files* (mixed types: video, GeoTIFF, satellite images, PDFs, text)
    to Gemini in one multimodal prompt and return a structured findings string.

    Raises no exceptions — returns an error string on failure so callers can
    degrade gracefully without crashing the stream.
    """
    from google.genai import types

    if not files:
        return "(no multimodal files to scan)"

    loop = asyncio.get_event_loop()
    parts: list = []

    for f in files:
        ext = os.path.splitext(f.filename)[1].lower()
        path = f.path
        if not os.path.exists(path):
            continue

        label = f"\n--- {f.domain}/{f.filename} ---\n"

        if ext in TEXT_EXTS:
            try:
                with open(path, "r", encoding="utf-8", errors="replace") as fh:
                    text = fh.read(8_000)
                parts.append(types.Part.from_text(label + text))
            except Exception:
                pass
            continue

        mime = GEMINI_MIME.get(ext)
        if not mime:
            continue

        file_size = os.path.getsize(path)
        parts.append(types.Part.from_text(label))

        if file_size <= INLINE_LIMIT_BYTES:
            with open(path, "rb") as fh:
                data = fh.read()
            parts.append(types.Part.from_bytes(data=data, mime_type=mime))
        else:
            # Offload blocking upload to thread pool
            uri = await loop.run_in_executor(
                None, _do_upload, gemini_client, path, mime, f.filename
            )
            if uri:
                parts.append(types.Part.from_uri(file_uri=uri, mime_type=mime))
            else:
                parts.append(types.Part.from_text(
                    f"(large file unavailable: {f.filename})"
                ))

    if not parts:
        return "(no files were processable by Gemini multimodal)"

    # ── Analysis query ────────────────────────────────────────────────────────
    parts.append(types.Part.from_text(
        f"\n\n"
        f"Risk factor under assessment: **{risk_factor_name}**\n"
        f"Business context: {business_context}\n\n"
        "You have received a cross-modal set of evidence: video footage, "
        "geospatial DEM rasters, satellite/aerial images, PDFs, and structured data. "
        "Analyse ALL of them together and answer:\n\n"
        "1. **Visual & spatial signals** — what do the non-text sources (video, images, "
        "GeoTIFF elevation/terrain models) reveal that text documents cannot?\n"
        "2. **Cross-source corroboration** — where do multiple modalities agree or conflict?\n"
        "3. **Quantifiable observations** — specific measurements, dates, counts, or "
        "geographic extents that can anchor a loss estimate.\n"
        "4. **Residual gaps** — what would a site visit, higher-resolution imagery, or "
        "additional data reduce uncertainty about?\n\n"
        "Be specific and concise. Return plain text (no markdown headers). "
        "Focus only on evidence directly relevant to the stated risk factor."
    ))

    try:
        response = await loop.run_in_executor(
            None,
            lambda: gemini_client.models.generate_content(
                model=model,
                contents=parts,
            ),
        )
        return response.text or "(empty response from Gemini multimodal)"
    except Exception as exc:
        print(f"[multimodal] generate_content failed: {exc}")
        return f"(multimodal scan error: {exc})"


def select_multimodal_files(
    all_domain_files: list[FileMetadata],
    keyword_matched: list[FileMetadata],
    max_files: int = 6,
) -> list[FileMetadata]:
    """
    Choose which files to send to the multimodal scanner.

    Strategy:
    - Always include keyword-matched visual/geo files from depth-1.
    - Backfill with any domain-level images/GeoTIFFs not already included
      (since filename keywords can't capture image/video content).
    - Cap at *max_files* to control latency and cost.
    """
    VISUAL_TYPES = {"image", "video", "audio"}

    matched_paths = {f.path for f in keyword_matched}

    # Priority 1: keyword-matched visual files
    selected = [f for f in keyword_matched if f.type in VISUAL_TYPES]

    # Priority 2: all domain-level geo images / videos not already selected
    for f in all_domain_files:
        if len(selected) >= max_files:
            break
        if f.type in VISUAL_TYPES and f.path not in matched_paths:
            selected.append(f)
            matched_paths.add(f.path)

    return selected[:max_files]
