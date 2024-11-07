from typing import List, Optional
from pydantic import BaseModel

class Tag(BaseModel):
    slug: str
    name: str
    category: str

class Platform(BaseModel):
    id: int
    name: str
    symbol: str
    slug: str
    token_address: str

class USDQuote(BaseModel):
    price: float
    volume_24h: float
    volume_change_24h: float
    percent_change_1h: float
    percent_change_24h: float
    percent_change_7d: float
    percent_change_30d: float
    percent_change_60d: float
    percent_change_90d: float
    market_cap: float
    market_cap_dominance: float
    fully_diluted_market_cap: float
    tvl: Optional[float]
    last_updated: str

class FullCMCToken(BaseModel):
    _id: dict
    id: int
    name: str
    symbol: str
    slug: str
    num_market_pairs: int
    date_added: str
    tags: List[Tag]
    max_supply: Optional[float]
    circulating_supply: float
    total_supply: float
    platform: Optional[Platform]
    is_active: int
    infinite_supply: bool
    cmc_rank: int
    is_fiat: int
    self_reported_circulating_supply: Optional[float]
    self_reported_market_cap: Optional[float]
    tvl_ratio: Optional[float]
    last_updated: str
    quote: dict[str, USDQuote]