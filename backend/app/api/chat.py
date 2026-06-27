import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.llm import chat_prompt, get_llm

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
async def chat(req: ChatRequest):
    try:
        llm = get_llm()
        chain = chat_prompt | llm
        result = await chain.ainvoke({"question": req.message})
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"LLM error: {exc}") from exc

    return ChatResponse(
        answer=result.content,
        sources=[],
        market_snapshot={},
        conversation_id=req.conversation_id or str(uuid.uuid4()),
    )
