from pydantic import BaseModel
from typing import List
from datetime import datetime

class CustomCategoryTokens(BaseModel):
    id: int
    symbol: str

class CustomCategory(BaseModel):
    id: str
    name: str
    num_tokens: int
    market_cap: float
    market_cap_change: float
    volume: float
    volume_change: float
    tokens_ids: List[CustomCategoryTokens]
    last_updated: datetime
