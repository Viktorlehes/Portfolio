import asyncio
from typing import Dict
from datetime import datetime, timezone, timedelta
import time

class RateLimiter:
    """Rate limiter for API calls"""
    def __init__(self, calls_per_minute: int = 30):
        self.calls_per_minute = calls_per_minute
        self.calls: Dict[float, datetime] = {}
        self.lock = asyncio.Lock()
        
    async def acquire(self):
        """Acquire permission to make an API call"""
        async with self.lock:
            now = datetime.now(timezone.utc)
            # Remove calls older than 1 minute
            cutoff = now - timedelta(minutes=1)
            self.calls = {k: v for k, v in self.calls.items() 
                         if v > cutoff}
            
            # If at limit, wait until oldest call expires
            if len(self.calls) >= self.calls_per_minute:
                oldest_call = min(self.calls.values())
                wait_time = (oldest_call + timedelta(minutes=1) - now).total_seconds()
                if wait_time > 0:
                    await asyncio.sleep(wait_time)
            
            # Add new call
            call_id = time.time()
            self.calls[call_id] = now
            return call_id

class TimeoutManager:
    """Manages timeouts for API calls"""
    def __init__(self, base_timeout: float = 30.0, max_retries: int = 3):
        self.base_timeout = base_timeout
        self.max_retries = max_retries
        
    async def execute_with_timeout(self, func, *args, **kwargs):
        """Execute function with timeout and retries"""
        last_exception = None
        
        for attempt in range(self.max_retries):
            try:
                timeout = self.base_timeout * (attempt + 1)
                async with asyncio.timeout(timeout):
                    return await func(*args, **kwargs)
            except asyncio.TimeoutError as e:
                last_exception = e
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
                continue
            except Exception as e:
                raise e
                
        raise last_exception or Exception("Max retries exceeded")