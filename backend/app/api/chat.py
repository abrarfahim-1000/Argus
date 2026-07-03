import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.agents import run_chat_graph
from app.db import append_message, create_conversation, get_conversation, get_db

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None


class ChatResponse(BaseModel):
    answer: str
    sources: list = []
    market_snapshot: dict = {}
    conversation_id: str


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, db: Session = Depends(get_db)):
    if req.conversation_id:
        try:
            conversation_uuid = uuid.UUID(req.conversation_id)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Invalid conversation_id") from exc
        conversation = get_conversation(db, conversation_uuid)
        if conversation is None:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        conversation = create_conversation(db)

    try:
        result = await run_chat_graph(req.message, db, conversation.id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Chat pipeline error: {exc}") from exc

    append_message(db, conversation.id, "user", req.message)
    append_message(db, conversation.id, "assistant", result["answer"], sources=result["sources"])

    return ChatResponse(
        answer=result["answer"],
        sources=result["sources"],
        market_snapshot=result["market_snapshot"],
        conversation_id=str(conversation.id),
    )
