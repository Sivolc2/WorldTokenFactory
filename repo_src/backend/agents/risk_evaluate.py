"""
Fixed evaluator — analogous to autoresearch's prepare.py / val_bpb.
The uncertainty_score is the metric the research loop tries to minimize.
"""
from repo_src.backend.models.risk import RiskMetrics

# Represents total ignorance before any research.
# Set to $1B so scores map naturally to 0.0–1.0 for typical business risks.
_INITIAL_PRIOR_USD = 1_000_000_000


def uncertainty_score(metrics: RiskMetrics) -> float:
    """
    Lower is better.
    Analogous to val_bpb: normalized width of the loss range relative to the prior.
    0.0 = perfect certainty   1.0 = maximum uncertainty (width ≥ $1B)
    """
    width = uncertainty_usd(metrics)
    return min(1.0, width / _INITIAL_PRIOR_USD)


def uncertainty_usd(metrics: RiskMetrics) -> int:
    """Absolute width of the loss range — the raw uncertainty in dollars."""
    return max(0, metrics.loss_range_high - metrics.loss_range_low)


def format_score(score: float) -> str:
    """Human-readable version for log / tsv output."""
    return f"{score:.4f}"
