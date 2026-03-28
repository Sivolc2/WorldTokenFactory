"""Autoresearch request/response models."""
from pydantic import BaseModel
from typing import Optional


class AutoresearchRequest(BaseModel):
    risk_factor_name: str
    business_context: str
    initial_exposure_low: int = 0
    initial_exposure_high: int = 0
    target_exposure_low: Optional[int] = None
    target_exposure_high: Optional[int] = None
    max_iterations: int = 6
    max_searches_per_iteration: int = 4
