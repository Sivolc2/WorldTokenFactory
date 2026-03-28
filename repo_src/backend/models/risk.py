from pydantic import BaseModel
from typing import Optional, Literal

class RiskFactor(BaseModel):
    id: str
    name: str
    description: str
    initial_metrics: Optional["RiskMetrics"] = None

class RiskMetrics(BaseModel):
    failure_rate: float
    uncertainty: float
    loss_range_low: int
    loss_range_high: int
    loss_range_note: str

class Artifact(BaseModel):
    filename: str
    domain: str
    type: Literal["document", "image", "youtube", "audio", "video", "data"]
    relevance: str
    url: Optional[str] = None

class AnalysisResult(BaseModel):
    risk_factor_id: str
    summary: str
    gaps: list[str]
    metrics: RiskMetrics
    artifacts: list[Artifact]
    tokens_used: int
    depth: int

class StreamEvent(BaseModel):
    event: Literal["step", "file_found", "signal", "complete", "error", "token_update"]
    text: Optional[str] = None
    filename: Optional[str] = None
    domain: Optional[str] = None
    result: Optional[AnalysisResult] = None
    tokens: Optional[int] = None  # only on "token_update"
