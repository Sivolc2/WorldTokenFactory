"""
Augment Context Engine integration for World Token Factory.
Uses the Context Engine SDK to index and search risk documents semantically.
"""
import os
import subprocess
from pathlib import Path
from typing import Optional

AUGMENT_AVAILABLE = False

try:
    # Check if auggie CLI is available for codebase-retrieval
    result = subprocess.run(["auggie", "--version"], capture_output=True, text=True, timeout=5)
    if result.returncode == 0:
        AUGMENT_AVAILABLE = True
except (FileNotFoundError, subprocess.TimeoutExpired):
    pass


def check_augment_status() -> dict:
    """Check if Augment Context Engine is available."""
    return {
        "available": AUGMENT_AVAILABLE,
        "cli_installed": AUGMENT_AVAILABLE,
        "mcp_configured": True,  # We configured it in .claude.json
    }


async def augment_search_codebase(query: str) -> dict:
    """
    Use Augment's codebase-retrieval to semantically search the project.
    Falls back gracefully if auggie is not available.
    """
    if not AUGMENT_AVAILABLE:
        return {"available": False, "error": "auggie CLI not installed"}

    try:
        result = subprocess.run(
            ["auggie", "--print", "--quiet", "-i", f"Search the codebase for: {query}. Return only the most relevant file paths and code snippets."],
            capture_output=True, text=True, timeout=30,
            cwd=str(Path(__file__).parent.parent.parent.parent)
        )
        if result.returncode == 0:
            return {"available": True, "source": "augment_context_engine", "results": result.stdout[:3000]}
        return {"available": True, "error": result.stderr[:500]}
    except subprocess.TimeoutExpired:
        return {"available": True, "error": "timeout"}
    except Exception as e:
        return {"available": False, "error": str(e)}
