from pydantic import BaseModel, RootModel
from typing import List
from datetime import datetime

class CategoryData(BaseModel):
    id: str
    name: str
    market_cap: float
    market_cap_change_24h: float
    content: str
    top_3_coins_id: List[str]
    top_3_coins: List[str]
    volume_24h: float
    updated_at: datetime

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "smart-contract-platform",
                "name": "Smart Contract Platform",
                "market_cap": 2969444385499.122,
                "market_cap_change_24h": -0.1959823588030821,
                "content": "Smart contract platforms are usually blockchains that host smart contracts...",
                "top_3_coins_id": ["bitcoin", "ethereum", "solana"],
                "top_3_coins": [
                    "https://coin-images.coingecko.com/coins/images/1/small/bitcoin.png",
                    "https://coin-images.coingecko.com/coins/images/279/small/ethereum.png",
                    "https://coin-images.coingecko.com/coins/images/4128/small/solana.png"
                ],
                "volume_24h": 171473330258.68356,
                "updated_at": "2024-12-02T08:15:42.078Z"
            }
        }

class CategoryResponse(RootModel):
    """A list of category data objects"""
    root: List[CategoryData]

    def __iter__(self):
        return iter(self.root)

    def __getitem__(self, item):
        return self.root[item]