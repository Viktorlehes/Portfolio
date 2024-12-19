#overview.py
# Standard library imports
import json
from typing import List, Generic, TypeVar, Dict
from datetime import datetime, timedelta
import pytz
import logging
from pydantic import BaseModel
# Third-party imports
from fastapi import APIRouter, HTTPException, Request
import httpx
from requests import Session
from requests.exceptions import ConnectionError, Timeout, TooManyRedirects
from bson import ObjectId
from pymongo import UpdateOne
import asyncio
from aiohttp import ClientSession, ClientTimeout
import uuid


# Local imports (absolute imports)
from app.schemas.market.market_data import MarketDataResponse
from app.schemas.market.feargreed_response import FearGreedResponse
from app.schemas.market.openinterest_response import OpenInterestResponse
from app.schemas.market.CMCLatestTokens import CMCLatestTokens
from app.schemas.tokens.full_token import FullCMCToken
from app.schemas.tokens.coinglass_token_response import ExchangeResponse
from app.schemas.tokens.TokenOverviewData import TokenOverviewData
from app.schemas.market.Catagory_data import CategoryResponse, CategoryData
from app.utils.helpers import MongoJSONEncoder
from app.schemas.market.CustomCategory import CustomCategory
from app.scripts.coinglass_scrape import CoinglassMetrics, scrape_coinglass
from app.utils.cache_manager import cached_endpoint

# Environment variables
from app.core.config import CM_API_KEY, CGLS_API_KEY

# MongoDB setup
from app.core.db import tokens_collection, coinglass_collection, categories_collection, tracked_categories, custom_categories_collection

# Router setup
router = APIRouter()

T = TypeVar('T')

class CachedResponse(BaseModel, Generic[T]):
    data: T
    is_updating: bool
    last_updated: str

async def get_tokens_via_ids(token_ids: list[str]) -> list[FullCMCToken]:
    url = 'https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest'
    
    parameters = {
        'id': ','.join(token_ids),  # Join IDs with commas for the API
        'convert': 'USD',
    }
    headers = {
        'Accepts': 'application/json',
        'X-CMC_PRO_API_KEY': CM_API_KEY
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
        'X-CMC_PRO_API_KEY': CM_API_KEY
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
        'X-CMC_PRO_API_KEY': CM_API_KEY
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
        'limit': 100,
    }
    
    headers = {
        'Accepts': 'application/json',
        'X-CMC_PRO_API_KEY': CM_API_KEY
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
        
@router.get("/get-scraped-CGLS-data", response_model=CachedResponse[CoinglassMetrics])
@cached_endpoint("get-scraped-CGLS-data", expiry_minutes=10)
async def get_scraped_coinglass_data():
    data = await scrape_coinglass()
    if data:
        return data
    else:
        raise HTTPException(status_code=500, detail="Error fetching data from Coinglass API")

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

@router.get("/overview-tokens-table-data", response_model=CachedResponse[List[TokenOverviewData]])
@cached_endpoint("tokens_table", expiry_minutes=10)
async def get_overview_tokens_table_data(request: Request):
    response_data = []
    print("Fetching Token Table Data")
    try:
        latest_tokens: CMCLatestTokens = await get_currencies()
        if latest_tokens['status']['error_message']:
            raise HTTPException(status_code=500, detail="Error fetching data from CoinMarketCap API")
        
        tokens = latest_tokens['data']
        tokens_to_fetch = []
        tokens_map = {}
        current_time = datetime.now(pytz.UTC)
        
        # First pass: check existing tokens and their timestamps
        for token in tokens:
            token_id = str(token['id'])
            token_exists = await tokens_collection.find_one({"id": token['id']})
            
            # Check if token needs update (doesn't exist or old timestamp)
            needs_update = True
            if token_exists and 'last_updated' in token_exists:
                try:
                    # Convert string timestamp to timezone-aware datetime
                    last_updated = datetime.fromisoformat(token_exists["last_updated"].replace('Z', '+00:00'))
                    needs_update = (current_time - last_updated).total_seconds() > 300
                except (ValueError, TypeError) as e:
                    print(f"Error parsing timestamp for token {token_id}: {e}")
                    needs_update = True
            
            if needs_update:
                tokens_to_fetch.append(token_id)
                tokens_map[token_id] = len(response_data)
                response_data.append(None)
            else:
                token_exists['_id'] = str(token_exists['_id'])
                response_data.append(token_exists)
        
        # Fetch all tokens that need updating
        if tokens_to_fetch:
            fetched_tokens = await get_tokens_via_ids(tokens_to_fetch)
            tokens_to_update = []
            
            for token in fetched_tokens:
                if 'message' in token:
                    print(f"Error fetching token: {token['message']}")
                    continue
                    
                token_id = str(token.id)
                position = tokens_map[token_id]
                token_dict = token.model_dump()
                
                if '_id' in token_dict and isinstance(token_dict['_id'], dict):
                    token_dict['_id'] = ObjectId()
                
                # Add last_updated timestamp
                token_dict['last_updated'] = current_time.isoformat()
                
                response_data[position] = token_dict
                tokens_to_update.append(
                    UpdateOne(
                        {"id": token.id},
                        {"$set": token_dict},
                        upsert=True
                    )
                )
            
            # Bulk update/insert all fetched tokens
            if tokens_to_update:
                await tokens_collection.bulk_write(tokens_to_update)
        
        # Filter out any None values and duplicates
        filtered_response = []
        seen_tokens = set()
        for token in response_data:
            if token and token['id'] not in seen_tokens:
                filtered_response.append(token)
                seen_tokens.add(token['id'])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error with CMC data: {str(e)}")

    print("Fetching CGLS token data")
    # Process and combine data
    final_response = []
    
    async def process_token(token):
        try:
            coinglass_token = await coinglass_collection.find_one({"symbol": token['symbol']})
            coinglass_token = await update_coinglass_data(token['symbol'], coinglass_token)
            
            net_inflow_24h = 0
            if coinglass_token and 'data' in coinglass_token:
                net_inflow_24h = sum(exchange['flowsUsd24h'] for exchange in coinglass_token['data'])
                
            return {
                "name": token['name'],
                "price": token['quote']['USD']['price'],
                "change24h": token['quote']['USD']['percent_change_24h'],
                "change7d": token['quote']['USD']['percent_change_7d'],
                "volume": token['quote']['USD']['volume_24h'],
                "volumeChange24h": token['quote']['USD']['volume_change_24h'],
                "marketCap": token['quote']['USD']['market_cap'],
                "netInflow24h": net_inflow_24h,
                "lastUpdated": token['last_updated'],
            }
        except Exception as e:
            print(f"Error processing token {token['symbol']}: {str(e)}")
            return None
            
    final_response = await asyncio.gather(
        *[process_token(token) for token in filtered_response]
    )
    return [token for token in final_response if token is not None]
        
async def update_coinglass_data(symbol: str, coinglass_token: dict) -> dict:
    """Helper function to handle coinglass data updates"""
    try:
        # Case 1: Token not in collection
        if not coinglass_token:
            coinglass_data = await get_coinglass_token(symbol)
            if coinglass_data['code'] == "0":
                coinglass_token = {
                    "symbol": symbol,
                    "data": coinglass_data['data'],
                    'last_updated': datetime.now()
                }
                await coinglass_collection.insert_one(coinglass_token)
            else:
                print(f"Error fetching coinglass data for {symbol}")
                return None
                
        # Case 2: Token exists but needs update (>5 min old)
        elif ('last_updated' in coinglass_token and 
              datetime.now() - coinglass_token['last_updated'] > timedelta(minutes=5)):
            coinglass_data = await get_coinglass_token(symbol)
            if coinglass_data['code'] == "0":
                coinglass_token['data'] = coinglass_data['data']
                coinglass_token['last_updated'] = datetime.now()
                await coinglass_collection.update_one(
                    {"symbol": symbol}, 
                    {"$set": coinglass_token}
                )
                
        # Case 3: Token exists but has no timestamp
        elif 'last_updated' not in coinglass_token:
            coinglass_data = await get_coinglass_token(symbol)
            if coinglass_data['code'] == "0":
                coinglass_token['data'] = coinglass_data['data']
                coinglass_token['last_updated'] = datetime.now()
                await coinglass_collection.update_one(
                    {"symbol": symbol}, 
                    {"$set": coinglass_token}
                )
                
        return coinglass_token
        
    except Exception as e:
        print(f"Error updating coinglass data for {symbol}: {str(e)}")
        return None
    
@router.get("/get-user-catagories", response_model=CachedResponse[CategoryResponse])
@cached_endpoint("get-user-catagories", expiry_minutes=5)
async def get_cmc_catagories(request: Request):
    try: 
        current_tracked_categories = await tracked_categories.find().to_list()
        tracked_categories_id_list = [str(cat['id']) for cat in current_tracked_categories]
        
        if not tracked_categories_id_list:
            raise HTTPException(status_code=404, detail="No tracked categories found")
        
        cmc_categories = await categories_collection.find({"id": {"$in": tracked_categories_id_list}}).to_list()
        needs_update = False
        
        if not cmc_categories:
            #Categories not found in database, fetch from CMC API
            return Exception("Implement fetching from CMC API") 
        else:
            for category in cmc_categories:
                try:
                    # Handle potential missing or invalid timestamp
                    last_updated = category.get('last_updated')
                    if not last_updated:
                        needs_update = True
                        break
                    
                    try:
                        print(f"Last updated: {last_updated}")
                        print(f"Current time: {datetime.now()}")
                        if last_updated < datetime.now() - timedelta(minutes=5):
                            needs_update = True
                        break
                    except TypeError:
                        print("Error parsing timestamp")
                        needs_update = True
                        break
                except (ValueError, TypeError):
                    needs_update = True
                    break
        
        if needs_update:
            updated_categories = await update_categories(tracked_categories_id_list)
            return updated_categories
            
        return cmc_categories
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

async def fetch_single_category(session: ClientSession, cat_id: str, api_key: str) -> Dict:
    """Fetch a single category from CMC API"""
    url = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/category'
    headers = {
        'Accepts': 'application/json',
        'X-CMC_PRO_API_KEY': api_key
    }
    params = {'id': cat_id}
    
    try:
        async with session.get(url, params=params, headers=headers) as response:
            if response.status == 200:
                data = await response.json()
                if 'data' in data:
                    category_data = data['data']
                    last_updated = datetime.now()
                    return CategoryData(
                        id=str(category_data['id']),
                        name=category_data['name'],
                        title=category_data['title'],
                        description=category_data.get('description', ''),
                        num_tokens=category_data.get('num_tokens', 0),
                        avg_price_change=category_data.get('avg_price_change', 0.0),
                        market_cap=category_data.get('market_cap', 0.0),
                        market_cap_change=category_data.get('market_cap_change', 0.0),
                        volume=category_data.get('volume', 0.0),
                        volume_change=category_data.get('volume_change', 0.0),
                        last_updated=last_updated
                    ).model_dump()
    except Exception as e:
        logging.error(f"Error fetching category {cat_id}: {str(e)}")
    return None

async def process_batch(session: ClientSession, batch: List[str], api_key: str, semaphore: asyncio.Semaphore) -> List[Dict]:
    """Process a batch of category IDs with rate limiting"""
    tasks = []
    for cat_id in batch:
        async with semaphore:  # Control concurrent requests
            task = asyncio.create_task(fetch_single_category(session, cat_id, api_key))
            tasks.append(task)
            await asyncio.sleep(0.1)  # Small delay between requests within batch
            
    results = await asyncio.gather(*tasks)
    return [r for r in results if r is not None]

async def fetch_cmc_category_data(category_ids: List[str], api_key: str) -> List[Dict]:
    """Fetch category data from CMC API with concurrent processing"""
    timeout = ClientTimeout(total=300)  # 5 minutes total timeout
    all_category_data = []
    batch_size = 10
    max_concurrent_requests = 5
    
    # Create semaphore to limit concurrent requests
    semaphore = asyncio.Semaphore(max_concurrent_requests)
    
    async with ClientSession(timeout=timeout) as session:
        tasks = []
        for i in range(0, len(category_ids), batch_size):
            batch = category_ids[i:i + batch_size]
            task = asyncio.create_task(process_batch(session, batch, api_key, semaphore))
            tasks.append(task)
            await asyncio.sleep(1)  # Delay between batches
            
        # Process all batches
        batch_results = await asyncio.gather(*tasks)
        for batch_data in batch_results:
            all_category_data.extend(batch_data)
    
    return all_category_data

@router.get("/update-categories")
async def update_categories(tracked_categories_id_list: List[str]):
    """Update existing categories with latest data from CMC"""
    try:
        # Find existing categories
        existing_categories = await categories_collection.find(
            {"id": {"$in": tracked_categories_id_list}}
        ).to_list(length=None)
        
        mongo_encoder = MongoJSONEncoder()
        
        for cat in existing_categories:
            cat['_id'] = mongo_encoder.default(cat['_id'])
        
        if not existing_categories:
            raise HTTPException(status_code=404, detail="No categories found in database")
        elif len(existing_categories) != len(tracked_categories_id_list):
            print("Not all categories found in database")
            
        # Fetch updated data from CMC
        updated_categories = await fetch_cmc_category_data(tracked_categories_id_list, CM_API_KEY)
        
        if not updated_categories:
            return existing_categories
            
        # Prepare update operations
        update_operations = []
        for category in updated_categories:
            # Ensure category is a dict and has required fields
            if isinstance(category, CategoryData):
                category = category.model_dump()
                
            update_operations.append(
                UpdateOne(
                    {"id": category['id']},
                    {"$set": {
                        **category,
                    }},
                    upsert=True
                )
            )
            
        # Perform bulk update if we have operations
        if update_operations:
            await categories_collection.bulk_write(update_operations)
            
            # Fetch the updated documents
            updated_docs = await categories_collection.find(
                {"id": {"$in": tracked_categories_id_list}}
            ).to_list(length=None)
            
            for doc in updated_docs:
                doc['_id'] = str(doc['_id'])
            # Convert to serializable format
            return updated_docs
            
        return existing_categories
        
    except Exception as e:
        print(f"Error in update_categories: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating categories: {str(e)}")
    
@router.get('/get-default-categories', response_model=CachedResponse[CategoryResponse])
@cached_endpoint("get-default-categories", expiry_minutes=5)
async def get_default_categories():
    try:
        some_categories = await categories_collection.find().limit(10).to_list()
        some_categories_ids = [str(cat['id']) for cat in some_categories]
        needs_update = False
        
        for category in some_categories:
            try:
                last_updated = category.get('last_updated')
                if not last_updated:
                    needs_update = True
                    break
                
                try:
                    if last_updated < datetime.now() - timedelta(minutes=5):
                        needs_update = True
                        break
                except TypeError:
                    print("Error parsing timestamp")
                    needs_update = True
                    break
            except (ValueError, TypeError):
                needs_update = True
                break
        
        if needs_update:
            updated_categories = await update_categories(some_categories_ids)
            return updated_categories
        
        return some_categories
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
    
async def handle_category_update(category_id: str, category_data: CategoryData) -> CategoryData:
    """
    Handle category update with fallback logic
    Returns either updated category data or original data with encoded _id
    """
    mongo_encoder = MongoJSONEncoder()
    try:
        # First attempt: Check timestamp and update if needed
        should_update = False
        try:
            last_updated = category_data.get('last_updated')
            if not last_updated or last_updated < datetime.now() - timedelta(minutes=5):
                should_update = True
        except TypeError:
            # If there's a type error in timestamp checking, force an update
            print(f"Error parsing timestamp for category {category_id}, forcing update")
            should_update = True
        
        # Attempt update if needed
        if should_update:
            try:
                updated_categories = await update_categories([category_id])
                if updated_categories and len(updated_categories) > 0:
                    json_category = updated_categories[0]
                    json_category['_id'] = mongo_encoder.default(json_category['_id'])
                    return json_category
            except Exception as update_error:
                print(f"Error during category update: {str(update_error)}")
                # Fall through to return original data
        
        # If no update needed or update failed, return original data
        category_data['_id'] = mongo_encoder.default(category_data['_id'])
        return category_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
    
@router.post("/add-CMC-category")
async def add_cmc_category(category_id: dict):
    category_id = category_id['categoryId']
    try:
        category_data = await categories_collection.find_one({"id": category_id})
        if not category_data:
            raise HTTPException(status_code=404, detail="Category doesnt exist")
        
        category_tracked = await tracked_categories.find_one({"id": category_id})
        
        if category_tracked:
            raise HTTPException(status_code=400, detail="Category already tracked")
        
        try:
            await tracked_categories.insert_one({"id": category_id})
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"failed to insert category into DB: {str(e)}")
    
        print("Category added")

        return await handle_category_update(category_id, category_data)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
    
@router.post("/remove-CMC-category")
async def remove_cmc_category(category_id: dict):
    category_id = category_id['categoryId']
    try:
        category_tracked = await tracked_categories.find_one({"id": category_id})
        if not category_tracked:
            raise HTTPException(status_code=404, detail="Category not tracked")
        print("Category tracked")
        try:
            await tracked_categories.delete_one({"id": category_id})
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"failed to remove category from DB: {str(e)}")
        print("Category removed")
        return {"message": "Category removed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
    
def get_marketcap_data(token_data):
    total_market_cap = sum(token['quote']['USD']['market_cap'] for token in token_data)
    # Calculate average market cap change
    market_cap_change = sum(token['quote']['USD']['percent_change_24h'] for token in token_data) / len(token_data)
    return total_market_cap, market_cap_change

def get_volume_data(token_data):
    total_volume = sum(token['quote']['USD']['volume_24h'] for token in token_data)
    # Calculate average volume change
    volume_change = sum(token['quote']['USD']['volume_change_24h'] for token in token_data) / len(token_data)
    return total_volume, volume_change
    
async def update_custom_categories(custom_categories):
    update_categories = []
    for category in custom_categories:
        token_ids = [token['id'] for token in category['tokens_ids']]
        token_data = []
        
        try:
            for token_id in token_ids:
                token_exists = await tokens_collection.find_one({"id": token_id})
                token_data.append(token_exists)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to get token data: {str(e)}")
        
        if len(token_data) != len(token_ids):
            raise HTTPException(status_code=404, detail="Some token was not found")
        
        for token in token_data:
            token['_id'] = str(token['_id'])
            
        try:
            total_market_cap, market_cap_change = get_marketcap_data(token_data)
            total_volume, volume_change = get_volume_data(token_data)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to calculate market cap or volume: {str(e)}")
        
        try:
            updated_category = {
                'id': category['id'],
                'name': category['name'],
                'num_tokens': len(token_data),
                'market_cap': total_market_cap,
                'market_cap_change': market_cap_change,
                'volume': total_volume,
                'volume_change': volume_change,
                'tokens_ids': [
                    {
                        'id': token['id'],
                        'symbol': token['symbol']
                    }
                    for token in token_data
                ],
                'last_updated': datetime.now()
            }
            await custom_categories_collection.update_one(
                {"id": category['id']},
                {"$set": updated_category}
            )
            update_categories.append(updated_category)
            print("Category updated")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to update category: {str(e)}")
         
    return update_categories
    
@router.get("/get-custom-categories", response_model=CachedResponse[List[CustomCategory]])
@cached_endpoint("get-custom-categories", expiry_minutes=5)
async def get_custom_categories(request: Request):
    try:
        custom_categories = await custom_categories_collection.find().to_list()
        needs_update = False
        
        for category in custom_categories:
            last_updated = category.get('last_updated')
            if last_updated < datetime.now() - timedelta(minutes=5):
                needs_update = True
                break
        
        if needs_update:
            try:
                updated_categories = await update_custom_categories(custom_categories)
                return updated_categories
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to update custom categories: {str(e)}")
            
        return custom_categories
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
    
@router.post("/remove-custom-category")
async def remove_custom_category(category_id: dict):
    category_id = category_id['categoryId']
    try:
        category_tracked = await custom_categories_collection.find_one({"id": category_id})
        if not category_tracked:
            raise HTTPException(status_code=404, detail="Category not tracked")
        print("Category tracked")
        try:
            await custom_categories_collection.delete_one({"id": category_id})
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"failed to remove category from DB: {str(e)}")
        print("Category removed")
        return {"message": "Category removed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
    
    
@router.get("/get-default-tokens", response_model=CachedResponse[List[FullCMCToken]])
@cached_endpoint("get-default-tokens", expiry_minutes=5)
async def get_default_tokens():
    try:
        default_tokens = await tokens_collection.find().limit(50).to_list()
        return default_tokens
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
    
@router.post("/find-tokens-by-name", response_model=List[FullCMCToken])
async def get_tokens_by_name(token_name: dict):
    try:
        token_name = token_name['name']
        print(f"Searching for: {token_name}")
        
        # Validate and clean search input
        token_name = token_name.strip()
        if not token_name:
            raise HTTPException(status_code=400, detail="Search term cannot be empty")
            
        # Escape special regex characters to prevent injection
        escaped_name = "".join([char if char.isalnum() else f"\\{char}" for char in token_name])
        
        # Use $or operator to match either name OR symbol
        tokens = await tokens_collection.find(
            {
                "$or": [
                    {"name": {"$regex": escaped_name, "$options": "i"}},
                    {"symbol": {"$regex": escaped_name, "$options": "i"}}
                ]
            }
        ).to_list(length=None)
        
        # Serialize ObjectId for JSON response
        response_tokens = []
        for token in tokens:
            token['_id'] = str(token['_id'])
            response_tokens.append(token)
            
        print(f"Found {len(response_tokens)} tokens")
        return response_tokens if response_tokens else []
        
    except Exception as e:
        print(f"Error in token search: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

@router.post("/add-custom-category") 
async def add_custom_category(category_data: dict):
    unique_id = str(uuid.uuid4())
    name = category_data['name']
    token_ids = category_data['token_ids']
    num_tokens = len(token_ids)
    
    token_data = []
    try:
        for token_id in token_ids:
            token_exists = await tokens_collection.find_one({"id": token_id})
            token_data.append(token_exists)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get token data: {str(e)}")
    
    if len(token_data) != num_tokens:
        raise HTTPException(status_code=404, detail="Some token was not found") 
    
    for token in token_data:
        token['_id'] = str(token['_id'])
    
    try:
        total_market_cap, market_cap_change = get_marketcap_data(token_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate market cap: {str(e)}")
    
    try:
        total_volume, volume_change = get_volume_data(token_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate volume: {str(e)}")
    
    try:
        custom_category = {
            'id': unique_id,
            'name': name,
            'num_tokens': num_tokens,
            'market_cap': total_market_cap,
            'market_cap_change': market_cap_change,
            'volume': total_volume,
            'volume_change': volume_change,
            'tokens_ids': [
                {
                    'id': token['id'],
                    'symbol': token['symbol']
                }
                for token in token_data
            ],
            'last_updated': datetime.now()
            }
        await custom_categories_collection.insert_one(custom_category)
        print("Category added")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to insert category: {str(e)}")
    
    custom_category['_id'] = str(custom_category['_id'])
    
    return custom_category