import uuid
from datetime import datetime

from app.schemas.base import CamelModel


class NotificationOut(CamelModel):
    id: uuid.UUID
    kind: str
    title: str
    body: str
    href: str | None
    read: bool
    created_at: datetime
