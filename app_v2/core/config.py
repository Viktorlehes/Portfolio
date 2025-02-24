import os
from pydantic_settings import BaseSettings
from datetime import timedelta

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
    USER_SECRET_KEY: str
    USER_PUBLIC_KEY: str
    ACCESS_TOKEN_EXPIRE_DELTA: timedelta = timedelta(minutes=30)
    ACCOUNT_LOCKOUT_DURATION: timedelta = timedelta(minutes=5)
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

# Then export your variables
CG_DEMO_API_KEY = settings.CG_DEMO_API_KEY
CGLS_API_KEY = settings.CGLS_API_KEY
CM_API_KEY = settings.CM_API_KEY
DB_URI = settings.DB_URI
PROXY_PASSWORD = settings.PROXY_PASSWORD
PROXY_USERNAME = settings.PROXY_USERNAME
ZERION_API_KEY = settings.ZERION_API_KEY
VITE_API_URL = settings.VITE_API_URL
TELEGRAM_BOT_TOKEN = settings.TELEGRAM_BOT_TOKEN
VITE_PIN_SECRET_KEY = settings.VITE_PIN_SECRET_KEY
VITE_ENCRYPTED_PIN = settings.VITE_ENCRYPTED_PIN
API_KEY = settings.VITE_API_KEY
USER_SECRET_KEY = settings.USER_SECRET_KEY
USER_PUBLIC_KEY = settings.USER_PUBLIC_KEY
ACCESS_TOKEN_EXPIRE_DELTA = settings.ACCESS_TOKEN_EXPIRE_DELTA
ACCOUNT_LOCKOUT_DURATION = settings.ACCOUNT_LOCKOUT_DURATION