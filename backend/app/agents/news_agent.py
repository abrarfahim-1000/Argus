import asyncio
import logging

from app.db import SessionLocal
from app.db.crud import get_recent_articles

from .state import ChatState

logger = logging.getLogger(__name__)


def _fetch_recent_headlines() -> list[str]:
    db = SessionLocal()
    try:
        articles = get_recent_articles(db)
        return [a.title for a in articles if a.title]
    finally:
        db.close()


async def news_agent(state: ChatState) -> dict:
    try:
        headlines = await asyncio.to_thread(_fetch_recent_headlines)
    except Exception:
        logger.exception("news_agent failed, returning no headlines")
        return {"news_headlines": []}
    return {"news_headlines": headlines}
