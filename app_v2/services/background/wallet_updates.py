# app/services/background/wallet_updates.py
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Optional
from app_v2.services.background.base import BackgroundTask
from app_v2.services.db.wallet_service import WalletService
from app_v2.services.external.zerion_service import ZerionService, ZerionServiceError
from app_v2.services.wallet.position_utils import process_positions
from app_v2.models.wallet import WalletSource
from app_v2.services.db.token_service import TokenService

class WalletUpdateTask(BackgroundTask):
    """Background task for updating wallet data"""
    
    def __init__(self, interval_seconds: int = 300):
        super().__init__("wallet_updates", interval_seconds)
        self.wallet_service = WalletService()
        self.zerion_service = ZerionService()
        self.token_service = TokenService()

    async def execute(self) -> None:
        """Execute wallet updates"""
        try:
            # Get all active wallets
            wallets = await self.wallet_service.find_many({'is_active': True})
            
            print("wallets found:", len(wallets) if wallets else "no wallets" )
            
            for wallet in wallets:
                try:
                    # Skip non-Zerion wallets for now
                    if wallet.source != WalletSource.ZERION:
                        continue

                    current_time = datetime.now(timezone.utc)
                    wallet_updated = wallet.updated_at.replace(tzinfo=timezone.utc)  # Add UTC timezone to naive datetime

                    if (current_time - wallet_updated) < timedelta(minutes=10):
                        continue
                    
                    # Get wallet data from Zerion
                    wallet_data = await self.zerion_service.get_wallet_positions(wallet.address)
                    
                    if not wallet_data:
                        continue

                    # Process wallet positions
                    tokens, defi_positions = await process_positions(wallet_data.get('data', []))
                    
                    # Calculate totals
                    total_assets = sum(token.value_usd for token in tokens)
                    total_defi = sum(pos.price_data.current_value for pos in defi_positions)
                    
                    # Update wallet
                    await self.wallet_service.update(wallet.id, {
                        'tokens': [token.model_dump() for token in tokens],
                        'defi_positions': [pos.model_dump() for pos in defi_positions],
                        'total_value_assets': total_assets,
                        'total_value_defi': total_defi,
                        'total_value_usd': total_assets + total_defi,
                        'updated_at': datetime.now(timezone.utc)
                    })

                except ZerionServiceError as e:
                    logging.error(f"Error fetching Wallet: {wallet.address}: {str(e)}" )

                except Exception as e:
                    logging.error(f"Error updating wallet {wallet.address}: {str(e)}")
                    continue

        except Exception as e:
            logging.error(f"Error in wallet update task: {str(e)}")
            raise