from unittest.mock import AsyncMock

from httpx import AsyncClient
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.main import app


async def test_health_reports_db_up(client: AsyncClient) -> None:
    response = await client.get("/v1/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "db": True}


async def test_health_reports_db_down_without_failing(client: AsyncClient) -> None:
    broken = AsyncMock(spec=AsyncSession)
    broken.execute.side_effect = OperationalError("SELECT 1", {}, Exception("connection lost"))

    async def override_get_db() -> AsyncSession:
        return broken

    # `client` clears dependency_overrides on teardown, so this does not leak.
    app.dependency_overrides[get_db] = override_get_db
    response = await client.get("/v1/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "db": False}


async def test_health_is_only_mounted_under_v1(client: AsyncClient) -> None:
    response = await client.get("/health")

    assert response.status_code == 404
    assert response.json()["code"] == "not_found"
