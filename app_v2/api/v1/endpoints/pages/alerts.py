from fastapi import APIRouter, Depends, HTTPException
from app_v2.core.security import get_current_user
from typing import List
from app_v2.models.user import User
from app_v2.core.responses import APIResponse, create_response
from app_v2.api.v1.dependencies import AlertUsersServiceDep
from app_v2.models.Alerts.alert_users import Alert, CreateAlertRequest

router = APIRouter()

@router.get("/", response_model=APIResponse[List[Alert]])
async def get_user_alerts(
    alerts_service: AlertUsersServiceDep,
    current_user: User = Depends(get_current_user)
    ):
    try:
        data = await alerts_service.get_alerts_by_email(current_user.email)
        if not data:
            raise HTTPException(
                status_code=204,
                detail="No Alerts FOund"
            )
        return create_response(data)
    except HTTPException as e:
        raise HTTPException(detail=f"Error fetching alerts: " + str(e), status_code=e.status_code)
    except Exception as e: 
        print(str(e))
        raise HTTPException(detail=f"Error fetching alerts: " + str(e), status_code=500)
    
@router.post("/", response_model=APIResponse[Alert])
async def create_alert(
    alert_data: CreateAlertRequest,
    alerts_service: AlertUsersServiceDep,
    current_user: User = Depends(get_current_user)
    ):
    try: 
        data = await alerts_service.new_alert(current_user.email, alert_data)
        if not data:
            raise HTTPException(
                status_code=500,
                detail="Error creating Alert"
            )
        return create_response(data)
    except HTTPException as e:
        raise HTTPException(detail=f"Error creating alerts: " + str(e), status_code=500)
    except Exception as e:
        print(str(e))
        raise HTTPException(detail=f"Error creating alert: " + str(e), status_code=500)

@router.delete("/{alert_id}", response_model=APIResponse[bool])
async def delete_alert(
    alert_id: str,
    alerts_service: AlertUsersServiceDep,
    current_user: User = Depends(get_current_user)
):
    try:
        data = await alerts_service.remove_alert(current_user.email, alert_id)
        return create_response(data)
    except HTTPException as e:
        raise HTTPException(detail=f"Error deleting alerts: " + str(e), status_code=500)
    except Exception as e:
        print(str(e))
        raise HTTPException(detail=f"Error deleting alert: " + str(e), status_code=500)