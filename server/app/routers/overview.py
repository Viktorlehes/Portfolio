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

load_dotenv()
coinmarket_api_key = os.getenv("CM_API_KEY")
coingecko_api_key = os.getenv("CG_DEMO_API_KEY")

router = APIRouter()

MONGO_URI = os.getenv("DB_URI")

client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
db = client['Main']  # Database name

wallets_collection = db["Wallets"]
tokens_collection = db["Tokens"]

@router.get('/cryptostats')
async def get_cryptostats():
    url = 'https://coinmarketcap.com/'  # Replace with the target URL
    response = requests.get(url)

    # Step 2: Check if the request was successful
    if response.status_code == 200:
        # Step 3: Parse the content with BeautifulSoup
        soup = BeautifulSoup(response.content, 'html.parser')

        # Step 4: Find the desired data (adjust selectors as needed)
        # Example: Find all <h2> tags
        data = ''
        for scrape_data in soup.find_all('div', 'global-stats'):
            data += scrape_data.get_text()

            # Extract Cryptos
        cryptos_match = re.search(r'Cryptos:\s*([\d.]+[MK]?)', data)
        cryptos = cryptos_match.group(1) if cryptos_match else None

        # Extract Exchanges
        exchanges_match = re.search(r'Exchanges:\s*(\d+)', data)
        exchanges = exchanges_match.group(1) if exchanges_match else None

        # Extract Market Cap with 24h change
        market_cap_match = re.search(r'Market Cap:\s*\$([\d.]+[TBM]?)\s*([\d.]+)%', data)
        market_cap_value = market_cap_match.group(1) if market_cap_match else None
        market_cap_change = market_cap_match.group(2) if market_cap_match else None

        # Extract 24h Volume with 24h change
        vol_24h_match = re.search(r'24h Vol:\s*\$([\d.]+[TBM]?)\s*([\d.]+)%', data)
        vol_24h_value = vol_24h_match.group(1) if vol_24h_match else None
        vol_24h_change = vol_24h_match.group(2) if vol_24h_match else None

        # Extract Dominance BTC and ETH
        dominance_btc_match = re.search(r'BTC:\s*([\d.]+)%', data)
        dominance_btc = dominance_btc_match.group(1) if dominance_btc_match else None

        dominance_eth_match = re.search(r'ETH:\s*([\d.]+)%', data)
        dominance_eth = dominance_eth_match.group(1) if dominance_eth_match else None

        # Extract ETH Gas
        eth_gas_match = re.search(r'ETH Gas:\s*([\d.]+)\s*Gwei', data)
        eth_gas = eth_gas_match.group(1) if eth_gas_match else None

        # Extract Fear & Greed
        fear_greed_match = re.search(r'Fear & Greed:\s*(\d+)/100', data)
        fear_greed = fear_greed_match.group(1) if fear_greed_match else None

        # Store extracted data in a dictionary with structured market_cap and 24h_vol
        crypto_info = {
            "cryptos": cryptos,
            "exchanges": exchanges,
            "market_cap": {
                "value": market_cap_value,
                "change": market_cap_change
            },
            "24h_vol": {
                "value": vol_24h_value,
                "change": vol_24h_change
            },
            "dominance_btc": dominance_btc,
            "dominance_eth": dominance_eth,
            "eth_gas": eth_gas,
            "fear_greed": fear_greed
        }
        
        return crypto_info
    
    else:
        return {response.status_code}

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

@router.get("/currenciesById")
async def get_currencies():
    url = ' https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest'
    parameters = {
        'slug': 'bitcoin,ethereum',
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

@router.get("/ping")
async def ping_coingecko():
    url = f"https://api.coingecko.com/api/v3/ping?x_cg_demo_api_key={coingecko_api_key}"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        return response.json()

@router.get("/global")
async def global_coingecko():
    url = f"https://api.coingecko.com/api/v3/global?x_cg_demo_api_key={coingecko_api_key}"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        return response.json()

@router.get("/catagories")
async def catagories_coingecko():
    url = f"https://api.coingecko.com/api/v3/coins/categories?x_cg_demo_api_key={coingecko_api_key}"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        return response.json()

@router.get("/catagorie/{catagorie}")
async def catagories_coingecko(catagorie: str):
    url = f"https://api.coingecko.com/api/v3/coins/categories/{catagorie}?x_cg_demo_api_key=CG-{coingecko_api_key}"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        return response.json()        