import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    GROQ_API_KEY: str = ""
    HF_TOKEN: str = ""
    MAX_FILE_SIZE_MB: int = 50
    MAX_RETRIES: int = 3
    BATCH_SIZE: int = 32

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
