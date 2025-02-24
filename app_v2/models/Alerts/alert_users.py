from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId
from pydantic import BaseModel, Field, ConfigDict, field_validator

# Request Models
class CreateAlertRequest(BaseModel):
    id: int
    symbol: str
    name: str
    upper_target_price: Optional[float] = None
    lower_target_price: Optional[float] = None
    percent_change_threshold: Optional[float] = None
    base_price: Optional[float] = None

# Response Models
class AlertUser(BaseModel):
    email: str
    telegram_chat_id: Optional[str] = None 
    last_active: datetime
    verification_code: Optional[str] = None
    is_verified: bool = False

class Alert(BaseModel):
    cmc_id: int
    symbol: str
    name: str
    telegram_chat_id: str
    upper_target_price: Optional[float] = None
    lower_target_price: Optional[float] = None
    percent_change_threshold: Optional[float] = None
    base_price: Optional[float] = None
    last_checked_price: Optional[float] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    id: str