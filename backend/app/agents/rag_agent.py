import asyncio
import logging

from app.tools.vector_tools import search_articles

from .state import ChatState

logger = logging.getLogger(__name__)


async def rag_agent(state: ChatState) -> dict:
    try:
        hits = await asyncio.to_thread(search_articles, state["question"])
    except Exception:
        logger.exception("rag_agent failed, returning no hits")
        return {"rag_hits": []}
    return {"rag_hits": hits}
