# app/models/token.py
from typing import Optional, Dict, List
from datetime import datetime
from pydantic import BaseModel, Field

class TokenPrice(BaseModel):
    """Price data from cmc"""
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
    last_updated: datetime

class TokenNetFlow(BaseModel):
    """Exchange flow data from Coinglass"""
    net_flow_1h: float = 0
    net_flow_4h: float = 0
    net_flow_12h: float = 0
    net_flow_24h: float = 0
    net_flow_1w: float = 0
    last_updated: datetime

class TokenImplementation(BaseModel):
    """Chain-specific token implementation details"""
    chain_id: str
    address: Optional[str]
    decimals: int

class Tags(BaseModel):
    slug: str
    name: str
    category: str 
    
class ExternalLinks(BaseModel):
    type: str
    name: str
    url: str

class UnifiedToken(BaseModel):
    """Standardized token model combining data from all sources"""
    id: str = Field(..., description="Unique identifier")
    name: str
    symbol: str
    slug: str
    cmc_id: int
    cg_id: Optional[str] = None
    zerion_id: Optional[str] = None
    
    # Core token data
    implementations: Optional[List[TokenImplementation]] = None
    total_supply: Optional[float] = None
    circulating_supply: Optional[float] = None
    max_supply: Optional[float] = None
    
    # Price and market data
    price_data: TokenPrice
    net_flow_data: Optional[TokenNetFlow] = None
    
    # Metadata
    tags: Optional[List[Tags]] = []
    description: Optional[str] = None
    logo_url: Optional[str] = None
    external_links: Optional[List[ExternalLinks]] = None
    
    # Status fields
    is_active: bool = True
    rank: Optional[int] = None
    zerion_last_updated: Optional[datetime] = None
    last_active: datetime
    created_at: datetime
    updated_at: datetime