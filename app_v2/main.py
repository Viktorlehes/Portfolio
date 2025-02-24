# app/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from typing import AsyncGenerator
import logging
from datetime import datetime, timezone
from fastapi.middleware.cors import CORSMiddleware

# config
from app_v2.core.auth_utils import verify_api_key
from app_v2.core.responses import APIResponse

# Background tasks
from app_v2.services.background.base import task_manager
from app_v2.services.background.wallet_updates import WalletUpdateTask
from app_v2.services.background.token_updates import TokenUpdateTask
from app_v2.services.background.category_updates import CategoryUpdateTask

# Database
from app_v2.services.db.base import DatabaseClient

# Routers
from app_v2.api.v1.endpoints import users, wallets, charts, token
from app_v2.api.v1.endpoints.pages import overview, alerts

logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Lifespan context manager for FastAPI application.
    Handles startup and shutdown events for both DB and background tasks.
    """
    try:
        # Initialize database
        logging.info("Initializing database connection...")
        db_client = DatabaseClient()
        await db_client.initialize()
        logging.info("Database initialization completed")

        # Initialize background tasks
        logging.info("Starting background tasks...")
        wallet_task = WalletUpdateTask(interval_seconds=30)  # 5 minutes
        task_manager.register_task(wallet_task)
        
        token_task = TokenUpdateTask(interval_seconds=30)
        task_manager.register_task(token_task)
        
        category_task = CategoryUpdateTask(interval_seconds=30)
        task_manager.register_task(category_task)
        
        task_manager.start_all()
        logging.info("Background tasks started successfully")

        yield 

    except Exception as e:
        logging.error(f"Error during startup: {str(e)}")
        raise
    finally:
        # Shutdown
        logging.info("Shutting down application...")
        
        # Stop background tasks
        task_manager.stop_all()
        logging.info("Background tasks stopped")
        
        # Close database connection
        await db_client.close()
        logging.info("Database connection closed")

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", 'https://portfolio-self-chi-74.vercel.app'],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=APIResponse(
            success=False,
            error=exc.detail,
            status_code=exc.status_code,
            timestamp=datetime.now(timezone.utc)
        ).model_dump(mode='json')
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content=APIResponse(
            success=False,
            error=str(exc),
            status_code=500,
            timestamp=datetime.now(timezone.utc)
        ).model_dump(mode='json')
    )


#Add dependencies=[Depends(verify_api_key)]
app.include_router(users.router, prefix="/user", tags=["user"], dependencies=[Depends(verify_api_key)])
app.include_router(wallets.router, prefix="/wallet", tags=["wallet"], dependencies=[Depends(verify_api_key)])
app.include_router(overview.router, prefix="/overview", tags=["Overview"], dependencies=[Depends(verify_api_key)])
app.include_router(charts.router, prefix="/chart", tags=["Chart"], dependencies=[Depends(verify_api_key)])
app.include_router(alerts.router, prefix="/alert", tags=["Alert"], dependencies=[Depends(verify_api_key)])
app.include_router(token.router, prefix="/token", tags=["Token"], dependencies=[Depends(verify_api_key)])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)