from pydantic import BaseModel
from bson import ObjectId

class CGLS_ID_DOC(BaseModel):
    _id: ObjectId
    id: str
    symbol: str
    name: str