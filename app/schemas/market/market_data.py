from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class USDQuote(BaseModel):
    total_market_cap: float
    total_volume_24h: float
    total_volume_24h_reported: float
    altcoin_volume_24h: float
    altcoin_volume_24h_reported: float
    altcoin_market_cap: float
    defi_volume_24h: float
    defi_volume_24h_reported: float
    defi_24h_percentage_change: float
    defi_market_cap: float
    stablecoin_volume_24h: float
    stablecoin_volume_24h_reported: float
    stablecoin_24h_percentage_change: float
    stablecoin_market_cap: float
    derivatives_volume_24h: float
    derivatives_volume_24h_reported: float
    derivatives_24h_percentage_change: float
    total_market_cap_yesterday: float
    total_volume_24h_yesterday: float
    total_market_cap_yesterday_percentage_change: float
    total_volume_24h_yesterday_percentage_change: float
    last_updated: datetime

class CryptoData(BaseModel):
    active_cryptocurrencies: int
    total_cryptocurrencies: int
    active_market_pairs: int
    active_exchanges: int
    total_exchanges: int
    eth_dominance: float
    btc_dominance: float
    eth_dominance_yesterday: float
    btc_dominance_yesterday: float
    eth_dominance_24h_percentage_change: float
    btc_dominance_24h_percentage_change: float
    defi_volume_24h: float
    defi_volume_24h_reported: float
    defi_market_cap: float
    defi_24h_percentage_change: float
    stablecoin_volume_24h: float
    stablecoin_volume_24h_reported: float
    stablecoin_market_cap: float
    stablecoin_24h_percentage_change: float
    derivatives_volume_24h: float
    derivatives_volume_24h_reported: float
    derivatives_24h_percentage_change: float
    quote: dict[str, USDQuote]
    last_updated: datetime

class Status(BaseModel):
    timestamp: datetime
    error_code: int
    error_message: Optional[str] = None  # Made optional
    elapsed: int
    credit_count: int
    notice: Optional[str] = None  # Made optional

class MarketDataResponse(BaseModel):
    status: Status
    data: CryptoData