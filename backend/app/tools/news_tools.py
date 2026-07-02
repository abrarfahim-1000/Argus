from datetime import datetime, timezone

import feedparser
import httpx
from bs4 import BeautifulSoup

RSS_SOURCES: dict[str, str] = {
    # Tier 1 — wires
    "Yahoo Finance":   "https://finance.yahoo.com/news/rssindex",
    "Investing.com":   "https://www.investing.com/rss/news.rss",
    "Seeking Alpha":   "https://seekingalpha.com/market_currents.xml",
    "CoinDesk":        "https://www.coindesk.com/arc/outboundfeeds/rss/",
    "Google News":     "https://news.google.com/rss/search?q=stock+market+when:1d&hl=en-US&gl=US&ceid=US:en",

    # Tier 2 — US primary
    "Federal Reserve": "https://www.federalreserve.gov/feeds/press_all.xml",
    "BLS Latest":      "https://www.bls.gov/feed/bls_latest.rss",
    "BLS CPI":         "https://www.bls.gov/feed/cpi_latest.rss",
    "BLS Employment":  "https://www.bls.gov/feed/empsit.rss",

    # Tier 3 — European primary
    "ECB":             "https://www.ecb.europa.eu/rss/press.html",
    "Bank of England": "https://www.bankofengland.co.uk/rss/news",

    # Tier 4 — Asian primary
    "Bank of Japan":   "https://www.boj.or.jp/en/rss/whatsnew.xml",
}

_REQUEST_HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; ArgusBot/1.0)"}
_MAX_BODY_CHARS = 8000
_MIN_BODY_CHARS = 200
_BOILERPLATE_PARAGRAPHS = {
    "oops, something went wrong",
    # ECB global nav / mega-menu teaser text, present on every ecb.europa.eu page
    "our monetary policy strategy, the tools we use and the impact they have",
    "insights into our work on financial stability and payments and market infrastructures",
    "access to all ecb statistics and background information",
    "all you need to know about our common currency",
    "in-depth studies and expert analyses covering diverse topics and fields",
    # Bank of Japan site chrome — appears on statistics-release landing pages
    # that link out to PDF/XLSX attachments and have no real article body
    "social networking site management policy",
    "statistics",
    "copyright bank of japan all rights reserved.",
}


def _clean_text(text: str) -> str:
    return text.replace("\x00", "").strip()


def _parse_published(entry) -> datetime:
    if hasattr(entry, "published_parsed") and entry.published_parsed:
        return datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
    return datetime.now(timezone.utc)


def _fetch_article_body(url: str) -> str | None:
    try:
        response = httpx.get(
            url, headers=_REQUEST_HEADERS, timeout=10, follow_redirects=True
        )
        response.raise_for_status()
        content_type = response.headers.get("content-type", "")
        if "html" not in content_type:
            return None
    except Exception:
        return None

    soup = BeautifulSoup(response.text, "html.parser")
    paragraphs = [_clean_text(p.get_text(strip=True)) for p in soup.find_all("p")]
    body = " ".join(
        text for text in paragraphs
        if text and text.lower() not in _BOILERPLATE_PARAGRAPHS
    )
    body = body.strip()[:_MAX_BODY_CHARS]
    if len(body) < _MIN_BODY_CHARS:
        return None
    return body


def parse_feeds() -> list[dict]:
    articles: list[dict] = []
    seen_urls: set[str] = set()
    for source, url in RSS_SOURCES.items():
        try:
            feed = feedparser.parse(url, request_headers=_REQUEST_HEADERS)
            for entry in feed.entries:
                try:
                    article_url = entry.get("link", "").strip()
                    if not article_url or article_url in seen_urls:
                        continue
                    seen_urls.add(article_url)
                    content = _clean_text(entry.get("summary", "")) or None
                    if not content:
                        content = _fetch_article_body(article_url)
                    articles.append({
                        "title":        _clean_text(entry.get("title", "")),
                        "url":          article_url,
                        "source":       source,
                        "published_at": _parse_published(entry),
                        "content":      content,
                    })
                except Exception:
                    continue
        except Exception:
            continue
    return articles
