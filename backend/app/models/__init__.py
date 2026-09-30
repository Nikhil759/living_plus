from app.models.base import Base, IdTimestampMixin

# Import every model module here so Alembic's target_metadata sees all tables.

__all__ = ["Base", "IdTimestampMixin"]
