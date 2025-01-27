# alerts.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from bson import ObjectId
from typing import List, Optional
from app.core.db import bot_users, alerts_collection
from app.schemas.alerts_users.alert_users import Alert, AlertUser

router = APIRouter()

@router.get("/get-alerts", response_model=List[Alert])
async def get_alerts(email: str):
    # First find user by email and verify
    user = await bot_users.find_one({"email": email})        
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user = AlertUser.from_dict(user)
    
    if not user.is_verified:
        raise HTTPException(status_code=403, detail="User not verified")

    # Use the telegram_chat_id from the user record to find alerts
    alerts = await alerts_collection.find({"telegram_chat_id": user.telegram_chat_id}).to_list(length=100)
    
    if not alerts or alerts == []:
        raise HTTPException(status_code=204, detail="No alerts found")
        
    return [Alert.from_dict(alert) for alert in alerts]
        
class CreateAlertRequest(BaseModel):
    id: int
    symbol: str
    name: str
    email: str
    upper_target_price: Optional[float] = None
    lower_target_price: Optional[float] = None
    percent_change_threshold: Optional[float] = None
    base_price: Optional[float] = None

@router.post("/create-alert")
async def create_alert(request: CreateAlertRequest) -> Alert:
    try:
        print(request)
        # Find and verify user
        user = await bot_users.find_one({"email": request.email})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        user = AlertUser.from_dict(user)
        if not user.is_verified:
            raise HTTPException(status_code=403, detail="User not verified")

        # Create alert object with telegram_chat_id from user
        alert = Alert(
            cmc_id=request.id,
            telegram_chat_id=user.telegram_chat_id,
            symbol=request.symbol,
            name=request.name,
            upper_target_price=request.upper_target_price,
            lower_target_price=request.lower_target_price,
            percent_change_threshold=request.percent_change_threshold,
            base_price=request.base_price
        )

        # Validate alert parameters
        if not alert.validate():
            raise HTTPException(
                status_code=400,
                detail="Alert must have either price targets or percent threshold"
            )
        
        # Save alert
        result = await alerts_collection.insert_one(alert.to_dict())
        alert._id = str(result.inserted_id)
        return alert

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )
        
class DeleteAlertRequest(BaseModel):
    alert_id: str    

@router.post("/delete-alert")
async def delete_alert(request: DeleteAlertRequest):
    try:
        # Delete alert    
        result = await alerts_collection.delete_one({"_id": ObjectId(request.alert_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Alert not found")
            
        return {"message": "Alert deleted"}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )