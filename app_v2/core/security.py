# app/core/auth.py

from datetime import datetime, timezone
from typing import Optional
from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app_v2.services.db.user_service import UserService
from app_v2.models.user import User
from app_v2.core.auth_utils import verify_token

# Security scheme for Swagger UI
security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> User:
    """
    FastAPI dependency to get current authenticated user from JWT token.
    Usage: 
        @router.get("/")
        async def endpoint(current_user: User = Depends(get_current_user)):
            ...
    """
    try:
        token = credentials.credentials
        payload = await verify_token(token)
        
        user_service = UserService()
        user = await user_service.get_by_id(str(payload['sub']))
        
        if not user:
            raise HTTPException(
                status_code=401,
                detail="User not found"
            )
            
        # Update last active timestamp
        await user_service.update_last_active(str(user.id))
        
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail="Authentication failed"
        )

# Optional: Add role-based access control
async def get_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency for admin-only endpoints.
    Usage:
        @router.get("/admin")
        async def admin_endpoint(current_user: User = Depends(get_admin_user)):
            ...
    """
    if not current_user.is_admin:  # Add is_admin field to User model
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )
    return current_user