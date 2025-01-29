# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import overview, dashboard, tokens, wallets, alerts
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import Depends
from requests import Session

# Utils
from app.utils.token_updates import update_all_tokens 
from app.core.auth import verify_api_key
from app.routers.wallets import get_wallets

@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = AsyncIOScheduler()
    
    @scheduler.scheduled_job('interval', minutes=1)
    async def scheduled_job():
        print("Updating tokens with scheduler...")
        await update_all_tokens()
        
    @scheduler.scheduled_job('interval', minutes=5)
    async def scheduled_job():
        print("Updating wallets with scheduler...")
        await get_wallets()
    
    scheduler.start()
    print("Started scheduler!")
    
    try:
        yield  # Only one yield statement here
    finally:
        print("Shutting down scheduler...")
        scheduler.shutdown()

app = FastAPI(lifespan=lifespan)

# Set up CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", 'https://portfolio-self-chi-74.vercel.app'],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Include routers
app.include_router(overview.router, prefix="/overview", tags=["Overview"], dependencies=[Depends(verify_api_key)])
app.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"], dependencies=[Depends(verify_api_key)])
app.include_router(tokens.router, prefix="/tokens", tags=["Tokens"], dependencies=[Depends(verify_api_key)])
app.include_router(wallets.router, prefix="/wallets", tags=["Wallets"], dependencies=[Depends(verify_api_key)])
app.include_router(alerts.router, prefix="/alerts", tags=["Alerts"], dependencies=[Depends(verify_api_key)])

async def seed_cmc_ids():
    # Seed cmc_ids map
    from app.core.db import CMC_id_map
    from app.core.config import CM_API_KEY
    
    url = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/map'

    headers = {
        'Accepts': 'application/json',
        'X-CMC_PRO_API_KEY': CM_API_KEY
    }
    
    session = Session()
    session.headers.update(headers)
    
    try:
        # Fetch the tokens data from CoinMarketCap
        response = session.get(url, headers=headers)
        response.raise_for_status()
        data = response.json()
        
        # Check if the token data is in the response
        if 'data' in data:
            print("Seeding CMC id map...")
            
            inserted = await CMC_id_map.insert_many(data['data'])
            
            if inserted:
                print("CMC id map seeded!", inserted)
            else:
                print("CMC id map seeding failed!")
        else:
            print("No data in response!")
    except Exception as e:
        print(f"Error seeding CMC id map: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)