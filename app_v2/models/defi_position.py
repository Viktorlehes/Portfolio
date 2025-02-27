# app/models/token.py
from typing import Optional, Dict, List
from datetime import datetime
from pydantic import BaseModel, Field

class PositionPriceData(BaseModel):
    """Unified price data from multiple sources"""
    current_value: float
    current_price: float
    price_change_24h: Optional[float]
    percent_change_24h: float

class PositionQuantityData(BaseModel):
    """Position Quantity Data"""
    int: str
    decimals: float
    float: float
    numeric: str

class TokenImplementation(BaseModel):
    """Chain-specific token implementation details"""
    chain_id: str
    address: Optional[str]
    decimals: int

class DefiPosition(BaseModel):
    """Standardized Position model combining data from all sources"""
    id: str = Field(..., description="Unique identifier")
    name: str
    symbol: str
    position_name: str
    protocol: str
    chain: str
    position_type: str
    cmc_id: Optional[int] = None
    zerion_id: Optional[str] = None
    coingecko_id: Optional[str] = None
    
    # Core token data
    implementatioxns: List[TokenImplementation]
    
    # Price and market data
    price_data: PositionPriceData
    quantity: PositionQuantityData
    
    # Metadata
    icon: Optional[str]
    protocol_id: Optional[str]
    protocol_link: Optional[str]
    protocol_icon: Optional[str]
    protocol_chain: Optional[str]
    dapp: Optional[str]
    
    # Status fields
    updated_at: datetime