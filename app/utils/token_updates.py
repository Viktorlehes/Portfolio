# app/scripts/token_updates.py
import aiohttp
import asyncio
import math
from typing import List
from requests import Session
from fastapi import HTTPException
from pymongo import UpdateOne

from app.core.db import tokens_collection  # Move DB setup to core/db.py
from app.core.config import CM_API_KEY, CG_API_KEY  # Move env vars to core/config.py

async def update_all_tokens():
    url = 'https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest'
    batch_size = 100
    
    # Get tokens from database
    try:
        asyncio_tokens = tokens_collection.find({}, {'id': 1, 'coingecko_id': 1})
        tokens = []
        async for document in asyncio_tokens:
            tokens.append(document)

        # Separate tokens by type
        cmc_ids = []
        cg_ids = []
        for token in tokens:
            if "coingecko_id" in token:
                cg_ids.append(token['id'])
            else:
                cmc_ids.append(token['id'])

        total_cmc_tokens = len(cmc_ids)
        num_batches = math.ceil(total_cmc_tokens / batch_size)

        headers = {
            'Accepts': 'application/json',
            'X-CMC_PRO_API_KEY': CM_API_KEY
        }

        async with aiohttp.ClientSession(headers=headers) as session:
            for batch_num in range(num_batches):
                start_idx = batch_num * batch_size
                end_idx = min((batch_num + 1) * batch_size, total_cmc_tokens)
                current_batch = cmc_ids[start_idx:end_idx]
                token_ids = ','.join(str(id) for id in current_batch)
                
                parameters = {
                    'id': token_ids,
                    'convert': 'USD',
                }

                try:
                    async with session.get(url, params=parameters) as response:
                        if response.status != 200:
                            error_text = await response.text()
                            continue
                            
                        data = await response.json()
                        bulk_operations = []

                        if 'data' in data:
                            for token_id in current_batch:
                                str_token_id = str(token_id)
                                if str_token_id in data['data']:
                                    token_data = data['data'][str_token_id]
                                    try:
                                        bulk_operations.append(
                                            UpdateOne(
                                                {'id': token_id},
                                                {'$set': {
                                                    'name': token_data['name'],
                                                    'symbol': token_data['symbol'],
                                                    'quote': token_data['quote'],
                                                    'last_updated': token_data['last_updated']
                                                }},
                                                upsert=True
                                            )
                                        )
                                    except KeyError as ke:
                                        print(f"Missing key in token data for ID {token_id}: {ke}")
                                        print("Token data:", token_data)
                                else:
                                    print(f"Token ID {token_id} not found in API response")

                            if bulk_operations:
                                try:
                                    result = await tokens_collection.bulk_write(bulk_operations)
                                    print(f"Batch {batch_num + 1}/{num_batches}:")
                                    print(f"- Modified: {result.modified_count}")
                                    print(f"- Upserted: {result.upserted_count}")
                                    print(f"- Matched: {result.matched_count}")
                                except Exception as e:
                                    print(f"Error in bulk update for batch {batch_num + 1}: {str(e)}")
                            else:
                                print(f"No updates needed for batch {batch_num + 1}")
                        else:
                            print(f"No data in response for batch {batch_num + 1}")
                            print("Response:", data)

                except Exception as e:
                    print(f"Error processing batch {batch_num + 1}: {str(e)}")
                    continue

                # Rate limiting
                await asyncio.sleep(1)

    except Exception as e:
        print(f"Error in update_all_tokens: {str(e)}")
        raise

    # Update CoinGecko tokens
    if len(cg_ids) > 0:
        total_cg_tokens = len(cg_ids)

        headers = {
            "accept": "application/json",
            "x-cg-demo-api-key": CG_API_KEY
        }

        session = Session()
        session.headers.update(headers)

        for token_id in cg_ids:
            url = f"https://api.coingecko.com/api/v3/coins/{token_id}"

            try:
                response = session.get(url)
                response.raise_for_status()
                data = response.json()

                if data:
                    try:
                        await tokens_collection.update_one(
                            {'id': token_id},
                            {'$set': {
                                'name': data['name'],
                                'symbol': data['symbol'],
                                'price': data['market_data']['current_price'],
                                'last_updated': data['last_updated']
                            }}
                        )
                        print(f"Updated token {data['name']} ({data['symbol']})")
                    except Exception as e:
                        error_msg = f"Error updating token {data['name']} ({data['symbol']}): {str(e)}"
                        print(error_msg)
            except Exception as e:
                error_msg = f"Error fetching token {token_id}: {str(e)}"
                print(error_msg)
                continue

            await asyncio.sleep(1)

        print("CoinGecko tokens updated")

    print("Token update completed")