from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId

@dataclass
class AlertUser:
    email: str
    telegram_chat_id: str
    verification_code: Optional[str] = None
    is_verified: bool = False
    _id: Optional[str] = field(default_factory=lambda: str(ObjectId()), repr=True)

    def to_dict(self):
        """Convert the dataclass to a MongoDB-compatible dictionary"""
        return {
            "_id": ObjectId(self._id) if self._id else ObjectId(),
            "email": self.email,
            "telegram_chat_id": self.telegram_chat_id,
            "verification_code": self.verification_code,
            "is_verified": self.is_verified
        }

    @classmethod
    def from_dict(cls, data: dict):
        """Create an AlertUser instance from a MongoDB document"""
        if data is None:
            return None
            
        if "_id" in data:
            data["_id"] = str(data["_id"])
            
        return cls(**data)

@dataclass
class Alert:
    cmc_id: int
    symbol: str
    name: str
    telegram_chat_id: str  # Changed from email to telegram_chat_id
    upper_target_price: Optional[float] = None
    lower_target_price: Optional[float] = None
    percent_change_threshold: Optional[float] = None
    base_price: Optional[float] = None
    last_checked_price: Optional[float] = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    _id: str = field(default_factory=lambda: str(ObjectId()), repr=True)

    def to_dict(self):
        """Convert the dataclass to a MongoDB-compatible dictionary"""
        return {
            "_id": ObjectId(self._id) if self._id else ObjectId(),
            "cmc_id": self.cmc_id,
            "telegram_chat_id": self.telegram_chat_id,
            "symbol": self.symbol,
            "name": self.name,
            "upper_target_price": self.upper_target_price,
            "lower_target_price": self.lower_target_price,
            "percent_change_threshold": self.percent_change_threshold,
            "base_price": self.base_price,
            "last_checked_price": self.last_checked_price,
            "created_at": self.created_at
        }

    @classmethod
    def from_dict(cls, data: dict):
        """Create an Alert instance from a MongoDB document"""
        if data is None:
            return None
            
        if "_id" in data:
            data["_id"] = str(data["_id"])
            
        return cls(**data)

    def validate(self) -> bool:
        """Validate that the alert has valid price targets"""
        has_price_target = (
            self.upper_target_price is not None or 
            self.lower_target_price is not None
        )
        has_percent_threshold = self.percent_change_threshold is not None
        return has_price_target or has_percent_threshold