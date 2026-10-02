from functools import lru_cache
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """All configuration comes from the environment (or a local .env file)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str
    # Tokens are ES256-signed. Public keys come from the JWKS endpoint under this URL
    # (/auth/v1/.well-known/jwks.json), so no JWT secret is needed.
    SUPABASE_URL: str
    FRONTEND_ORIGIN: str
    REDIS_URL: str
    ENV: Literal["local", "test", "staging", "production"] = "local"
    # Local only: when no Bearer token is sent, act as this seeded user (see scripts/seed.py).
    LOCAL_DEV_AUTH_EMAIL: str | None = None
    # Reusable demo join code (any email, never consumed). Empty disables.
    MASTER_INVITE_CODE: str = "LIVING-OPEN-50"

    @field_validator("DATABASE_URL")
    @classmethod
    def require_asyncpg_driver(cls, value: str) -> str:
        # A plain postgresql:// URL would pick the sync driver and fail at first query.
        if not value.startswith("postgresql+asyncpg://"):
            raise ValueError("DATABASE_URL must start with postgresql+asyncpg://")
        return value

    @field_validator("FRONTEND_ORIGIN")
    @classmethod
    def normalise_origin(cls, value: str) -> str:
        # Browsers send Origin without a trailing slash; CORS matching is exact.
        return value.rstrip("/")


@lru_cache
def get_settings() -> Settings:
    return Settings()
