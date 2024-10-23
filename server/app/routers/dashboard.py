from fastapi import APIRouter
import httpx
from dotenv import load_dotenv
import os
import motor.motor_asyncio
from bson import ObjectId
from fastapi import HTTPException 
from ..schemas.token import Token
from ..schemas.wallet import Wallet

load_dotenv()
coinmarket_api_key = os.getenv("CM_API_KEY")
coingecko_api_key = os.getenv("CG_DEMO_API_KEY")

router = APIRouter()

MONGO_URI = os.getenv("DB_URI")
ZERION_API_BASE_URL = "https://api.zerion.io/v1"
ZERION_API_KEY = os.getenv("ZERION_API_KEY")

client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
db = client['Main']

wallets_collection = db["Wallets"]
tokens_collection = db["Tokens"]

@router.get('/wallet/{wallet_address}', response_model=Wallet)
async def get_wallet(wallet_address: str):
    try:
        print("Fetching wallet...")
        wallet = await wallets_collection.find_one({"address": wallet_address})
        
        if not wallet:
            raise HTTPException(status_code=404, detail="Wallet not found")
        
        print("Wallet found")
        tokens = []
        for token in wallet["tokens"]:
            token_data = await tokens_collection.find_one({"id": int(token["id"])})
            if token_data:
                if "_id" in token_data and isinstance(token_data["_id"], ObjectId):
                    token_data["_id"] = str(token_data["_id"])

                token_value = round(float(token["amount"]) * float(token_data["quote"]["USD"]["price"]), 2)
                
                formated_token = Token(
                    id=token_data["id"],
                    symbol=token_data["symbol"],
                    name=token_data["name"],
                    value=token_value,
                    price=round(float(token_data["quote"]["USD"]["price"]), 2),
                    amount=token["amount"],
                    change24h=token_data["quote"]["USD"]["percent_change_24h"],
                    last_updated=token_data["last_updated"]
                )
            else:
                print(f"Token data for token id {token['id']} not found, fetching from CoinMarketCap")
                async with httpx.AsyncClient() as client:
                    url = f"http://127.0.0.1:8000/token_via_id/{token['id']}"
                    response = await client.get(url)
                    token_data = response.json()
                    if token_data:
                        print(token_data)
                        try:
                            tokens_collection.insert_one(token_data)
                        except Exception as e:
                            raise HTTPException(status_code=500, detail=f"Could not insert token into DB: {str(e)}")
                            
                        print('Token inserted into DB')
                        token_value = round(float(token["amount"]) * float(token_data["quote"]["USD"]["price"]), 2)
                        formated_token = Token(
                            id=token_data["id"],
                            symbol=token_data["symbol"],
                            name=token_data["name"],
                            value=token_value,
                            price=round(float(token_data["quote"]["USD"]["price"]), 2),
                            amount=token["amount"],
                            change24h=token_data["quote"]["USD"]["percent_change_24h"],
                            last_updated=token_data["last_updated"]
                        )
                    else:
                        print(token_data.get('message', 'Unknown error occurred while fetching token data'))
                        continue  
    
            tokens.append(formated_token)
        return Wallet(address= wallet['address'] , tokens=tokens, name=wallet["name"], color=wallet["color"])
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")
    
# Asynchronous function to get wallet data using httpx
async def get_new_wallet(wallet_address: str):
    async with httpx.AsyncClient() as client:
        # Zerion API URL for fetching tokens
        url = f"{ZERION_API_BASE_URL}/wallets/{wallet_address}/positions/?currency=usd"
        
        # API headers
        headers = {
            "Authorization": f"Bearer {ZERION_API_KEY}",
            "Content-Type": "application/json",
        }
        
        # Perform the async GET request
        response = await client.get(url, headers=headers)
        
        # Check if request was successful
        if response.status_code == 200:
            return response.json()
        else:
            # Raise an HTTPException if Zerion API returns an error
            raise HTTPException(status_code=response.status_code, detail="Error fetching data from Zerion API")

# FastAPI route to get tokens by public address using the asynchronous httpx client
@router.get("/manage/new_wallet/{wallet_address}")
async def get_tokens(wallet_address: str):
    try:
        # Fetch wallet data asynchronously
        wallet_data = await get_new_wallet(wallet_address)
        return wallet_data  # You can process or filter the data before returning
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))