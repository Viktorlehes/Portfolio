from typing import Optional, List
from pydantic import BaseModel
from enum import Enum

class ExternalLink(BaseModel):
    type: object
    name: str
    url: str

class Implementation(BaseModel):
    chain_id: str
    address: Optional[str]
    decimals: int

class MarketChanges(BaseModel):
    percent_1d: float
    percent_30d: float
    percent_90d: float
    percent_365d: float

class MarketData(BaseModel):
    total_supply: float
    circulating_supply: float
    market_cap: float
    fully_diluted_valuation: float
    price: float
    changes: MarketChanges

class IconData(BaseModel):
    url: str

class Flags(BaseModel):
    verified: bool

class ChartRelationData(BaseModel):
    type: str
    id: str

class ChartRelationLinks(BaseModel):
    related: str

class ChartRelation(BaseModel):
    links: ChartRelationLinks
    data: ChartRelationData

class AssetRelationships(BaseModel):
    chart_day: ChartRelation
    chart_hour: ChartRelation
    chart_max: ChartRelation
    chart_month: ChartRelation
    chart_week: ChartRelation
    chart_year: ChartRelation

class AssetAttributes(BaseModel):
    name: str
    symbol: str
    description: str
    icon: IconData
    flags: Flags
    external_links: List[ExternalLink]
    implementations: List[Implementation]
    market_data: MarketData

class AssetData(BaseModel):
    type: str
    id: str
    attributes: AssetAttributes
    relationships: AssetRelationships

class AssetLinks(BaseModel):
    self: str

class ZerionToken(BaseModel):
    links: AssetLinks
    data: AssetData
