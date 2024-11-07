from enum import Enum
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Union
from datetime import datetime
from .token import Token

# Enums for different types
class PositionType(str, Enum):
    WALLET = "wallet"
    DEPOSIT = "deposit"
    LOAN = "loan"
    REWARD = "reward"
    STAKED = "staked"
    LOCKED = "locked"
    AIRDROP = "airdrop"
    MARGIN = "margin"

class WalletMode(str, Enum):
    SIMPLE = "simple"
    FULL = "full"

# Base position model that all types will inherit from

class Quantity(BaseModel):
    float: float
    numeric: str

class Changes(BaseModel):
    absolute_1d: float
    percent_1d: float

class BasePosition(BaseModel):
    id: str
    name: str
    symbol: str
    position_type: PositionType
    quantity: Quantity
    value: float
    price: float
    changes: Changes
    last_updated: datetime
    chain: str
    icon: str
    fungible_id: str

class DefiPosition(BasePosition):
    protocol_id: str
    protocol_link: str
    protocol_icon: str
    protocol_chain: str
    protocol: str
    dapp: str

class FullToken(BaseModel):
    zerion_token: bool
    token_data: Optional[Token] = None
    zerion_data: BasePosition

class Wallet(BaseModel):
    address: str
    name: str
    color: str
    wallet_mode: WalletMode
    last_updated: datetime
    tokens: List[FullToken] = Field(default_factory=list)
    defi_positions: List[DefiPosition] = Field(default_factory=list)
    asset_total: float = 0
    defi_total: float = 0

    def calculate_total_value(self):
        self.asset_total = sum(token.zerion_data.value for token in self.tokens)
        self.defi_total = sum(pos.value if pos.position_type != PositionType.LOAN else -pos.value for pos in self.defi_positions)