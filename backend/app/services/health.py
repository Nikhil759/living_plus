import logging

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


async def check_database(db: AsyncSession) -> bool:
    try:
        await db.execute(text("SELECT 1"))
    except (SQLAlchemyError, OSError):
        # OSError: asyncpg raises connection-refused/timeouts without SQLAlchemy wrapping them.
        logger.warning("database health check failed", exc_info=True)
        return False
    return True
