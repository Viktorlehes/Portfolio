# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import overview, dashboard, tokens, wallets
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import Depends

# Utils
from app.utils.token_updates import update_all_tokens 
from app.core.auth import verify_api_key

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
)

# Include routers
app.include_router(overview.router, prefix="/overview", tags=["Overview"], dependencies=[Depends(verify_api_key)])
app.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"], dependencies=[Depends(verify_api_key)])
app.include_router(tokens.router, prefix="/tokens", tags=["Tokens"], dependencies=[Depends(verify_api_key)])
app.include_router(wallets.router, prefix="/wallets", tags=["Wallets"], dependencies=[Depends(verify_api_key)])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)