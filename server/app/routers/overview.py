#Overview.py
from fastapi import APIRouter, HTTPException
import httpx
from requests import Request, Session
from requests.exceptions import ConnectionError, Timeout, TooManyRedirects
import json
from dotenv import load_dotenv
import os
import motor.motor_asyncio
from typing import List
from bson import ObjectId
from pydantic import BaseModel
from app.schemas.market_data import MarketDataResponse
from app.schemas.feargreed_response import FearGreedResponse
from app.schemas.openinterest_response import OpenInterestResponse
from app.schemas.CMCLatestTokens import CMCLatestTokens
from app.schemas.full_token import FullCMCToken
from app.scripts.coinglass_scrape import APIResponse as CGLS_APIResponse
from app.schemas.coinglass_token_response import ExchangeResponse
from app.schemas.TokenOverviewData import TokenOverviewData
from app.schemas.Catagory_data import CategoryResponse
from app.scripts.coinglass_scrape import scrape_coinglass





load_dotenv()
coinmarket_api_key = os.getenv("CM_API_KEY")
coingecko_api_key = os.getenv("CG_DEMO_API_KEY")
CGLS_API_KEY = os.getenv("CGLS-API-KEY")

router = APIRouter()

MONGO_URI = os.getenv("DB_URI")

client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
db = client['Main']  # Database name

wallets_collection = db["Wallets"]
tokens_collection = db["Tokens"]
coinglass_collection = db["Coinglass_Tokens"]

class MongoJSONEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, ObjectId):
            return str(o)
        return super().default(o)

def safe_get(d, keys, default=None):
    """Safely retrieve a nested value from a dictionary, returning default if any key is missing."""
    for key in keys:
        if d is None or not isinstance(d, dict):
            return default
        d = d.get(key)
    return d if d is not None else default

async def get_tokens_via_ids(token_ids: list[str]) -> list[FullCMCToken]:
    url = 'https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest'
    
    parameters = {
        'id': ','.join(token_ids),  # Join IDs with commas for the API
        'convert': 'USD',
    }
    headers = {
        'Accepts': 'application/json',
        'X-CMC_PRO_API_KEY': coinmarket_api_key
    }
    session = Session()
    session.headers.update(headers)
    
    try:
        # Fetch the tokens data from CoinMarketCap
        response = session.get(url, params=parameters)
        response.raise_for_status()
        data = response.json()
        
        tokens = []
        
        # Check if the token data is in the response
        if 'data' in data:
            for token_id, token_data in data['data'].items():
                # Map the response to the FullCMCToken model
                full_token = FullCMCToken(
                    _id={'$oid': token_id},
                    id=int(token_data['id']),
                    name=token_data['name'],
                    symbol=token_data['symbol'],
                    slug=token_data['slug'],
                    num_market_pairs=int(token_data['num_market_pairs']),
                    date_added=token_data['date_added'],
                    tags=[
                        {
                            'slug': tag['slug'],
                            'name': tag['name'],
                            'category': tag['category']
                        }
                        for tag in token_data.get('tags', [])
                    ],
                    max_supply=token_data.get('max_supply'),
                    circulating_supply=token_data['circulating_supply'],
                    total_supply=token_data['total_supply'],
                    platform=token_data.get('platform') and {
                        'id': token_data['platform']['id'],
                        'name': token_data['platform']['name'],
                        'symbol': token_data['platform']['symbol'],
                        'slug': token_data['platform']['slug'],
                        'token_address': token_data['platform']['token_address']
                    },
                    is_active=int(token_data['is_active']),
                    infinite_supply=token_data['infinite_supply'],
                    cmc_rank=int(token_data['cmc_rank']),
                    is_fiat=int(token_data['is_fiat']),
                    self_reported_circulating_supply=token_data.get('self_reported_circulating_supply'),
                    self_reported_market_cap=token_data.get('self_reported_market_cap'),
                    tvl_ratio=token_data.get('tvl_ratio'),
                    last_updated=token_data['last_updated'],
                    quote={
                        'USD': {
                            'price': token_data['quote']['USD']['price'],
                            'volume_24h': token_data['quote']['USD']['volume_24h'],
                            'volume_change_24h': token_data['quote']['USD']['volume_change_24h'],
                            'percent_change_1h': token_data['quote']['USD']['percent_change_1h'],
                            'percent_change_24h': token_data['quote']['USD']['percent_change_24h'],
                            'percent_change_7d': token_data['quote']['USD']['percent_change_7d'],
                            'percent_change_30d': token_data['quote']['USD']['percent_change_30d'],
                            'percent_change_60d': token_data['quote']['USD']['percent_change_60d'],
                            'percent_change_90d': token_data['quote']['USD']['percent_change_90d'],
                            'market_cap': token_data['quote']['USD']['market_cap'],
                            'market_cap_dominance': token_data['quote']['USD']['market_cap_dominance'],
                            'fully_diluted_market_cap': token_data['quote']['USD']['fully_diluted_market_cap'],
                            'tvl': token_data['quote']['USD'].get('tvl'),
                            'last_updated': token_data['quote']['USD']['last_updated'],
                        }
                    }
                )
                tokens.append(full_token)
            
            return tokens
        
        else:
            return {'message': "No tokens found", 'data': None}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

@router.get('/feargreedindex', response_model=FearGreedResponse)
async def get_feargreedindex():
    url = 'https://pro-api.coinmarketcap.com/v3/fear-and-greed/latest'

    headers = {
        'Accepts': 'application/json',
        'X-CMC_PRO_API_KEY': coinmarket_api_key
    }

    session = Session()
    session.headers.update(headers)

    try:
        response = session.get(url)
        data = json.loads(response.text)
        return(data)
    except (ConnectionError, Timeout, TooManyRedirects) as e:
        return e

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
    url = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/map'
    parameters = {
        'sort': 'cmc_rank',
        'limit': 50,
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

@router.get("/get-coinglass-BTC-open-interest", response_model=OpenInterestResponse)
async def get_coinglass_market_data():
    async with httpx.AsyncClient() as client:
        response_data = dict({})
        url = 'https://open-api-v3.coinglass.com/api/futures/openInterest/exchange-list?symbol=BTC'

        headers = {
            "accept": "application/json",
            "CG-API-KEY": CGLS_API_KEY
        }

        response = await client.get(url, headers=headers)

        if response.status_code == 200:
            response_data['openinterestBTC'] = response.json()
        else:     
            raise HTTPException(status_code=500, detail="Error fetching data from Coinglass API")
        
@router.get("/get-scraped-CGLS-data", response_model=CGLS_APIResponse)
async def get_scraped_coinglass_data():
    data = await scrape_coinglass()
    return data

@router.get("/get-latest-tokens")
async def get_latest_tokens():
    async with httpx.AsyncClient() as client:
        url = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/trending/latest'

        response = await client.get(url)

        if response.status_code == 200:
            return response.json()
        else:     
            raise HTTPException(status_code=500, detail="Error fetching data from Coinglass API")

@router.get("/get-coinglass-token-via-symbol/", response_model=ExchangeResponse)
async def get_coinglass_token(symbol: str):
    async with httpx.AsyncClient() as client:
        url = f"https://open-api-v3.coinglass.com/api/spot/pairs-markets?symbol={symbol}"

        headers = {
            "accept": "application/json",
            "CG-API-KEY": CGLS_API_KEY
        }
        
        response = await client.get(url, headers=headers)

        if response.status_code == 200:
            return response.json()
        else:     
            raise HTTPException(status_code=500, detail="Error fetching data from Coinglass API")

@router.get("/overview-tokens-table-data", response_model=List[TokenOverviewData])
async def get_overview_tokens_table_data():
    response_data = []
    try:
        latest_tokens: CMCLatestTokens = await get_currencies()
        if latest_tokens['status']['error_message']:
            raise HTTPException(status_code=500, detail="Error fetching data from CoinMarketCap API")
        
        tokens = latest_tokens['data']
        tokens_to_fetch = []
        tokens_map = {}
        
        # First pass: check existing tokens
        for token in tokens:
            token_id = str(token['id'])
            token_exists = await tokens_collection.find_one({"id": token['id']})
            
            if token_exists:
                token_exists['_id'] = str(token_exists['_id'])
                response_data.append(token_exists)
            else:
                tokens_to_fetch.append(token_id)
                tokens_map[token_id] = len(response_data)
                response_data.append(None)
        
        # Fetch missing tokens
        if tokens_to_fetch:
            fetched_tokens = await get_tokens_via_ids(tokens_to_fetch)
            tokens_to_insert = []
            
            for token in fetched_tokens:
                if 'message' in token:
                    print(f"Error fetching token: {token['message']}")
                    continue
                token_id = str(token.id)
                position = tokens_map[token_id]
                token_dict = token.model_dump()
                if '_id' in token_dict and isinstance(token_dict['_id'], dict):
                    token_dict['_id'] = ObjectId()
                response_data[position] = token_dict
                tokens_to_insert.append(token_dict)
            
            if tokens_to_insert:
                await tokens_collection.insert_many(tokens_to_insert)
        
        # Filter out any None values
        response_data = [token for token in response_data if token is not None]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error with CMC data: {str(e)}")

    # Process and combine data
    final_response = []
    try:
        for token in response_data:
            # Get coinglass data
            coinglass_token = await coinglass_collection.find_one({"symbol": token['symbol']})
            if not coinglass_token:
                coinglass_data = await get_coinglass_token(token['symbol'])
                if coinglass_data['code'] == "0":
                    coinglass_token = {
                        "symbol": token['symbol'],
                        "data": coinglass_data['data']
                    }
                    await coinglass_collection.insert_one(coinglass_token)
                else:
                    print(f"Error fetching coinglass data for {token['symbol']}")
                    coinglass_token = None

            # Calculate net inflow from coinglass data (if available)
            net_inflow_24h = 0
            if coinglass_token and 'data' in coinglass_token:
                # Sum up flowsUsd24h from all exchanges
                net_inflow_24h = sum(exchange['flowsUsd24h'] for exchange in coinglass_token['data'])

            # Extract and format required fields
            formatted_token = {
                "name": token['name'],
                "price": token['quote']['USD']['price'],
                "change24h": token['quote']['USD']['percent_change_24h'],
                "change7d": token['quote']['USD']['percent_change_7d'],
                "volume": token['quote']['USD']['volume_24h'],
                "volumeChange24h": token['quote']['USD']['volume_change_24h'],
                "marketCap": token['quote']['USD']['market_cap'],
                "netInflow24h": net_inflow_24h
            }
            
            final_response.append(formatted_token)
            
        return list[TokenOverviewData](final_response)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred while processing data: {str(e)}")
    
@router.get("/get-crypto-catagories", response_model=CategoryResponse)
async def get_crypto_catagories():
    async with httpx.AsyncClient() as client:
        url = 'https://api.coingecko.com/api/v3/coins/categories'
        
        headers = {
            'Accepts': 'application/json',
            'x-cg-demo-api-key': coingecko_api_key
        }
        
        response = await client.get(url, headers=headers)
        
        if response.status_code == 200:
            catagories = response.json()
            return catagories[:20]
        else:
            raise HTTPException(status_code=500, detail="Error fetching data from CoinMarketCap API")

@router.get("/get-crypto-catagorie/{catagory}")
async def get_crypto_catagories(catagory: str):
    async with httpx.AsyncClient() as client:
        url = f'https://api.coingecko.com/api/v3/coins/categories/{catagory}'
        
        headers = {
            'Accepts': 'application/json',
            'x-cg-demo-api-key': coingecko_api_key
        }
        
        response = await client.get(url, headers=headers)
        
        if response.status_code == 200:
            catagory = response.json()
            return catagory
        else:
            raise HTTPException(status_code=500, detail="Error fetching data from CoinMarketCap API")
        