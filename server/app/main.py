# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import motor.motor_asyncio
from app.routers import overview, bundles, dashboard
import os
from fastapi import HTTPException
from requests import Request, Session
from .schemas.full_token import FullToken

app = FastAPI()

MONGO_URI = os.getenv("DB_URI")
CM_API_KEY = os.getenv("CM_API_KEY")

client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
db = client['Main']  # Database name

tokens_collection = db["Tokens"]

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

@app.get('/token_via_id/{token_id}', response_model=FullToken)
async def get_token(token_id: str):
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

            # Map the response to the FullToken model
            full_token = FullToken(
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
    
@app.get("/tokens/latest")
def get_latest_tokens():
    url = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest'
    
    parameters = {
        'limit': '15',
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
        
        return data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")