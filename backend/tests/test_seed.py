import sys
from pathlib import Path

from sqlalchemy import func, select

from app.models import Flat, Membership, Post, Profile, Ticket, TicketFollower, User
from app.models.enums import MembershipRole, PostType

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
import seed


async def _count(db_session, query) -> int:
    return int(await db_session.scalar(select(func.count()).select_from(query.subquery())))


async def test_seed_matches_the_society_guide_and_is_idempotent(db_session) -> None:
    await seed.run_seed()
    await seed.run_seed()

    assert await _count(db_session, select(Flat.id)) == 420
    committee = await db_session.scalars(
        select(User.name)
        .join(Membership, Membership.user_id == User.id)
        .where(Membership.role == MembershipRole.committee)
    )
    assert set(committee) == {
        "Anil Khanna",
        "Meera Sharma",
        "Vikram Rao",
        "Sunita Joshi",
        "Farhan Ali",
    }
    football = [p for p in await db_session.scalars(select(Profile)) if "football" in p.interests]
    assert len(football) == 14

    lift = await db_session.scalar(select(Ticket).where(Ticket.number == 1042))
    assert lift is not None and lift.title == "Tower B Lift 2 stops at 5th floor"
    assert (
        await _count(
            db_session, select(TicketFollower.id).where(TicketFollower.ticket_id == lift.id)
        )
        == 11
    )

    notices = list(
        await db_session.scalars(select(Post.body).where(Post.post_type == PostType.notice))
    )
    assert len(notices) == 6
    assert any("Tue 6 Oct, 2:00\u20134:00 PM" in body for body in notices)
    assert not any("2024" in body or "C-702" in body for body in notices)
