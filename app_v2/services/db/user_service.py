# app/services/db/user_service.py
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Tuple
from app_v2.services.db.base import BaseDBService
from app_v2.models.user import User, UserSettings
from app_v2.core.auth_utils import verify_password, encrypt_password
from app_v2.core.config import ACCOUNT_LOCKOUT_DURATION
import uuid

class UserService(BaseDBService[User]):
    def __init__(self):
        super().__init__('users', User)

    async def get_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        doc = await self.collection.find_one({'email': email.lower()})
        return User(**doc) if doc else None

    async def verify_credentials(self, email: str, password: str) -> Tuple[Optional[User], Optional[str]]:
        """
        Verify user credentials and handle login attempts.
        Returns (user, error_message) tuple.
        """
        user = await self.get_by_email(email)
        if not user:
            return None, "Invalid email or password"
        
        # Check account lock
        lock_until = None
        if user.locked_until:
            if (datetime.now(timezone.utc) - user.locked_until.replace(tzinfo=timezone.utc)) < timedelta(seconds=0):
                return None, "Account is temporarily locked. Please try again later."
            else:
                # Reset lock if expired
                await self.collection.update_one(
                    {"_id": user.id},
                    {"$set": {
                        "locked_until": None,
                        "failed_login_attempts": 0
                        }
                    })

        # Verify password
        if not verify_password(password, user.password_hash):
            # Increment failed login attempts
            failed_attempts = (user.failed_login_attempts or 0) + 1
            update_data = {"failed_login_attempts": failed_attempts}

            # Lock account after 5 failed attempts
            if failed_attempts >= 5:
                lock_until = datetime.now(timezone.utc) + ACCOUNT_LOCKOUT_DURATION
                update_data["locked_until"] = lock_until

            await self.collection.update_one(
                {"_id":user.id},
                {"$set": update_data}
                )
            if lock_until: 
                return None, "Account is temporarily locked. Please try again later."
            return None, "Invalid email or password"

        # Update successful login
        await self.update(user.id, {
            "last_login": datetime.now(timezone.utc),
            "last_active": datetime.now(timezone.utc),
            "failed_login_attempts": 0,
            "locked_until": None
        })

        return user, None

    async def create_user(self, email: str, password: str) -> User:
        """Create a new user"""
        # Check if user exists
        existing_user = await self.get_by_email(email)
        if existing_user:
            raise ValueError("User already exists")

        # Create new user
        user = User(
            email=email.lower(),
            password_hash=encrypt_password(password),
            email_verified=False,
            mfa_enabled=False,
            settings=UserSettings(),
            failed_login_attempts=0
        )

        # Insert into database
        result = await self.collection.insert_one(user.model_dump(by_alias=True))
        if not result.inserted_id:
            raise ValueError("Failed to create user")

        return user

    async def get_active_users(self, minutes: int = 15) -> List[User]:
        """Get recently active users"""
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=minutes)
        return await self.find_many({
            'last_active': {'$gt': cutoff},
            'is_active': True
        })
        
    async def update_last_active(self, user_id: str) -> bool:
        """Update the users last_active time"""
        result = await self.update(user_id, {
            "last_active": datetime.now(timezone.utc)
        })
        return result
        
    async def mark_email_verified(self, user_id: str) -> bool:
        """Mark user's email as verified"""
        result = await self.update(user_id, {
            "email_verified": True
        })
        return result

    async def update_password(self, user_id: str, new_password: str) -> bool:
        """Update user's password"""
        result = await self.update(user_id, {
            "password_hash": encrypt_password(new_password),
            "password_reset_token": None,
            "password_reset_expires": None
        })
        return result

    async def set_password_reset_token(self, email: str, token: str) -> bool:
        """Set password reset token"""
        user = await self.get_by_email(email)
        if not user:
            return False

        result = await self.update(user.id, {
            "password_reset_token": token,
            "password_reset_expires": datetime.now(timezone.utc) + timedelta(hours=1)
        })
        return result
    