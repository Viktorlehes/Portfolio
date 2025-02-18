from pydantic import BaseModel
from typing import List, Optional

class ExchangeMarketData(BaseModel):
    symbol: str
    exName: str
    price: float
    priceChange24h: float
    priceChangePercent24h: float
    volUsd24h: float
    buyVolUsd24h: float
    sellVolUsd24h: float
    volUsdChange24h: float
    volUsdChangePercent24h: float
    flowsUsd24h: float
    priceChange12h: float
    priceChangePercent12h: float
    volUsd12h: float
    buyVolUsd12h: float
    sellVolUsd12h: float
    volUsdChange12h: float
    volUsdChangePercent12h: float
    flowsUsd12h: float
    priceChange4h: float
    priceChangePercent4h: float
    volUsd4h: float
    buyVolUsd4h: float
    sellVolUsd4h: float
    volUsdChange4h: float
    volUsdChangePercent4h: float
    flowsUsd4h: float
    priceChange1h: float
    priceChangePercent1h: float
    volUsd1h: float
    buyVolUsd1h: float
    sellVolUsd1h: float
    volUsdChange1h: float
    volUsdChangePercent1h: float
    flowsUsd1h: float
    priceChange1w: float
    priceChangePercent1w: float
    volUsd1w: float
    buyVolUsd1w: float
    sellVolUsd1w: float
    volUsdChange1w: float
    volUsdChangePercent1w: float
    flowsUsd1w: float

class ExchangeResponse(BaseModel):
    code: str
    msg: str
    data: List[ExchangeMarketData]
    success: bool