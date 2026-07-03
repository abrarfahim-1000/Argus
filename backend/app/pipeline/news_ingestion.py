import logging

from sqlalchemy.orm import Session

from app.db import Article
from app.rag import chunk_text, upsert_chunks
from app.tools import RSS_SOURCES, parse_feeds

logger = logging.getLogger(__name__)

_empty_run_counts: dict[str, int] = {}


def check_feed_health(source: str, new_article_count: int, threshold: int = 3) -> None:
    if new_article_count == 0:
        _empty_run_counts[source] = _empty_run_counts.get(source, 0) + 1
        if _empty_run_counts[source] >= threshold:
            logger.warning(
                "'%s' has returned 0 new articles for %d consecutive runs — feed may be dead.",
                source, _empty_run_counts[source],
            )
    else:
        _empty_run_counts[source] = 0


def run_ingestion(db: Session) -> int:
    articles = parse_feeds()
    inserted = 0
    inserted_by_source: dict[str, int] = {source: 0 for source in RSS_SOURCES}
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
        inserted_by_source[item["source"]] = inserted_by_source.get(item["source"], 0) + 1
    if inserted:
        db.commit()

    for source, count in inserted_by_source.items():
        check_feed_health(source, count)
        logger.info("%s: %d new articles", source, count)

    embed_pending_articles(db)
    return inserted


def embed_pending_articles(db: Session) -> int:
    pending = db.query(Article).filter(Article.embedded.is_(False)).all()
    embedded = 0
    for article in pending:
        if not article.content:
            article.embedded = True
            db.commit()
            continue
        try:
            chunks = chunk_text(article.content)
            upsert_chunks(
                article_id=str(article.id),
                title=article.title,
                url=article.url,
                source=article.source,
                chunks=chunks,
            )
            article.embedded = True
            db.commit()
            embedded += 1
        except Exception:
            logger.exception("Failed to embed article %s", article.id)
            db.rollback()
    return embedded
