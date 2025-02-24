# app/services/background/token_updates.py
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional
import asyncio
from app_v2.services.background.base import BackgroundTask
from app_v2.services.db.token_service import TokenService
from app_v2.services.external.cmc_service import CMCService
from app_v2.services.external.cgls_service import CGLSService
from app_v2.services.external.zerion_service import ZerionService
from app_v2.models.token import UnifiedToken, TokenPrice, TokenNetFlow, Tags, TokenImplementation, ExternalLinks
from app_v2.models.CMC.CMC_token import FullCMCToken


class TokenUpdateTask(BackgroundTask):
    """Background task for updating token data"""
    
    def __init__(self, interval_seconds: int = 300, cmc_interval: int = 120, 
                cgls_interval: int = 120, zerion_interval: int = 1):
        super().__init__("token_updates", interval_seconds)
        self.cmc_interval = cmc_interval
        self.cgls_interval = cgls_interval
        self.zerion_interval = zerion_interval
        self.token_service = TokenService()
        self.cmc_service = CMCService()
        self.cgls_service = CGLSService()
        self.zerion_service = ZerionService()
        self.batch_size = 100

    async def update_CMC_data(self, token: UnifiedToken, cmc_data: FullCMCToken) -> Optional[UnifiedToken]:
        """Update token with new CMC data"""
        try:
            if not cmc_data:
                return None
                
            price_data = cmc_data["quote"]["USD"].copy()
            price_data.pop("last_updated", None)
            price_data["last_updated"] = datetime.now(timezone.utc)
            
            tags = []
            if cmc_data.get("tags"):
                tags = [Tags(**tag) if isinstance(tag, dict) else tag for tag in cmc_data.get("tags", [])]
            
            token.price_data = TokenPrice(**price_data)
            token.total_supply = cmc_data.get("total_supply")
            token.circulating_supply = cmc_data.get("circulating_supply")
            token.max_supply = cmc_data.get("max_supply")
            token.tags = tags
            token.rank = cmc_data.get("cmc_rank")
            
            return token
            
        except Exception as e:
            logging.error(f"Error updating CMC data for token {token.cmc_id}: {str(e)}")
            return None

    async def update_coinglass_data(self, token: UnifiedToken, cgls_data: dict) -> Optional[UnifiedToken]:
        """Update token with new Coinglass data"""
        try:
            if not cgls_data:
                return None
            
            # net_flow_data = TokenNetFlow(
            #     net_flow_1h=sum(exchange.get('flowsUsd1h', 0) for exchange in cgls_data),
            #     net_flow_4h=sum(exchange.get('flowsUsd4h', 0) for exchange in cgls_data),
            #     net_flow_12h=sum(exchange.get('flowsUsd12h', 0) for exchange in cgls_data),
            #     net_flow_24h=sum(exchange.get('flowsUsd24h', 0) for exchange in cgls_data),
            #     net_flow_1w=sum(exchange.get('flowsUsd1w', 0) for exchange in cgls_data),
            #     last_updated=datetime.now(timezone.utc)
            # )
            
            net_flow_data = TokenNetFlow(last_updated=datetime.now(timezone.utc))
            
            token.net_flow_data = net_flow_data
            return token
            
        except Exception as e:
            logging.error(f"Error updating Coinglass data for token {token.symbol}: {str(e)}")
            return None

    async def update_zerion_data(self, token: UnifiedToken, zerion_data: dict) -> Optional[UnifiedToken]:
        """Update token with new Zerion data"""
        try:
            if not zerion_data:
                return None
                
            external_links = []
            implementations = []
            logo_url = ""
                
            if zerion_data.get("attributes", {}).get("implementations"):
                implementations = [TokenImplementation(**impl) if isinstance(impl, dict) else impl for impl in zerion_data.get("attributes", {}).get("implementations")]
            
            if zerion_data.get("attributes", {}).get("external_links"):
                external_links = [ExternalLinks(**link) if isinstance(link, dict) else link for link in zerion_data.get("attributes", {}).get("external_links")]
            
            if zerion_data.get("attributes", {}).get("icon"):
                logo_url = zerion_data.get("attributes", {}).get("icon", {}).get("url")
            
            token.implementations = implementations
            token.description = zerion_data.get("attributes", {}).get("description")
            token.logo_url = logo_url
            token.external_links = external_links
            token.zerion_last_updated = datetime.now(timezone.utc)
            return token
            
        except Exception as e:
            logging.error(f"Error updating Zerion data for token {token.zerion_id}: {str(e)}")
            return None

    async def batch_update_tokens(self, tokens: List[UnifiedToken]) -> bool:
        """Update tokens in batches"""
        try:
            for i in range(0, len(tokens), self.batch_size):
                batch = tokens[i:i + self.batch_size]
                update_ops = []
                
                for token in batch:
                    if not token:
                        continue
                    token_dict = token.model_dump()
                    update_ops.append(
                        self.token_service.update(token.id, token_dict)
                    )
                
                if update_ops:
                    results = await asyncio.gather(*update_ops, return_exceptions=True)
                    for result, token in zip(results, batch):
                        if isinstance(result, Exception):
                            logging.error(f"Failed to update token {token.id}: {str(result)}")
                    if results:
                        return True
                    else:
                        return False
                            
        except Exception as e:
            logging.error(f"Error in batch update: {str(e)}")
            return False

    async def execute(self) -> None:
        """Execute token updates"""
        try:
            # Get all active tokens
            tokens: List[UnifiedToken] = await self.token_service.get_all_active_tokens()
            if not tokens:
                logging.info("No tokens found for update")
                return

            logging.info(f"Processing updates for {len(tokens)} tokens")
            current_time = datetime.now(timezone.utc)
                        
            # Track which tokens need updates from each source
            updates_needed = {token.id: {
                "token": token,
                "needs_cmc": False,
                "needs_cgls": False,
                "needs_zerion": False
            } for token in tokens}
            
            # Prepare batch update lists
            cmc_update_ids = []
            cgls_update_symbols = []
            zerion_update_ids = []

            # Check which updates each token needs
            for token in tokens:
                update_info = updates_needed[token.id]
                    
                cmc_last_updated = token.price_data.last_updated.replace(tzinfo=timezone.utc)
                if token.price_data and (current_time - cmc_last_updated) > timedelta(seconds=self.cmc_interval):
                    update_info["needs_cmc"] = True
                    if token.cmc_id:
                        cmc_update_ids.append(token.cmc_id)
                        
                if token.net_flow_data:
                    cgls_last_updated = token.net_flow_data.last_updated.replace(tzinfo=timezone.utc)
                    if token.net_flow_data and (current_time - cgls_last_updated ) > timedelta(seconds=self.cgls_interval):
                        update_info["needs_cgls"] = True
                        cgls_update_symbols.append(token.symbol)
                
                if token.zerion_last_updated:
                    zerion_last_updated = token.zerion_last_updated.replace(tzinfo=timezone.utc)
                    if not token.zerion_last_updated or (current_time - zerion_last_updated) > timedelta(days=self.zerion_interval):
                        update_info["needs_zerion"] = True
                        if token.zerion_id:
                            zerion_update_ids.append(token.zerion_id)
                
                updates_needed[token.id] = update_info

            # Fetch data from each service in bulk where possible
            cmc_data = None
            if cmc_update_ids:
                cmc_data = await self.cmc_service.get_tokens_by_cmc_id(cmc_update_ids)

            # Update tokens with new data
            tokens_to_update = list()
            for token_id, update_info in updates_needed.items():
                token = update_info["token"]
                updated = False

                # Apply CMC updates
                if update_info["needs_cmc"] and cmc_data and str(token.cmc_id) in cmc_data:
                    updated_token = await self.update_CMC_data(token, cmc_data[str(token.cmc_id)])
                    if updated_token:
                        token = updated_token
                        updated = True

                # Apply Coinglass updates
                if update_info["needs_cgls"]:
                    cgls_data = {"data": "data"} # await self.cgls_service.get_token(token.symbol)
                    if cgls_data:
                        updated_token = await self.update_coinglass_data(token, cgls_data)
                        if updated_token:
                            token = updated_token
                            updated = True

                # Apply Zerion updates
                if update_info["needs_zerion"] and token.zerion_id:
                    zerion_data = await self.zerion_service.get_token_by_id(token.zerion_id)
                    if zerion_data:
                        updated_token = await self.update_zerion_data(token, zerion_data)
                        if updated_token:
                            token = updated_token
                            updated = True

                if updated:
                    tokens_to_update.append(token)

            # Perform batch updates for all modified tokens
            if tokens_to_update:
                result = await self.batch_update_tokens(list(tokens_to_update))
                if result:
                    logging.info(f"Successfully updated {len(tokens_to_update)} tokens")
                else:
                    logging.warning(f"Error in token update task: DB updates")

        except Exception as e:
            logging.error(f"Error in token update task: {str(e)}")