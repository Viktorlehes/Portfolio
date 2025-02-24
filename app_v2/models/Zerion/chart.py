from pydantic import BaseModel
from datetime import datetime
from typing import List, Tuple

class Links(BaseModel):
    self: str

class Stats(BaseModel):
    first: float
    min: float
    avg: float
    max: float
    last: float

class Attributes(BaseModel):
    begin_at: datetime
    end_at: datetime
    stats: Stats
    points: List[Tuple[float, float]]

class Data(BaseModel):
    type: str
    id: str
    attributes: Attributes

class ChartData(BaseModel):
    links: Links
    data: Data
    
class FullChartData(BaseModel):
    day: ChartData
    week: ChartData
    month: ChartData