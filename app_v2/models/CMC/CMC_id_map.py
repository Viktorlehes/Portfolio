from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from bson import ObjectId

class Platform(BaseModel):
    id: int
    name: str
    symbol: str
    slug: str
    token_address: str

class CMC_ID_DOC(BaseModel):
    _id: ObjectId
    id: int
    rank: int
    name: str
    symbol: str
    slug: str
    is_active: int
    status: int
    first_historical_data: datetime
    last_historical_data: datetime
    platform: Optional[Platform]