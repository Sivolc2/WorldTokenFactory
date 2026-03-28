"""
Model Router for DO Gradient Serverless Inference.

Analyzes the task type and selects the optimal model from DO Gradient's catalog.
Routes based on: complexity, speed requirements, cost, and task specialization.
"""
import re
from typing import Optional

# ── Available models on DO Gradient (as of March 2026) ──────────────────────

MODELS = {
    # Tier 1: Flagship reasoning (complex analysis, synthesis)
    "openai-gpt-5.4-pro":          {"tier": "flagship", "speed": "slow",   "cost": "high",   "strengths": ["reasoning", "analysis", "synthesis"]},
    "anthropic-claude-opus-4.6":    {"tier": "flagship", "speed": "slow",   "cost": "high",   "strengths": ["reasoning", "writing", "analysis"]},
    "openai-o3":                    {"tier": "flagship", "speed": "slow",   "cost": "high",   "strengths": ["reasoning", "math", "code"]},

    # Tier 2: Strong general purpose (good balance)
    "anthropic-claude-4.6-sonnet":  {"tier": "strong",   "speed": "medium", "cost": "medium", "strengths": ["analysis", "code", "writing"]},
    "openai-gpt-5.4":              {"tier": "strong",   "speed": "medium", "cost": "medium", "strengths": ["analysis", "general", "code"]},
    "kimi-k2.5":                   {"tier": "strong",   "speed": "medium", "cost": "medium", "strengths": ["reasoning", "multilingual", "long-context"]},
    "nvidia-nemotron-3-super-120b": {"tier": "strong",   "speed": "medium", "cost": "medium", "strengths": ["reasoning", "analysis"]},

    # Tier 3: Fast and efficient (quick tasks, high throughput)
    "llama3.3-70b-instruct":       {"tier": "fast",     "speed": "fast",   "cost": "low",    "strengths": ["general", "extraction", "classification"]},
    "openai-gpt-5-mini":          {"tier": "fast",     "speed": "fast",   "cost": "low",    "strengths": ["general", "quick", "extraction"]},
    "anthropic-claude-haiku-4.5":  {"tier": "fast",     "speed": "fast",   "cost": "low",    "strengths": ["extraction", "classification", "quick"]},
    "openai-gpt-5-nano":          {"tier": "fast",     "speed": "fastest", "cost": "lowest", "strengths": ["classification", "simple", "extraction"]},
    "deepseek-r1-distill-llama-70b": {"tier": "fast",   "speed": "fast",   "cost": "low",    "strengths": ["reasoning", "math", "code"]},

    # Tier 4: Specialized
    "alibaba-qwen3-32b":          {"tier": "specialized", "speed": "fast",  "cost": "low",   "strengths": ["multilingual", "code", "extraction"]},
    "glm-5":                      {"tier": "specialized", "speed": "medium","cost": "medium", "strengths": ["multilingual", "general"]},
    "minimax-m2.5":               {"tier": "specialized", "speed": "medium","cost": "medium", "strengths": ["multilingual", "creative"]},
    "mistral-nemo-instruct-2407": {"tier": "specialized", "speed": "fast",  "cost": "low",   "strengths": ["code", "instruction-following"]},

    # Embedding models (not for chat)
    # "all-mini-lm-l6-v2", "gte-large-en-v1.5", "multi-qa-mpnet-base-dot-v1", "qwen3-embedding-0.6b"
}

# ── Task type detection ─────────────────────────────────────────────────────

TASK_PATTERNS = {
    "deep_analysis": [
        r"(?i)(synthesiz|deep.?run|comprehensive|thorough|detailed.?analysis|full.?report)",
        r"(?i)(risk.?assessment|due.?diligence|regulatory.?review|loss.?model)",
    ],
    "research_brief": [
        r"(?i)(research|brief|summariz|overview|compare|evaluate)",
        r"(?i)(depth.?2|research.?brief|read.?and.?analys)",
    ],
    "quick_scan": [
        r"(?i)(quick|scan|fast|classify|categoriz|list|extract|identify)",
        r"(?i)(depth.?1|file.?match|keyword|tag)",
    ],
    "decompose": [
        r"(?i)(decompos|break.?down|steps|process|value.?chain|workflow)",
    ],
    "geospatial": [
        r"(?i)(geospatial|satellite|weather|flood|seismic|hurricane|climate|terrain|elevation)",
        r"(?i)(lat|lng|longitude|latitude|bbox|coordinate|location.?risk)",
    ],
    "code": [
        r"(?i)(code|function|implement|debug|refactor|api|endpoint)",
    ],
    "chat": [
        r"(?i)(chat|convers|help|explain|what.?is|how.?does|tell.?me)",
    ],
}


def detect_task_type(prompt: str, system_message: str = "") -> str:
    """Detect the task type from the prompt and system message."""
    combined = f"{system_message} {prompt}"

    scores = {}
    for task_type, patterns in TASK_PATTERNS.items():
        score = sum(len(re.findall(p, combined)) for p in patterns)
        if score > 0:
            scores[task_type] = score

    if not scores:
        return "chat"  # default

    return max(scores, key=scores.get)


def route_model(
    prompt: str,
    system_message: str = "",
    prefer_speed: bool = False,
    prefer_quality: bool = False,
    task_type_override: Optional[str] = None,
) -> tuple[str, str]:
    """
    Route to the optimal DO Gradient model based on task analysis.

    Returns:
        (model_id, reason) — the model to use and why it was selected
    """
    task_type = task_type_override or detect_task_type(prompt, system_message)

    # ── Routing logic ───────────────────────────────────────────────────

    if task_type == "deep_analysis":
        if prefer_speed:
            return "anthropic-claude-4.6-sonnet", f"deep_analysis (speed mode): Sonnet balances depth + speed"
        return "openai-gpt-5.4-pro", f"deep_analysis: flagship model for comprehensive risk synthesis"

    if task_type == "research_brief":
        return "anthropic-claude-4.6-sonnet", f"research_brief: strong analysis + writing for risk briefs"

    if task_type == "quick_scan":
        return "anthropic-claude-haiku-4.5", f"quick_scan: fastest for file matching + classification"

    if task_type == "decompose":
        return "llama3.3-70b-instruct", f"decompose: efficient structured output for business decomposition"

    if task_type == "geospatial":
        if prefer_quality:
            return "openai-gpt-5.4-pro", f"geospatial (quality mode): best reasoning for spatial risk analysis"
        return "kimi-k2.5", f"geospatial: strong reasoning + long context for multi-source spatial data"

    if task_type == "code":
        return "deepseek-r1-distill-llama-70b", f"code: specialized for code reasoning tasks"

    # Default: chat / general
    if prefer_speed:
        return "openai-gpt-5-nano", f"chat (speed): ultra-fast for conversational responses"
    if prefer_quality:
        return "anthropic-claude-4.6-sonnet", f"chat (quality): best general-purpose for rich responses"
    return "llama3.3-70b-instruct", f"chat: good balance of speed + quality for general conversation"


# ── Convenience ─────────────────────────────────────────────────────────────

def get_model_info(model_id: str) -> dict:
    """Get metadata about a specific model."""
    return MODELS.get(model_id, {"tier": "unknown", "speed": "unknown", "cost": "unknown", "strengths": []})


def list_available_models() -> list[dict]:
    """List all available models with their metadata."""
    return [
        {"id": model_id, **meta}
        for model_id, meta in MODELS.items()
    ]
