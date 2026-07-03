import asyncio
import logging
import uuid

from app.db import SessionLocal
from app.db.crud import get_history

from .state import ChatState

logger = logging.getLogger(__name__)


def _fetch_history(conversation_id: uuid.UUID) -> list[dict]:
    db = SessionLocal()
    try:
        messages = get_history(db, conversation_id)
        return [{"role": message.role, "content": message.content} for message in messages]
    finally:
        db.close()


async def history_agent(state: ChatState) -> dict:
    try:
        history = await asyncio.to_thread(_fetch_history, state["conversation_id"])
    except Exception:
        logger.exception("history_agent failed, returning no history")
        return {"conversation_history": []}
    return {"conversation_history": history}
