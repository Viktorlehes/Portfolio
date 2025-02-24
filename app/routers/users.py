#users.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.core.db import users_collection
from bson import ObjectId
import jwt
from pymongo import errors as PymongoErrors
from datetime import datetime, timezone
from app.core.auth import verify_user_password, generate_token, encrypt_password
from app.core.config import ACCOUNT_LOCKOUT_DURATION

router = APIRouter()

class User(BaseModel):
    _id: ObjectId
    email: str
    email_verified: Optional[bool]
    password_hash: str
    
    mfa_enabled: bool
    mfa_secret: Optional[str]
    password_reset_token: Optional[str]
    password_reset_expires: Optional[datetime]
    failed_login_attempts: Optional[int]
    locked_until: Optional[datetime]
    
    created_at: datetime
    last_login: datetime
    last_active: datetime

class LoginUserRequest(BaseModel):
    email: EmailStr
    password: str

class LoginUserResponse(BaseModel):
    access_token: str 
    token_type: str = "bearer"

@router.post("/login", response_model=LoginUserResponse)
async def login_user(request: LoginUserRequest):
    try:
        user: dict = await users_collection.find_one(
            {"email": request.email},
            {"email": 1, "password_hash": 1, "failed_login_attempts": 1, "locked_until": 1}
        )

        if not user:
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        if user.get("locked_until"):
            if datetime.now(timezone.utc) < user["locked_until"]:
                raise HTTPException(
                    status_code=401,
                    detail="Account is temporarily locked. Please try again later."
                )
            else:
                await users_collection.update_one(
                    {"_id": user["_id"]},
                    {"$unset": {"locked_until": "", "failed_login_attempts": ""}}
                )

        # Verify password
        if not await verify_user_password(request.password, user["password_hash"]):
            # Increment failed login attempts
            failed_attempts = user.get("failed_login_attempts", 0) + 1
            update_data = {
                "$inc": {"failed_login_attempts": 1}
            }

            # Lock account after 5 failed attempts
            if failed_attempts >= 5:
                lock_until = datetime.now(timezone.utc) + ACCOUNT_LOCKOUT_DURATION
                update_data["$set"] = {"locked_until": lock_until}
                
            await users_collection.update_one(
                {"_id": user["_id"]},
                update_data
            )

            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        # Login successful - Update user data
        current_time = datetime.now(timezone.utc)
        update_result = await users_collection.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "last_active": current_time,
                    "last_login": current_time,
                    "failed_login_attempts": 0  
                },
                "$unset": {"locked_until": ""}  
            }
        )

        if update_result.modified_count != 1:
            # Log this error but don't expose to client
            print(f"Failed to update user data for ID: {user['_id']}")

        # Generate access token
        access_token = await generate_token(str(user["_id"]), user["email"])

        return {
            "access_token": access_token,
            "token_type": "bearer"
        }

    except jwt.PyJWTError:
        raise HTTPException(
            status_code=500,
            detail="Could not generate access token"
        )
    except Exception as e:
        # Log the actual error but don't expose it
        print(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="An error occurred during login"
        )
        
class RegisterUserRequest(BaseModel):
    email: EmailStr
    password: str
    
@router.post("/register", response_model=LoginUserResponse)
async def register_user(request: RegisterUserRequest):
    try:        
        user_exists = await users_collection.find_one({"email": request.email})
        
        if user_exists:
            raise HTTPException(detail="User already exists", status_code=409)
        
        hashed_password = encrypt_password(request.password)
        current_time = datetime.now(timezone.utc)
        
        user = {
            "email": request.email,
            "email_verified": False,
            "password_hash": hashed_password,
            
            "mfa_enabled": False,
            "mfa_secret": None,
            "password_reset_token": None,
            "password_reset_expires": None,
            "failed_login_attempts": 0,
            "locked_until": None,
            "created_at": current_time,
            "last_login": current_time,
            "last_active": current_time
        }
        
        created_user = await users_collection.insert_one(user)
        
        if not created_user.inserted_id:
            raise HTTPException(detail="Error creating user", status_code=500)
        
        access_token = await generate_token(str(created_user.inserted_id), user["email"])

        return {
            "access_token": access_token,
            "token_type": "bearer"
        }

    except jwt.PyJWTError:
        raise HTTPException(
            status_code=500,
            detail="Could not generate access token"
        )
    except PymongoErrors.DuplicateKeyError:
        raise HTTPException(detail="User already exists", status_code=409)
    except PymongoErrors.PyMongoError as e:
        print(f"Database error: {str(e)}")
        raise HTTPException(detail="Error creating user", status_code=500)
    except HTTPException as e:
        print(f"Registration Error: {e.status_code}: {e.detail}")
        raise e
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        raise HTTPException(detail="Internal Server Error", status_code=500)