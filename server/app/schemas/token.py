from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class Token(BaseModel):
    id: str
    symbol: str
    name: str
    value: float
    price: float
    amount: float
    change24h: float
    position_type: str
    chain: str
    last_updated: datetime
    zerion_id: Optional[bool] = False
    coingecko_id: Optional[bool] = False