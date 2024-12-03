from typing import List
from app.schemas.wallet.wallet import (
    Wallet, WalletMode, PositionType, Token, 
    DefiPosition, FullToken, BasePosition, 
    Quantity, Changes
)
from app.schemas.tokens.full_token import FullCMCToken
from app.schemas.tokens.zeriontoken import (
    ZerionToken, AssetLinks, AssetData, 
    AssetRelationships, AssetAttributes, 
    IconData, Flags, MarketData, MarketChanges,
    ChartRelation, ChartRelationData, ChartRelationLinks
)
from app.utils.helpers import safe_get, safe_float

def format_base_position(token_value, position) -> BasePosition:
    return BasePosition(
                id=str(position.get('id', None)),
                name=safe_get(position, ['attributes', 'fungible_info', 'name']),
                symbol=safe_get(position, ['attributes', 'fungible_info', 'symbol']),
                position_type=safe_get(position, ['attributes', 'position_type']),
                quantity=Quantity(
                    float=safe_get(position, ['attributes', 'quantity', 'float'], 0),
                    numeric=safe_get(position, ['attributes', 'quantity', 'numeric'], 0)
                ),
                value=token_value,
                price=safe_get(position, ['attributes', 'price'], 0),
                changes=Changes(
                    absolute_1d=safe_get(position, ['attributes', 'changes', 'absolute_1d'], 0),
                    percent_1d=safe_get(position, ['attributes', 'changes', 'percent_1d'], 0)
                ),
                last_updated=safe_get(position, ['attributes', 'updated_at'], ''),
                chain=safe_get(position, ['relationships', 'chain', 'data', 'id'], ''),
                icon=safe_get(position, ['attributes', 'fungible_info', 'icon', 'url'], ''),
                fungible_id=safe_get(position, ['relationships', 'fungible', 'data', 'id'], '')
            )
    
def format_token(position: dict, token_data: dict, token_type) -> FullToken:
    """Format token data into Token model."""

    if token_type == 'zerion':
        # Use data from position
        if position['attributes']['value'] is None:
            token_price = float(safe_get(position, ['attributes', 'price'], 0))
            token_amount = safe_get(position, ['attributes', 'quantity', 'float'], 0)

            token_value = round((token_amount) * (token_price), 2)
        else:
            token_value = safe_get(position, ['attributes', 'value'], 0)

        return FullToken(
            zerion_token=True,
            token_data=None,
            zerion_data= format_base_position(token_value, position)
        )

    elif token_type == 'CMC':
        token_price = safe_get(token_data, ['quote', 'USD', 'price'])
        token_quantity = safe_float(safe_get(position, ['attributes', 'quantity', 'float'], 0), 3)

        token_value = round((token_quantity or 0) * (token_price or 0), 2)

        return FullToken(
            zerion_token=False,
            token_data=Token(
                id=str(token_data.get("id", None)),
                symbol=token_data.get("symbol", None),
                name=token_data.get("name", None),
                value=token_value,
                price=token_price,
                amount=token_quantity,
                change24h=safe_float(safe_get(token_data, ['quote', 'USD', 'percent_change_24h']), 2),
                position_type=safe_get(position, ['attributes', 'position_type']),
                chain=safe_get(position, ['relationships', 'chain', 'data', 'id']),
                last_updated=token_data.get("last_updated", None)
                ),

            zerion_data=format_base_position(
                token_value if safe_get(position, ['attributes', 'value']) is None else safe_get(position, ['attributes', 'value']),
                position
            )
        )
    
    elif token_type == 'CG':
        token_price = safe_get(token_data, ['price'])
        token_quantity = safe_float(safe_get(position, ['attributes', 'quantity', 'float'], 0), 3)

        token_value = round((token_quantity or 0) * (token_price or 0), 2)

        return FullToken(
            zerion_token=False,
            token_data= Token(
                id=str(token_data.get("id", None)),
                symbol=token_data.get("symbol", None),
                name=token_data.get("name", None),
                value=token_value,
                price=token_price,
                amount=token_quantity,
                change24h=safe_get(token_data, ['change24h']),
                position_type='',
                chain=safe_get(token_data, ['chain']),
                last_updated=token_data.get("last_updated", None),
                coingecko_id=True
            ),
            zerion_data=format_base_position(
                token_value if safe_get(position, ['attributes', 'value']) is None else safe_get(position, ['attributes', 'value']),
                position
            )
        )
        
def format_defi_position(position: dict) -> DefiPosition:
    """Format DeFi position data"""
    base_data: BasePosition = format_base_position(safe_get(position, ['attributes', 'value'], 0), position)
    
    return DefiPosition(
        **base_data.model_dump(),
        protocol_id=safe_get(position, ['relationships', 'chain', 'links', 'related'], ''),
        protocol_link=safe_get(position, ['attributes', 'application_metadata', 'url'], ''),
        protocol_icon=safe_get(position, ['attributes', 'application_metadata', 'icon', 'url'], ''),
        protocol_chain=safe_get(position, ['relationships', 'chain', 'data', 'id'], ''),
        protocol=safe_get(position, ['attributes', 'protocol'], ''),
        position_name=safe_get(position, ['attributes', 'name'], ''),
        dapp=safe_get(position, ['relationships', 'dapp', 'data', 'id'], '')
    )
    
def format_zerion_token(token):
    # First create the ZerionToken object as before
    zerion_token = ZerionToken(
        links=AssetLinks(
            self=safe_get(token, ['links', 'self'], '')
        ),
        data=AssetData(
            type=safe_get(token, ['data', 'type'], ''),
            id=safe_get(token, ['data', 'id'], ''),
            attributes=AssetAttributes(
                name=safe_get(token, ['data', 'attributes', 'name'], ''),
                symbol=safe_get(token, ['data', 'attributes', 'symbol'], ''),
                description=safe_get(token, ['data', 'attributes', 'description'], ''),
                icon=IconData(
                    url=safe_get(token, ['data', 'attributes', 'icon', 'url'], '')
                ),
                flags=Flags(
                    verified=safe_get(token, ['data', 'attributes', 'flags', 'verified'], False)
                ),
                external_links=safe_get(token, ['data', 'attributes', 'external_links'], []),
                implementations=safe_get(token, ['data', 'attributes', 'implementations'], []),
                market_data=MarketData(
                    total_supply=safe_get(token, ['data', 'attributes', 'market_data', 'total_supply'], 0),
                    circulating_supply=safe_get(token, ['data', 'attributes', 'market_data', 'circulating_supply'], 0),
                    market_cap=safe_get(token, ['data', 'attributes', 'market_data', 'market_cap'], 0),
                    fully_diluted_valuation=safe_get(token, ['data', 'attributes', 'market_data', 'fully_diluted_valuation'], 0),
                    price=safe_get(token, ['data', 'attributes', 'market_data', 'price'], 0),
                    changes=MarketChanges(
                        percent_1d=safe_get(token, ['data', 'attributes', 'market_data', 'changes', 'percent_1d'], 0),
                        percent_30d=safe_get(token, ['data', 'attributes', 'market_data', 'changes', 'percent_30d'], 0),
                        percent_90d=safe_get(token, ['data', 'attributes', 'market_data', 'changes', 'percent_90d'], 0),
                        percent_365d=safe_get(token, ['data', 'attributes', 'market_data', 'changes', 'percent_365d'], 0)
                    )
                )
            ),
            relationships=AssetRelationships(
                chart_day=ChartRelation(
                    links=ChartRelationLinks(
                        related=safe_get(token, ['data', 'relationships', 'chart_day', 'links', 'related'], '')
                    ),
                    data=ChartRelationData(
                        type=safe_get(token, ['data', 'relationships', 'chart_day', 'data', 'type'], ''),
                        id=safe_get(token, ['data', 'relationships', 'chart_day', 'data', 'id'], '')
                    )
                ),
                chart_hour=ChartRelation(
                    links=ChartRelationLinks(
                        related=safe_get(token, ['data', 'relationships', 'chart_hour', 'links', 'related'], '')
                    ),
                    data=ChartRelationData(
                        type=safe_get(token, ['data', 'relationships', 'chart_hour', 'data', 'type'], ''),
                        id=safe_get(token, ['data', 'relationships', 'chart_hour', 'data', 'id'], '')
                    )
                ),
                chart_max=ChartRelation(
                    links=ChartRelationLinks(
                        related=safe_get(token, ['data', 'relationships', 'chart_max', 'links', 'related'], '')
                    ),
                    data=ChartRelationData(
                        type=safe_get(token, ['data', 'relationships', 'chart_max', 'data', 'type'], ''),
                        id=safe_get(token, ['data', 'relationships', 'chart_max', 'data', 'id'], '')
                    )
                ),
                chart_month=ChartRelation(
                    links=ChartRelationLinks(
                        related=safe_get(token, ['data', 'relationships', 'chart_month', 'links', 'related'], '')
                    ),
                    data=ChartRelationData(
                        type=safe_get(token, ['data', 'relationships', 'chart_month', 'data', 'type'], ''),
                        id=safe_get(token, ['data', 'relationships', 'chart_month', 'data', 'id'], '')
                    )
                ),
                chart_week=ChartRelation(
                    links=ChartRelationLinks(
                        related=safe_get(token, ['data', 'relationships', 'chart_week', 'links', 'related'], '')
                    ),
                    data=ChartRelationData(
                        type=safe_get(token, ['data', 'relationships', 'chart_week', 'data', 'type'], ''),
                        id=safe_get(token, ['data', 'relationships', 'chart_week', 'data', 'id'], '')
                    )
                ),
                chart_year=ChartRelation(
                    links=ChartRelationLinks(
                        related=safe_get(token, ['data', 'relationships', 'chart_year', 'links', 'related'], '')
                    ),
                    data=ChartRelationData(
                        type=safe_get(token, ['data', 'relationships', 'chart_year', 'data', 'type'], ''),
                        id=safe_get(token, ['data', 'relationships', 'chart_year', 'data', 'id'], '')
                    )
                )
            )
        )
    )
    
    # Convert the Pydantic model to a dictionary
    return zerion_token.model_dump()
