import uuid
from collections.abc import Iterable

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentMember
from app.models import Notification
from app.schemas.notification import NotificationOut
from app.services.flat_opening_reminders import send_due_reminders
from app.services.marketplace import now

_LIMIT = 100


def add_notifications(
    db: AsyncSession,
    society_id: uuid.UUID,
    user_ids: Iterable[uuid.UUID],
    *,
    kind: str,
    title: str,
    body: str,
    href: str | None = None,
) -> None:
    """Queues in-app notifications; the caller commits. Nothing is pushed."""
    db.add_all(
        Notification(
            id=uuid.uuid4(),
            society_id=society_id,
            user_id=user_id,
            kind=kind,
            title=title,
            body=body,
            href=href,
        )
        for user_id in user_ids
    )


def _scoped(member: CurrentMember):
    return (
        Notification.society_id == member.society_id,
        Notification.user_id == member.user.id,
    )


async def list_notifications(db: AsyncSession, member: CurrentMember) -> list[NotificationOut]:
    await send_due_reminders(db, member)
    result = await db.execute(
        select(Notification)
        .where(*_scoped(member))
        .order_by(Notification.created_at.desc())
        .limit(_LIMIT)
    )
    return [
        NotificationOut(
            id=item.id,
            kind=item.kind,
            title=item.title,
            body=item.body,
            href=item.href,
            read=item.read_at is not None,
            created_at=item.created_at,
        )
        for item in result.scalars()
    ]


async def has_unread(db: AsyncSession, member: CurrentMember) -> bool:
    await send_due_reminders(db, member)
    count = await db.scalar(
        select(func.count())
        .select_from(Notification)
        .where(*_scoped(member), Notification.read_at.is_(None))
    )
    return bool(count)


async def mark_all_read(db: AsyncSession, member: CurrentMember) -> None:
    await db.execute(
        update(Notification)
        .where(*_scoped(member), Notification.read_at.is_(None))
        .values(read_at=now())
    )
    await db.commit()
