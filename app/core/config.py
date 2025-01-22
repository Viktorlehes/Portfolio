import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DB_URI: str
    CM_API_KEY: str
    CG_DEMO_API_KEY: str
    ZERION_API_KEY: str
    CGLS_API_KEY: str
    VITE_PIN_SECRET_KEY: str
    VITE_ENCRYPTED_PIN: str
    VITE_API_KEY: str
    VITE_API_URL: str
    PROXY_USERNAME: str
    PROXY_PASSWORD: str
    TELEGRAM_BOT_TOKEN: str
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

# Then export your variables
DB_URI = settings.DB_URI
CM_API_KEY = settings.CM_API_KEY
CG_DEMO_API_KEY = settings.CG_DEMO_API_KEY
ZERION_API_KEY = settings.ZERION_API_KEY
CGLS_API_KEY = settings.CGLS_API_KEY
VITE_PIN_SECRET_KEY = settings.VITE_PIN_SECRET_KEY
VITE_ENCRYPTED_PIN = settings.VITE_ENCRYPTED_PIN
API_KEY = settings.VITE_API_KEY
VITE_API_URL = settings.VITE_API_URL
PROXY_USERNAME = settings.PROXY_USERNAME
PROXY_PASSWORD = settings.PROXY_PASSWORD
TELEGRAM_BOT_TOKEN = settings.TELEGRAM_BOT_TOKEN
