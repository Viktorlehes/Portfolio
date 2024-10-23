from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import motor.motor_asyncio
import os
from datetime import datetime

MONGO_URI = os.getenv("DB_URI")

client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
db = client['Main']  # Database name

tokens_collection = db["Tokens"]

class Token(BaseModel):
    symbol: str
    name: str
    price: float
    last_updated: datetime

async def add_test_tokens():
    token1 = Token(symbol="BTC", name="Bitcoin", price=50000, last_updated=datetime.now())
    token2 = Token(symbol="ETH", name="Ethereum", price=3000, last_updated=datetime.now())
    token3 = Token(symbol="BNB", name="Binance Coin", price=500, last_updated=datetime.now())
    token4 = Token(symbol="ADA", name="Cardano", price=2, last_updated=datetime.now())

    await tokens_collection.insert_one(token1)
    await tokens_collection.insert_one(token2)
    await tokens_collection.insert_one(token3)
    await tokens_collection.insert_one(token4)
    return {"message": "Token added", "tokens": [token1, token2, token3, token4]}



if __name__ == "__main__":  
    import asyncio
    loop = asyncio.get_event_loop()
    loop.run_until_complete(add_test_tokens())