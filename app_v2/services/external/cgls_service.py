# app/services/external/cmc_service.py
from fastapi import HTTPException
from typing import List
import httpx
from app.core.config import CGLS_API_KEY
from app_v2.models.CGLS.CGLS_token import ExchangeResponse

class CGLSServiceError(Exception):
    """Custom exception for CGLS service errors"""
    pass

class CGLSService:
    """Service for interacting with Coinglass API"""
    
    def __init__(self):
        self.base_url = "https://open-api-v3.coinglass.com/api/"
        self.headers = {
            "accept": "application/json",
            "CG-API-KEY": CGLS_API_KEY
        }
        self.retry_delay = 15  # seconds
        self.max_retry_time = 120  # seconds (2 minutes)

    async def get_token(self, name: str) -> List[ExchangeResponse]:
        """
        Get token data from coinglass
        """
        async with httpx.AsyncClient() as client: 
            url = self.base_url + "spot/pairs-markets" + f"?symbol={name.strip()}"
            try:
                response = await client.get(url, headers=self.headers)
                if response.status_code == 200:
                    data = response.json()
                    return data["data"] if data["success"] == True else None
                else:
                    return None
            except HTTPException as e:
                raise HTTPException(detail="CGLSService error:" + str(e), status_code= e.status_code if e.status_code else 500)