# Article Scraping — How It Works

**One system, not several.** All 11 RSS sources go through the same single function, `_fetch_article_body()` in `app/tools/news_tools.py`. There is no per-site parser, no if/else branching on domain, no separate code path for Yahoo vs. ECB vs. Bank of Japan.

What differs per-source is **data, not code**: a shared denylist of known boilerplate strings (`_BOILERPLATE_PARAGRAPHS`) that a few specific sites happen to leak into their HTML. Adding a new source never requires writing a new scraper — at most it means adding a string to that set if a future site leaks its own chrome.

---

## The one pipeline (`parse_feeds()` → `_fetch_article_body()`)

For every entry in every feed:

1. **Try the RSS `summary` field first.** If the feed itself includes real text (some do, most of the 11 don't), use it — no HTTP fetch needed.
2. **If no summary, fetch the article URL.** `httpx.get()` with a browser-like `User-Agent`, 10s timeout, follows redirects.
3. **Check `Content-Type`.** If it's not HTML (PDF, XLSX, etc. — common on Fed/ECB/BoJ release feeds), bail out to `None` immediately. No attempt to parse binary as text.
4. **Extract every `<p>` tag** with BeautifulSoup and join their text.
5. **Drop known boilerplate paragraphs** — exact, case-insensitive match against `_BOILERPLATE_PARAGRAPHS` (Yahoo's error-boundary string, ECB's nav teaser sentences, Bank of Japan's chrome/footer labels).
6. **Strip NUL bytes** from every string (`_clean_text()`) — Postgres rejects them outright.
7. **Length floor.** If what's left after steps 5–6 is under 200 characters, treat it as "no real article" and return `None` rather than storing scraps (nav labels, table captions, etc.).
8. **Truncate to 8000 characters** and return.

Every source — Yahoo Finance, Investing.com, Seeking Alpha, CoinDesk, Google News, Federal Reserve, BLS (×3), ECB, Bank of England, Bank of Japan — runs through exactly these same 8 steps.

---

## Why it looked like "different systems"

Three bugs were found and fixed over the course of this work, and each one added an entry to a config (a denylist string, a content-type check, a length threshold) rather than a new code path:

| Source | Problem | What was added |
|---|---|---|
| Yahoo Finance | Leaked a hidden error-boundary paragraph | 1 string in the denylist |
| ECB | Leaked global-nav teaser paragraphs | 4 strings in the denylist |
| Bank of Japan | Chrome-only landing pages, no real prose | 3 strings in the denylist + the length-floor check (step 7) |
| Federal Reserve / ECB (PDF links) | Binary parsed as HTML → NUL bytes crashed inserts | Content-Type check (step 3) + NUL stripping (step 6) |

None of these required a site-specific extraction function. They're all guardrails bolted onto the same single `find_all("p")` pass.

---

## Known limitation

This is a generic, unstructured extraction strategy (`find_all("p")` + denylist), not proper content extraction. It has needed extending twice already as new sites leaked new chrome. If a 4th or 5th source shows the same pattern, that's the signal to replace this whole approach with a real content-extraction library (`trafilatura` or `readability-lxml`), which identify the "main content" region of a page structurally instead of guessing via a growing denylist — rather than continuing to patch strings in one at a time.
