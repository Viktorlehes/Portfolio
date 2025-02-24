# app/models/wallet.py
from enum import Enum
from typing import Optional, List, Dict
from datetime import datetime
from pydantic import BaseModel
from app_v2.models.defi_position import DefiPosition

class WalletSource(str, Enum):
    ZERION = "zerion"
    BINANCE = "binance"
    COINBASE = "coinbase"
    CUSTOM = "custom"

class WalletToken(BaseModel):
    """Token position in a wallet"""
    token_id: str
    name: str
    symbol: str
    amount: float
    value_usd: float
    price_usd: float
    price_24h_change: float
    position_type: str  # e.g., spot, staked, lending
    chain: Optional[str]
    icon: Optional[str]
    last_updated: datetime
    
class UnifiedWallet(BaseModel):
    """Standardized wallet model supporting multiple sources"""
    id: str
    user_id: str
    name: str
    color: str
    risk_level: str = "Default"
    source: WalletSource
    address: Optional[str]  # Required for on-chain wallets
    tokens: List[WalletToken] = []
    defi_positions: List[DefiPosition] = []
    total_value_usd: float = 0
    total_value_assets: Optional[float]
    total_value_defi: Optional[float]
    metadata: Dict = {}  # Source-specific metadata
    is_active: bool = True
    created_at: datetime
    updated_at: datetime
    

