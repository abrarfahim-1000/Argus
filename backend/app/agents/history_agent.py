import asyncio
import logging

from langchain_core.runnables import RunnableConfig

from app.db.crud import get_history

from .state import ChatState

logger = logging.getLogger(__name__)


async def history_agent(state: ChatState, config: RunnableConfig) -> dict:
    db = config["configurable"]["db"]
    try:
        messages = await asyncio.to_thread(get_history, db, state["conversation_id"])
    except Exception:
        logger.exception("history_agent failed, returning no history")
        return {"conversation_history": []}
    return {
        "conversation_history": [
            {"role": message.role, "content": message.content} for message in messages
        ]
    }
