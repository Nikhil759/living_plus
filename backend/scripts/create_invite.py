"""Create or refresh a pending membership invite for a resident email.

Usage (from backend/):
    PYTHONPATH=. uv run python scripts/create_invite.py \\
        --email you@gmail.com --code MY-DEMO-01 --flat C-702 --role tenant
"""

from __future__ import annotations

import argparse
import asyncio
import uuid

from sqlalchemy import select

from app.core.db import get_sessionmaker
from app.models import Flat, MembershipInvite, Society, Tower
from app.models.enums import MembershipInviteStatus, MembershipRole
from app.services.invites import normalize_email, normalize_invite_code
from scripts.seed import INVITE_CODE


async def run(email: str, code: str, flat_key: str, role: MembershipRole) -> None:
    session_factory = get_sessionmaker()
    async with session_factory() as session:
        society = await session.scalar(
            select(Society).where(Society.invite_code == INVITE_CODE)
        )
        if society is None:
            raise SystemExit(
                f"Society with invite_code {INVITE_CODE} not found. Run seed.py first."
            )

        tower_letter, flat_no = flat_key.split("-", 1)
        tower_name = f"Tower {tower_letter}"
        tower = await session.scalar(
            select(Tower).where(Tower.society_id == society.id, Tower.name == tower_name)
        )
        if tower is None:
            raise SystemExit(f"Tower {tower_letter} not found.")

        flat = await session.scalar(
            select(Flat).where(Flat.tower_id == tower.id, Flat.flat_no == flat_no)
        )
        if flat is None:
            raise SystemExit(f"Flat {flat_key} not found.")

        normalized_code = normalize_invite_code(code)
        invite = await session.scalar(
            select(MembershipInvite).where(MembershipInvite.code == normalized_code)
        )
        if invite is None:
            invite = MembershipInvite(
                id=uuid.uuid4(),
                society_id=society.id,
                flat_id=flat.id,
                email=normalize_email(email),
                role=role,
                code=normalized_code,
                status=MembershipInviteStatus.pending,
            )
            session.add(invite)
        else:
            invite.society_id = society.id
            invite.flat_id = flat.id
            invite.email = normalize_email(email)
            invite.role = role
            invite.status = MembershipInviteStatus.pending
            invite.consumed_at = None
            invite.consumed_by_user_id = None

        await session.commit()
        print(f"Invite {normalized_code} → {email} · {flat_key} · {role.value} (pending)")


def main() -> None:
    parser = argparse.ArgumentParser(description="Create a membership invite code")
    parser.add_argument("--email", required=True, help="Resident email (must match Google sign-in)")
    parser.add_argument("--code", required=True, help="One-time invite code")
    parser.add_argument(
        "--flat",
        required=True,
        help="Flat key like C-702 (tower letter + flat number)",
    )
    parser.add_argument(
        "--role",
        default="tenant",
        choices=[r.value for r in MembershipRole],
    )
    args = parser.parse_args()
    asyncio.run(run(args.email, args.code, args.flat, MembershipRole(args.role)))


if __name__ == "__main__":
    main()
