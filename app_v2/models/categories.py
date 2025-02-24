from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

class BaseCategoryData(BaseModel):
    id: str
    name: str
    market_cap: float
    volume: float
    volume_change: float
    avg_price_change: float
    last_updated: datetime

class DefaultCategory(BaseCategoryData):
    title: str
    description: str
    market_cap_change: float
    num_tokens: int

class CustomCategory(BaseCategoryData):
    tokens: List[int]  # List of token IDs and symbols
    owner_id: str

class UserCategoryPreference(BaseModel):
    user_id: str
    default_category_ids: List[str]
    custom_category_ids: List[str]
    last_active: datetime
    
class CustomCategoryCreation(BaseModel):
    user_id: str
    tokens: List[int]
    name: str
    
class UserCategories(BaseModel):
    default_categories: Optional[List[DefaultCategory]]
    custom_categories: Optional[List[CustomCategory]]