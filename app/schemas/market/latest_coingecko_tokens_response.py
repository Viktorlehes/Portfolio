from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ROI(BaseModel):
    times: float
    currency: str
    percentage: float

class CoingeckoLatestTokensResponse(BaseModel):
    id: str = Field(description="Unique identifier of the cryptocurrency")
    symbol: str = Field(description="Trading symbol of the cryptocurrency")
    name: str = Field(description="Full name of the cryptocurrency")
    image: str = Field(description="URL to the cryptocurrency's logo")
    current_price: float = Field(description="Current price in USD")
    market_cap: int = Field(description="Total market capitalization in USD")
    market_cap_rank: int = Field(description="Market cap ranking")
    fully_diluted_valuation: Optional[int] = Field(description="Fully diluted valuation in USD")
    total_volume: float = Field(description="24h trading volume in USD")
    high_24h: float = Field(description="Highest price in last 24 hours")
    low_24h: float = Field(description="Lowest price in last 24 hours")
    price_change_24h: float = Field(description="Price change in last 24 hours")
    price_change_percentage_24h: float = Field(description="Price change percentage in last 24 hours")
    market_cap_change_24h: float = Field(description="Market cap change in last 24 hours")
    market_cap_change_percentage_24h: float = Field(description="Market cap change percentage in last 24 hours")
    circulating_supply: float = Field(description="Number of coins in circulation")
    total_supply: Optional[float] = Field(description="Total number of coins")
    max_supply: Optional[float] = Field(description="Maximum number of coins that can exist")
    ath: float = Field(description="All-time high price")
    ath_change_percentage: float = Field(description="Percentage change from ATH")
    ath_date: datetime = Field(description="Date of ATH")
    atl: float = Field(description="All-time low price")
    atl_change_percentage: float = Field(description="Percentage change from ATL")
    atl_date: datetime = Field(description="Date of ATL")
    roi: Optional[ROI] = Field(description="Return on investment metrics")
    last_updated: datetime = Field(description="Last data update timestamp")
    price_change_percentage_24h_in_currency: float = Field(description="24h price change percentage in USD")
    price_change_percentage_7d_in_currency: float = Field(description="7d price change percentage in USD")
    