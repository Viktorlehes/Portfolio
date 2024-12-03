import motor.motor_asyncio
from app.core.config import MONGO_URI

client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
db = client['Main']  # Database name
tokens_collection = db["Tokens"]
CG_id_map = db["CG_ID_MAP"]
wallets_collection = db["Wallets"]
zerion_tokens = db["Zerion_Tokens"]
coinglass_collection = db["Coinglass_Tokens"]