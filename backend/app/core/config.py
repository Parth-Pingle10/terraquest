from typing import List, Optional, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    APP_NAME: str = "TerraQuest Backend"
    APP_VERSION: str = "0.1.0"
    APP_ENV: str = "development"
    APP_DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # MongoDB
    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "terraquest"
    MONGODB_TIMEOUT_MS: int = 5000

    # Security
    JWT_SECRET_KEY: str = "dev-insecure-secret-key-please-replace-in-production-32-chars-min"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    SHARE_TOKEN_SALT: str = "terraquest-share-salt-default"

    # CORS
    CORS_ORIGINS: Union[str, List[str]] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]

    # llama.cpp Local GGUF Inference
    LLAMA_CPP_BASE_URL: str = "http://127.0.0.1:8080"
    LLAMA_CPP_MODEL_PATH: str = "/models/qwen2.5-0.5b-instruct-q4_k_m.gguf"
    LLAMA_CPP_TIMEOUT_SECONDS: float = 15.0
    LLAMA_CPP_CONTEXT_SIZE: int = 2048
    LLAMA_CPP_MAX_TOKENS: int = 512

    # Ollama Local AI (Alternative local inference)
    OLLAMA_BASE_URL: str = "http://127.0.0.1:11434"
    OLLAMA_MODEL: str = "qwen2.5:0.5b"
    OLLAMA_VISION_MODEL: str = "moondream:latest"
    OLLAMA_TIMEOUT_SECONDS: float = 10.0
    OLLAMA_VISION_TIMEOUT_SECONDS: float = 25.0

    # Vision Model Toggle (disabled by default for production/low-memory stability)
    ENABLE_VISION_MODEL: bool = False

    # Frontend Single-Service Serving
    FRONTEND_DIST_DIR: Optional[str] = None

    # Exploration & Map
    DEFAULT_REGION_GRID_CELLS: int = 100

    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_AUTH_PER_MINUTE: int = 20
    RATE_LIMIT_AI_PER_MINUTE: int = 30
    RATE_LIMIT_SHARE_PER_MINUTE: int = 30

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    @property
    def is_production(self) -> bool:
        return self.APP_ENV.lower() == "production"


settings = Settings()
