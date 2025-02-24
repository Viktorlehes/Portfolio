# app/services/external/zerion_service.py
from fastapi import HTTPException
from typing import Dict, List, Optional
import httpx
import asyncio
from datetime import datetime
import logging
from app_v2.core.config import ZERION_API_KEY
from app_v2.models.Zerion.zerion_token import ZerionToken
from app_v2.models.Zerion.chart import ChartData, FullChartData

class ZerionServiceError(Exception):
    """Custom exception for Zerion service errors"""
    pass

class ZerionService:
    """Service for interacting with Zerion API"""
    
    def __init__(self):
        self.base_url = "https://api.zerion.io/v1"
        self.headers = {
            "accept": "application/json",
            "authorization": f"Basic {ZERION_API_KEY}=="
        }
        self.retry_delay = 15  # seconds
        self.max_retry_time = 120  # seconds (2 minutes)

    async def get_wallet_positions(self, address: str) -> Dict:
        """
        Get wallet positions from Zerion with retry logic for 202 status.
        Will retry every 15 seconds for up to 2 minutes.
        """
        async with httpx.AsyncClient() as client:
            logging.info(f"Fetching wallet positions for address: {address}")
            
            url = f"{self.base_url}/wallets/{address}/positions/"
            params = {
                "filter[positions]": "no_filter",
                "currency": "usd",
                "sort": "value"
            }

            start_time = datetime.now()
            attempt = 1

            while True:
                try:
                    response = await client.get(url, headers=self.headers, params=params)
                    
                    if response.status_code == 200:
                        logging.info(f"Successfully fetched wallet positions for {address}")
                        return response.json()
                        
                    elif response.status_code == 202:
                        elapsed_time = (datetime.now() - start_time).total_seconds()
                        
                        if elapsed_time >= self.max_retry_time:
                            error_msg = f"Timeout waiting for wallet positions after {attempt} attempts over {elapsed_time} seconds"
                            logging.error(error_msg)
                            raise ZerionServiceError(error_msg)
                            
                        logging.info(f"Received 202 status for {address}, attempt {attempt}. Retrying in {self.retry_delay} seconds...")
                        await asyncio.sleep(self.retry_delay)
                        attempt += 1
                        continue
                    
                    elif response.status_code == 400:
                        raise HTTPException(detail="Invalid Address", status_code=400)   
                     
                    else:
                        error_msg = f"Unexpected status code {response.status_code} from Zerion API"
                        logging.error(error_msg)
                        response.raise_for_status()

                except HTTPException as e:
                    raise HTTPException(detail=e.detail, status_code=e.status_code)

                except httpx.HTTPStatusError as e:
                    error_msg = f"HTTP error occurred: {str(e)}"
                    logging.error(error_msg)
                    raise ZerionServiceError(error_msg)
                    
                except asyncio.TimeoutError:
                    error_msg = f"Request timed out while fetching wallet positions for {address}"
                    logging.error(error_msg)
                    raise ZerionServiceError(error_msg)
                    
                except Exception as e:
                    error_msg = f"Unexpected error fetching wallet positions: {str(e)}"
                    logging.error(error_msg)
                    raise ZerionServiceError(error_msg)

    async def get_token_by_id(self, fungible_id: str) -> ZerionToken:
        """Get token data from Zerion"""
        async with httpx.AsyncClient() as client:
            try:
                url = f"{self.base_url}/fungibles/{fungible_id}"
                response = await client.get(url, headers=self.headers)
                response.raise_for_status()
                data = response.json()
                return data["data"]
            except Exception as e:
                logging.error(f"Error fetching token data for {fungible_id}: {str(e)}")
                raise ZerionServiceError(f"Failed to fetch token data: {str(e)}")
    
    async def get_day_chart_by_fungible_id(self, fungible_id: str) -> ChartData:
        """Get chart data from Zerion"""
        async with httpx.AsyncClient() as client:
            try:
                url = f"{self.base_url}/fungibles/{fungible_id}/charts/day"
                response = await client.get(url, headers=self.headers)
                response.raise_for_status()
                data = response.json()
                return data
            except Exception as e:
                logging.error(f"Error fetching Charts for {fungible_id}: {str(e)}")
                raise ZerionServiceError(f"Failed to fetch Chart data: {str(e)}")
            
    async def get_all_charts_by_fungible_id(self, fungible_id: str) -> FullChartData:
        """Get chart data from Zerion"""
        chart_dict = dict({})
        async with httpx.AsyncClient() as client:
            try:
                url = f"{self.base_url}/fungibles/{fungible_id}/charts/day"
                response = await client.get(url, headers=self.headers)
                response.raise_for_status()
                if response.status_code == 200:
                    chart_dict["day"] = response.json()
                else:
                    chart_dict["day"] = None
            except Exception as e:
                logging.error(f"Error fetching day Chart for {fungible_id}: {str(e)}")
                chart_dict["day"] = None
                raise ZerionServiceError(f"Failed to fetch Chart data: {str(e)}")
            try:
                url = f"{self.base_url}/fungibles/{fungible_id}/charts/week"
                response = await client.get(url, headers=self.headers)
                response.raise_for_status()
                if response.status_code == 200:
                    chart_dict["week"] = response.json()
                else:
                    chart_dict["week"] = None
            except Exception as e:
                logging.error(f"Error fetching week Chart for {fungible_id}: {str(e)}")
                chart_dict["week"] = None
                raise ZerionServiceError(f"Failed to fetch Chart data: {str(e)}")
            try:
                url = f"{self.base_url}/fungibles/{fungible_id}/charts/month"
                response = await client.get(url, headers=self.headers)
                response.raise_for_status()
                if response.status_code == 200:
                    chart_dict["month"] = response.json()
                else:
                    chart_dict["month"] = None
            except Exception as e:
                logging.error(f"Error fetching month Chart for {fungible_id}: {str(e)}")
                chart_dict["month"] = None
                raise ZerionServiceError(f"Failed to fetch Chart data: {str(e)}")
        
        return chart_dict
            
    async def get_token(self, name: str = "") -> ZerionToken:
        """Get token by name or symbol from zerion api"""
        async with httpx.AsyncClient() as client:
            try:
                url = self.base_url + '/fungibles/'
            
                params = {
                    "filter[search_query]": name.strip(),
                    "currency": "usd",
                    "sort": "-market_data.market_cap"
                }
                
                response = await client.get(url, headers=self.headers, params=params)
                response.raise_for_status()
                data = response.json()
                return data["data"][0] if len(data["data"]) > 0 else None
                
            except HTTPException as e:
                raise HTTPException(detail="ZerionService Error:" + str(e))
            
    