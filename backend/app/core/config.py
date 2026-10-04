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
    # Local event cover files. Path is relative to the process working directory.
    UPLOAD_DIR: str = "./.uploads"

    # Saarthi (Gemini). Empty key: the app runs, Saarthi answers "not available".
    GEMINI_API_KEY: str = ""
    # Stronger model for chat; fast Flash-Lite for summaries, form fill and fallback.
    GEMINI_MODEL_MAIN: str = "gemini-3.8-flash"
    GEMINI_MODEL_FAST: str = "gemini-3.5-flash-lite"
    GEMINI_EMBED_MODEL: str = "gemini-embedding-001"
    # Thinking effort for the chat models ("low", "medium", "high"; empty = model default). "low"
    # cut p50 on tool turns from 6.3 s to 4.4 s with the same eval score (Oct 2026).
    GEMINI_REASONING_EFFORT: str = "low"
    SAARTHI_TIMEOUT_SECONDS: float = 30
    # Most recent messages sent to the model per request; bounds cost on long chats.
    SAARTHI_HISTORY_MESSAGES: int = 20
    SAARTHI_MAX_MESSAGE_CHARS: int = 2000
    SAARTHI_CHAT_PER_10MIN: int = 30
    SAARTHI_CHAT_PER_DAY: int = 200
    # Confirmed Saarthi actions per resident per hour.
    SAARTHI_ACTIONS_PER_HOUR: int = 30
    # Below this best cosine score no passages are passed at all. Scores of answerable and
    # unanswerable questions overlap (see evals/guide_retrieval.py), so this only drops clearly
    # unrelated questions; the model decides coverage from the passages it gets.
    SAARTHI_GUIDE_MIN_SCORE: float = 0.58
    # Same gate for keyword-only search when there are no embeddings yet.
    SAARTHI_GUIDE_KEYWORD_FLOOR: float = 3.0
    # Rupee estimate on the committee AI usage page (model prices are in USD).
    USD_TO_INR: float = 88.0

    # Optional Langfuse tracing; off unless both keys are set.
    LANGFUSE_PUBLIC_KEY: str = ""
    LANGFUSE_SECRET_KEY: str = ""
    LANGFUSE_HOST: str = "https://cloud.langfuse.com"

    @field_validator("DATABASE_URL")
    @classmethod
    def require_sqlite_driver(cls, value: str) -> str:
        if not value.startswith("sqlite+aiosqlite://"):
            raise ValueError("DATABASE_URL must start with sqlite+aiosqlite://")
        return value

    @field_validator("FRONTEND_ORIGIN")
    @classmethod
    def normalise_origin(cls, value: str) -> str:
        # Browsers send Origin without a trailing slash; CORS matching is exact.
        return value.rstrip("/")

    @property
    def cors_origins(self) -> list[str]:
        """Comma-separated origins (e.g. production + preview Vercel URLs)."""
        parts = [p.strip().rstrip("/") for p in self.FRONTEND_ORIGIN.split(",")]
        return [p for p in parts if p]


@lru_cache
def get_settings() -> Settings:
    return Settings()
