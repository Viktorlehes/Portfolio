# app/core/responses.py
from typing import Any, TypeVar, Generic, Optional
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from datetime import datetime, timezone

T = TypeVar('T')

class APIResponse(BaseModel, Generic[T]):
    data: Optional[T] = None
    success: bool = True
    error: Optional[str] = None
    status_code: int = 200
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }

def create_response(data: Any, status_code: int = 200) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content=APIResponse(
            data=data,
            success=True,
            status_code=status_code,
            timestamp=datetime.now(timezone.utc)
        ).model_dump(mode='json')
    )