#dashboard.py
# Third-party imports
from fastapi import APIRouter, HTTPException
import httpx
from typing import Generic, TypeVar, List
from pydantic import BaseModel

#Local imports
from app.utils.cache_manager import cached_endpoint

# Environment variables
from app.core.config import ZERION_API_KEY

# Router setup
router = APIRouter()

T = TypeVar('T')

class CachedResponse(BaseModel, Generic[T]):
    data: T
    is_updating: bool
    last_updated: str

@router.post("/charts")
async def get_charts(fungible_id: dict):  # Change this to accept a JSON body
    async with httpx.AsyncClient() as client:
        url = f"https://api.zerion.io/v1/fungibles/{fungible_id['fungible_id']}/charts/day"
        headers = {
            "accept": "application/json",
            "authorization": f"Basic {ZERION_API_KEY}==",
        }
        response = await client.get(url, headers=headers)
        if response.status_code == 200:
            return response.json()
        else:
            raise HTTPException(status_code=response.status_code, detail="Error fetching data from Zerion API")
    
@router.post("/allCharts")
async def get_charts(fungible_id: dict):  # Change this to accept a JSON body
    chart = dict({})
    async with httpx.AsyncClient() as client:
        url = f"https://api.zerion.io/v1/fungibles/{fungible_id['fungible_id']}/charts/day"
        headers = {
            "accept": "application/json",
            "authorization": f"Basic {ZERION_API_KEY}==",
        }
        response = await client.get(url, headers=headers)
        if response.status_code == 200:
            chart['day'] = response.json()
        else:
            raise HTTPException(status_code=response.status_code, detail="Error fetching data from Zerion API")
        
        url = f"https://api.zerion.io/v1/fungibles/{fungible_id['fungible_id']}/charts/week"
        headers = {
            "accept": "application/json",
            "authorization": f"Basic {ZERION_API_KEY}==",
        }
        response = await client.get(url, headers=headers)
        if response.status_code == 200:
            chart['week'] = response.json()
        else:
            raise HTTPException(status_code=response.status_code, detail="Error fetching data from Zerion API")
        
        url = f"https://api.zerion.io/v1/fungibles/{fungible_id['fungible_id']}/charts/month"
        headers = {
            "accept": "application/json",
            "authorization": f"Basic {ZERION_API_KEY}==",
        }
        response = await client.get(url, headers=headers)
        if response.status_code == 200:
            chart['month'] = response.json()
        else:
            raise HTTPException(status_code=response.status_code, detail="Error fetching data from Zerion API")
        
    if chart:
        return chart
    else:
        raise HTTPException(status_code=404, detail="Error fetching data from Zerion API")