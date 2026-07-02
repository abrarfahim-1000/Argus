# Phase 7 — Issues Encountered & Fixes

Log of problems hit while building and verifying the RAG pipeline (Qdrant + BGE embeddings), and what was done about each. Kept separate from `BACKEND_PHASES.md` so the phase plan stays a clean forward-looking doc.

---

## 1. Embedding model drifted from the original phase doc

`BACKEND_PHASES.md` and `CLAUDE.md` still said `all-MiniLM-L6-v2`, but the model actually decided on (per `docs/notes.md`, an earlier planning session) is **`BAAI/bge-small-en-v1.5`** (384-dim, same vector size — coincidence, not a compatibility guarantee).

**Fix:** updated both docs to reference `BAAI/bge-small-en-v1.5`. `app/rag/embedder.py` and `app/rag/retriever.py` (`VECTOR_SIZE = 384`) were built against the correct model from the start.

---

## 2. All ingested articles had `content = None`

After the RAG pipeline was wired up, every article in the `articles` table had `content = None`, so nothing meaningful ever reached Qdrant. Root cause was in Phase 5 (`app/tools/news_tools.py`), not Phase 7:

| Feed | Problem |
|---|---|
| Reuters | `feeds.reuters.com` no longer resolves (DNS failure) — feed URL is dead |
| CNBC | Returns HTTP 200 but the feed body parses to 0 entries — endpoint likely deprecated |
| MarketWatch | RSS entries have a `summary` field, but it's always an empty string for the real-time headlines feed |
| Yahoo Finance | RSS entries have no `summary` field at all |

`entry.get("summary", "").strip() or None` therefore returned `None` for every article. The original phase doc always intended "RSS feed parser **+ article HTML fetch**" as a fallback, but that fetch step was never implemented.

**Fix:** added `_fetch_article_body(url)` to `news_tools.py` — when RSS `summary` is empty, GET the article URL and extract `<p>` tag text via BeautifulSoup (`httpx` + `beautifulsoup4`, both already in `requirements.txt`). Backfilled the 52 articles already in the DB (41 recovered real content; 11 failed the fetch and stayed `content = None`, which is expected — see issue #4).

---

## 3. Scraped Yahoo Finance content started with "Oops, something went wrong"

Yahoo Finance's server-rendered HTML includes a hidden client-side error-boundary `<p>` (`class="tertiary yf-te3rzo centerText"`, text `"Oops, something went wrong"`) that renders *before* the real article body in the raw HTML. Grabbing every `<p>` tag on the page picked this up as the first sentence of ~37 of 41 scraped Yahoo articles — polluting the embedded text and, worse, the DB content column.

**Fix:** added a `_BOILERPLATE_PARAGRAPHS` denylist (exact, case-insensitive match) in `news_tools.py._fetch_article_body()` that drops known boilerplate paragraphs before joining the body text. Deleted and re-created the affected Qdrant points, re-fetched clean content for the 37 DB rows.

**Known limitation:** this is a narrow, site-specific string match, not general boilerplate detection. If Yahoo changes the string, or another source leaks similar UI chrome into scraped text, it needs a manual addition to the denylist. No generic content-extraction library (e.g. `trafilatura`, `readability-lxml`) was introduced — deliberately, to avoid a bigger dependency for a one-page-shape fix. Revisit if boilerplate leakage recurs across other sources.

---

## 4. Not every article scrapes cleanly — some sources block bots outright

During a full end-to-end server run (`uvicorn` startup → scheduled ingestion job), MarketWatch returned **HTTP 401 Forbidden** for every article URL fetch, despite the RSS feed itself parsing fine. Result: 0 of that batch's MarketWatch articles got body content; only Yahoo Finance articles did (66 of 78 total articles ended up with content in that run).

This is expected behavior, not a bug — `_fetch_article_body()` catches the exception and returns `None`, and `embed_pending_articles()` marks those rows `embedded = True` without embedding them (no retry loop, no fake data). Not fixed in this phase; noted here so it isn't mistaken for a regression later.

**Possible future mitigation** (not implemented): rotate/spoof headers further, or accept that some sources will simply never yield full-text content and are only useful for their (usually more reliable) `title` field.

---

## 5. Reuters and CNBC feeds are effectively dead

Independent of the content-scraping issues above: the Reuters feed URL fails DNS resolution outright, and the CNBC feed returns zero entries. **No articles from either source have entered the pipeline since these issues were discovered.** This was true before Phase 7 as well — it just became visible once content quality was being checked closely.

**Not fixed** — flagged for a future Phase 5 follow-up: find replacement RSS URLs for Reuters and CNBC business news, or drop them from `FEEDS` in `app/tools/news_tools.py` if no working equivalent exists.

---

## 6. Phase 5 Patch — RSS source overhaul (11 feeds, 4 tiers) + global ticker coverage

Applied `docs/PHASE_5_PATCH (1).md` in full: replaced the dead/limited 4-feed `FEEDS` dict in `news_tools.py` with the patch's validated `RSS_SOURCES` (Yahoo Finance, Investing.com, Seeking Alpha, CoinDesk, Google News, Federal Reserve, BLS Latest/CPI/Employment, ECB, Bank of England, Bank of Japan — 11 sources), added cross-feed URL dedup (Google News overlaps with the others), added `check_feed_health()` in `news_ingestion.py` (warns after 3 consecutive empty runs per source), added `N225`/`FTSE`/`DAX` to `market_tools.py` `TICKERS` (verified each resolves in yfinance), and extended `useMarketTicker.js` `DISPLAY_ORDER` to match. `app/pipeline/scheduler.py` already met the patch's requirement (APScheduler, 15-min interval, wired into `main.py` lifespan) — no change needed there.

**Result:** 423 articles landed across all 11/11 configured sources on the first full run (exceeds the patch's 9/11 milestone), with per-feed counts logged on every ingestion cycle.

---

## 7. NUL bytes from a PDF crashed the entire ingestion batch

The first full 11-feed run inserted **zero** articles and logged no per-feed status at all — a silent, total failure. Root cause: one Federal Reserve/ECB link resolved to a PDF; `BeautifulSoup` parsed the raw PDF binary as if it were HTML, and the extracted "text" contained NUL (`\x00`) bytes. Postgres/psycopg2 rejects NUL bytes in text columns, so the single batch `db.commit()` covering *all* newly-fetched articles raised `ValueError: A string literal cannot contain NUL (0x00) characters` and rolled back the entire batch — not just the one bad row.

**Fix:**
- `_fetch_article_body()` now checks the response `Content-Type` header and returns `None` immediately if it's not HTML (skips PDFs/XLSX/etc. before ever parsing them as HTML).
- Added `_clean_text()` — strips NUL bytes from every scraped/RSS title and content string before it's assembled into an article dict, as defense in depth in case a NUL slips in through some other content type in the future.

Re-ran after the fix: same 11 feeds, 423 articles inserted cleanly, no crash.

---

## 8. Bank of Japan and ECB content was null or boilerplate-only, repeatedly

Same underlying class of bug as issue #3 (Yahoo's leaked error-boundary paragraph), but two more instances of it, found by inspecting DB rows directly rather than log output — the ingestion *looked* successful (per-feed counts were non-zero, no crash) while silently storing garbage or losing content:

- **ECB** — every scraped article's content began with the same four sentences: *"Our monetary policy strategy, the tools we use and the impact they have. Insights into our work on financial stability and payments... "* etc. This is ECB's site-wide global navigation / mega-menu teaser text, which lives in `<p>` tags positioned *before* the actual press-release body in the raw HTML. Grabbing every `<p>` tag picked it up identically on every single ECB page, ahead of the real content.
- **Bank of Japan** — `whatsnew.xml` links to a mix of PDFs, XLSX statistical files (correctly filtered to `None` by the Content-Type check in issue #7), and HTML *landing/index* pages (e.g. `.../release/2026/ac260610.htm`) that link out to those attachments but contain no real prose themselves — just site chrome: `"Social Networking Site Management Policy"` (nav label), `"Statistics"` (nav label), `"Copyright Bank of Japan All Rights Reserved."` (footer). The scraper extracted this chrome as if it were article content.

**Fix:**
- Extended `_BOILERPLATE_PARAGRAPHS` with the exact ECB nav strings and BoJ chrome strings (same denylist mechanism as issue #3 — this is the "revisit if boilerplate leakage recurs across other sources" case that doc already flagged).
- Added a `_MIN_BODY_CHARS = 200` floor: after boilerplate is stripped, if what's left is shorter than that, treat the page as having no real article body and return `None` rather than storing leftover fragments (e.g. BoJ pages that, after removing chrome, only had `"(Annex Table 1)" "(Annex Table 2)" "(Annex Table 3)"` left — not usable content). This is a structural fix, not just a denylist addition — it should catch future chrome-only landing pages from *any* source without needing a manual string added first.
- Deleted and re-created the affected Qdrant points; re-fetched all 64 existing Bank of Japan + ECB rows with the fixed scraper (30 changed: 10 correctly nulled out as genuinely chrome-only pages, 20 recovered clean real content that had previously been prefixed with nav boilerplate).

**Known limitation, still:** the denylist is still exact-string, site-specific matching, not general boilerplate/nav detection. It has now needed extending twice (Yahoo, then ECB+BoJ) — if this keeps recurring across more sources, it's a sign to swap the whole `find_all("p")` approach for a proper content-extraction library (`trafilatura` or `readability-lxml`) rather than continuing to patch the denylist one site at a time. The `_MIN_BODY_CHARS` floor added here reduces the blast radius of *new* undiscovered chrome-only pages (they resolve to `None` instead of storing junk) even before their specific boilerplate strings are known.

---

## Verification performed

- `chunk_text()` — confirmed short-article passthrough and multi-chunk splitting on long input.
- `embed_texts()` / `ensure_collection()` — collection created in Qdrant Cloud, 384-dim COSINE.
- `upsert_chunks()` → `search()` — round-tripped a synthetic article, retrieved it with a topically related query, cleaned up the test point.
- Full ingestion run via `run_ingestion()` — real RSS articles inserted, embedded, and searchable (`search("interest rate cut")` returned relevant, correctly-scored real articles).
- Full server boot (`uvicorn app.main:app`) — `/health`, `/market/snapshot`, `/suggestions`, `/chat` all returned 200 with expected payloads; scheduled ingestion job ran automatically on startup and logged its result.
- `alembic current` matches `alembic heads` — no pending migrations.
- Full 11-feed ingestion run — 423 articles across all 11 sources, per-feed counts logged, no crash.
- `^N225` / `^FTSE` / `^GDAXI` — confirmed resolving in yfinance with valid intraday bars.
- Targeted re-fetch of all 64 Bank of Japan + ECB DB rows post-fix — 0 rows contain the ECB nav boilerplate or BoJ site-chrome strings; `search("European Central Bank interest rate decision")` returns real, correctly-scored ECB/BoJ articles.
