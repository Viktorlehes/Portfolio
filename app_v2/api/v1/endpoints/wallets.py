# app/api/v1/endpoints/wallets/wallets.py

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from pydantic import BaseModel, Field

from app_v2.models.wallet import UnifiedWallet, WalletSource
from app_v2.api.v1.dependencies import WalletServiceDep
from app_v2.core.security import get_current_user
from app_v2.models.user import User
from app_v2.core.responses import APIResponse, create_response
from app_v2.services.external.zerion_service import ZerionServiceError

router = APIRouter()

class CreateWalletRequest(BaseModel):
    """Request model for creating a new wallet"""
    address: str = Field(..., description="Wallet address")
    name: str = Field(..., description="Display name for the wallet")
    color: str = Field(..., description="Color code for UI display")
    risk_level: str = Field(..., description="Risk level of wallet")
    #source: WalletSource = Field(default=WalletSource.ZERION, description="Wallet data source")
    
class UpdateWalletRequest(BaseModel):
    """Request model for updating a new wallet"""
    address: str = Field(..., description="Wallet address")
    name: str = Field(..., description="Display name for the wallet")
    color: str = Field(..., description="Color code for UI display")
    risk_level: str = Field(..., description="Risk level of wallet")

@router.post("/", response_model=APIResponse[UnifiedWallet])
async def create_wallet(
    request: CreateWalletRequest,
    wallet_service: WalletServiceDep,
    current_user: User = Depends(get_current_user)
):
    """
    Create a new wallet for the current user.
    """
    try:
        # Create new wallet
        new_wallet = await wallet_service.create_new_wallet(
            user_id=current_user.id,
            address=request.address,
            name=request.name,
            color=request.color,
            risk_level=request.risk_level,
            source="zerion"
        )
        
        return create_response(new_wallet, status_code=201)
    
    except HTTPException as e:
        raise HTTPException(detail=e.detail, status_code=e.status_code)
    
    except ZerionServiceError as e:
        raise Exception("Something went wrong when fetching wallet")
    except ValueError as e:
        # Handle known validation errors
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Log unexpected errors here
        raise HTTPException(status_code=500, detail="Failed to create wallet")

@router.get("/", response_model=APIResponse[List[UnifiedWallet]])
async def get_wallets(
    wallet_service: WalletServiceDep,
    source: Optional[WalletSource] = Query(None, description="Filter by wallet source"),
    current_user: User = Depends(get_current_user)
):
    """
    Get all wallets for the current user.
    Optionally filter by source (zerion, binance, etc.)
    """
    try:
        if source:
            wallets = await wallet_service.get_by_source(current_user.id, source)
        else:
            wallets = await wallet_service.get_user_wallets(current_user.id)
            
        return create_response(wallets)
        
    except Exception as e:
        # Log error here
        raise HTTPException(status_code=500, detail="Failed to fetch wallets")

@router.delete("/{address}", response_model=APIResponse[bool])
async def remove_wallet(
    address: str,
    wallet_service: WalletServiceDep,
    current_user: User = Depends(get_current_user)
):
    """
    Remove (deactivate) a wallet for the current user
    """
    try:
        success = await wallet_service.remove_user_wallet(str(current_user.id), address.lower())
        
        if not success:
            raise HTTPException(status_code=404, detail="Wallet not found or not owned by user")
            
        return create_response(data=True, status_code=201)
        
    except HTTPException as e:
        raise e
    except Exception as e:
        # Log error here
        raise HTTPException(status_code=500, detail="Failed to remove wallet")

@router.get("/{address}", response_model=APIResponse[UnifiedWallet])
async def get_wallet(
    address: str,
    wallet_service: WalletServiceDep,
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific wallet by address
    """
    try:
        wallet = await wallet_service.get_by_address(address)
        
        if not wallet:
            raise HTTPException(status_code=404, detail="Wallet not found")
            
        if wallet.user_id != str(current_user.id):
            raise HTTPException(status_code=403, detail="Access denied")
            
        return create_response(wallet)
        
    except HTTPException as e:
        raise e
    except Exception as e:
        # Log error here
        raise HTTPException(status_code=500, detail="Failed to fetch wallet")

@router.post("/{address}/refresh", response_model=APIResponse[UnifiedWallet])
async def refresh_wallet(
    address: str,
    wallet_service: WalletServiceDep,
    current_user: User = Depends(get_current_user)
):
    """
    Manually refresh wallet data from source
    """
    try:
        wallet = await wallet_service.get_by_address(address)
        
        if not wallet:
            raise HTTPException(status_code=404, detail="Wallet not found")
            
        if wallet.user_id != str(current_user.id):
            raise HTTPException(status_code=403, detail="Access denied")
            
        success = await wallet_service.update_wallet(wallet)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to refresh wallet")
            
        # Fetch and return updated wallet
        updated_wallet = await wallet_service.get_by_address(address)
        return create_response(updated_wallet)
        
    except HTTPException as e:
        raise e
    except Exception as e:
        # Log error here
        raise HTTPException(status_code=500, detail="Failed to refresh wallet")
    
@router.post("/update", response_model=APIResponse[bool])
async def update_wallet(
    request: UpdateWalletRequest,
    wallet_service: WalletServiceDep,
    current_user: User = Depends(get_current_user)
):
    """
    Update a wallet for the current user
    """
    try:
        address = request.address.lower()
        color = request.color
        risk_level = request.risk_level
        name = request.name
        success = await wallet_service.update_wallet_details(str(current_user.id), address, name, risk_level, color)
        
        if not success:
            raise HTTPException(status_code=404, detail="Wallet not found or not owned by user")
            
        return create_response(data=True, status_code=201)
        
    except HTTPException as e:
        raise e
    except Exception as e:
        # Log error here
        raise HTTPException(status_code=500, detail="Failed to remove wallet")