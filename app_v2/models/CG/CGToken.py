from pydantic import BaseModel, Field
from typing import Dict, List, Optional
from datetime import datetime

class Platform(BaseModel):
    decimal_place: Optional[int]
    contract_address: Optional[str]
    logo: Optional[str]

class Links(BaseModel):
    homepage: List[str]
    blockchain_site: List[str]
    official_forum_url: List[str]
    chat_url: List[str]
    announcement_url: List[str]
    twitter_screen_name: Optional[str]
    facebook_username: Optional[str]
    telegram_channel_identifier: Optional[str]
    subreddit_url: Optional[str]
    repos_url: Dict[str, List[str]]

class Image(BaseModel):
    thumb: str
    small: str
    large: str

class MarketData(BaseModel):
    current_price: Dict[str, float]
    total_value_locked: Optional[Dict[str, float]]
    mcap_to_tvl_ratio: Optional[float]
    fdv_to_tvl_ratio: Optional[float]
    roi: Optional[float]
    ath: Dict[str, float]
    ath_change_percentage: Dict[str, float]
    ath_date: Dict[str, datetime]
    atl: Dict[str, float]
    atl_change_percentage: Dict[str, float]
    atl_date: Dict[str, datetime]
    market_cap: Dict[str, float]
    market_cap_rank: int
    fully_diluted_valuation: Dict[str, float]
    market_cap_fdv_ratio: float
    total_volume: Dict[str, float]
    high_24h: Dict[str, float]
    low_24h: Dict[str, float]
    price_change_24h: float
    price_change_percentage_24h: float
    price_change_percentage_7d: float
    price_change_percentage_14d: float
    price_change_percentage_30d: float
    price_change_percentage_60d: float
    price_change_percentage_200d: float
    price_change_percentage_1y: float
    market_cap_change_24h: float
    market_cap_change_percentage_24h: float
    price_change_24h_in_currency: Dict[str, float]
    price_change_percentage_1h_in_currency: Dict[str, float]
    price_change_percentage_24h_in_currency: Dict[str, float]
    price_change_percentage_7d_in_currency: Dict[str, float]
    price_change_percentage_14d_in_currency: Dict[str, float]
    price_change_percentage_30d_in_currency: Dict[str, float]
    price_change_percentage_60d_in_currency: Dict[str, float]
    price_change_percentage_200d_in_currency: Dict[str, float]
    price_change_percentage_1y_in_currency: Dict[str, float]
    market_cap_change_24h_in_currency: Dict[str, float]
    market_cap_change_percentage_24h_in_currency: Dict[str, float]
    total_supply: float
    max_supply: Optional[float]
    max_supply_infinite: bool
    circulating_supply: float
    last_updated: datetime

class CGToken(BaseModel):
    id: str
    symbol: str
    name: str
    web_slug: str
    asset_platform_id: Optional[str]
    platforms: Dict[str, str]
    detail_platforms: Dict[str, Platform]
    block_time_in_minutes: int
    hashing_algorithm: Optional[str]
    categories: List[str]
    preview_listing: bool
    public_notice: Optional[str]
    additional_notices: List[str]
    description: Dict[str, str]
    links: Links
    image: Image
    country_origin: str
    genesis_date: Optional[datetime]
    contract_address: Optional[str]
    sentiment_votes_up_percentage: float
    sentiment_votes_down_percentage: float
    watchlist_portfolio_users: int
    market_cap_rank: int
    market_data: MarketData
    status_updates: List[str]
    last_updated: datetime