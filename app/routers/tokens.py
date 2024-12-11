# app/routers/tokens.py
from fastapi import APIRouter, HTTPException, BackgroundTasks, Response, status
from requests.exceptions import HTTPError
from typing import Optional, Dict, List
from pydantic import BaseModel
from app.schemas.tokens.full_token import FullCMCToken
from app.schemas.tokens.token import Token
from app.utils.token_updates import update_all_tokens
from requests import Session
import httpx
from datetime import datetime, timedelta

# Local imports 
from app.schemas.wallet.wallet import Wallet, WalletData
from app.schemas.wallet.wallet import (Token)
from app.schemas.tokens.full_token import FullCMCToken
from app.schemas.tokens.zeriontoken import ZerionToken
from app.utils.formatters import format_zerion_token

# Environment variables
from app.core.config import CM_API_KEY
from app.core.config import CG_DEMO_API_KEY
from app.core.config import ZERION_API_KEY

# DB
from app.core.db import CG_id_map
from app.core.db import tokens_collection
from app.core.db import zerion_tokens

# Utils
from app.utils.helpers import safe_get, safe_float

router = APIRouter()

class CG(BaseModel):
    name: str
    symbol: str
    
@router.post('/update_tokens', status_code=200)
async def update_tokens(backgroundtasks: BackgroundTasks, response: Response):
    backgroundtasks.add_task(update_all_tokens)
    response.status_code = status.HTTP_200_OK
    return response

@router.get('/token_via_id/{token_id}', response_model=FullCMCToken)
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
    
@router.get("/token_via_symbol/{token_symbol}", response_model=FullCMCToken)
async def get_token_by_symbol(token_symbol: str):
    url = 'https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest'
    print(f"Fetching token with symbol: {token_symbol}")
    
    # Clean the symbol - remove any special characters that CMC doesn't support
    clean_symbol = token_symbol.strip().upper()
    
    parameters = {
        'symbol': clean_symbol,
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
        response.raise_for_status()
        data = response.json()

        if 'data' not in data:
            raise HTTPException(status_code=404, detail="Token not found in response")
            
        if not data['data']:
            raise HTTPException(status_code=404, detail="No data returned for token")
            
        # Safely get the first key and check if there's data
        key = list(data['data'].keys())[0]
        if not data['data'][key] or len(data['data'][key]) == 0:
            raise HTTPException(status_code=404, detail="No token data found")
            
        token_data = data['data'][key][0]
        
        # Safely handle potentially missing or null fields
        def safe_int(value, default=0):
            try:
                return int(value) if value is not None else default
            except (ValueError, TypeError):
                return default
                
        def safe_get(obj, key, default=None):
            return obj.get(key, default) 
        
        # Map the response to the FullCMCToken model with safe value handling
        full_token = FullCMCToken(
            _id={'$oid': str(token_data['id'])},
            id=token_data['id'],
            name=token_data['name'],
            symbol=token_data['symbol'],
            slug=token_data['slug'],
            num_market_pairs=safe_int(token_data.get('num_market_pairs')),
            date_added=token_data.get('date_added'),
            tags=[
                {
                    'slug': tag.get('slug', ''),
                    'name': tag.get('name', ''),
                    'category': tag.get('category', '')
                }
                for tag in token_data.get('tags', [])
            ],
            max_supply=token_data.get('max_supply'),
            circulating_supply=token_data.get('circulating_supply'),
            total_supply=token_data.get('total_supply'),
            platform=token_data.get('platform') and {
                'id': safe_get(token_data['platform'], 'id'),
                'name': safe_get(token_data['platform'], 'name'),
                'symbol': safe_get(token_data['platform'], 'symbol'),
                'slug': safe_get(token_data['platform'], 'slug'),
                'token_address': safe_get(token_data['platform'], 'token_address')
            },
            is_active=safe_int(token_data.get('is_active')),
            infinite_supply=bool(token_data.get('infinite_supply')),
            cmc_rank=safe_int(token_data.get('cmc_rank')),
            is_fiat=safe_int(token_data.get('is_fiat')),
            self_reported_circulating_supply=token_data.get('self_reported_circulating_supply'),
            self_reported_market_cap=token_data.get('self_reported_market_cap'),
            tvl_ratio=token_data.get('tvl_ratio'),
            last_updated=token_data.get('last_updated'),
            quote={
                'USD': {
                    'price': safe_get(token_data['quote']['USD'], 'price', 0),
                    'volume_24h': safe_get(token_data['quote']['USD'], 'volume_24h', 0),
                    'volume_change_24h': safe_get(token_data['quote']['USD'], 'volume_change_24h', 0),
                    'percent_change_1h': safe_get(token_data['quote']['USD'], 'percent_change_1h', 0),
                    'percent_change_24h': safe_get(token_data['quote']['USD'], 'percent_change_24h', 0),
                    'percent_change_7d': safe_get(token_data['quote']['USD'], 'percent_change_7d', 0),
                    'percent_change_30d': safe_get(token_data['quote']['USD'], 'percent_change_30d', 0),
                    'percent_change_60d': safe_get(token_data['quote']['USD'], 'percent_change_60d', 0),
                    'percent_change_90d': safe_get(token_data['quote']['USD'], 'percent_change_90d', 0),
                    'market_cap': safe_get(token_data['quote']['USD'], 'market_cap', 0),
                    'market_cap_dominance': safe_get(token_data['quote']['USD'], 'market_cap_dominance', 0),
                    'fully_diluted_market_cap': safe_get(token_data['quote']['USD'], 'fully_diluted_market_cap', 0),
                    'tvl': safe_get(token_data['quote']['USD'], 'tvl'),
                    'last_updated': safe_get(token_data['quote']['USD'], 'last_updated'),
                }
            }
        )

        return full_token
        
    except HTTPError as http_err:
        if http_err.response.status_code == 400:
            # Return None instead of raising an exception for invalid symbols
            return None
        raise HTTPException(status_code=http_err.response.status_code, 
                          detail=f"HTTP error occurred: {str(http_err)}")
    except Exception as e:
        # Return None instead of raising an exception for other errors
        return None
    
@router.post("/token_via_CG")
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
    
@router.get("/token_via_chain/{chain}/{token_address}")
async def get_token_via_chain(chain: str, token_address: str):
    url = f"https://api.coingecko.com/api/v3/simple/token_price/{chain}?contract_addresses={token_address}&vs_currencies=usd"

    headers = {
    "accept": "application/json",
    "x-cg-demo-api-key": CG_DEMO_API_KEY
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
    
@router.get("/tokens/latest")
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
    
async def get_token_price_chain(impls: List[Dict]) -> float:
    async with httpx.AsyncClient() as client:
        for impl in impls:
            chain_id = impl['chain_id']
            address = impl['address']
            if chain_id and address:
                url = f"http://127.0.0.1:8000/token_via_chain/{chain_id}/{address}"
                response = await client.get(url)
                if response.status_code != 404:
                    return response.json()

    return None

class FungibleIdRequest(BaseModel):
    fungible_id: str

@router.post("/zerionToken", response_model=ZerionToken)
async def get_zerion_token(request: FungibleIdRequest):
    fungible_id = request.fungible_id
    
    # Check if we have a cached version
    cached_token = await zerion_tokens.find_one({"fungible_id": fungible_id})
    
    if cached_token:
        # Convert the datetime string back to datetime object if needed
        last_updated = safe_get(cached_token, ['last_updated'])
        if isinstance(last_updated, str):
            last_updated = datetime.fromisoformat(last_updated.replace('Z', '+00:00'))
            
        # Check if the cache is still valid (less than 5 minutes old)
        if last_updated and datetime.now() - last_updated < timedelta(minutes=5):
            # Convert stored dict back to ZerionToken model
            return ZerionToken.model_validate(cached_token)
    
    # Fetch new data from Zerion API
    async with httpx.AsyncClient() as client:
        url = f"https://api.zerion.io/v1/fungibles/{fungible_id}?currency=usd"
        headers = {
            "accept": "application/json",
            "authorization": f"Basic {ZERION_API_KEY}==",
        }
        
        response = await client.get(url, headers=headers)
        
        if response.status_code == 200:
            response_data = response.json()
            
            # Add timestamp to the data
            current_time = datetime.now()
            
            # Format the token data
            formatted_token = format_zerion_token(response_data)
            
            # Add fungible_id and last_updated to the formatted data
            formatted_token.update({
                'fungible_id': fungible_id,
                'last_updated': current_time
            })
            
            # Store in database
            await zerion_tokens.update_one(
                {"fungible_id": fungible_id},
                {"$set": formatted_token},
                upsert=True
            )
            
            # Return as ZerionToken model
            return ZerionToken.model_validate(formatted_token)
        else:
            raise HTTPException(
                status_code=response.status_code,
                detail="Error fetching data from Zerion API"
            )
