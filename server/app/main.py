# main.py
from fastapi import FastAPI, HTTPException, BackgroundTasks, Response, status
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import motor.motor_asyncio
from app.routers import overview, bundles, dashboard
import os
from requests import Request, Session
from .schemas.full_token import FullCMCToken
from .schemas.token import Token
from pymongo import UpdateOne
import asyncio
import math
from contextlib import asynccontextmanager 
import aiohttp 
from pydantic import BaseModel
import uvicorn

MONGO_URI = os.getenv("DB_URI")
CM_API_KEY = os.getenv("CM_API_KEY")
CG_API_KEY = os.getenv("CG_DEMO_API_KEY")
ZERION_API_KEY = os.getenv("ZERION_API")

def safe_get(d, keys, default=None):
    """Safely retrieve a nested value from a dictionary, returning default if any key is missing."""
    for key in keys:
        if d is None or not isinstance(d, dict):
            return default
        d = d.get(key)
    return d if d is not None else default

def safe_float(value, precision=None):
    """Convert value to float with optional rounding, return None if conversion fails."""
    try:
        f_value = float(value)
        return round(f_value, precision) if precision is not None else f_value
    except (TypeError, ValueError):
        return 0

async def update_all_tokens():
    url = 'https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest'
    batch_size = 100
    
    # Get tokens from database
    try:
        asyncio_tokens = tokens_collection.find({}, {'id': 1, 'coingecko_id': 1})
        tokens = []
        async for document in asyncio_tokens:
            tokens.append(document)

        # Separate tokens by type
        cmc_ids = []
        cg_ids = []
        for token in tokens:
            if "coingecko_id" in token:
                cg_ids.append(token['id'])
            else:
                cmc_ids.append(token['id'])

        total_cmc_tokens = len(cmc_ids)
        num_batches = math.ceil(total_cmc_tokens / batch_size)

        headers = {
            'Accepts': 'application/json',
            'X-CMC_PRO_API_KEY': CM_API_KEY
        }

        async with aiohttp.ClientSession(headers=headers) as session:
            for batch_num in range(num_batches):
                start_idx = batch_num * batch_size
                end_idx = min((batch_num + 1) * batch_size, total_cmc_tokens)
                current_batch = cmc_ids[start_idx:end_idx]
                token_ids = ','.join(str(id) for id in current_batch)
                
                parameters = {
                    'id': token_ids,
                    'convert': 'USD',
                }

                try:
                    async with session.get(url, params=parameters) as response:
                        if response.status != 200:
                            error_text = await response.text()
                            continue
                            
                        data = await response.json()
                        bulk_operations = []

                        if 'data' in data:
                            for token_id in current_batch:
                                str_token_id = str(token_id)
                                if str_token_id in data['data']:
                                    token_data = data['data'][str_token_id]
                                    try:
                                        bulk_operations.append(
                                            UpdateOne(
                                                {'id': token_id},
                                                {'$set': {
                                                    'name': token_data['name'],
                                                    'symbol': token_data['symbol'],
                                                    'quote': token_data['quote'],
                                                    'last_updated': token_data['last_updated']
                                                }},
                                                upsert=True
                                            )
                                        )
                                    except KeyError as ke:
                                        print(f"Missing key in token data for ID {token_id}: {ke}")
                                        print("Token data:", token_data)
                                else:
                                    print(f"Token ID {token_id} not found in API response")

                            if bulk_operations:
                                try:
                                    result = await tokens_collection.bulk_write(bulk_operations)
                                    print(f"Batch {batch_num + 1}/{num_batches}:")
                                    print(f"- Modified: {result.modified_count}")
                                    print(f"- Upserted: {result.upserted_count}")
                                    print(f"- Matched: {result.matched_count}")
                                except Exception as e:
                                    print(f"Error in bulk update for batch {batch_num + 1}: {str(e)}")
                            else:
                                print(f"No updates needed for batch {batch_num + 1}")
                        else:
                            print(f"No data in response for batch {batch_num + 1}")
                            print("Response:", data)

                except Exception as e:
                    print(f"Error processing batch {batch_num + 1}: {str(e)}")
                    continue

                # Rate limiting
                await asyncio.sleep(1)

    except Exception as e:
        print(f"Error in update_all_tokens: {str(e)}")
        raise

    # Update CoinGecko tokens
    if len(cg_ids) > 0:
        total_cg_tokens = len(cg_ids)

        headers = {
            "accept": "application/json",
            "x-cg-demo-api-key": CG_API_KEY
        }

        session = Session()
        session.headers.update(headers)

        for token_id in cg_ids:
            url = f"https://api.coingecko.com/api/v3/coins/{token_id}"

            try:
                response = session.get(url)
                response.raise_for_status()
                data = response.json()

                if data:
                    try:
                        await tokens_collection.update_one(
                            {'id': token_id},
                            {'$set': {
                                'name': data['name'],
                                'symbol': data['symbol'],
                                'price': data['market_data']['current_price'],
                                'last_updated': data['last_updated']
                            }}
                        )
                        print(f"Updated token {data['name']} ({data['symbol']})")
                    except Exception as e:
                        error_msg = f"Error updating token {data['name']} ({data['symbol']}): {str(e)}"
                        print(error_msg)
            except Exception as e:
                error_msg = f"Error fetching token {token_id}: {str(e)}"
                print(error_msg)
                continue

            await asyncio.sleep(1)

        print("CoinGecko tokens updated")

    print("Token update completed")

@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = AsyncIOScheduler()
    
    @scheduler.scheduled_job('interval', hours=1)
    async def scheduled_job():
        await update_all_tokens() 
    
    print("Adding scheduler job...")
    scheduler.start()
    print("Started scheduler!")
    
    try:
        yield
    finally:
        print("Shutting down scheduler...")
        scheduler.shutdown()
app = FastAPI(lifespan=lifespan)

# Set up CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Frontend origin
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)

app.include_router(overview.router, prefix="/overview", tags=["Overview"])
app.include_router(bundles.router, prefix="/bundles", tags=["Bundles"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])

client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
db = client['Main']  # Database name

tokens_collection = db["Tokens"]
CG_id_map = db["CG_ID_MAP"]

@app.post('/update_tokens', status_code=200)
async def update_tokens( backgroundtasks: BackgroundTasks,response: Response):
    backgroundtasks.add_task(update_all_tokens)
    response.status_code = status.HTTP_200_OK
    return response

@app.get('/token_via_id/{token_id}', response_model=FullCMCToken)
async def get_token_via_id(token_id: str):
    url = 'https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest'
    print(f"Fetching token with id: {token_id}")
    
    parameters = {
        'id': token_id,
        'convert': 'USD',
    }
    headers = {
        'Accepts': 'application/json',
        'X-CMC_PRO_API_KEY': CM_API_KEY
    }
    session = Session()
    session.headers.update(headers)
    
    try:
        # Fetch the token data from CoinMarketCap
        response = session.get(url, params=parameters)
        response.raise_for_status()  # Raises an HTTPError for bad responses
        data = response.json()
        
        # Check if the token data is in the response
        if 'data' in data and token_id in data['data']:
            token_data = data['data'][token_id]

            # Map the response to the FullCMCToken model
            full_token = FullCMCToken(
                _id={'$oid': token_id},  # You could change this to the actual MongoDB _id if needed
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

            return full_token
        
        else:
            return {'message': "Token not found", 'data': None}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
    

@app.get("/token_via_symbol/{token_symbol}", response_model=FullCMCToken)
async def get_token_by_symbol(token_symbol: str):
    url = 'https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest'
    print(f"Fetching token with symbol: {token_symbol}")
    
    parameters = {
        'symbol': token_symbol,
        'convert': 'USD',
    }
    headers = {
        'Accepts': 'application/json',
        'X-CMC_PRO_API_KEY': CM_API_KEY
    }

    session = Session()
    session.headers.update(headers)
    
    try:
        # Fetch the token data from CoinMarketCap
        response = session.get(url, params=parameters)
        response.raise_for_status()  # Raises an HTTPError for bad responses
        data = response.json()

        # Check if the token data is in the response
        if 'data' in data:
            key = list(data['data'].keys())[0]

            token_data = data['data'][key][0]

            token_id = token_data['id']

            # Map the response to the FullCMCToken model
            full_token = FullCMCToken(
                _id={'$oid': token_id},  # You could change this to the actual MongoDB _id if needed
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

            return full_token
        
        else:
            return {'message': "Token not found", 'data': None}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

class CG(BaseModel):
    name: str
    symbol: str

@app.post("/token_via_CG")
async def get_token_via_CG(
    wallet_data: CG,
):
    token = await CG_id_map.find_one({
        "$or": [
            {"symbol": wallet_data.symbol.lower()},
            {"name": wallet_data.name}
        ]
    })

    if not token:
        error_msg = f"Failed to fetch data for token {wallet_data.name} ({wallet_data.symbol})"
        print(error_msg)
        return None

    url = f"https://api.coingecko.com/api/v3/coins/{token['id']}"

    headers = {
        'Accepts': 'application/json',
        'X-CMC_PRO_API_KEY': CM_API_KEY
    }

    session = Session()
    session.headers.update(headers)
    
    try:
        # Fetch the token data from CoinMarketCap
        response = session.get(url)
        response.raise_for_status()  # Raises an HTTPError for bad responses
        data = response.json()

        #check if platforms exist 
        if data['platforms']:
            chain = list(data['platforms'].keys())[0]
        else:
            chain = ''

        return Token(
            id=safe_get(data, ['id']),
            symbol=safe_get(data, ['symbol']),
            name=safe_get(data, ['name']),
            value=0,
            price=safe_float(safe_get(data, ['market_data', 'current_price', 'usd']), 3),
            amount=0,
            change24h=safe_float(safe_get(data, ['market_data', 'price_change_24h']), 2),
            position_type='',
            chain=chain,
            last_updated=safe_get(data, ['last_updated']),
            coingecko_id=True
        )
    
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Token not found: {str(e)}")

            
@app.get("/token_via_chain/{chain}/{token_address}")
async def get_token_via_chain(chain: str, token_address: str):
    url = f"https://api.coingecko.com/api/v3/simple/token_price/{chain}?contract_addresses={token_address}&vs_currencies=usd"

    headers = {
    "accept": "application/json",
    "x-cg-demo-api-key": CG_API_KEY
    }

    session = Session()
    session.headers.update(headers)
    
    try:
        # Fetch the token data from CoinMarketCap
        response = session.get(url)
        response.raise_for_status()  # Raises an HTTPError for bad responses
        data = response.json()
        if data:
            return data[token_address]['usd']
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Token not found: {str(e)}")
        
@app.get("/tokens/latest")
async def get_latest_tokens():
    url = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest'
    
    parameters = {
        'limit': '1000',
        'convert': 'USD',
    }
    headers = {
        'Accepts': 'application/json',
        'X-CMC_PRO_API_KEY': CM_API_KEY
    }
    session = Session()
    session.headers.update(headers)
    
    try:
        # Fetch the token data from CoinMarketCap
        response = session.get(url, params=parameters)
        response.raise_for_status()  # Raises an HTTPError for bad responses
        data = response.json()
        
        if 'data' in data:
            try:
                for token in data['data']:
                    try:
                        await tokens_collection.insert_one(token)
                        print('Token inserted into DB')
                    except Exception as e:
                        error_msg = f"error inserting token into DB: {str(e)}"
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
        return "Tokens inserted into DB"
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
    
    
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)