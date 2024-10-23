from pydantic import BaseModel
from datetime import datetime

class Token(BaseModel):
    id: int
    symbol: str
    name: str
    value: float
    price: float
    amount: float
    change24h: float
    last_updated: datetime
