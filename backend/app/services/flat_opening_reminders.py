import math
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentMember
from app.models import FlatOpening, Notification, Tower
from app.models.enums import OpeningStatus
from app.services.flat_openings import RENEW_WINDOW, opening_title
from app.services.marketplace import now


def _ends_in(remaining: timedelta) -> str:
    days = math.ceil(remaining.total_seconds() / 86_400)
    return "within a day" if days <= 1 else f"in {days} days"


async def send_due_reminders(db: AsyncSession, member: CurrentMember) -> None:
    """Reminds the poster 3 days before a listing lapses.

    There is no job runner yet, so this runs whenever the poster loads their notifications;
    `reminder_sent_at` keeps it to one reminder per listing (reset when they renew).
    """
    at = now()
    result = await db.execute(
        select(FlatOpening, Tower.name)
        .join(Tower, Tower.id == FlatOpening.tower_id)
        .where(
            FlatOpening.society_id == member.society_id,
            FlatOpening.poster_id == member.user.id,
            FlatOpening.status == OpeningStatus.active,
            FlatOpening.reminder_sent_at.is_(None),
            FlatOpening.expires_at > at,
            FlatOpening.expires_at <= at + RENEW_WINDOW,
        )
    )
    due = result.all()
    for opening, tower in due:
        title = opening_title(opening.kind, opening.bhk, tower)
        db.add(
            Notification(
                society_id=member.society_id,
                user_id=member.user.id,
                kind="opening_expiring",
                title="Is your opening still available?",
                body=f"{title} ends {_ends_in(opening.expires_at - at)}. Tap to keep it up.",
                href=f"/flat-openings/{opening.id}",
            )
        )
        opening.reminder_sent_at = at
    if due:
        await db.commit()
