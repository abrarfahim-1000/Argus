import asyncio
import logging

from app.tools import fetch_snapshot

from .state import ChatState

logger = logging.getLogger(__name__)


async def market_agent(state: ChatState) -> dict:
    try:
        snapshot = await asyncio.to_thread(fetch_snapshot)
    except Exception:
        logger.exception("market_agent failed, returning empty snapshot")
        return {"market_snapshot": {}}
    return {"market_snapshot": snapshot}
