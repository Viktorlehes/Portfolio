from fastapi import APIRouter, HTTPException
from app_v2.core.responses import APIResponse, create_response
from app_v2.api.v1.dependencies import TokenServiceDep
from app_v2.models.token import UnifiedToken
from pydantic import BaseModel

router = APIRouter()

class TokenData(BaseModel):
    id: str
    id_type: str

@router.post("/", response_model=APIResponse[UnifiedToken])
async def get_token_chart(
    token_data: TokenData,
    token_service: TokenServiceDep):
    try:
        data = await token_service.get_by_external_id(token_data.id_type, token_data.id)
        if not data:
            raise HTTPException(
                status_code=404,
                detail="Token data not found"
            )
        return create_response(data)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching token data: {str(e)}"
        )