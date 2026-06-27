from datetime import datetime, timezone

import feedparser

FEEDS: dict[str, str] = {
    "Reuters":       "https://feeds.reuters.com/reuters/businessNews",
    "CNBC":          "https://search.cnbc.com/rs/search/combinedcombined/view/rss/?partnerId=wrss01&id=100003114",
    "MarketWatch":   "https://feeds.content.dowjones.io/public/rss/mw_realtimeheadlines",
    "Yahoo Finance": "https://finance.yahoo.com/news/rssindex",
}


def _parse_published(entry) -> datetime:
    if hasattr(entry, "published_parsed") and entry.published_parsed:
        return datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
    return datetime.now(timezone.utc)


def parse_feeds() -> list[dict]:
    articles: list[dict] = []
    for source, url in FEEDS.items():
        try:
            feed = feedparser.parse(url)
            for entry in feed.entries:
                try:
                    article_url = entry.get("link", "").strip()
                    if not article_url:
                        continue
                    articles.append({
                        "title":        entry.get("title", "").strip(),
                        "url":          article_url,
                        "source":       source,
                        "published_at": _parse_published(entry),
                        "content":      entry.get("summary", "").strip() or None,
                    })
                except Exception:
                    continue
        except Exception:
            continue
    return articles
