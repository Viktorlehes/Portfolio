from fastapi import APIRouter, Response, status
import httpx
from dotenv import load_dotenv
import os
import motor.motor_asyncio
from bson import ObjectId
from fastapi import HTTPException 
from ..schemas.token import Token
from ..schemas.wallet import Wallet
from pydantic import BaseModel
from typing import List, Tuple, Optional, Dict
from datetime import datetime, timedelta
from ..schemas.wallet import Wallet, WalletMode, PositionType, Token, DefiPosition, FullToken, BasePosition, Quantity, Changes
from ..schemas.full_token import FullCMCToken

load_dotenv()
coinmarket_api_key = os.getenv("CM_API_KEY")
coingecko_api_key = os.getenv("CG_DEMO_API_KEY")

router = APIRouter()

MONGO_URI = os.getenv("DB_URI")
ZERION_API_KEY = os.getenv("ZERION_API_KEY")

client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
db = client['Main']

wallets_collection = db["Wallets"]
tokens_collection = db["Tokens"]

@router.get('/wallets', response_model=List[Wallet], tags=["Dashboard"])
async def get_wallets():

    print("Fetching wallets")

    try:
        async with httpx.AsyncClient() as client:
            url = f"http://127.0.0.1:8000/update_tokens"
            response = await client.post(url)
            if response.status_code == 200:
                print("Tokens updated")
            else:
                print("Failed to update tokens")

        current_time = datetime.now()

        asynio_wallets = wallets_collection.find({})

        wallets = []
    
        async for document in asynio_wallets:
            wallets.append(document)

        wallets = list(wallets)

        if not wallets:
            return []

        for wallet in wallets:
            last_updated = wallet['last_updated']

            if (current_time - last_updated) > timedelta(minutes=5):
                
                print("Updating wallet")

                wallet_data = WalletData(color=wallet['color'], name=wallet['name'], mode=wallet['wallet_mode'])

                updated_wallet = await create_new_wallet(wallet['address'], wallet_data)

                print("Updated wallet")

                wallets[wallets.index(wallet)] = updated_wallet

        print("Returning wallets")

        return wallets
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred: {str(e)}"
        )

async def get_new_wallet(wallet_address: str):
    async with httpx.AsyncClient() as client:
        url = f"https://api.zerion.io/v1/wallets/{wallet_address}/positions/?filter[positions]=no_filter&currency=usd&sort=value"
        
        headers = {
            "accept": "application/json",
            "authorization": f"Basic {ZERION_API_KEY}==",
        }
        
        response = await client.get(url, headers=headers)

        if response.status_code == 200:
            return response.json()
        else:
            raise HTTPException(status_code=response.status_code, detail="Error fetching data from Zerion API")

async def fetch_token_from_api_CMC(symbol: str) -> Optional[Dict]:
    """Fetch token data from external API."""
    async with httpx.AsyncClient() as client:
        url = f"http://127.0.0.1:8000/token_via_symbol/{symbol}"
        response = await client.get(url)
        return response.json() if response.status_code == 200 else None

async def fetch_token_from_api_CG(symbol: str, name: str) -> Optional[Dict]:
    """Fetch token data from external API."""
    async with httpx.AsyncClient() as client:
        url = f"http://127.0.0.1:8000/token_via_CG"

        request_body = {
            "symbol": symbol,
            "name": name,
        }

        response = await client.post(url, json=request_body)
        return response.json() if response.status_code == 200 else None
       

async def get_or_create_token(position: dict) -> Tuple[Optional[Dict], str]:
    """
    Get token from DB or fetch and create it if it doesn't exist.
    Returns (token_data, token_type) where token_type is one of: 'CMC', 'CG', 'zerion'
    
    Args:
        position (dict): Token position data from Zerion
        tokens_collection: MongoDB collection for tokens
    
    Returns:
        Tuple[Optional[Dict], str]: (token_data, token_type) or (None, error_message)
    """
    symbol = position['attributes']['fungible_info']['symbol']
    name = position['attributes']['fungible_info']['name']
    
    # Check if token exists in database
    token_data = await tokens_collection.find_one({
        "$or": [
            {"symbol": symbol},
            {"name": name}
        ]
    })
    
    if token_data:
        print(f"Token {symbol} found in database")
        # Determine token type based on presence of coingecko_id
        token_type = 'CG' if token_data.get('coingecko_id') else 'CMC'
        return token_data, token_type
    
    # Try fetching from CMC first
    print(f"Fetching {symbol} from CMC...")
    cmc_token_data: FullCMCToken = await fetch_token_from_api_CMC(symbol)
    
    if cmc_token_data:
        try:
            # Ensure we use the name from the position data
            cmc_token_data['name'] = name
            await tokens_collection.insert_one(cmc_token_data)
            print(f"CMC token {symbol} inserted into DB")
            return cmc_token_data, 'CMC'
        except Exception as e:
            error_msg = f"Failed to insert CMC token {symbol} into DB: {str(e)}"
            print(error_msg)
            return None, error_msg
    

    # If CMC fails and zerion has no price data, try CoinGecko
    if position['attributes']['price'] is None:
        print(f"Fetching {symbol} from CoinGecko...")
        cg_token_data = await fetch_token_from_api_CG(symbol, name)
        
        if cg_token_data:
            print(cg_token_data)
            try:
                # Add CoinGecko identifier
                cg_token_data['coingecko_id'] = True
                cg_token_data['name'] = name
                await tokens_collection.insert_one(cg_token_data)
                print(f"CoinGecko token {symbol} inserted into DB")
                return cg_token_data, 'CG'
            except Exception as e:
                error_msg = f"Failed to insert CoinGecko token {symbol} into DB: {str(e)}"
                print(error_msg)
                return None, error_msg

    # If no data found from either source, return zerion position
    print(f"No external data found for {symbol}, using Zerion data")
    return None, 'zerion'

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

def format_base_position(token_value, position) -> BasePosition:
    return BasePosition(
                id=str(position.get('id', None)),
                name=safe_get(position, ['attributes', 'fungible_info', 'name']),
                symbol=safe_get(position, ['attributes', 'fungible_info', 'symbol']),
                position_type=safe_get(position, ['attributes', 'position_type']),
                quantity=Quantity(
                    float=safe_get(position, ['attributes', 'quantity', 'float'], 0),
                    numeric=safe_get(position, ['attributes', 'quantity', 'numeric'], 0)
                ),
                value=token_value,
                price=safe_get(position, ['attributes', 'price'], 0),
                changes=Changes(
                    absolute_1d=safe_get(position, ['attributes', 'changes', 'absolute_1d'], 0),
                    percent_1d=safe_get(position, ['attributes', 'changes', 'percent_1d'], 0)
                ),
                last_updated=safe_get(position, ['attributes', 'updated_at'], ''),
                chain=safe_get(position, ['relationships', 'chain', 'data', 'id'], ''),
                icon=safe_get(position, ['attributes', 'fungible_info', 'icon', 'url'], ''),
                fungible_id=safe_get(position, ['relationships', 'fungible', 'data', 'id'], '')
            )


def format_token(position: dict, token_data: dict, token_type) -> FullToken:
    """Format token data into Token model."""

    if token_type == 'zerion':
        # Use data from position
        if position['attributes']['value'] is None:
            token_price = float(safe_get(position, ['attributes', 'price'], 0))
            token_amount = safe_get(position, ['attributes', 'quantity', 'float'], 0)

            token_value = round((token_amount) * (token_price), 2)
        else:
            token_value = safe_get(position, ['attributes', 'value'], 0)

        return FullToken(
            zerion_token=True,
            token_data=None,
            zerion_data= format_base_position(token_value, position)
        )

    elif token_type == 'CMC':
        token_price = safe_get(token_data, ['quote', 'USD', 'price'])
        token_quantity = safe_float(safe_get(position, ['attributes', 'quantity', 'float'], 0), 3)

        token_value = round((token_quantity or 0) * (token_price or 0), 2)

        return FullToken(
            zerion_token=False,
            token_data=Token(
                id=str(token_data.get("id", None)),
                symbol=token_data.get("symbol", None),
                name=token_data.get("name", None),
                value=token_value,
                price=token_price,
                amount=token_quantity,
                change24h=safe_float(safe_get(token_data, ['quote', 'USD', 'percent_change_24h']), 2),
                position_type=safe_get(position, ['attributes', 'position_type']),
                chain=safe_get(position, ['relationships', 'chain', 'data', 'id']),
                last_updated=token_data.get("last_updated", None)
                ),

            zerion_data=format_base_position(
                token_value if safe_get(position, ['attributes', 'value']) is None else safe_get(position, ['attributes', 'value']),
                position
            )
        )
    
    elif token_type == 'CG':
        token_price = safe_get(token_data, ['price'])
        token_quantity = safe_float(safe_get(position, ['attributes', 'quantity', 'float'], 0), 3)

        token_value = round((token_quantity or 0) * (token_price or 0), 2)

        return FullToken(
            zerion_token=False,
            token_data= Token(
                id=str(token_data.get("id", None)),
                symbol=token_data.get("symbol", None),
                name=token_data.get("name", None),
                value=token_value,
                price=token_price,
                amount=token_quantity,
                change24h=safe_get(token_data, ['change24h']),
                position_type='',
                chain=safe_get(token_data, ['chain']),
                last_updated=token_data.get("last_updated", None),
                coingecko_id=True
            ),
            zerion_data=format_base_position(
                token_value if safe_get(position, ['attributes', 'value']) is None else safe_get(position, ['attributes', 'value']),
                position
            )
        )

@router.delete("/manage/delete_wallet/{wallet_address}")
async def delete_wallet(wallet_address: str):
    """Delete a wallet by its ID."""
    try:
        wallet = await wallets_collection.find_one({"address": wallet_address})
        if not wallet:
            raise HTTPException(
                status_code=404,
                detail="Wallet not found"
            )

        await wallets_collection.delete_one({"address": wallet_address})
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred: {str(e)}"
        )

async def get_token_price_chain(impls: List[Dict]) -> float:
    async with httpx.AsyncClient() as client:
        for impl in impls:
            chain_id = impl['chain_id']
            address = impl['address']
            if chain_id and address:
                print(f"Fetching token price for {address} on chain {chain_id}")
                url = f"http://127.0.0.1:8000/token_via_chain/{chain_id}/{address}"
                response = await client.get(url)
                if response.status_code != 404:
                    return response.json()

    return None

async def process_wallet_positions(wallet_positions: list) -> Tuple[List[FullToken]]:
    """
    Process all wallet positions in a wallet.
    Returns (tokens)
    """
    tokens = []

    for position in wallet_positions:
        try:
            token_data, token_type = await get_or_create_token(position)

            token: FullToken = format_token(position, token_data, token_type)
            tokens.append(token)
            
        except Exception as e:
            print(f"Error processing position {position['attributes']['fungible_info']['symbol']}: {str(e)}")
            continue

    return tokens

async def process_defi_positions(positions: List[dict]) -> List[DefiPosition]:
    """
    Process all positions in a wallet based on the selected mode.
    Returns (tokens, defi_positions, loans, zerion_tracked_positions)
    """
    defi_positions = []

    for position in positions:
        token_price = None

        if 'price' not in position['attributes'] or position['attributes']['price'] is None:
            token_price = await get_token_price_chain(position['attributes']['fungible_info']['implementations'])

            if token_price:
                position['attributes']['price'] = token_price

        try:
            defi_pos = format_defi_position(position)
            defi_positions.append(defi_pos)
        
        except Exception as e:
            print(f"Error processing position {position['attributes']['fungible_info']['symbol']}: {str(e)}")
            continue

    return defi_positions

def format_defi_position(position: dict) -> DefiPosition:
    """Format DeFi position data"""
    base_data: BasePosition = format_base_position(safe_get(position, ['attributes', 'value'], 0), position)
    
    return DefiPosition(
        **base_data.model_dump(),
        protocol_id=safe_get(position, ['relationships', 'chain', 'links', 'related'], ''),
        protocol_link=safe_get(position, ['attributes', 'application_metadata', 'url'], ''),
        protocol_icon=safe_get(position, ['attributes', 'application_metadata', 'icon', 'url'], ''),
        protocol_chain=safe_get(position, ['relationships', 'chain', 'data', 'id'], ''),
        protocol=safe_get(position, ['attributes', 'protocol'], ''),
        dapp=safe_get(position, ['relationships', 'dapp', 'data', 'id'], '')
    )


class WalletData(BaseModel):
    color: str
    name: str
    mode: str

@router.post("/manage/new_wallet/{wallet_address}")
async def create_new_wallet(
    wallet_address: str,
    wallet_data: WalletData,
):
    """Create a new wallet with its positions based on selected mode."""

    try:
        raw_wallet_data = await get_new_wallet(wallet_address)
        if not raw_wallet_data:
            raise HTTPException(
                status_code=404,
                detail="Wallet data not found: invalid wallet address?"
            )

        # Process positions based on wallet mode

        wallet_positions = []
        defi_positions = []

        for position in raw_wallet_data["data"]:
            position_type = PositionType(position['attributes']['position_type'])

            if position_type == PositionType.WALLET:
                wallet_positions.append(position)
            else:
                defi_positions.append(position)

        if wallet_positions:
            tokens = await process_wallet_positions(wallet_positions)

        if wallet_data.mode == WalletMode.FULL:
            defi = await process_defi_positions(defi_positions)
        else:
            defi = []

        # Create wallet object
        wallet = Wallet(
            address=wallet_address,
            name=wallet_data.name,
            color=wallet_data.color,
            wallet_mode=wallet_data.mode,
            tokens=tokens,
            defi_positions=defi,
            last_updated=datetime.now()
        )
        
        # Calculate total value
        wallet.calculate_total_value()

        wallet_exists = await wallets_collection.find_one({'address': wallet.address})

        if wallet_exists:
            await wallets_collection.delete_one({"address": wallet.address})
            await wallets_collection.insert_one(wallet.model_dump())
        else:
            await wallets_collection.insert_one(wallet.model_dump())

        return wallet

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred: {str(e)}"
        )
    
@router.post("/test")
async def test():
    async with httpx.AsyncClient() as client:
        url = 'https://api.zerion.io/v1/fungibles/0x23878914efe38d27c4d67ab83ed1b93a74d4086a?currency=usd'

        headers = {
                "accept": "application/json",
                "authorization": f"Basic {ZERION_API_KEY}==",
            }
        
        response = await client.get(url, headers=headers)

        if response.status_code == 200:
            return response.json()
        else:
            raise HTTPException(status_code=response.status_code, detail="Error fetching data from Zerion API")

@router.post("/charts")
async def get_charts(fungible_id: dict):  # Change this to accept a JSON body
    async with httpx.AsyncClient() as client:
        url = f"https://api.zerion.io/v1/fungibles/{fungible_id['fungible_id']}/charts/day"
        headers = {
            "accept": "application/json",
            "authorization": f"Basic {ZERION_API_KEY}==",
        }
        response = await client.get(url, headers=headers)
        if response.status_code == 200:
            return response.json()
        else:
            raise HTTPException(status_code=response.status_code, detail="Error fetching data from Zerion API")