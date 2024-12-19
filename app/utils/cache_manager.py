from datetime import datetime, timedelta
from typing import TypeVar, Optional, Callable, Dict, Any
import asyncio
from fastapi import HTTPException
import logging
from functools import wraps
from fastapi import Request, Depends, FastAPI
import inspect

T = TypeVar('T')

class CacheManager:
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._locks: Dict[str, asyncio.Lock] = {}
        self._updating: Dict[str, bool] = {}
        
    async def get_or_update(
        self,
        cache_key: str,
        fetch_func: Callable[[], T],
        expiry_minutes: int = 5,
        force_update: bool = False
    ) -> tuple[T, bool]:
        """
        Get data from cache or update if expired.
        Returns tuple of (data, is_updating)
        """
        if cache_key not in self._locks:
            self._locks[cache_key] = asyncio.Lock()
            
        current_time = datetime.now()
        cache_entry = self._cache.get(cache_key)
        is_updating = self._updating.get(cache_key, False)

        # Return cached data if it exists and isn't expired
        if not force_update and cache_entry and (current_time - cache_entry['timestamp']) < timedelta(minutes=expiry_minutes):
            return cache_entry['data'], is_updating

        # If we're already updating, return stale data
        if is_updating and cache_entry:
            return cache_entry['data'], True

        # Try to acquire lock for update
        if await self._locks[cache_key].acquire():
            try:
                self._updating[cache_key] = True
                
                # Double check if another process updated while we were waiting
                cache_entry = self._cache.get(cache_key)
                if not force_update and cache_entry and (current_time - cache_entry['timestamp']) < timedelta(minutes=expiry_minutes):
                    return cache_entry['data'], False

                # Fetch new data
                try:
                    new_data = await fetch_func()
                    self._cache[cache_key] = {
                        'data': new_data,
                        'timestamp': current_time
                    }
                    return new_data, False
                except Exception as e:
                    logging.error(f"Error updating cache for {cache_key}: {str(e)}")
                    if cache_entry:
                        return cache_entry['data'], False
                    raise HTTPException(status_code=500, detail=f"Failed to fetch data: {str(e)}")
            finally:
                self._updating[cache_key] = False
                self._locks[cache_key].release()
        
        # If we couldn't acquire the lock but have cached data, return it
        if cache_entry:
            return cache_entry['data'], True
            
        # If we have no cached data and couldn't acquire the lock, wait briefly and try again
        await asyncio.sleep(0.5)
        return await self.get_or_update(cache_key, fetch_func, expiry_minutes)

# Global cache manager instance
cache_manager = CacheManager()

def get_force_update(request: Request):
    force_update = request.query_params.get('force_update', 'false')
    print(f"Raw query param: {force_update}")  # Debug print
    return force_update.lower() == 'true'

# def cached_endpoint(cache_key: str, expiry_minutes: int = 5):
#     def decorator(func):
#         @wraps(func)
#         async def wrapper(force_update: bool = Depends(get_force_update), *args, **kwargs):
#             print(force_update)
#             async def fetch_data():
#                 return await func(*args, **kwargs)
            
#             data, is_updating = await cache_manager.get_or_update(
#                 cache_key,
#                 fetch_data,
#                 expiry_minutes,
#                 force_update=force_update
#             )
            
#             response = {
#                 "data": data,
#                 "is_updating": is_updating,
#                 "last_updated": datetime.now().isoformat()
#             }
            
#             return response
#         return wrapper
#     return decorator

def cached_endpoint(cache_key: str, expiry_minutes: int = 5):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            request: Optional[Request] = None
            force_update = False
            # First check kwargs
            if 'request' in kwargs:
                request = kwargs['request']
            # Then check args
            else:
                request = next(
                    (arg for arg in args if isinstance(arg, Request)),
                    None
                )
            if request:
                if request.query_params:
                    force_update = request.query_params.get('force_update', 'false')
                
            async def fetch_data():
                return await func(*args, **kwargs)
            
            data, is_updating = await cache_manager.get_or_update(
                cache_key,
                fetch_data,
                expiry_minutes,
                force_update=force_update
            )
            
            response = {
                "data": data,
                "is_updating": is_updating,
                "last_updated": datetime.now().isoformat()
            }
            
            return response
        return wrapper
    return decorator