# app/services/external/cmc_service.py
import math
import httpx
import asyncio
import logging
from fastapi import HTTPException
from app.core.config import CM_API_KEY
from typing import List, Dict, Optional
from datetime import datetime, timezone
from app_v2.services.db.base import BaseDBService
from app_v2.models.CMC.CMC_id_map import CMC_ID_DOC
from app_v2.models.categories import DefaultCategory
from app_v2.models.CMC.CMC_token import FullCMCToken
from app_v2.models.CMC.feargreed_response import FearGreadData
from app_v2.models.CMC.market_stats_response import MarketStats
from app_v2.utils.rate_limiter import RateLimiter, TimeoutManager

class CMCServiceError(Exception):
    """Custom exception for CMC service errors"""
    pass

class CMCService:
    """Service for interacting with CMC API"""
    
    def __init__(self):
        self.base_url = "https://pro-api.coinmarketcap.com/"
        self.headers = {
            'Accepts': 'application/json',
            'X-CMC_PRO_API_KEY': CM_API_KEY
        }
        self.retry_delay = 15  # seconds
        self.max_retry_time = 120  # seconds (2 minutes)
        self.standard_batch_size = 100
        self.CMC_id_map_collection = BaseDBService("CMC_ID_MAP", CMC_ID_DOC)
        self.rate_limiter = RateLimiter(calls_per_minute=30)
        self.timeout_manager = TimeoutManager()
        self.logger = logging.getLogger(__name__)

    async def _handle_api_error(self, error: Exception, operation: str):
        """Standardized error handling for API operations"""
        error_msg = f"CMCService error during {operation}: {str(error)}"
        self.logger.error(error_msg)
        raise HTTPException(
            detail=error_msg,
            status_code=getattr(error, 'status_code', 500)
        )

    async def _make_api_request(self, client: httpx.AsyncClient, url: str, 
                               params: Optional[Dict] = None) -> Dict:
        """Make an API request with rate limiting and timeout handling"""
        await self.rate_limiter.acquire()
        
        async def _do_request():
            response = await client.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            return response.json()
            
        return await self.timeout_manager.execute_with_timeout(_do_request)

    async def get_default_categories(self) -> List[DefaultCategory]:
        """
        Get Default Categories from CMC
        """
        async with httpx.AsyncClient() as client: 
            url = self.base_url + "v1/cryptocurrency/categories"
            params = {
                'limit': 500,
            }
            
            try:
                data = await self._make_api_request(client, url, params)
                if data["status"]["error_code"] == 0:
                    return [cat for cat in data["data"]]
                
            except Exception as e:
                await self._handle_api_error(e, "fetching default categories")

    async def get_currencies(self) -> List[int]:
        """
        Get CMC top 100 listed tokens, returns CMC ids 
        """
        async with httpx.AsyncClient() as client: 
            url = self.base_url + "v1/cryptocurrency/map"
            params = {
                'sort': 'cmc_rank',
                'limit': 100,
            }
            
            try:
                data = await self._make_api_request(client, url, params)
                if data["status"]["error_code"] == 0:
                    return [token["id"] for token in data["data"] ]
                
            except Exception as e:
                await self._handle_api_error(e, "fetching top currencies")

    async def get_market_stats(self) -> MarketStats:
        """
        /v1/global-metrics/quotes/latest  
        """
        async with httpx.AsyncClient() as client: 
            url = self.base_url + "v1/global-metrics/quotes/latest"
            params = {
                'convert': 'USD',
            }
            try:
                data = await self._make_api_request(client, url, params)
                
                if data["status"]["error_code"] == 0:
                    return data["data"]
                
            except Exception as e:
                await self._handle_api_error(e, "fetching market stats")
            
    async def get_feargreed_index(self) -> FearGreadData:
        """
        Get fear greed index from CMC
        """
        async with httpx.AsyncClient() as client:
            url = self.base_url + "v3/fear-and-greed/latest"
            
            try: 
                data = await self._make_api_request(client, url)
                
                if data["status"]["error_code"] == '0':
                    return data["data"]
                
            except Exception as e:
                await self._handle_api_error(e, "fetching feargread index")

    async def get_token_by_symbol_or_name(self, name: str) -> FullCMCToken | None:
        """ 
        Fetch new token by name or symbol from CMC api 
        """
        
        query = name.strip()
        search_query = {
            '$or': [
                {'symbol': {'$regex': f'^{query}$', '$options': 'i'}},
                {'name': {'$regex': f'^{query}$', '$options': 'i'}}, 
                {'slug': {'$regex': f'^{query}$', '$options': 'i'}}
            ]
        }
        
        token_exists = await self.CMC_id_map_collection.find_many(search_query, limit=1)
        
        if token_exists:
            token_data = token_exists[0].model_dump()
            id = token_data["id"]
            async with httpx.AsyncClient() as client:
                url = self.base_url + "v2/cryptocurrency/quotes/latest"
                params = {
                    "id": id
                }
                try: 
                    data = await self._make_api_request(client, url, params)
                    dict = data["data"]
                    return dict[str(id)] 
                except Exception as e:
                    await self._handle_api_error(e, "fetching token")
        else:
            return None
        
    async def search_tokens_by_symbol_or_name(self, name: str, limit: int = 100) -> List[FullCMCToken] | None:
        """ 
        Fetch new token by name or symbol from CMC api 
        """
        
        query = name.strip()
        search_query = {
            '$or': [
                {'symbol': {'$regex': f'^{query}$', '$options': 'i'}},
                {'name': {'$regex': f'^{query}$', '$options': 'i'}}, 
                {'slug': {'$regex': f'^{query}$', '$options': 'i'}}
            ]
        }
        
        token_exists = await self.CMC_id_map_collection.find_many(search_query, limit=limit)
        
        if token_exists:
            token_ids = ','.join(str(token.id) for token in token_exists)
            async with httpx.AsyncClient() as client:
                url = self.base_url + "v2/cryptocurrency/quotes/latest"
                params = {
                    "id": token_ids
                }
                try: 
                    data = await self._make_api_request(client, url, params)
                    dict = data["data"]
                    return [dict[str(token.id)] for token in token_exists]
                except Exception as e:
                    await self._handle_api_error(e, "fetching token")
        else:
            return None
        
    async def get_tokens_by_cmc_id(self, ids: List[int]) -> Optional[Dict[str, FullCMCToken]]:
        """
        Fetch CMC tokens by CMC ids in batches and return consolidated data.
        Returns None if the fetch operation fails.
        
        Args:
            ids: List of CMC token IDs to fetch
            
        Returns:
            Dict mapping token IDs to their full token data, or None if the operation fails
        """
        try:
            result_data: Dict[str, FullCMCToken] = {}
            total_cmc_ids = len(ids)
            num_batches = math.ceil(total_cmc_ids / self.standard_batch_size)

            async with httpx.AsyncClient() as client:
                for batch_num in range(num_batches):
                    try:
                        start_idx = batch_num * self.standard_batch_size
                        end_idx = min((batch_num + 1) * self.standard_batch_size, total_cmc_ids)
                        current_batch = ids[start_idx:end_idx]
                        token_ids = ','.join(str(id) for id in current_batch)
                        
                        url = self.base_url + "v2/cryptocurrency/quotes/latest"
                        params = {
                            "id": token_ids
                        }
                        
                        batch_data = await self._make_api_request(client, url, params)
                        
                        if "data" in batch_data:
                            result_data.update(batch_data["data"])
                    except Exception as e:
                        self.logger.error(f"Failed to fetch batch {batch_num + 1}/{num_batches} of CMC tokens: {str(e)}")
                        continue  # Continue with next batch even if this one fails
                
                # Verify we got at least some tokens
                if not result_data:
                    self.logger.error("Failed to fetch any token data from CMC")
                    return None
                    
                if len(result_data) != total_cmc_ids:
                    self.logger.warning(f"Incomplete token data fetch: {len(result_data)}/{total_cmc_ids} tokens found")
                
                return result_data

        except Exception as e:
            await self._handle_api_error(e, "fetching CMC tokens")    
        
    async def fetch_single_category(self, client: httpx.AsyncClient, cat_id: str) -> Dict:
        """Fetch a single category from CMC API"""
        url = self.base_url + 'v1/cryptocurrency/category'
        params = {'id': cat_id}
        
        try:
            data = await self._make_api_request(client, url, params)
            
            if 'data' in data:
                category_data = data['data']
                last_updated = datetime.now(timezone.utc)
                return DefaultCategory(
                    id=str(category_data['id']),
                    name=category_data['name'],
                    title=category_data['title'],
                    description=category_data.get('description', ''),
                    num_tokens=category_data.get('num_tokens', 0),
                    avg_price_change=category_data.get('avg_price_change', 0.0),
                    market_cap=category_data.get('market_cap', 0.0),
                    market_cap_change=category_data.get('market_cap_change', 0.0),
                    volume=category_data.get('volume', 0.0),
                    volume_change=category_data.get('volume_change', 0.0),
                    last_updated=last_updated
                ).model_dump()
        except Exception as e:
            self.logger.error(f"Error fetching category {cat_id}: {str(e)}")
        return None
            
    async def process_batch(self, client: httpx.AsyncClient , batch: List[str], semaphore: asyncio.Semaphore) -> List[Dict]:
        """Process a batch of category IDs with rate limiting"""
        tasks = []
        for cat_id in batch:
            async with semaphore:  # Control concurrent requests
                task = asyncio.create_task(self.fetch_single_category(client, cat_id))
                tasks.append(task)
                await asyncio.sleep(0.1)  # Small delay between requests within batch
                
        results = await asyncio.gather(*tasks)
        return [r for r in results if r is not None]
        
    async def fetch_cmc_category_data(self, category_ids: List[str]) -> List[DefaultCategory]:
        """Fetch category data from CMC API with concurrent processing"""
        timeout = 300.0
        all_category_data = []
        batch_size = 10
        max_concurrent_requests = 5
        
        # Create semaphore to limit concurrent requests
        semaphore = asyncio.Semaphore(max_concurrent_requests)
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                tasks = []
                for i in range(0, len(category_ids), batch_size):
                    batch = category_ids[i:i + batch_size]
                    task = asyncio.create_task(self.process_batch(client, batch, semaphore))
                    tasks.append(task)
                    await asyncio.sleep(1)  # Delay between batches
                    
                # Process all batches
                batch_results = await asyncio.gather(*tasks)
                for batch_data in batch_results:
                    all_category_data.extend(batch_data)
                
            return all_category_data
        except Exception as e:
            self.logger.error(f"Error fetching CMC categories: " + str(e))
            return []
