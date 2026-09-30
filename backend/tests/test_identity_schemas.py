import uuid
from datetime import UTC, datetime

from app.models.enums import MembershipRole, MembershipStatus, SocietyPlan
from app.models.membership import Membership
from app.models.society import Society
from app.models.user import User
from app.schemas.identity import (
    MembershipRead,
    SocietyRead,
    UserRead,
)


def test_identity_read_schemas_use_camel_case_aliases() -> None:
    now = datetime.now(tz=UTC)
    user = User(
        id=uuid.uuid4(),
        supabase_uid="uid-1",
        email="a@example.com",
        phone=None,
        name="Ada",
        avatar_url=None,
        created_at=now,
        updated_at=now,
    )
    society = Society(
        id=uuid.uuid4(),
        name="Sector 50",
        city="Gurgaon",
        address=None,
        invite_code="CODE",
        plan=SocietyPlan.free,
        settings={},
        created_at=now,
        updated_at=now,
    )
    membership = Membership(
        id=uuid.uuid4(),
        user_id=user.id,
        society_id=society.id,
        flat_id=None,
        role=MembershipRole.owner,
        status=MembershipStatus.approved,
        created_at=now,
        updated_at=now,
    )

    user_json = UserRead.model_validate(user).model_dump(by_alias=True)
    assert user_json["supabaseUid"] == "uid-1"
    assert "supabase_uid" not in user_json

    society_json = SocietyRead.model_validate(society).model_dump(by_alias=True)
    assert society_json["inviteCode"] == "CODE"

    membership_json = MembershipRead.model_validate(membership).model_dump(by_alias=True)
    assert membership_json["societyId"] == society.id
