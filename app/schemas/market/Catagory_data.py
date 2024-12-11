from pydantic import BaseModel, RootModel
from typing import List
from datetime import datetime

class CategoryData(BaseModel):
    id: str
    name: str
    title: str
    description: str
    num_tokens: int
    avg_price_change: float
    market_cap: float
    market_cap_change: float
    volume: float
    volume_change: float
    last_updated: datetime

class CategoryResponse(RootModel):
    """A list of category data objects"""
    root: List[CategoryData]

    def __iter__(self):
        return iter(self.root)

    def __getitem__(self, item):
        return self.root[item]