import uuid

from sqlalchemy.orm import Session

from app.db import Article, Conversation, Message


def create_conversation(db: Session) -> Conversation:
    conv = Conversation(id=uuid.uuid4())
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv


def get_conversation(db: Session, conversation_id: uuid.UUID) -> Conversation | None:
    return db.query(Conversation).filter(Conversation.id == conversation_id).first()


def get_recent_articles(db: Session, limit: int = 8) -> list[Article]:
    return db.query(Article).order_by(Article.published_at.desc()).limit(limit).all()


def get_history(db: Session, conversation_id: uuid.UUID, limit: int = 10) -> list[Message]:
    messages = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.desc())
        .limit(limit)
        .all()
    )
    return list(reversed(messages))


def append_message(
    db: Session,
    conversation_id: uuid.UUID,
    role: str,
    content: str,
    sources: list | None = None,
) -> Message:
    msg = Message(
        conversation_id=conversation_id,
        role=role,
        content=content,
        sources=sources,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg
