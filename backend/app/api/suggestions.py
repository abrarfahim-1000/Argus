import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db, get_snapshot, upsert_snapshot
from app.llm import generate_suggestions

logger = logging.getLogger(__name__)
router = APIRouter()

STATIC_FALLBACK = [
    {"icon": "TrendingDown", "title": "Why is Nvidia falling today?",      "desc": "Analyze technicals and news driving NVDA."},
    {"icon": "TrendingUp",   "title": "Why is Bitcoin rising this week?",  "desc": "Check ETF inflows and macro drivers."},
    {"icon": "CalendarDays", "title": "What should I watch this week?",    "desc": "Upcoming earnings and economic data."},
    {"icon": "Landmark",     "title": "What did the Fed say about rates?", "desc": "Summary of latest FOMC statements."},
]


@router.get("/suggestions")
def get_suggestions(db: Session = Depends(get_db)) -> list[dict]:
    row = get_snapshot(db, "suggestions")
    if row is not None:
        return row.payload

    try:
        items = generate_suggestions(db)
        payload = [item.model_dump() for item in items]
        upsert_snapshot(db, "suggestions", payload)
        return payload
    except Exception:
        logger.exception("Failed to generate suggestions, returning fallback")
        return STATIC_FALLBACK
