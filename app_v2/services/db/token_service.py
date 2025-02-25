# app/services/db/token_service.py
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from app_v2.services.db.base import BaseDBService
from app_v2.models.token import UnifiedToken, TokenPrice, TokenNetFlow
from app_v2.services.external.cmc_service import CMCService
from app_v2.services.external.cgls_service import CGLSService
from app_v2.services.external.zerion_service import ZerionService
from app_v2.services.external.cg_service import CGService
import re
from bson import ObjectId
import uuid
from pydantic import ValidationError
import logging
import asyncio
from pymongo import UpdateOne

class TokenService(BaseDBService[UnifiedToken]):
    def __init__(self):
        super().__init__('tokens', UnifiedToken)
        #if token hasnt been used for 3 days, set to inactive. No longer auto updates
        self.token_time_out_days = 3
        self.cmc_service = CMCService()
        self.cgls_service = CGLSService()
        self.zerion_service = ZerionService()
        self.cg_service = CGService()
        self.logger = logging.getLogger(__name__)
        
    async def get_by_symbol(self, symbol: str) -> Optional[UnifiedToken]:
        """Get token by symbol"""
        doc = await self.collection.find_one({'symbol': symbol.upper()})
        return UnifiedToken(**doc) if doc else None
    
    async def update_token_activity(self, token_id: str) -> bool:
        """Update token's last_active timestamp and ensure it's active"""
        try:
            result = await self.collection.update_one(
                {"id": token_id},
                {
                    "$set": {
                        "last_active": datetime.now(timezone.utc),
                        "is_active": True,
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
            return result.modified_count > 0
        except Exception as e:
            self.logger.error(f"Error updating token activity: {str(e)}")
            return False
    
    async def activate_token(self, token_id: str) -> bool:
        """Activate token and update its last_active timestamp"""
        try:
            result = await self.collection.update_one(
                {"id": token_id},
                {
                    "$set": {
                        "is_active": True,
                        "last_active": datetime.now(timezone.utc),
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
            return result.modified_count > 0
        except Exception as e:
            self.logger.error(f"Error activating token: {str(e)}")
            return False

    async def deactivate_token(self, token_id: str) -> bool:
        """Deactivate token while preserving its last_active timestamp"""
        try:
            result = await self.collection.update_one(
                {"id": token_id},
                {
                    "$set": {
                        "is_active": False,
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
            return result.modified_count > 0
        except Exception as e:
            self.logger.error(f"Error deactivating token: {str(e)}")
            return False
    
    async def get_all_active_tokens(self) -> Optional[List[UnifiedToken]]:
        """Get all active tokens from db and handle deactivation"""
        try:
            # Get all tokens that are either active or were active in the last 3 days
            query = {
                "is_active": True,
            }
            
            docs = await self.find_many(query, limit=100000)
            if not docs:
                return None
                    
            active_tokens = []
            deactivate_ops = []
            current_time = datetime.now(timezone.utc)
            
            for token in docs:
                token_last_active = token.last_active.replace(tzinfo=timezone.utc)
                
                if (current_time - token_last_active) > timedelta(days=self.token_time_out_days):
                    if token.is_active:
                        deactivate_ops.append(self.deactivate_token(token.id))
                else:
                    active_tokens.append(token)
            
            # Execute all deactivation operations in parallel if any
            if deactivate_ops:
                await asyncio.gather(*deactivate_ops)
                
            return active_tokens
        
        except Exception as e:
            self.logger.error(f"Error in get_all_active_tokens: {str(e)}")
            return None

    async def get_by_external_id(self, id_type: str, external_id: str) -> Optional[UnifiedToken]:
        """Get token by external ID (cmc, zerion, coingecko)"""
        doc = await self.collection.find_one({id_type: external_id})
        
        if doc:
            token = UnifiedToken(**doc) 
            await self.update_token_activity(token.id)
        
            return token
        else:
            return None

    async def update_price_data(self, token_id: str, price_data: TokenPrice) -> bool:
        """Update token price data"""
        result = await self.collection.update_one(
            {'_id': ObjectId(token_id)},
            {
                '$set': {
                    'price_data': price_data.model_dump(),
                    'updated_at': datetime.now(timezone.utc)
                }
            }
        )
        return result.modified_count > 0

    async def update_flow_data(self, token_id: str, flow_data: TokenNetFlow) -> bool:
        """Update token flow data"""
        result = await self.collection.update_one(
            {'_id': ObjectId(token_id)},
            {
                '$set': {
                    'net_flow_data': flow_data.model_dump(),
                    'updated_at': datetime.now(timezone.utc)
                }
            }
        )
        return result.modified_count > 0

    async def search_tokens(self, query: str, limit: int = 10) -> List[UnifiedToken]:
        """Search tokens by name or symbol"""
        search_query = {
            '$or': [
                {'symbol': {'$regex': f'^{query}$', '$options': 'i'}},
                {'name': {'$regex': f'^{query}$', '$options': 'i'}}, 
                {'slug': {'$regex': f'^{query}$', '$options': 'i'}}
            ],
        }
        return await self.find_many(search_query, limit=limit)

    async def get_top_tokens(self, limit: int = 100) -> List[UnifiedToken]:
        """
        Get top tokens by rank with optimized database operations
        """
        try:
            # 1. Get top token IDs from CMC
            top_token_ids = await self.cmc_service.get_currencies()
            top_token_ids = top_token_ids[:limit]  # Limit the results
            
            if not top_token_ids:
                self.logger.warning("No top tokens received from CMC")
                return []

            # 2. Bulk query existing tokens
            existing_tokens = await self.collection.find({
                "cmc_id": {"$in": top_token_ids}
            }).to_list(length=None)
            
            # Create lookup dictionary for faster access
            existing_token_map = {str(token["cmc_id"]): token for token in existing_tokens}
            
            # 3. Process tokens in parallel
            async def process_token(cmc_id: int) -> Optional[UnifiedToken]:
                try:
                    if str(cmc_id) in existing_token_map:
                        return UnifiedToken(**existing_token_map[str(cmc_id)])
                    else:
                        return await self.get_or_create_new_token(id=str(cmc_id), id_type="cmc")
                except Exception as e:
                    self.logger.error(f"Error processing token {cmc_id}: {str(e)}")
                    return None

            # Process all tokens in parallel
            tokens = await asyncio.gather(
                *[process_token(cmc_id) for cmc_id in top_token_ids]
            )
            
            # More readable approach
            response_tokens: List[UnifiedToken] = []
            inactive_tokens: List[UnifiedToken] = []
            for token in tokens:
                if token:  # Filter out None values
                    response_tokens.append(token)
                    if not token.is_active:
                        inactive_tokens.append(token)
                        
            if inactive_tokens:
                # Bulk update operation
                bulk_ops = [
                    UpdateOne(
                        {"id": token.id},
                        {
                            "$set": {
                                "is_active": True,
                                "last_active": datetime.now(timezone.utc),
                                "updated_at": datetime.now(timezone.utc)
                            }
                        }
                    ) for token in inactive_tokens
                ]
                
                if bulk_ops:
                    await self.collection.bulk_write(bulk_ops)
                    self.logger.info(f"Activated {len(bulk_ops)} tokens in bulk")

            # 5. Return results
            return [token.model_dump() for token in response_tokens]

        except Exception as e:
            self.logger.error(f"Error in get_top_tokens: {str(e)}")
            raise Exception(f"Failed to get top tokens: {str(e)}")
        
    async def get_or_create_new_token(self, name: str = "", symbol: str = "", id: Optional[str] = None, id_type: str = "") -> Optional[UnifiedToken]:
        try:
            # 1. Direct ID match (most reliable)
            if id:
                token = await self._get_token_by_id(id, id_type)
                if token:
                    await self.update_token_activity(token.id)
                    return token

            # 2. Symbol + Name match 
            if symbol and name:
                token = await self._find_token_by_symbol_and_name(symbol, name)
                if token:
                    await self.update_token_activity(token.id)
                    return token

            # 3. Create new token
            return await self._create_new_token(name, symbol, id, id_type)

        except Exception as e:
            self.logger.error(f"Error in get_or_create_new_token: {str(e)}")
            return None

    async def _get_token_by_id(self, id: str, id_type: str) -> Optional[UnifiedToken]:
        """Direct ID lookup"""
        id_field = f"{id_type.strip()}_id"
        return await self.get_by_external_id(id_field, id)

    async def _find_token_by_symbol_and_name(self, symbol: str, name: str) -> Optional[UnifiedToken]:
        """
        Smart token matching using symbol and name
        """
        # Clean inputs
        symbol = symbol.strip().upper()
        name = self._normalize_token_name(name)

        # First try exact symbol match
        matches = await self.search_tokens(symbol, limit=5)
        
        for match in matches:
            # Compare normalized names
            if self._are_names_similar(name, match.name):
                return match

        return None

    def _normalize_token_name(self, name: str) -> str:
        """Normalize token name for comparison"""
        # Remove common suffixes/prefixes
        name = re.sub(r'(token|coin|protocol|network)\s*$', '', name, flags=re.IGNORECASE)
        # Remove special characters and extra spaces
        name = re.sub(r'[^\w\s]', ' ', name)
        return ' '.join(name.lower().split())

    def _are_names_similar(self, name1: str, name2: str) -> bool:
        """
        Check if two token names are similar enough to be considered the same token
        """
        name1 = self._normalize_token_name(name1)
        name2 = self._normalize_token_name(name2)
        
        # Exact match after normalization
        if name1 == name2:
            return True
            
        # Check if one name contains the other
        if name1 in name2 or name2 in name1:
            return True
            
        # Could add more sophisticated matching here:
        # - Levenshtein distance for typos
        # - Acronym handling
        # - Token-specific aliases (e.g., "WETH" = "Wrapped Ether")
        
        return False

    async def _create_new_token(self, name: str, symbol: str, id: Optional[str], id_type: str) -> Optional[UnifiedToken]:
        """Create new unified token from best available data"""
        # Get CMC data (required)
        cmc_token = await self._get_cmc_data(name, symbol, id, id_type)
        if not cmc_token:
            return None

        # Build token data
        token_data = {
            "id": str(uuid.uuid4()),
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "last_active": datetime.now(timezone.utc),
            "is_active": True,
            "tags": [],
            "net_flow_data": None,
            "external_links": None
        }

        # Add CMC data
        token_data.update(self._process_cmc_data(cmc_token))

        # Add optional data
        await self._add_optional_data(token_data, symbol, id, id_type)

        # Create and save token
        try:
            new_token = UnifiedToken(**token_data)
            if await self.create(new_token):
                print(f"Created token: {new_token.name}")
                return new_token
        except ValidationError as e:
            self.logger.error(f"Token validation error: {str(e)}")
        
        return None
    
    async def _get_cmc_data(self, name: str, symbol: str, id: Optional[str ], id_type: str) -> Optional[dict]:
        """Get CMC token data, trying multiple methods in order of reliability"""
        cmc_token = None
        
        # 1. Try direct CMC ID if provided
        if id and id_type == "cmc":
            result = await self.cmc_service.get_tokens_by_cmc_id([id])
            if result:
                return result[id]
        
        # 2. Clean inputs for searching
        clean_name = re.sub(r'[^\w\s]', '', name).strip()
        clean_symbol = symbol.strip().upper()
        
        # 3. Try to find by exact symbol match first
        if clean_symbol:
            cmc_token = await self.cmc_service.get_token_by_symbol_or_name(clean_symbol)
            if cmc_token and self._validate_cmc_match(cmc_token, clean_name, clean_symbol):
                return cmc_token
                
        # 4. Try to find by name if symbol search failed
        if clean_name and not cmc_token:
            cmc_token = await self.cmc_service.get_token_by_symbol_or_name(clean_name)
            if cmc_token and self._validate_cmc_match(cmc_token, clean_name, clean_symbol):
                return cmc_token
        
        return None

    def _validate_cmc_match(self, cmc_token: dict, name: str, symbol: str) -> bool:
        """Validate that CMC token matches the search criteria"""
        if not name and not symbol:
            return True
            
        cmc_symbol = cmc_token["symbol"].strip().upper()
        cmc_name = self._normalize_token_name(cmc_token["name"])
        
        # If symbol provided, must match exactly
        if symbol and cmc_symbol != symbol:
            return False
            
        # If name provided, must be similar
        if name and not self._are_names_similar(name, cmc_name):
            return False
            
        return True

    def _process_cmc_data(self, cmc_token: dict) -> dict:
        """Extract relevant data from CMC token response"""
        price_data = cmc_token["quote"]["USD"].copy()
        price_data.pop("last_updated", None)
        price_data["last_updated"] = datetime.now(timezone.utc)
        
        return {
            "name": cmc_token["name"],
            "symbol": cmc_token["symbol"],
            "slug": cmc_token["slug"],
            "cmc_id": cmc_token["id"],
            "total_supply": cmc_token.get("total_supply"),
            "circulating_supply": cmc_token.get("circulating_supply"),
            "max_supply": cmc_token.get("max_supply"),
            "tags": cmc_token.get("tags", []),
            "rank": cmc_token.get("cmc_rank"),
            "price_data": TokenPrice(**price_data)
        }

    async def _add_optional_data(self, token_data: dict, symbol: str, id: Optional[str], id_type: str):
        """Add optional data from other services"""
        # 1. Add Coinglass data if available
        try:
            cgls_token = await self.cgls_service.get_token(token_data["symbol"])
            if cgls_token:
                net_flow_data = TokenNetFlow(
                    net_flow_1h=sum(exchange.get('flowsUsd1h', 0) for exchange in cgls_token),
                    net_flow_4h=sum(exchange.get('flowsUsd4h', 0) for exchange in cgls_token),
                    net_flow_12h=sum(exchange.get('flowsUsd12h', 0) for exchange in cgls_token),
                    net_flow_24h=sum(exchange.get('flowsUsd24h', 0) for exchange in cgls_token),
                    net_flow_1w=sum(exchange.get('flowsUsd1w', 0) for exchange in cgls_token),
                    last_updated=datetime.now(timezone.utc)
                )
                token_data["net_flow_data"] = net_flow_data
        except Exception as e:
            self.logger.warning(f"Error fetching Coinglass data: {str(e)}")

        # 2. Add Zerion data if available
        try:
            zerion_token = None
            if id and id_type == "zerion":
                zerion_token = await self.zerion_service.get_token_by_id(id)
            
            if not zerion_token:
                zerion_token = await self.zerion_service.get_token(token_data["name"])
                if not zerion_token:
                    zerion_token = await self.zerion_service.get_token(token_data["symbol"])
                if zerion_token:
                    if zerion_token["attributes"]["symbol"].lower() == token_data["symbol"].lower():
                        matched = self._are_names_similar(token_data["name"], zerion_token["attributes"]["name"])
                        zerion_token = zerion_token if matched else {}
                    else:
                        zerion_token = {}
            
            if zerion_token:
                token_exists = await self.collection.find_one({"zerion_id": zerion_token.get("id")})
                
                if token_exists:
                    raise Exception("warning: zerion token exists: " + zerion_token.get("id"))
                
                icon = zerion_token.get("attributes", {}).get("icon", {})
                if icon:
                    icon_url = icon.get("url")
                else:
                    icon_url = ""
                
                token_data.update({
                    "zerion_id": zerion_token.get("id"),
                    "implementations": zerion_token.get("attributes", {}).get("implementations"),
                    "description": zerion_token.get("attributes", {}).get("description"),
                    "logo_url": icon_url,
                    "external_links": zerion_token.get("attributes", {}).get("external_links"),
                    "zerion_last_updated": datetime.now(timezone.utc)
                })
        except Exception as e:
            self.logger.warning(f"Error fetching Zerion data: {str(e)}")