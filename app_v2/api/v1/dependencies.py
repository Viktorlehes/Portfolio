# app/api/v1/dependencies.py
from fastapi import Depends
from typing import Annotated
from app_v2.services.db.token_service import TokenService
from app_v2.services.db.wallet_service import WalletService
from app_v2.services.db.user_service import UserService
from app_v2.services.external.cmc_service import CMCService
from app_v2.services.external.cgls_service import CGLSService
from app_v2.services.external.zerion_service import ZerionService
from app_v2.services.db.categories_service import CategoryService
from app_v2.services.db.alerts_service import AlertUsersService

# Service dependency functions
async def get_token_service() -> TokenService:
    return TokenService()

async def get_wallet_service() -> WalletService:
    return WalletService()

async def get_user_service() -> UserService:
    return UserService()

async def get_cmc_service() -> CMCService:
    return CMCService()

async def get_cgls_service() -> CGLSService:
    return CGLSService()

async def get_zerion_service() -> ZerionService:
    return ZerionService()

async def get_category_service() -> CategoryService:
    return CategoryService()

async def get_user_alerts_service() -> AlertUsersService:
    return AlertUsersService()

# Type annotations for cleaner dependency injection
TokenServiceDep = Annotated[TokenService, Depends(get_token_service)]
WalletServiceDep = Annotated[WalletService, Depends(get_wallet_service)]
UserServiceDep = Annotated[UserService, Depends(get_user_service)]
CMCServiceDep = Annotated[CMCService, Depends(get_cmc_service)]
CGLSServiceDep = Annotated[CGLSService, Depends(get_cgls_service)]
ZerionServiceDep = Annotated[ZerionService, Depends(get_zerion_service)]
CategoryServiceDep = Annotated[CategoryService, Depends(get_category_service)]
AlertUsersServiceDep = Annotated[AlertUsersService, Depends(get_user_alerts_service)]