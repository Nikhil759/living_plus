from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import CurrentMember
from app.core.errors import AppError
from app.models import Membership, Profile, Society
from app.schemas.home import ResidentOut
from app.schemas.identity import ProfileUpdate
from app.services import home as home_service
from app.services import mappers
from app.services import notifications as notification_service


async def ensure_profile(db: AsyncSession, member: CurrentMember) -> tuple[Profile, bool]:
    profile = await db.get(Profile, member.user.id)
    if profile is None:
        profile = Profile(
            user_id=member.user.id,
            society_id=member.society_id,
            bio=None,
            interests=[],
        )
        db.add(profile)
        await db.flush()
        return profile, True

    if profile.society_id != member.society_id:
        raise AppError(
            "profile_society_mismatch",
            "Profile does not match your current society.",
            403,
        )
    return profile, False


async def build_resident_out(db: AsyncSession, member: CurrentMember) -> ResidentOut:
    society = await db.get(Society, member.society_id)
    membership = await db.get(Membership, member.membership_id)
    if society is None or membership is None:
        raise AppError("membership_missing", "Membership context is missing.", 503)

    tower_name, flat_no = await home_service.load_tower_flat(db, member.membership_id)
    profile, created = await ensure_profile(db, member)
    if created:
        await db.commit()
    return mappers.map_resident(
        member.user,
        society,
        membership,
        tower_name=tower_name,
        flat_no=flat_no,
        profile=profile,
        has_unread_notifications=await notification_service.has_unread(db, member),
    )


async def update_profile(
    db: AsyncSession,
    member: CurrentMember,
    body: ProfileUpdate,
) -> ResidentOut:
    profile, _created = await ensure_profile(db, member)

    if body.bio is not None:
        profile.bio = body.bio.strip() or None
    if body.interests is not None:
        profile.interests = body.interests
    if body.is_visible is not None:
        profile.is_visible = body.is_visible
    if body.show_flat is not None:
        profile.show_flat = body.show_flat

    await db.commit()
    await db.refresh(profile)
    return await build_resident_out(db, member)
