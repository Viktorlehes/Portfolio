from fastapi import APIRouter
import httpx
import requests
from requests import Request, Session
from requests.exceptions import ConnectionError, Timeout, TooManyRedirects
import json
from bs4 import BeautifulSoup
import re
from dotenv import load_dotenv
import os
import motor.motor_asyncio
from ..schemas.market_data import MarketDataResponse

load_dotenv()
coinmarket_api_key = os.getenv("CM_API_KEY")
coingecko_api_key = os.getenv("CG_DEMO_API_KEY")

router = APIRouter()

MONGO_URI = os.getenv("DB_URI")

client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
db = client['Main']  # Database name

wallets_collection = db["Wallets"]
tokens_collection = db["Tokens"]

@router.get('/cryptostats', response_model=MarketDataResponse)
async def get_cryptostats():
    url = 'https://pro-api.coinmarketcap.com/v1/global-metrics/quotes/latest'
    parameters = {
        'convert': 'USD',
    }
    
    headers = {
        'Accepts': 'application/json',
        'X-CMC_PRO_API_KEY': coinmarket_api_key
    }
    
    session = Session()
    session.headers.update(headers)
    
    try:
        response = session.get(url, params=parameters)
        data = json.loads(response.text)
        return(data)
    except (ConnectionError, Timeout, TooManyRedirects) as e:
        return e

@router.get("/currencyIds")
async def get_currencies():
    url = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/map '
    parameters = {
        'sort': 'cmc_rank',
        'limit': 50,
        'convert': 'USD',
    }
    
    headers = {
        'Accepts': 'application/json',
        'X-CMC_PRO_API_KEY': coinmarket_api_key
    }
    
    session = Session()
    session.headers.update(headers)
    
    try:
        response = session.get(url, params=parameters)
        data = json.loads(response.text)
        return(data)
    except (ConnectionError, Timeout, TooManyRedirects) as e:
        return e