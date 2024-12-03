from typing import List, Optional, Literal
from pydantic import BaseModel
from datetime import datetime

class Implementation(BaseModel):
    chain_id: str
    address: Optional[str]
    decimals: int

class Icon(BaseModel):
    url: Optional[str] = None

class Flags(BaseModel):
    verified: Optional[bool] = False
    displayable: Optional[bool] = False
    is_trash: Optional[bool] = False

class FungibleInfo(BaseModel):
    name: str
    symbol: str
    icon: Optional[Icon] = None
    flags: Optional[Flags] = None
    implementations: List[Implementation]

class Quantity(BaseModel):
    int: str
    decimals: int # type: ignore
    float: float
    numeric: str

class Changes(BaseModel):
    absolute_1d: float
    percent_1d: float

class RelationshipData(BaseModel):
    type: str
    id: str

class RelationshipLinks(BaseModel):
    related: str

class Relationship(BaseModel):
    links: RelationshipLinks
    data: RelationshipData

class Relationships(BaseModel):
    chain: Relationship
    fungible: Relationship

class PositionAttributes(BaseModel):
    parent: Optional[str]
    protocol: Optional[str]
    name: str
    position_type: Optional[str]
    quantity: Quantity
    value: float
    price: float
    changes: Changes
    fungible_info: FungibleInfo
    flags: Optional[Flags]
    updated_at: datetime
    updated_at_block: int

class Position(BaseModel):
    type: str
    id: str
    attributes: PositionAttributes
    relationships: Relationships

class ZerionWalletResponse(BaseModel):
    links: dict[str, str]
    data: List[Position]