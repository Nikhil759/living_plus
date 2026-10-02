from functools import lru_cache

import jwt
from jwt import PyJWKClient

from app.core.config import get_settings
from app.core.errors import AppError


@lru_cache
def _jwks_client() -> PyJWKClient:
    settings = get_settings()
    url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
    return PyJWKClient(url, cache_keys=True)


def decode_supabase_access_token(token: str) -> dict[str, object]:
    settings = get_settings()
    try:
        signing_key = _jwks_client().get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "HS256"],
            audience="authenticated",
            issuer=f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1",
        )
    except jwt.PyJWTError as exc:
        raise AppError("invalid_token", "Invalid or expired access token.", 401) from exc
