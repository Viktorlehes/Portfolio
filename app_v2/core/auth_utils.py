# app/core/auth_utils.py

import bcrypt
import jwt
from datetime import datetime, timezone
from fastapi import HTTPException, Security
from starlette.status import HTTP_403_FORBIDDEN
from fastapi.security.api_key import APIKeyHeader
from app_v2.core.config import USER_SECRET_KEY, ACCESS_TOKEN_EXPIRE_DELTA, API_KEY

API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=True)

async def verify_api_key(api_key: str = Security(API_KEY_HEADER)):
    if api_key != API_KEY:
        raise HTTPException(
            status_code=HTTP_403_FORBIDDEN,
            detail="Invalid API key"
        )
    return api_key

def encrypt_password(password: str) -> str:
    """Hash a password using bcrypt"""
    try:
        password_bytes = password.encode('utf-8')
        salt = bcrypt.gensalt(12)
        hashed = bcrypt.hashpw(password_bytes, salt)
        return hashed.decode('utf-8')
    except Exception as e:
        raise Exception(f"Password encryption failed: {str(e)}")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    try:
        password_bytes = plain_password.encode('utf-8')
        hashed_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception as e:
        print(f"Password verification error: {str(e)}")
        return False

async def generate_token(user_id: str, email: str) -> str:
    """Generate JWT token for authenticated user"""
    try:
        payload = {
            "sub": user_id,
            "email": email,
            "exp": datetime.now(timezone.utc) + ACCESS_TOKEN_EXPIRE_DELTA
        }
        return jwt.encode(payload, USER_SECRET_KEY, algorithm="HS256")
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Could not generate access token"
        )

async def verify_token(token: str) -> dict:
    """Verify and decode JWT token"""
    try:
        payload = jwt.decode(
            token,
            USER_SECRET_KEY,
            algorithms=["HS256"]
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )