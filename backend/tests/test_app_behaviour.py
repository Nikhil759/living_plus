from collections.abc import AsyncIterator

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.core.errors import AppError
from app.main import create_app


@pytest.fixture
async def probe_client() -> AsyncIterator[AsyncClient]:
    """Fresh app with routes that fail on purpose. Needs no database."""
    probe_app: FastAPI = create_app()

    @probe_app.get("/probe/app-error")
    async def app_error() -> None:
        raise AppError("event_full", "This event is full.", 409)

    @probe_app.get("/probe/crash")
    async def crash() -> None:
        raise RuntimeError("password=hunter2 leaked from a bug")

    @probe_app.get("/probe/typed")
    async def typed(count: int) -> dict[str, int]:
        return {"count": count}

    # raise_app_exceptions=False: a real server answers with the 500 response instead of raising.
    transport = ASGITransport(app=probe_app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as http:
        yield http


async def test_app_error_is_rendered_as_code_and_message(probe_client: AsyncClient) -> None:
    response = await probe_client.get("/probe/app-error")

    assert response.status_code == 409
    assert response.json() == {"code": "event_full", "message": "This event is full."}


async def test_unexpected_error_does_not_leak_details(probe_client: AsyncClient) -> None:
    response = await probe_client.get("/probe/crash", headers={"X-Request-ID": "req-123"})

    assert response.status_code == 500
    assert response.json() == {"code": "internal_error", "message": "Something went wrong."}
    assert "hunter2" not in response.text
    assert response.headers["X-Request-ID"] == "req-123"


async def test_validation_error_uses_error_shape(probe_client: AsyncClient) -> None:
    response = await probe_client.get("/probe/typed", params={"count": "abc"})

    assert response.status_code == 422
    body = response.json()
    assert body["code"] == "validation_error"
    assert "count" in body["message"]
    assert "abc" not in body["message"]


async def test_request_id_is_generated_when_absent(probe_client: AsyncClient) -> None:
    response = await probe_client.get("/probe/typed", params={"count": 1})

    assert len(response.headers["X-Request-ID"]) == 32


async def test_unsafe_request_id_is_replaced(probe_client: AsyncClient) -> None:
    response = await probe_client.get(
        "/probe/typed", params={"count": 1}, headers={"X-Request-ID": "bad id\twith spaces"}
    )

    assert response.headers["X-Request-ID"] != "bad id\twith spaces"
    assert len(response.headers["X-Request-ID"]) == 32


async def test_cors_allows_only_the_frontend_origin(probe_client: AsyncClient) -> None:
    allowed = await probe_client.get(
        "/probe/typed", params={"count": 1}, headers={"Origin": "http://localhost:3000"}
    )
    blocked = await probe_client.get(
        "/probe/typed", params={"count": 1}, headers={"Origin": "https://evil.example"}
    )

    assert allowed.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert "access-control-allow-origin" not in blocked.headers
