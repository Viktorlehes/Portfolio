from typing import List
from pydantic import BaseModel

class OpenInterestData(BaseModel):
    exchange: str
    symbol: str
    openInterest: float
    openInterestAmount: float
    openInterestByCoinMargin: float
    openInterestByStableCoinMargin: float
    openInterestAmountByCoinMargin: float
    openInterestAmountByStableCoinMargin: float
    openInterestChangePercent5m: float
    openInterestChangePercent15m: float
    openInterestChangePercent30m: float
    openInterestChangePercent1h: float
    openInterestChangePercent4h: float
    openInterestChangePercent24h: float

class OpenInterestResponse(BaseModel):
    code: str
    msg: str
    data: List[OpenInterestData]
    success: bool