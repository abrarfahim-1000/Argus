import logging
import time

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.llm import generate_suggestions

logger = logging.getLogger(__name__)
router = APIRouter()

TTL = 900  # 15 minutes

_cache: list | None = None
_cache_time: float = 0.0

STATIC_FALLBACK = [
    {"icon": "TrendingDown", "title": "Why is Nvidia falling today?",      "desc": "Analyze technicals and news driving NVDA."},
    {"icon": "TrendingUp",   "title": "Why is Bitcoin rising this week?",  "desc": "Check ETF inflows and macro drivers."},
    {"icon": "CalendarDays", "title": "What should I watch this week?",    "desc": "Upcoming earnings and economic data."},
    {"icon": "Landmark",     "title": "What did the Fed say about rates?", "desc": "Summary of latest FOMC statements."},
]


@router.get("/suggestions")
def get_suggestions(db: Session = Depends(get_db)) -> list[dict]:
    global _cache, _cache_time

    if _cache is not None and (time.time() - _cache_time) < TTL:
        return _cache

    try:
        items = generate_suggestions(db)
        _cache = [item.model_dump() for item in items]
        _cache_time = time.time()
        return _cache
    except Exception:
        logger.exception("Failed to generate suggestions, returning fallback")
        return STATIC_FALLBACK
