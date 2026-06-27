from sqlalchemy.orm import Session

from app.db.models import Article
from app.tools import parse_feeds


def run_ingestion(db: Session) -> int:
    articles = parse_feeds()
    inserted = 0
    for item in articles:
        if not item.get("url"):
            continue
        exists = db.query(Article).filter(Article.url == item["url"]).first()
        if exists:
            continue
        db.add(Article(
            title=item["title"],
            url=item["url"],
            source=item["source"],
            published_at=item["published_at"],
            content=item["content"],
        ))
        inserted += 1
    if inserted:
        db.commit()
    return inserted
