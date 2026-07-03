import asyncio
import logging

from langchain_core.runnables import RunnableConfig

from app.db.crud import get_recent_articles

from .state import ChatState

logger = logging.getLogger(__name__)


async def news_agent(state: ChatState, config: RunnableConfig) -> dict:
    db = config["configurable"]["db"]
    try:
        articles = await asyncio.to_thread(get_recent_articles, db)
    except Exception:
        logger.exception("news_agent failed, returning no headlines")
        return {"news_headlines": []}
    return {"news_headlines": [a.title for a in articles if a.title]}
