from pydantic import BaseModel
from typing import List
from .token import Token

class Wallet(BaseModel):
    address: str
    name: str
    color: str
    tokens: List[Token] 
