import logging

from sqlalchemy.orm import Session

from app.db import upsert_snapshot
from app.llm import generate_suggestions
from app.tools import fetch_snapshot

logger = logging.getLogger(__name__)


def refresh_market_and_suggestions(db: Session) -> None:
    snapshot = fetch_snapshot()
    upsert_snapshot(db, "market_snapshot", snapshot)

    try:
        items = generate_suggestions(db, snapshot=snapshot)
        upsert_snapshot(db, "suggestions", [item.model_dump() for item in items])
    except Exception:
        logger.exception(
            "Suggestion generation failed during scheduled refresh; keeping last cached value"
        )
