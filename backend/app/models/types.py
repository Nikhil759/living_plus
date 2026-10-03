"""SQLite-safe column types. JSON stands in for Postgres ARRAY/JSONB."""

from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime
from enum import StrEnum
from typing import Any

from sqlalchemy import JSON, DateTime, TypeDecorator
from sqlalchemy import Enum as SAEnum


class UTCDateTime(TypeDecorator[datetime]):
    """Store timestamps in UTC so SQLite naive values stay comparable."""

    impl = DateTime
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect: Any) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            value = value.replace(tzinfo=UTC)
        return value.astimezone(UTC).replace(tzinfo=None)

    def process_result_value(self, value: datetime | None, dialect: Any) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value.astimezone(UTC)


class JsonList(TypeDecorator[list[Any]]):
    impl = JSON
    cache_ok = True

    def process_bind_param(self, value: list[Any] | None, dialect: Any) -> list[Any]:
        if not value:
            return []
        return [str(item) if isinstance(item, uuid.UUID) else item for item in value]

    def process_result_value(self, value: Any, dialect: Any) -> list[Any]:
        if value is None:
            return []
        if isinstance(value, str):
            parsed = json.loads(value)
            return parsed if isinstance(parsed, list) else []
        return list(value)


class JsonDict(TypeDecorator[dict[str, Any]]):
    impl = JSON
    cache_ok = True

    def process_bind_param(self, value: dict[str, Any] | None, dialect: Any) -> dict[str, Any]:
        return value if value is not None else {}

    def process_result_value(self, value: Any, dialect: Any) -> dict[str, Any]:
        if value is None:
            return {}
        if isinstance(value, str):
            parsed = json.loads(value)
            return parsed if isinstance(parsed, dict) else {}
        return dict(value)


class UuidList(TypeDecorator[list[uuid.UUID]]):
    impl = JSON
    cache_ok = True

    def process_bind_param(self, value: list[uuid.UUID] | None, dialect: Any) -> list[str]:
        if not value:
            return []
        return [str(item) for item in value]

    def process_result_value(self, value: Any, dialect: Any) -> list[uuid.UUID]:
        if not value:
            return []
        if isinstance(value, str):
            value = json.loads(value)
        return [item if isinstance(item, uuid.UUID) else uuid.UUID(str(item)) for item in value]


def enum_column(enum_cls: type[StrEnum], name: str, **kwargs: Any) -> SAEnum:
    return SAEnum(
        enum_cls,
        name=name,
        native_enum=False,
        values_callable=lambda items: [item.value for item in items],
        **kwargs,
    )
