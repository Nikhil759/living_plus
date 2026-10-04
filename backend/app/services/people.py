"""How residents are named to each other: first name and last initial, never flat or phone."""

from app.models import User


def short_name(user: User | None) -> str:
    if user is None:
        return "A resident"
    parts = (user.name or "").split()
    if not parts:
        return "A resident"
    return f"{parts[0]} {parts[-1][0]}." if len(parts) > 1 else parts[0]
