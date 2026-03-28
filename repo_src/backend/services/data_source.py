import os
from dataclasses import dataclass
from typing import Optional

_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_DEFAULT_DATA_PATH = os.path.normpath(os.path.join(_THIS_DIR, "..", "..", "..", "data"))
DATA_PATH = os.getenv("DATA_PATH", _DEFAULT_DATA_PATH)

DOCUMENT_EXTS = {".pdf", ".md", ".txt", ".docx", ".tif", ".tiff"}
IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".gif", ".webp"}
AUDIO_EXTS = {".mp3", ".wav", ".ogg", ".m4a"}
VIDEO_EXTS = {".mp4", ".mkv", ".webm", ".mov", ".avi"}
DATA_EXTS = {".csv", ".json", ".xlsx", ".tsv"}

@dataclass
class FileMetadata:
    filename: str
    domain: str
    type: str  # document | image | youtube | audio | data
    path: str


def _classify(filename: str) -> str:
    ext = os.path.splitext(filename)[1].lower()
    if ext == ".url":
        return "youtube"
    if ext in VIDEO_EXTS:
        return "video"
    if ext in IMAGE_EXTS:
        return "image"
    if ext in AUDIO_EXTS:
        return "audio"
    if ext in DATA_EXTS:
        return "data"
    if ext in DOCUMENT_EXTS:
        return "document"
    return "document"


def list_files(domain: str) -> list[FileMetadata]:
    domain_path = os.path.join(DATA_PATH, domain)
    if not os.path.isdir(domain_path):
        return []
    results = []
    for fname in sorted(os.listdir(domain_path)):
        full_path = os.path.join(domain_path, fname)
        if os.path.isfile(full_path) and not fname.startswith("."):
            results.append(FileMetadata(
                filename=fname,
                domain=domain,
                type=_classify(fname),
                path=full_path,
            ))
        # Scan one level of subdirectories (e.g. artifacts/)
        elif os.path.isdir(full_path) and not fname.startswith("."):
            for subfname in sorted(os.listdir(full_path)):
                subpath = os.path.join(full_path, subfname)
                if os.path.isfile(subpath) and not subfname.startswith("."):
                    results.append(FileMetadata(
                        filename=f"{fname}/{subfname}",
                        domain=domain,
                        type=_classify(subfname),
                        path=subpath,
                    ))
    return results


def read_file(domain: str, filename: str) -> str | bytes:
    path = os.path.join(DATA_PATH, domain, filename)
    if not os.path.exists(path):
        raise FileNotFoundError(f"File not found: {domain}/{filename}")
    ext = os.path.splitext(filename)[1].lower()
    if ext in IMAGE_EXTS | AUDIO_EXTS:
        with open(path, "rb") as f:
            return f.read()
    if ext == ".pdf":
        try:
            import pypdf
            reader = pypdf.PdfReader(path)
            return "\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception:
            with open(path, "rb") as f:
                return f.read()
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        return f.read()


def file_exists(domain: str, filename: str) -> bool:
    path = os.path.join(DATA_PATH, domain, filename)
    return os.path.isfile(path)


def list_domains() -> list[str]:
    if not os.path.isdir(DATA_PATH):
        return []
    return [d for d in sorted(os.listdir(DATA_PATH))
            if os.path.isdir(os.path.join(DATA_PATH, d)) and not d.startswith(".")]
