import uuid

from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import text

from app.models.base import Base, IdTimestampMixin
from app.models.enums import (
    GroupMemberRole,
    JoinRequestStatus,
    JoinTargetType,
    ReactionType,
)


class Group(Base, IdTimestampMixin):
    __tablename__ = "groups"

    society_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("societies.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    cover_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    is_private: Mapped[bool] = mapped_column(default=False)
    tags: Mapped[list[str]] = mapped_column(
        ARRAY(String(50)), server_default=text("'{}'::varchar[]")
    )

    members: Mapped[list["GroupMember"]] = relationship(back_populates="group")
    posts: Mapped[list["Post"]] = relationship(back_populates="group")


class GroupMember(Base, IdTimestampMixin):
    __tablename__ = "group_members"
    __table_args__ = (UniqueConstraint("group_id", "user_id", name="uq_group_members_group_user"),)

    group_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("groups.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    role: Mapped[GroupMemberRole] = mapped_column(
        SAEnum(GroupMemberRole, name="group_member_role"), default=GroupMemberRole.member
    )

    group: Mapped["Group"] = relationship(back_populates="members")


class WhatsappGroup(Base, IdTimestampMixin):
    __tablename__ = "whatsapp_groups"

    society_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("societies.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(120))
    topic: Mapped[str | None] = mapped_column(String(200), nullable=True)
    member_count: Mapped[int] = mapped_column(default=0)
    invite_link: Mapped[str] = mapped_column(String(512))
    admin_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))


class JoinRequest(Base, IdTimestampMixin):
    __tablename__ = "join_requests"

    society_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("societies.id", ondelete="CASCADE"), index=True
    )
    target_type: Mapped[JoinTargetType] = mapped_column(
        SAEnum(JoinTargetType, name="join_target_type")
    )
    target_id: Mapped[uuid.UUID] = mapped_column()
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    status: Mapped[JoinRequestStatus] = mapped_column(
        SAEnum(JoinRequestStatus, name="join_request_status"), default=JoinRequestStatus.pending
    )


class Post(Base, IdTimestampMixin):
    __tablename__ = "posts"

    society_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("societies.id", ondelete="CASCADE"), index=True
    )
    group_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("groups.id", ondelete="CASCADE"), nullable=True, index=True
    )
    author_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    body: Mapped[str] = mapped_column(Text)
    media_urls: Mapped[list[str]] = mapped_column(
        ARRAY(String(2048)), server_default=text("'{}'::varchar[]")
    )

    group: Mapped["Group | None"] = relationship(back_populates="posts")
    comments: Mapped[list["Comment"]] = relationship(back_populates="post")
    reactions: Mapped[list["Reaction"]] = relationship(back_populates="post")


class Comment(Base, IdTimestampMixin):
    __tablename__ = "comments"

    post_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("posts.id", ondelete="CASCADE"), index=True
    )
    author_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    body: Mapped[str] = mapped_column(Text)

    post: Mapped["Post"] = relationship(back_populates="comments")


class Reaction(Base, IdTimestampMixin):
    __tablename__ = "reactions"
    __table_args__ = (
        UniqueConstraint("post_id", "user_id", "reaction_type", name="uq_reactions_post_user_type"),
    )

    post_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("posts.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    reaction_type: Mapped[ReactionType] = mapped_column(SAEnum(ReactionType, name="reaction_type"))

    post: Mapped["Post"] = relationship(back_populates="reactions")
