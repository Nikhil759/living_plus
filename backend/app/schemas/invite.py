from pydantic import Field

from app.schemas.base import CamelModel


class RedeemInviteIn(CamelModel):
    invite_code: str = Field(min_length=4, max_length=32)


class RedeemInviteOut(CamelModel):
    society_name: str
    tower_name: str
    flat_no: str
    role: str
