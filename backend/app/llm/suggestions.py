import json
import logging

from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from app.db.models import Article
from app.llm.provider import get_llm
from app.tools import fetch_snapshot

logger = logging.getLogger(__name__)

ICON_ALLOWLIST = {
    "TrendingUp", "TrendingDown", "BarChart2", "Activity",
    "Landmark", "Globe", "CalendarDays", "Newspaper",
    "Zap", "AlertTriangle", "DollarSign", "Bitcoin",
    "Flame", "Sparkles",
}


class SuggestionItem(BaseModel):
    icon: str
    title: str
    desc: str

    @field_validator("icon")
    @classmethod
    def icon_must_be_allowed(cls, v: str) -> str:
        if v not in ICON_ALLOWLIST:
            return "Sparkles"
        return v


def _build_prompt(snapshot: dict, headlines: list[str]) -> str:
    movers = sorted(snapshot.items(), key=lambda x: abs(x[1].get("change_pct", 0)), reverse=True)[:5]
    mover_lines = "\n".join(
        f"  {sym}: {data['price']:.2f} ({data['change_pct']:+.2f}%)"
        for sym, data in movers
    )
    headline_lines = "\n".join(f"  - {h}" for h in headlines[:8])

    return f"""You are a financial analyst assistant. Based on today's market data and news, generate exactly 4 prompt card suggestions for users of a financial AI app.

TOP MARKET MOVERS TODAY:
{mover_lines}

LATEST NEWS HEADLINES:
{headline_lines}

Return ONLY a JSON array of exactly 4 objects. Each object must have these exact keys:
- "icon": one of these Lucide icon names only: TrendingUp, TrendingDown, BarChart2, Activity, Landmark, Globe, CalendarDays, Newspaper, Zap, AlertTriangle, DollarSign, Bitcoin, Flame, Sparkles
- "title": a short, specific question a user might ask (max 60 chars)
- "desc": a one-sentence description of what the answer will cover (max 80 chars)

The questions should reflect actual market moves and news from today. Be specific, not generic.

JSON array only — no markdown, no explanation:"""


def generate_suggestions(db: Session) -> list[SuggestionItem]:
    snapshot = fetch_snapshot()
    articles = db.query(Article).order_by(Article.published_at.desc()).limit(8).all()
    headlines = [a.title for a in articles if a.title]

    prompt = _build_prompt(snapshot, headlines)
    llm = get_llm()
    response = llm.invoke(prompt)
    raw = response.content.strip()

    # Strip markdown code fences if the model wraps the JSON
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    parsed = json.loads(raw)
    if not isinstance(parsed, list) or len(parsed) != 4:
        raise ValueError(f"Expected list of 4, got: {type(parsed)}")

    return [SuggestionItem(**item) for item in parsed]
