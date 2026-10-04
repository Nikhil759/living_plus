"""Society feed, interest groups and the WhatsApp directory. Shared by the app and Saarthi."""

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentMember
from app.core.errors import AppError
from app.models import (
    Comment,
    Flat,
    Group,
    GroupMember,
    JoinRequest,
    Membership,
    Post,
    Profile,
    Reaction,
    Tower,
    User,
    WhatsappGroup,
)
from app.models.enums import (
    GroupMemberRole,
    JoinRequestStatus,
    JoinTargetType,
    MembershipStatus,
    PostType,
)
from app.schemas.community import (
    CatalogOut,
    FeedPostOut,
    GroupDetailOut,
    GroupIn,
    GroupOut,
    JoinRequestOut,
    NeighbourOut,
    PostIn,
    WhatsappGroupOut,
)
from app.services import notifications
from app.services.marketplace import is_committee
from app.services.people import short_name

FEED_LIMIT = 50


# --- groups ------------------------------------------------------------------------------


async def _my_roles(db: AsyncSession, member: CurrentMember) -> dict[uuid.UUID, GroupMemberRole]:
    rows = await db.execute(
        select(GroupMember.group_id, GroupMember.role).where(
            GroupMember.society_id == member.society_id, GroupMember.user_id == member.user.id
        )
    )
    return dict(rows.all())


async def _my_requests(
    db: AsyncSession, member: CurrentMember, target_type: JoinTargetType
) -> dict[uuid.UUID, JoinRequestStatus]:
    rows = await db.execute(
        select(JoinRequest.target_id, JoinRequest.status)
        .where(
            JoinRequest.society_id == member.society_id,
            JoinRequest.user_id == member.user.id,
            JoinRequest.target_type == target_type,
        )
        .order_by(JoinRequest.created_at)
    )
    # Latest request per target wins.
    return dict(rows.all())


async def _member_counts(db: AsyncSession, group_ids: list[uuid.UUID]) -> dict[uuid.UUID, int]:
    rows = await db.execute(
        select(GroupMember.group_id, func.count())
        .where(GroupMember.group_id.in_(group_ids))
        .group_by(GroupMember.group_id)
    )
    return dict(rows.all())


async def resident_interests(db: AsyncSession, member: CurrentMember) -> set[str]:
    profile = await db.get(Profile, member.user.id)
    return {i.lower() for i in (profile.interests if profile else [])}


async def _groups_out(
    db: AsyncSession, member: CurrentMember, groups: list[Group]
) -> list[GroupOut]:
    roles = await _my_roles(db, member)
    requests = await _my_requests(db, member, JoinTargetType.group)
    counts = await _member_counts(db, [g.id for g in groups])
    interests = await resident_interests(db, member)
    return [
        GroupOut(
            id=g.id,
            name=g.name,
            emoji=g.emoji,
            member_count=counts.get(g.id, 0),
            description=g.description or "",
            visibility="private" if g.is_private else "public",
            tags=g.tags,
            joined=g.id in roles,
            is_admin=roles.get(g.id) == GroupMemberRole.admin,
            pending=g.id not in roles and requests.get(g.id) == JoinRequestStatus.pending,
            suggested=g.id not in roles and bool(interests & {t.lower() for t in g.tags}),
        )
        for g in groups
    ]


async def _load_group(db: AsyncSession, member: CurrentMember, group_id: uuid.UUID) -> Group:
    group = await db.scalar(
        select(Group).where(Group.id == group_id, Group.society_id == member.society_id)
    )
    if group is None:
        raise AppError("not_found", "Group not found.", 404)
    return group


async def get_group(db: AsyncSession, member: CurrentMember, group_id: uuid.UUID) -> GroupDetailOut:
    group = await _load_group(db, member, group_id)
    out = (await _groups_out(db, member, [group]))[0]
    # Private group posts stay inside the group.
    posts = await feed(db, member, group.id) if out.joined or not group.is_private else []
    return GroupDetailOut(**out.model_dump(), posts=posts)


async def create_group(db: AsyncSession, member: CurrentMember, body: GroupIn) -> GroupOut:
    clash = await db.scalar(
        select(Group.id).where(
            Group.society_id == member.society_id, func.lower(Group.name) == body.name.lower()
        )
    )
    if clash is not None:
        raise AppError("group_exists", "A group with this name already exists.", 409)
    group = Group(
        society_id=member.society_id,
        name=body.name,
        emoji=body.emoji,
        description=body.description,
        created_by=member.user.id,
        is_private=body.visibility == "private",
        tags=body.tags,
    )
    db.add(group)
    await db.flush()
    db.add(
        GroupMember(
            society_id=member.society_id,
            group_id=group.id,
            user_id=member.user.id,
            role=GroupMemberRole.admin,
        )
    )
    await db.commit()
    return (await _groups_out(db, member, [group]))[0]


async def _group_admins(db: AsyncSession, group_id: uuid.UUID) -> list[uuid.UUID]:
    return list(
        await db.scalars(
            select(GroupMember.user_id).where(
                GroupMember.group_id == group_id, GroupMember.role == GroupMemberRole.admin
            )
        )
    )


async def join_group(db: AsyncSession, member: CurrentMember, group_id: uuid.UUID) -> GroupOut:
    """Public groups join straight away; private groups send a request to their admins."""
    group = await _load_group(db, member, group_id)
    out = (await _groups_out(db, member, [group]))[0]
    if out.joined or out.pending:
        return out
    if group.is_private:
        db.add(
            JoinRequest(
                society_id=member.society_id,
                target_type=JoinTargetType.group,
                target_id=group.id,
                user_id=member.user.id,
            )
        )
        notifications.add_notifications(
            db,
            member.society_id,
            await _group_admins(db, group.id),
            kind="join_request",
            title=f"Request to join {group.name}",
            body=f"{short_name(member.user)} would like to join.",
            href="/community",
        )
    else:
        db.add(GroupMember(society_id=member.society_id, group_id=group.id, user_id=member.user.id))
    await db.commit()
    return (await _groups_out(db, member, [group]))[0]


async def leave_group(db: AsyncSession, member: CurrentMember, group_id: uuid.UUID) -> GroupOut:
    group = await _load_group(db, member, group_id)
    membership = await db.scalar(
        select(GroupMember).where(
            GroupMember.group_id == group.id, GroupMember.user_id == member.user.id
        )
    )
    if membership is None:
        raise AppError("not_member", "You're not in this group.", 422)
    if membership.role == GroupMemberRole.admin and len(await _group_admins(db, group.id)) == 1:
        raise AppError("last_admin", "Make someone else an admin before you leave.", 422)
    await db.delete(membership)
    await db.commit()
    return (await _groups_out(db, member, [group]))[0]


# --- WhatsApp directory --------------------------------------------------------------------


def _whatsapp_out(
    group: WhatsappGroup, member: CurrentMember, status: JoinRequestStatus | None
) -> WhatsappGroupOut:
    is_admin = group.admin_user_id == member.user.id
    return WhatsappGroupOut(
        id=group.id,
        name=group.name,
        member_count=group.member_count,
        topic=group.topic,
        invite_link=group.invite_link if is_admin or status == JoinRequestStatus.approved else None,
        pending_approval=status == JoinRequestStatus.pending,
        is_admin=is_admin,
    )


async def request_whatsapp(
    db: AsyncSession, member: CurrentMember, whatsapp_id: uuid.UUID
) -> WhatsappGroupOut:
    group = await db.scalar(
        select(WhatsappGroup).where(
            WhatsappGroup.id == whatsapp_id, WhatsappGroup.society_id == member.society_id
        )
    )
    if group is None:
        raise AppError("not_found", "WhatsApp group not found.", 404)
    status = (await _my_requests(db, member, JoinTargetType.whatsapp)).get(group.id)
    if group.admin_user_id != member.user.id and status not in (
        JoinRequestStatus.pending,
        JoinRequestStatus.approved,
    ):
        db.add(
            JoinRequest(
                society_id=member.society_id,
                target_type=JoinTargetType.whatsapp,
                target_id=group.id,
                user_id=member.user.id,
            )
        )
        notifications.add_notifications(
            db,
            member.society_id,
            [group.admin_user_id],
            kind="join_request",
            title=f"Request to join {group.name}",
            body=f"{short_name(member.user)} asked for the WhatsApp invite.",
            href="/community",
        )
        await db.commit()
        status = JoinRequestStatus.pending
    return _whatsapp_out(group, member, status)


# --- join requests (group and WhatsApp admins) ---------------------------------------------


async def _admin_targets(db: AsyncSession, member: CurrentMember) -> dict[uuid.UUID, str]:
    groups = await db.execute(
        select(Group.id, Group.name)
        .join(GroupMember, GroupMember.group_id == Group.id)
        .where(
            Group.society_id == member.society_id,
            GroupMember.user_id == member.user.id,
            GroupMember.role == GroupMemberRole.admin,
        )
    )
    chats = await db.execute(
        select(WhatsappGroup.id, WhatsappGroup.name).where(
            WhatsappGroup.society_id == member.society_id,
            WhatsappGroup.admin_user_id == member.user.id,
        )
    )
    return {**dict(groups.all()), **dict(chats.all())}


async def pending_requests(db: AsyncSession, member: CurrentMember) -> list[JoinRequestOut]:
    targets = await _admin_targets(db, member)
    rows = await db.execute(
        select(JoinRequest, User)
        .join(User, User.id == JoinRequest.user_id)
        .where(
            JoinRequest.society_id == member.society_id,
            JoinRequest.status == JoinRequestStatus.pending,
            JoinRequest.target_id.in_(list(targets)),
        )
        .order_by(JoinRequest.created_at)
    )
    return [
        JoinRequestOut(
            id=request.id,
            target_type=request.target_type,
            target_id=request.target_id,
            target_name=targets[request.target_id],
            requester_name=short_name(user),
            created_at=request.created_at,
        )
        for request, user in rows
    ]


async def decide_request(
    db: AsyncSession, member: CurrentMember, request_id: uuid.UUID, approve: bool
) -> None:
    targets = await _admin_targets(db, member)
    request = await db.scalar(
        select(JoinRequest).where(
            JoinRequest.id == request_id,
            JoinRequest.society_id == member.society_id,
            JoinRequest.status == JoinRequestStatus.pending,
        )
    )
    if request is None:
        raise AppError("not_found", "Request not found.", 404)
    if request.target_id not in targets:
        raise AppError("forbidden", "Only the group's admin can decide this.", 403)
    request.status = JoinRequestStatus.approved if approve else JoinRequestStatus.rejected
    if approve and request.target_type == JoinTargetType.group:
        db.add(
            GroupMember(
                society_id=member.society_id, group_id=request.target_id, user_id=request.user_id
            )
        )
    name = targets[request.target_id]
    notifications.add_notifications(
        db,
        member.society_id,
        [request.user_id],
        kind="join_request",
        title=f"{name}: request {'approved' if approve else 'declined'}",
        body="Open Community to see the invite." if approve else "The admin declined this time.",
        href="/community",
    )
    await db.commit()


# --- feed ------------------------------------------------------------------------------------


async def _post_authors(
    db: AsyncSession, posts: list[Post]
) -> dict[uuid.UUID, tuple[User, Profile | None, str | None, str | None]]:
    rows = await db.execute(
        select(User, Profile, Tower.name, Flat.flat_no)
        .join(Profile, Profile.user_id == User.id, isouter=True)
        .join(
            Membership,
            (Membership.user_id == User.id)
            & (Membership.society_id == posts[0].society_id)
            & (Membership.status == MembershipStatus.approved),
            isouter=True,
        )
        .join(Flat, Flat.id == Membership.flat_id, isouter=True)
        .join(Tower, Tower.id == Flat.tower_id, isouter=True)
        .where(User.id.in_({p.author_id for p in posts}))
    )
    return {user.id: (user, profile, tower, flat) for user, profile, tower, flat in rows}


async def _counts(db: AsyncSession, model: Any, post_ids: list[uuid.UUID]) -> dict[uuid.UUID, int]:
    rows = await db.execute(
        select(model.post_id, func.count())
        .where(model.post_id.in_(post_ids))
        .group_by(model.post_id)
    )
    return dict(rows.all())


async def _posts_out(db: AsyncSession, posts: list[Post]) -> list[FeedPostOut]:
    if not posts:
        return []
    ids = [p.id for p in posts]
    authors = await _post_authors(db, posts)
    comments = await _counts(db, Comment, ids)
    reactions = await _counts(db, Reaction, ids)
    group_names = dict(
        (
            await db.execute(
                select(Group.id, Group.name).where(
                    Group.id.in_({p.group_id for p in posts if p.group_id})
                )
            )
        ).all()
    )
    out: list[FeedPostOut] = []
    for post in posts:
        user, profile, tower, flat = authors.get(post.author_id, (None, None, None, None))
        if post.post_type == PostType.notice:
            name, meta = "Committee", "Society notice"
        else:
            name = short_name(user)
            # Flat numbers only when the author has chosen to show them.
            meta = (
                f"{tower} · {flat}"
                if tower and flat and profile and profile.show_flat
                else (tower or "Resident")
            )
        out.append(
            FeedPostOut(
                id=post.id,
                author_name=name,
                author_avatar_url=user.avatar_url if user else None,
                author_meta=meta,
                group_id=post.group_id,
                group_name=group_names.get(post.group_id) if post.group_id else None,
                post_type=post.post_type,
                pinned=post.pinned,
                body=post.body,
                posted_at=post.created_at,
                comment_count=comments.get(post.id, 0),
                reaction_count=reactions.get(post.id, 0),
            )
        )
    return out


async def feed(
    db: AsyncSession, member: CurrentMember, group_id: uuid.UUID | None = None
) -> list[FeedPostOut]:
    """Society posts plus posts from public groups and private groups the resident is in."""
    my_groups = select(GroupMember.group_id).where(GroupMember.user_id == member.user.id)
    open_groups = select(Group.id).where(
        Group.society_id == member.society_id, Group.is_private.is_(False)
    )
    query = select(Post).where(
        Post.society_id == member.society_id,
        or_(Post.group_id.is_(None), Post.group_id.in_(open_groups), Post.group_id.in_(my_groups)),
    )
    if group_id is not None:
        group = await _load_group(db, member, group_id)
        roles = await _my_roles(db, member)
        if group.is_private and group.id not in roles:
            raise AppError("forbidden", "Join this group to see its posts.", 403)
        query = query.where(Post.group_id == group.id)
    posts = await db.scalars(query.order_by(Post.created_at.desc()).limit(FEED_LIMIT))
    return await _posts_out(db, list(posts))


async def create_post(db: AsyncSession, member: CurrentMember, body: PostIn) -> FeedPostOut:
    notice = body.post_type == PostType.notice
    if notice and not is_committee(member):
        raise AppError("forbidden", "Only the committee can post notices.", 403)
    if body.group_id is not None:
        if notice:
            raise AppError("validation_error", "Notices go to the whole society.", 422)
        await _load_group(db, member, body.group_id)
        if body.group_id not in await _my_roles(db, member):
            raise AppError("forbidden", "Join this group to post in it.", 403)
    post = Post(
        society_id=member.society_id,
        group_id=body.group_id,
        author_id=member.user.id,
        body=body.body,
        post_type=body.post_type,
        pinned=notice,
        # Set in Python: SQLite's server-side now() only has second precision.
        created_at=datetime.now(UTC),
    )
    db.add(post)
    await db.commit()
    return (await _posts_out(db, [post]))[0]


# --- catalog ---------------------------------------------------------------------------------


async def _neighbours(db: AsyncSession, member: CurrentMember) -> list[NeighbourOut]:
    rows = await db.execute(
        select(User, Profile, Tower.name)
        .join(Profile, Profile.user_id == User.id)
        .join(Membership, Membership.user_id == User.id)
        .join(Flat, Flat.id == Membership.flat_id)
        .join(Tower, Tower.id == Flat.tower_id)
        .where(
            Profile.society_id == member.society_id,
            Profile.is_visible.is_(True),
            Membership.society_id == member.society_id,
            Membership.status == MembershipStatus.approved,
            User.id != member.user.id,
        )
        .order_by(User.name)
    )
    return [
        NeighbourOut(
            id=str(user.id),
            first_name=(user.name or "Neighbour").split()[0],
            tower=tower,
            interests=profile.interests,
            avatar_url=user.avatar_url,
        )
        for user, profile, tower in rows
    ]


async def residents_with_interest(
    db: AsyncSession, society_id: uuid.UUID, interest: str, *, exclude: uuid.UUID | None = None
) -> list[uuid.UUID]:
    """Approved residents who list this interest. Ids only: used for counts and invites,
    so hidden profiles are included but no names or details ever leave this function."""
    wanted = interest.strip().lower()
    rows = await db.execute(
        select(Profile.user_id, Profile.interests)
        .join(Membership, Membership.user_id == Profile.user_id)
        .where(
            Profile.society_id == society_id,
            Membership.society_id == society_id,
            Membership.status == MembershipStatus.approved,
        )
        .distinct()
    )
    return [
        user_id
        for user_id, interests in rows
        if user_id != exclude and wanted in {i.lower() for i in interests}
    ]


async def interest_count(db: AsyncSession, member: CurrentMember, interest: str) -> int:
    """Other residents with this interest (a number only, hidden profiles included)."""
    found = await residents_with_interest(
        db, member.society_id, interest, exclude=member.user.id
    )
    return len(found)


async def catalog(db: AsyncSession, member: CurrentMember) -> CatalogOut:
    groups = list(
        await db.scalars(
            select(Group).where(Group.society_id == member.society_id).order_by(Group.name)
        )
    )
    chats = await db.scalars(
        select(WhatsappGroup)
        .where(WhatsappGroup.society_id == member.society_id)
        .order_by(WhatsappGroup.name)
    )
    requests = await _my_requests(db, member, JoinTargetType.whatsapp)
    return CatalogOut(
        groups=await _groups_out(db, member, groups),
        whatsapp_groups=[_whatsapp_out(c, member, requests.get(c.id)) for c in chats],
        neighbours=await _neighbours(db, member),
    )
