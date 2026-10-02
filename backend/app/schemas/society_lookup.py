from app.schemas.base import CamelModel


class SocietyLookupOut(CamelModel):
    name: str
    city: str
    homes: int | None = None
    members: int | None = None
