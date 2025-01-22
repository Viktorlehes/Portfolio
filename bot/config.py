import os
from dotenv import load_dotenv
from pathlib import Path

# Get root directory path
ROOT_DIR = Path(__file__).parent.parent

# Load environment variables from root .env file
load_dotenv(ROOT_DIR / ".env")

class Config:
    TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
    MONGODB_URI = os.getenv("DB_URI")
    CMC_API_KEY = os.getenv("CM_API_KEY")
    
    @classmethod
    def validate(cls):
        missing_vars = []
        if not cls.TELEGRAM_BOT_TOKEN:
            missing_vars.append("TELEGRAM_BOT_TOKEN")
        if not cls.MONGODB_URI:
            missing_vars.append("DB_URI")
        if not cls.CMC_API_KEY:
            missing_vars.append("CM_API_KEY")
            
        if missing_vars:
            raise ValueError(f"Missing environment variables: {', '.join(missing_vars)}")