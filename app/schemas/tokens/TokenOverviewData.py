from pydantic import BaseModel, Field
from typing import List

class TokenOverviewData(BaseModel):
    name: str = Field(description="Name of the cryptocurrency")
    price: float = Field(description="Current price in USD")
    change24h: float = Field(description="24-hour price change percentage")
    change7d: float = Field(description="7-day price change percentage")
    volume: float = Field(description="24-hour trading volume in USD")
    volumeChange24h: float = Field(description="24-hour volume change percentage")
    marketCap: float = Field(description="Market capitalization in USD")
    netInflow24h: float = Field(description="Net inflow over 24 hours across all exchanges")
    lastUpdated: str = Field(description="Last updated timestamp")

