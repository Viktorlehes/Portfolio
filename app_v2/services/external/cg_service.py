# app/services/external/cg_service.py
from fastapi import HTTPException
import httpx
from app_v2.core.config import CG_DEMO_API_KEY
from app_v2.services.db.base import BaseDBService
from app_v2.models.CG.CG_Id_map import CGLS_ID_DOC
from app_v2.models.CG.CGToken import CGToken

class CGServiceException(Exception):
    """Custom exception for CG service errors"""
    pass

class CGService:
    """Service for interacting with coingecko api"""
    def __init__(self):
        self.base_url = ""
        self.headers = ""
        self.CGLS_id_map_collection = BaseDBService("CG_ID_MAP", CGLS_ID_DOC)
        
    async def get_token(self, name: str) -> CGToken:
        """
        Get token data from coinglass
        """
        query = name.strip()
        search_query = {
            '$or': [
                {'symbol': query},
                {'name': query}
            ],
        }
        
        token_exists = await self.CGLS_id_map_collection.find_many(search_query, limit=1)
        
        if token_exists: 
            token_data = token_exists[0].model_dump()
            coin_id = token_data["id"]
            async with httpx.AsyncClient() as client: 
                url = self.base_url + "spot/pairs-markets" + f"?symbol={coin_id}"
                try:
                    response = await client.get(url, headers=self.headers)
                    data = response.json()
                    return data if "error" not in data else None
                except HTTPException as e:
                    raise HTTPException(detail="CGLSService error:" + str(e), status_code= e.status_code if e.status_code else 500)