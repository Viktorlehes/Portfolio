# app/services/db/wallet_service.py

from datetime import datetime, timezone
from fastapi import HTTPException
from typing import List, Optional
from app_v2.services.db.base import BaseDBService
from app_v2.services.external.zerion_service import ZerionService, ZerionServiceError
from app_v2.models.wallet import UnifiedWallet, WalletToken, WalletSource
from app_v2.services.wallet.position_utils import process_positions
from app_v2.services.db.token_service import TokenService
from bson import ObjectId
import logging
import uuid

class WalletService(BaseDBService[UnifiedWallet]):
    def __init__(self):
        super().__init__('wallets', UnifiedWallet)
        self.zerion_service = ZerionService()
        self.token_service = TokenService()

    async def get_user_wallets(self, user_id: str) -> List[UnifiedWallet]:
        """Get all wallets for a user"""
        return await self.find_many({
            'user_id': user_id,
            'is_active': True
        })

    async def activate_wallet(self, user_id: str, address: str) -> bool:
        """reactivate wallet for user"""
        doc = await self.collection.update_one(
            {"user_id": user_id, "address": address},
            {'$set': {"is_active": True}}
        )
        return doc.modified_count > 0
    
    async def deactivate_wallet(self, user_id: str, address: str) -> bool:
        """deactivate wallet for user"""
        doc = await self.collection.update_one(
            {"user_id": user_id, "address": address},
            {'$set': {"is_active": False}}
        )
        return doc.modified_count > 0
    
    async def update_wallet_details(self, user_id: str, address: str, name: str, risk_level: str, color: str):
        """Update wallet on reactivation"""
        doc = await self.collection.update_one(
            {"user_id": user_id, "address": address},
            {'$set': {
                "name": name,
                "risk_level": risk_level,
                "color": color
                }
            }
        )
        return doc.modified_count > 0
        

    async def get_by_address(self, address: str) -> Optional[UnifiedWallet]:
        """Get wallet by address"""
        doc = await self.collection.find_one({'address': address.lower()})
        return UnifiedWallet(**doc) if doc else None

    async def update_wallet_tokens(self, wallet_id: str, tokens: List[WalletToken]) -> bool:
        """Update wallet tokens and total value"""
        total_value = sum(token.value_usd for token in tokens)
        result = await self.collection.update_one(
            {'_id': ObjectId(wallet_id)},
            {
                '$set': {
                    'tokens': [token.model_dump() for token in tokens],
                    'total_value_usd': total_value,
                    'updated_at': datetime.now(timezone.utc)
                }
            }
        )
        return result.modified_count > 0

    async def get_by_source(self, user_id: str, source: WalletSource) -> List[UnifiedWallet]:
        """Get user wallets by source"""
        return await self.find_many({
            'user_id': user_id,
            'source': source,
            'is_active': True
        })

    async def remove_user_wallet(self, user_id: str, address: str) -> bool:
        """Deactivate Wallet"""
        doc = await self.collection.find_one({'user_id': user_id, 'address': address.lower()})
        if not doc:
            return False

        result = await self.deactivate_wallet(user_id, address.lower())
        
        return result

    async def create_new_wallet(
        self,
        user_id: str,
        address: str,
        name: str,
        color: str,
        risk_level: str,
        source: WalletSource = WalletSource.ZERION
    ) -> Optional[UnifiedWallet]:
        """Create a new wallet from address"""
        
        # Check if wallet already exists for this user
        wallet_doc = await self.collection.find_one({
            "user_id": user_id,
            "address": address.lower(),
        })

        if wallet_doc:
            existing_wallet = UnifiedWallet(**wallet_doc)
            
            # If wallet is already active, prevent duplicate
            if existing_wallet.is_active:
                raise ValueError("Wallet with this address already exists for user")

            # Attempt to reactivate and update inactive wallet
            if not await self.activate_wallet(user_id, address.lower()):
                raise Exception(f"Failed to activate wallet: {address}")

            if not await self.update_wallet_details(user_id, address.lower(), name, risk_level, color):
                raise Exception(f"Failed to update wallet details: {address}")

            return existing_wallet

        try:
            print("fetching data")
            # Fetch initial wallet data from Zerion
            wallet_data = await self.zerion_service.get_wallet_positions(address)
            
            if not wallet_data:
                raise ValueError("Unable to fetch wallet data")

            # Process wallet positions using utility function
            tokens, defi_positions = await process_positions(wallet_data.get('data', []))
            
            for token in tokens:
                created_token = await self.token_service.get_or_create_new_token(name=token.name, symbol=token.symbol, id=token.token_id, id_type="zerion")
            
            # Calculate totals
            total_assets = sum(token.value_usd for token in tokens)
            total_defi = sum(pos.price_data.current_value for pos in defi_positions)

            # Create new wallet
            new_wallet = UnifiedWallet(
                id=str(uuid.uuid4()),
                user_id=user_id,
                name=name,
                color=color,
                risk_level=risk_level,
                source=source,
                address=address.lower(),
                tokens=tokens,
                defi_positions=defi_positions,
                total_value_assets=total_assets,
                total_value_defi=total_defi,
                total_value_usd=total_assets + total_defi,
                metadata={},
                is_active=True,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )

            # Insert into database
            await self.create(new_wallet)
            return new_wallet

        except HTTPException as e:
            raise HTTPException(detail=e.detail, status_code=e.status_code)

        except ZerionServiceError as e:
            print(f"Failed to fetch wallet: {str(e)}")

        except Exception as e:
            logging.error(f"Error creating wallet: {str(e)}")
            raise ValueError(f"Error creating wallet: {str(e)}")

    async def update_wallet(self, wallet: UnifiedWallet) -> bool:
        """Update existing wallet with new data from Zerion"""
        try:
            wallet_data = await self.zerion_service.get_wallet_positions(wallet.address)
            
            if not wallet_data:
                raise ValueError("Unable to fetch wallet data")

            # Process positions using utility function
            tokens, defi_positions = await process_positions(wallet_data.get('data', []))
            
            # Calculate totals
            total_assets = sum(token.value_usd for token in tokens)
            total_defi = sum(pos.price_data.current_value for pos in defi_positions)
            
            # Update wallet
            result = await self.collection.update_one(
                {'_id': ObjectId(wallet.id)},
                {
                    '$set': {
                        'tokens': [token.model_dump() for token in tokens],
                        'defi_positions': [pos.model_dump() for pos in defi_positions],
                        'total_value_assets': total_assets,
                        'total_value_defi': total_defi,
                        'total_value_usd': total_assets + total_defi,
                        'updated_at': datetime.now(timezone.utc)
                    }
                }
            )
            return result.modified_count > 0

        except Exception as e:
            logging.error(f"Error updating wallet {wallet.address}: {str(e)}")
            return False