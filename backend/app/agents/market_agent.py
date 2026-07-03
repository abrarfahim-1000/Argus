import asyncio
import logging

from app.db import SessionLocal, get_snapshot, upsert_snapshot
from app.tools import fetch_snapshot

from .state import ChatState

logger = logging.getLogger(__name__)


def _read_or_refresh_snapshot() -> dict:
    db = SessionLocal()
    try:
        row = get_snapshot(db, "market_snapshot")
        if row is not None:
            return row.payload
        snapshot = fetch_snapshot()
        upsert_snapshot(db, "market_snapshot", snapshot)
        return snapshot
    finally:
        db.close()


async def market_agent(state: ChatState) -> dict:
    try:
        snapshot = await asyncio.to_thread(_read_or_refresh_snapshot)
    except Exception:
        logger.exception("market_agent failed, returning empty snapshot")
        return {"market_snapshot": {}}
    return {"market_snapshot": snapshot}
