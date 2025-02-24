from fastapi import APIRouter, Depends, HTTPException
from app_v2.core.security import get_current_user
from app_v2.core.responses import APIResponse, create_response
from app_v2.api.v1.dependencies import ZerionServiceDep
from app_v2.models.Zerion.chart import ChartData, FullChartData

router = APIRouter()

@router.post("/", response_model=APIResponse[FullChartData])
async def get_all_token_charts(
    fungible_id: dict,
    zerion_service: ZerionServiceDep):
    try:
        data = await zerion_service.get_all_charts_by_fungible_id(fungible_id['fungible_id'])
        if not data:
            raise HTTPException(
                status_code=404,
                detail="Chart data not found"
            )
        return create_response(data)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching chart data: {str(e)}"
        )

@router.post("/day", response_model=APIResponse[ChartData])
async def get_token_chart(
    fungible_id: dict,
    zerion_service: ZerionServiceDep):
    try:
        data = await zerion_service.get_day_chart_by_fungible_id(fungible_id['fungible_id'])
        if not data:
            raise HTTPException(
                status_code=404,
                detail="Chart data not found"
            )
        return create_response(data)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching chart data: {str(e)}"
        )
    