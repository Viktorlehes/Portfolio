# app/models/user.py

from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime
import uuid
from bson import ObjectId

class UserSettings(BaseModel):
    default_currency: str = "USD"
    theme: str = "light"
    notification_preferences: dict = {}
    
    class Config:
        json_schema_extra = {
            "example": {
                "default_currency": "USD",
                "theme": "light",
                "notification_preferences": {}
            }
        }

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), alias="_id")
    email: str
    email_verified: Optional[bool] = False
    password_hash: str
    mfa_enabled: bool = False
    mfa_secret: Optional[str] = None
    password_reset_token: Optional[str] = None
    password_reset_expires: Optional[datetime] = None
    failed_login_attempts: Optional[int] = 0
    locked_until: Optional[datetime] = None
    settings: UserSettings = Field(default_factory=UserSettings)
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    last_login: datetime = Field(default_factory=lambda: datetime.utcnow())
    last_active: datetime = Field(default_factory=lambda: datetime.utcnow())

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "email": "user@example.com",
                "email_verified": True,
                "mfa_enabled": False
            }
        }

    @classmethod
    def from_mongo(cls, data: dict):
        """Convert MongoDB document to User model"""
        if not data:
            return None
            
        # Convert MongoDB _id to string if it exists
        if '_id' in data and isinstance(data['_id'], ObjectId):
            data['_id'] = str(data['_id'])
            
        return cls(**data)

    def to_mongo(self) -> dict:
        """Convert User model to MongoDB document"""
        data = self.model_dump(by_alias=True)
        return data