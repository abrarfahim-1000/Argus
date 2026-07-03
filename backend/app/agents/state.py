import uuid
from typing import TypedDict


class ChatState(TypedDict):
    question: str
    conversation_id: uuid.UUID
    market_snapshot: dict[str, dict]
    news_headlines: list[str]
    rag_hits: list[dict]
    conversation_history: list[dict]
    answer: str
    sources: list[dict]
