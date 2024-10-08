# main.py
from fastapi import FastAPI
import uvicorn
from app.routers import overview, bundles

app = FastAPI()

app.include_router(overview.router, prefix="/overview", tags=["Overview"])
app.include_router(bundles.router, prefix="/bundles", tags=["Bundles"])

@app.get("/")
async def read_root():
    return {"message": "Welcome to the FastAPI backend!"}

@app.get("/items/{item_id}")
async def read_item(item_id: int, q: str = None):
    return {"item_id": item_id, "query": q}