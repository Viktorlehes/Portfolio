from fastapi import Security, HTTPException
from fastapi.security.api_key import APIKeyHeader
from starlette.status import HTTP_403_FORBIDDEN
import jwt
from datetime import datetime, timezone
from app.core.config import USER_SECRET_KEY, ACCESS_TOKEN_EXPIRE_DELTA, API_KEY
import bcrypt

API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=True)

async def verify_api_key(api_key: str = Security(API_KEY_HEADER)):
    if api_key != API_KEY:
        raise HTTPException(
            status_code=HTTP_403_FORBIDDEN,
            detail="Invalid API key"
        )
    return api_key

async def generate_token(user_id: str, email: str) -> str:
    """Generate JWT token for authenticated user"""
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + ACCESS_TOKEN_EXPIRE_DELTA
    }
    return jwt.encode(payload, USER_SECRET_KEY)

async def verify_token(token: str) -> dict:
    """Verify and decode JWT token"""
    try:
        payload = jwt.decode(
            token,
            USER_SECRET_KEY,
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

def encrypt_password(password: str) -> str:
    """
    Hash a password for storage using bcrypt.
    
    Args:
        password: The plain text password to hash
        
    Returns:
        str: The hashed password ready for storage
    """
    try:
        # Convert the password to bytes
        password_bytes = password.encode('utf-8')
        
        # Generate salt and hash password
        salt = bcrypt.gensalt(12)  # 12 is the default work factor
        hash_bytes = bcrypt.hashpw(password_bytes, salt)
        
        # Convert bytes to string for storage
        return hash_bytes.decode('utf-8')
    except Exception as e:
        print(f"Password encryption error: {str(e)}")
        raise Exception("Error encrypting password")

async def verify_user_password(password_to_verify: str, hashed_password: str) -> bool:
    try:
        # Convert strings to bytes
        password_bytes = password_to_verify.encode('utf-8')
        hashed_bytes = hashed_password.encode('utf-8')
        
        # Verify password
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception as e:
        print(f"Password verification error: {str(e)}")
        return False
    