from pydantic import BaseModel
from typing import Optional
from repo_src.backend.models.risk import RiskFactor

class Step(BaseModel):
    id: str
    name: str
    description: str
    position: int
    risk_factors: list[RiskFactor]

class DecomposeRequest(BaseModel):
    description: str
    max_steps: int = 5

class DecomposeResponse(BaseModel):
    business_name: str
    steps: list[Step]
    tokens_used: int

class AnalyseRequest(BaseModel):
    risk_factor_id: str
    risk_factor_name: str
    business_context: str
    step_context: str
    depth: int = 1
    data_domains: list[str] = ["oil", "geo", "shared"]
