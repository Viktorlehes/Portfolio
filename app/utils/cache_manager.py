from datetime import datetime, timedelta
from typing import TypeVar, Optional, Callable, Dict, Any
import asyncio
from fastapi import HTTPException
import logging
from functools import wraps
from fastapi import Request

T = TypeVar('T')

class CacheManager:
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._locks: Dict[str, asyncio.Lock] = {}
        self._updating: Dict[str, bool] = {}
        self._refresh_tasks: Dict[str, asyncio.Task] = {}
        self._last_access: Dict[str, datetime] = {}

    async def _background_refresh(
        self,
        cache_key: str,
        fetch_func: Callable[[], T],
        refresh_interval: int,
        max_refresh_time: int
    ):
        """Background task to periodically refresh cache data"""
        start_time = datetime.now()
        
        print(f"Starting background refresh for {cache_key}")
        
        while True:
            try:
                # Stop refreshing if we've exceeded max refresh time
                if datetime.now() - start_time > timedelta(minutes=max_refresh_time):
                    logging.info(f"Stopping background refresh for {cache_key} - max refresh time reached")
                    break
                    
                # Stop refreshing if data hasn't been accessed recently
                last_access = self._last_access.get(cache_key)
                if last_access and datetime.now() - last_access > timedelta(minutes=10):
                    logging.info(f"Stopping background refresh for {cache_key} - no recent access")
                    break
                
                print(f"Background refresh waiting for {cache_key}")
                await asyncio.sleep(refresh_interval * 60)  # Convert minutes to seconds
                
                # Perform the refresh
                logging.info(f"Background refresh starting for {cache_key}")
                new_data = await fetch_func()
                self._cache[cache_key] = {
                    'data': new_data,
                    'timestamp': datetime.now()
                }
                logging.info(f"Background refresh completed for {cache_key}")
                
            except Exception as e:
                logging.error(f"Error in background refresh for {cache_key}: {str(e)}")
                await asyncio.sleep(60)  # Wait a minute before retrying
                
        # Cleanup
        if cache_key in self._refresh_tasks:
            del self._refresh_tasks[cache_key]
    
    async def get_or_update(
        self,
        cache_key: str,
        fetch_func: Callable[[], T],
        expiry_minutes: int = 5,
        force_update: bool = False,
        enable_background_refresh: bool = True,
        refresh_interval: int = 5,  # minutes
        max_refresh_time: int = 30  # minutes
    ) -> tuple[T, bool]:
        """
        Get data from cache or update if expired.
        Returns tuple of (data, is_updating)
        
        Parameters:
            cache_key: Unique identifier for cached data
            fetch_func: Async function to fetch fresh data
            expiry_minutes: Minutes until cache expires
            force_update: Force a cache update
            enable_background_refresh: Enable background refresh after first request
            refresh_interval: Minutes between background refresh attempts
            max_refresh_time: Maximum minutes to continue background refresh
        """
        # Update last access time
        self._last_access[cache_key] = datetime.now()
        
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
                    
                    # Start background refresh if enabled and not already running
                    if enable_background_refresh and cache_key not in self._refresh_tasks:
                        refresh_task = asyncio.create_task(
                            self._background_refresh(
                                cache_key,
                                fetch_func,
                                refresh_interval,
                                max_refresh_time
                            )
                        )
                        self._refresh_tasks[cache_key] = refresh_task
                        
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

def cached_endpoint(
    cache_key: str,
    expiry_minutes: int = 5,
    enable_background_refresh: bool = True,
    refresh_interval: int = 5,
    max_refresh_time: int = 30
):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            request = next(
                (arg for arg in args if isinstance(arg, Request)),
                kwargs.get('request', None)
            )
            
            force_update = False
            if request and request.query_params:
                force_update = request.query_params.get('force_update', 'false').lower() == 'true'
            
            async def fetch_data():
                return await func(*args, **kwargs)
            
            # Use global cache manager instance
            data, is_updating = await cache_manager.get_or_update(
                cache_key,
                fetch_data,
                expiry_minutes,
                force_update=force_update,
                enable_background_refresh=enable_background_refresh,
                refresh_interval=refresh_interval,
                max_refresh_time=max_refresh_time
            )
            
            return {
                "data": data,
                "is_updating": is_updating,
                "last_updated": datetime.now().isoformat()
            }
            
        return wrapper
    return decorator