# app/api/v1/endpoints/users.py

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timezone
import jwt
from app_v2.api.v1.dependencies import UserServiceDep
from app_v2.core.security import get_current_user
from app_v2.core.auth_utils import generate_token
from app_v2.models.user import User
import logging
from app_v2.core.responses import APIResponse, create_response

router = APIRouter()

class LoginUserRequest(BaseModel):
    email: EmailStr
    password: str

class LoginUserResponse(BaseModel):
    access_token: str 
    token_type: str = "bearer"

@router.post("/login", response_model=APIResponse[LoginUserResponse])
async def login_user(
    request: LoginUserRequest,
    user_service: UserServiceDep
    ):
    """User login endpoint"""
    try:
        user, error = await user_service.verify_credentials(request.email, request.password)

        if error:
            raise HTTPException(
                status_code=401,
                detail=error
            )

        # Generate access token
        access_token = await generate_token(user.id, user.email)

        return create_response({
            "access_token": access_token,
            "token_type": "bearer"
        })

    except jwt.PyJWTError:
        raise HTTPException(
            status_code=500,
            detail="Could not generate access token"
        )
    except HTTPException as e:
        logging.error(f"Login error: {str(e)}")
        raise HTTPException(detail=str(e.detail), status_code=e.status_code)
    except Exception as e:
        logging.error(f"Login error: {str(e)}")
        raise Exception("An error occurred during login: " + str(e))
        
class RegisterUserRequest(BaseModel):
    email: EmailStr
    password: str
    
@router.post("/register", response_model=APIResponse[LoginUserResponse])
async def register_user(
    request: RegisterUserRequest,
    user_service: UserServiceDep
    ):
    """User registration endpoint"""
    try:
        try:
            user = await user_service.create_user(request.email, request.password)
        except ValueError as e:
            status_code = 409 if str(e) == "User already exists" else 500
            raise HTTPException(detail=str(e), status_code=status_code)

        # Generate access token
        access_token = await generate_token(user.id, user.email)

        return create_response({
            "access_token": access_token,
            "token_type": "bearer"
        })

    except HTTPException as e:
        raise HTTPException(
            status_code=e.status_code,
            detail="An error occurred during registration: " + str(e)
        )
    except Exception as e:
        logging.error(f"Registration error: {str(e)}")
        raise Exception("An error occurred during registration")

@router.get("/me", response_model=User)
async def get_current_user(current_user: User = Depends(get_current_user)):
    """Get current user profile"""
    return current_user

@router.post("/me/verify-email")
async def verify_email(
    user_service: UserServiceDep,
    current_user: User = Depends(get_current_user)
):
    """Verify user email"""
    success = await user_service.mark_email_verified(current_user.id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to verify email")
    return {"message": "Email verified successfully"}

@router.post("/me/change-password")
async def change_password(
    old_password: str,
    new_password: str,
    user_service: UserServiceDep,
    current_user: User = Depends(get_current_user)
):
    """Change user password"""
    # Verify old password
    _, error = await user_service.verify_credentials(current_user.email, old_password)
    if error:
        raise HTTPException(status_code=401, detail="Invalid current password")
    
    # Update password
    success = await user_service.update_password(current_user.id, new_password)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update password")
    
    return {"message": "Password updated successfully"}