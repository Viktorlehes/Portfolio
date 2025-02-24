from fastapi import HTTPException
from datetime import datetime, timezone
from typing import List
from app_v2.services.db.base import BaseDBService
from app_v2.models.Alerts.alert_users import AlertUser, Alert, CreateAlertRequest
import uuid

class _AlertService(BaseDBService[Alert]):
    def __init__(self):
        super().__init__('alerts', Alert)
        
    async def create_alert(self, telegram_chat_id: str , alert_data: CreateAlertRequest) -> Alert:
        """Create and insert Alert into DB"""
        
        alert = Alert(
            id=str(uuid.uuid4()),
            cmc_id=alert_data.id,
            telegram_chat_id=telegram_chat_id,
            symbol=alert_data.symbol,
            name=alert_data.name,
            upper_target_price=alert_data.upper_target_price,
            lower_target_price=alert_data.lower_target_price,
            percent_change_threshold=alert_data.percent_change_threshold,
            base_price=alert_data.base_price
        )
        
        result = await self.collection.insert_one(alert.model_dump())
        return alert if result.inserted_id else Exception("Something went wrong inserting into DB")

    async def delete_alert(self, telegram_chat_id: str, alert_id: str) -> bool:
        """Delete alert from DB"""
        
        alert = await self.find_many({"id": alert_id}, limit=1)
        if alert:
            alert = alert[0]
        else:
            raise Exception("Alert not found")
        
        if alert.telegram_chat_id != telegram_chat_id:
            raise Exception("Alert is not owned by user")
        
        result = await self.collection.delete_one({"id": alert_id})
        
        return result.deleted_count > 0

class AlertUsersService(BaseDBService[AlertUser]):
    def __init__(self):
        super().__init__('bot_users', AlertUser)
        self.alert_service = _AlertService()

    async def get_alerts_by_email(self, email: str) -> List[Alert]:
        """Get all alerts for user by id"""
        await self.collection.update_one(
            {"email": email.strip()},
            {"$set": {
                    "last_active": datetime.now(timezone.utc)
                    },
                    "$setOnInsert": {
                        "telegram_chat_id": None,
                        "verification_code": None,
                        "is_verified": False
                    }
            }, upsert=True
        )
        
        user = await self.find_many({"email": email.strip()}, limit=1)
        if not user:
            raise HTTPException(detail="User not found", status_code=404)
        else:
            user = user[0]
        
        if not user.is_verified:
            raise HTTPException(detail="User Not verified", status_code=403)
    
        return await self.alert_service.find_many({"telegram_chat_id": user.telegram_chat_id})

    async def new_alert(self, email: str, alert_data: CreateAlertRequest) -> Alert:
        """Create alert for user"""
        user = await self.find_many({"email": email.strip()}, limit=1)
        if not user:
            raise Exception("Error in AlertUsersService: User not found")
        else:
            user = user[0]
        
        if not user.is_verified:
            raise Exception("User Not verified")
        
        try:
            return await self.alert_service.create_alert(user.telegram_chat_id, alert_data)
        except Exception as e:
            raise Exception(str(e))
        
    async def remove_alert(self, email: str, alert_id: str) -> bool:
        """Delete a users Alert"""
        
        user = await self.find_many({"email": email.strip()}, limit=1)
        if not user:
            raise Exception("Error in AlertUsersService: User not found")
        else:
            user = user[0]
        
        return await self.alert_service.delete_alert(user.telegram_chat_id, alert_id)
        