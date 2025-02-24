from pydantic import BaseModel
from datetime import datetime

class FearGreadData(BaseModel):
    value: int
    update_time: datetime
    value_classification: str

class Status(BaseModel):
    timestamp: datetime
    error_code: str
    error_message: str
    elapsed: int
    credit_count: int

class FearGreedResponse(BaseModel):
    data: FearGreadData
    status: Status