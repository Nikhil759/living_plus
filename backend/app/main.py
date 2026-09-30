import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from http import HTTPStatus

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import get_settings
from app.core.db import get_engine
from app.core.errors import AppError
from app.core.logging import configure_logging
from app.core.request_id import REQUEST_ID_HEADER, RequestIdMiddleware
from app.routers.v1 import api_router
from app.schemas.errors import ErrorResponse

logger = logging.getLogger(__name__)


def error_response(
    request: Request,
    code: str,
    message: str,
    status: int,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    headers = dict(headers or {})
    # Set here too: unhandled errors are answered outside RequestIdMiddleware's send wrapper.
    if request_id := getattr(request.state, "request_id", None):
        headers[REQUEST_ID_HEADER] = request_id
    body = ErrorResponse(code=code, message=message)
    return JSONResponse(body.model_dump(), status_code=status, headers=headers)


async def handle_app_error(request: Request, exc: AppError) -> JSONResponse:
    return error_response(request, exc.code, exc.message, exc.status)


async def handle_http_exception(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    # Framework-raised errors (404, 405, ...) get the same {"code","message"} shape.
    code = HTTPStatus(exc.status_code).phrase.lower().replace(" ", "_")
    return error_response(request, code, str(exc.detail), exc.status_code, exc.headers)


async def handle_validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
    # Only location + message are returned; submitted values are never echoed back.
    message = "; ".join(
        f"{'.'.join(str(part) for part in err['loc'])}: {err['msg']}" for err in exc.errors()
    )
    return error_response(request, "validation_error", message, 422)


async def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
    # Full traceback goes to the logs only; the client gets a generic message.
    logger.error(
        "unhandled exception",
        exc_info=exc,
        extra={"request_id": getattr(request.state, "request_id", None)},
    )
    return error_response(request, "internal_error", "Something went wrong.", 500)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    yield
    await get_engine().dispose()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Aangan API", lifespan=lifespan)

    app.add_exception_handler(AppError, handle_app_error)
    app.add_exception_handler(StarletteHTTPException, handle_http_exception)
    app.add_exception_handler(RequestValidationError, handle_validation_error)
    app.add_exception_handler(Exception, handle_unexpected_error)

    # Middleware added last is outermost: request IDs wrap everything, including CORS preflights.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.FRONTEND_ORIGIN],
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type", REQUEST_ID_HEADER],
        expose_headers=[REQUEST_ID_HEADER],
    )
    app.add_middleware(RequestIdMiddleware)

    app.include_router(api_router)
    return app


configure_logging()
app = create_app()
