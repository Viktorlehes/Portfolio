from fastapi import APIRouter
import httpx

router = APIRouter()

@router.get("/ping")
async def ping_coingecko():
    url = f"https://api.coingecko.com/api/v3/ping?x_cg_demo_api_key=CG-miHc56F8UN3wDzBaSAKnshtP"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        return response.json()

@router.get("/global")
async def global_coingecko():
    url = f"https://api.coingecko.com/api/v3/global?x_cg_demo_api_key=CG-miHc56F8UN3wDzBaSAKnshtP"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        return response.json()

@router.get("/catagories")
async def catagories_coingecko():
    url = f"https://api.coingecko.com/api/v3/coins/categories?x_cg_demo_api_key=CG-miHc56F8UN3wDzBaSAKnshtP"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        return response.json()

@router.get("/catagorie/{catagorie}")
async def catagories_coingecko(catagorie: str):
    url = f"https://api.coingecko.com/api/v3/coins/categories/{catagorie}?x_cg_demo_api_key=CG-miHc56F8UN3wDzBaSAKnshtP"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        return response.json()        

