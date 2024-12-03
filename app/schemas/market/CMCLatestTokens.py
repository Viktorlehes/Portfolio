from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class Status(BaseModel):
    timestamp: datetime
    error_code: int
    error_message: Optional[str]
    elapsed: int
    credit_count: int
    notice: Optional[str]

class Platform(BaseModel):
    id: int
    name: str
    symbol: str
    slug: str
    token_address: str

class Token(BaseModel):
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

class CMCLatestTokens(BaseModel):
    status: Status
    data: List[Token]