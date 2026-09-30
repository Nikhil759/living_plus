import logging
import re
import time
import uuid

from starlette.datastructures import Headers, MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.logging import request_id_ctx

REQUEST_ID_HEADER = "X-Request-ID"

# Client-supplied IDs end up in logs, so only accept a safe, bounded charset.
_SAFE_ID = re.compile(r"^[A-Za-z0-9_-]{1,64}$")

logger = logging.getLogger("app.request")


def resolve_request_id(incoming: str | None) -> str:
    if incoming and _SAFE_ID.match(incoming):
        return incoming
    return uuid.uuid4().hex


class RequestIdMiddleware:
    """Pure ASGI (not BaseHTTPMiddleware) so context vars and exceptions behave predictably."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request_id = resolve_request_id(Headers(scope=scope).get(REQUEST_ID_HEADER))
        scope.setdefault("state", {})["request_id"] = request_id
        token = request_id_ctx.set(request_id)
        started = time.perf_counter()
        status = 500  # stays 500 if the app raises; the fallback handler responds with 500

        async def send_with_id(message: Message) -> None:
            nonlocal status
            if message["type"] == "http.response.start":
                status = message["status"]
                MutableHeaders(scope=message)[REQUEST_ID_HEADER] = request_id
            await send(message)

        try:
            await self.app(scope, receive, send_with_id)
        finally:
            logger.info(
                "request completed",
                extra={
                    "method": scope["method"],
                    "path": scope["path"],
                    "status": status,
                    "duration_ms": round((time.perf_counter() - started) * 1000, 2),
                },
            )
            request_id_ctx.reset(token)
