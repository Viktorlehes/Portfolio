# app/services/wallet/position_utils.py
from datetime import datetime, timezone
from typing import List, Dict, Optional, Tuple
import logging
from app_v2.models.wallet import WalletToken, DefiPosition
from app_v2.utils.helpers import safe_get, safe_float

async def create_wallet_token(position: Dict) -> Optional[WalletToken]:
    """Create WalletToken from position attributes"""
    try:
        attrs: dict = safe_get(position, ['attributes'], {})
        relations: dict = safe_get(position, ['relationships'], {})
        fungible_info: dict = safe_get(attrs, ['fungible_info'], {})
        quantity: dict = safe_get(attrs, ['quantity'], {})
        changes: dict = safe_get(attrs, ['changes'], {})
        
        return WalletToken(
            token_id=safe_get(relations, ['fungible', 'data', 'id']),
            name=safe_get(fungible_info, ['name']),
            symbol=safe_get(fungible_info, ['symbol']),
            amount=safe_get(quantity, ['float'], 0),
            value_usd=safe_get(attrs, ['value'], 0),
            price_usd=safe_get(attrs, ['price'], 0),
            price_24h_change=safe_get(changes, ['percent_1d'], 0),
            position_type=safe_get(attrs, ['position_type'], 'wallet'),
            chain=safe_get(relations, ['chain', 'data', 'id'], ""),
            icon=safe_get(fungible_info, ['icon', 'url'], ""),
            last_updated=datetime.now(timezone.utc)
        )
    except Exception:
        return None

async def create_defi_position(position: Dict) -> Optional[DefiPosition]:
    """Create DefiPosition from position attributes"""
    try:
        attrs: dict = safe_get(position, ['attributes'], {})
        relations: dict = safe_get(position, ['relationships'], {})
        fungible_info: dict = safe_get(attrs, ['fungible_info'], {})
        changes: dict = safe_get(attrs, ['changes'], {})
        quantity: dict = safe_get(attrs, ['quantity'], {})
        app_metadata: dict = safe_get(attrs, ['application_metadata'], {})
        
        return DefiPosition(
            id=safe_get(position, ['id']),
            name=safe_get(fungible_info, ['name']),
            symbol=safe_get(fungible_info, ['symbol']),
            position_name=safe_get(attrs, ['name']),
            protocol=safe_get(attrs, ['protocol']),
            chain=safe_get(relations, ['chain', 'data', 'id'], ""),
            position_type=safe_get(attrs, ['position_type']),
            zerion_id=safe_get(relations, ['fungible', 'data', 'id']),
            price_data={
                'current_value': safe_get(attrs, ['value'], 0),
                'current_price': safe_get(attrs, ['price'], 0),
                'price_change_24h': safe_get(changes, ['absolute_1d'], 0),
                'percent_change_24h': safe_get(changes, ['percent_1d'], 0),
            },
            quantity={
                'int': safe_get(quantity, ['int'], '0'),
                'decimals': safe_get(quantity, ['decimals'], 0),
                'float': safe_get(quantity, ['float'], 0),
                'numeric': safe_get(quantity, ['numeric'], '0')
            },
            icon=safe_get(fungible_info, ['icon', 'url'], ""),
            protocol_id=safe_get(relations, ['chain', 'links', 'related'], ""),
            protocol_link=safe_get(app_metadata, ['url'], ""),
            protocol_icon=safe_get(app_metadata, ['icon', 'url'], ""),
            protocol_chain=safe_get(relations, ['chain', 'data', 'id'], ""),
            dapp=safe_get(relations, ['dapp', 'data', 'id'], ""),
            updated_at=datetime.now(timezone.utc)
        )
    except Exception:
        return None

async def process_positions(positions: List[Dict]) -> Tuple[List[WalletToken], List[DefiPosition]]:
    """Process wallet positions from Zerion"""
    tokens = []
    defi_positions = []
    
    for position in positions:
        try:
            position_type = position.get('attributes').get('position_type')
            
            # Process as regular token
            if position_type == 'wallet':
                token = await create_wallet_token(position)
                if token:
                    tokens.append(token)
            
            # Process as DeFi position
            else:
                defi_pos = await create_defi_position(position)
                if defi_pos:
                    defi_positions.append(defi_pos)
                    
        except Exception as e:
            logging.error(f"Error processing position: {str(e)}")
            continue
            
    return tokens, defi_positions