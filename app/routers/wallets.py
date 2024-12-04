# app/routers/tokens.py
from fastapi import APIRouter, HTTPException, Response, status
from typing import List, Tuple, Optional, Dict
from app.utils.token_updates import update_all_tokens
import httpx
from datetime import datetime, timedelta

# Local imports
from app.schemas.wallet.wallet import Wallet, WalletData
from app.schemas.wallet.wallet import (
    Wallet, WalletMode, PositionType,
    Token, DefiPosition, FullToken
)
from app.schemas.tokens.full_token import FullCMCToken
from app.utils.formatters import format_token, format_defi_position, format_zerion_token
from app.routers.tokens import get_token_by_symbol, get_token_via_CG, get_token_price_chain
from app.utils.token_updates import update_all_tokens

# Environment variables
from app.core.config import ZERION_API_KEY

# DB
from app.core.db import wallets_collection
from app.core.db import tokens_collection

# Utils
from app.utils.helpers import safe_get, safe_float

router = APIRouter()


@router.get('/get_wallets', response_model=List[Wallet], tags=["Dashboard"])
async def get_wallets():

    print("Fetching wallets")

    try:
        await update_all_tokens()

        current_time = datetime.now()

        asynio_wallets = wallets_collection.find({})

        wallets = []
    
        async for document in asynio_wallets:
            wallets.append(document)

        if not wallets:
            return []

        for index, wallet in enumerate(wallets):
            last_updated = wallet['last_updated']

            print(f'Updating wallet {index+1}/{len(wallets)}')

            if (current_time - last_updated) > timedelta(minutes=5):

                wallet_data = WalletData(color=wallet['color'], name=wallet['name'], mode=wallet['wallet_mode'])

                try:
                    new_wallet = await create_new_wallet(wallet['address'], wallet_data)
                except Exception as e:
                    print(f"Error updating wallet {wallet['address']}: {str(e)}")
                    new_wallet = wallet

                wallets[wallets.index(wallet)] = new_wallet

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
        
        print(f"Fetching wallet data from Zerion API for {wallet_address}")
        
        response = await client.get(url, headers=headers)
        
        print(f"Response status code: {response.status_code}")

        if response.status_code == 200:
            return response.json()
        else:
            raise HTTPException(status_code=response.status_code, detail="Error fetching data from Zerion API")

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
        
        print("Processing wallet positions...")

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

        print("Processing complete!")

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

        # Update existing wallet or create new one using update_one with upsert
        await wallets_collection.update_one(
            {"address": wallet.address},
            {"$set": wallet.model_dump()},
            upsert=True
        )

        return wallet

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred: {str(e)}"
        )
        
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
        # Determine token type based on presence of coingecko_id
        token_type = 'CG' if token_data.get('coingecko_id') else 'CMC'
        return token_data, token_type
    
    cmc_token_data: FullCMCToken = await get_token_by_symbol(symbol)
    
    if cmc_token_data and 'detail' not in cmc_token_data:
        try:
            # Ensure we use the name from the position data
            cmc_token_data['name'] = name
            await tokens_collection.insert_one(cmc_token_data)
            return cmc_token_data, 'CMC'
        except Exception as e:
            error_msg = f"Failed to insert CMC token {symbol} into DB: {str(e)}"
            print(error_msg)
            return None, error_msg
    

    # If CMC fails and zerion has no price data, try CoinGecko
    if position['attributes']['price'] is None:
        
        wallet_data = {
            'symbol': symbol,
            'name': name
        }
        cg_token_data: Token = await get_token_via_CG(wallet_data)
        
        if cg_token_data and 'detail' not in cg_token_data:
            try:
                # Add CoinGecko identifier
                cg_token_data['coingecko_id'] = True
                cg_token_data['name'] = name
                await tokens_collection.insert_one(cg_token_data)
                return cg_token_data, 'CG'
            except Exception as e:
                error_msg = f"Failed to insert CoinGecko token {symbol} into DB: {str(e)}"
                print(error_msg)
                return None, error_msg

    # If no data found from either source, return zerion position
    return None, 'zerion'

@router.put("/manage/update_wallet/{wallet_address}")
async def update_wallet(wallet_address: str, wallet_data: WalletData):
    try:
        wallet = await wallets_collection.find_one({"address": wallet_address.strip()})
        if not wallet:
            raise HTTPException(
                status_code=404,
                detail="Wallet not found"
            )
            
        updated_wallet = await wallets_collection.update_one(
            {"address": wallet_address}, 
            {"$set": {
                "color": wallet_data.color,
                "name": wallet_data.name,
                "wallet_mode": wallet_data.mode
            }}
        )
        
        # Fetch the updated wallet
        updated_wallet = await wallets_collection.find_one({"address": wallet_address})
        updated_wallet['_id'] = str(updated_wallet['_id'])
        return updated_wallet
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred: {str(e)}"
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