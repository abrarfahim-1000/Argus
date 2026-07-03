# Argus Backend — Build Phases

Status key: `pending` | `in-progress` | `done`

---

## Phase 1 — Foundation Scaffold `done`

**Goal:** App skeleton that starts and serves `/health`.

**Files to create:**
- `app/main.py` — FastAPI entry, CORS, lifespan hooks
- `app/config.py` — pydantic-settings reading `.env`
- `app/api/health.py` — `GET /health` returning `{ status, llm_provider }`
- `backend/.env.example`

**Milestone:** `uvicorn app.main:app --reload` starts cleanly, `/health` returns 200.

---

## Phase 2 — Database Layer `done`

**Goal:** SQLAlchemy models, session factory, Alembic migrations, CRUD helpers.

**Files to create:**
- `app/db/models.py` — `Article`, `Conversation`, `Message` models
- `app/db/session.py` — `get_db` FastAPI dependency
- `app/db/crud.py` — insert/query helpers
- `alembic/` + `alembic.ini`

**Milestone:** `alembic upgrade head` creates all tables in Supabase.

---

## Phase 3 — LLM Provider + Bare Chat `done`

**Goal:** LLM abstraction + `/chat` endpoint powered by Gemini only (no agents). Unblocks frontend immediately.

**Files to create:**
- `app/llm/provider.py` — `get_llm()` switching on `LLM_PROVIDER` env var (gemini | openrouter)
- `app/llm/prompts.py` — prompt templates
- `app/api/chat.py` — `POST /chat` (message in → LLM answer out; no sources or market data yet)

**Milestone:** React `useChat` hook gets a real LLM response end-to-end.

---

## Phase 4 — Market Data `pending`

**Goal:** yfinance wrapper + `/market/snapshot` endpoint. Market data included in `/chat` response.

**Tracked assets:** SPY, QQQ, DJI, VIX, GC=F, SI=F, CL=F, BTC-USD, ETH-USD

**Files to create:**
- `app/tools/market_tools.py` — `fetch_snapshot()` for all tracked tickers
- `app/agents/market_agent.py`
- `app/api/market.py` — `GET /market/snapshot`

**Milestone:** `/market/snapshot` returns live prices with `change_pct`. `/chat` includes `market_snapshot` in its response.

---

## Phase 5 — News Ingestion Pipeline `pending`

**Goal:** RSS fetch → parse → persist to DB. Scheduler refreshes every 15 min via APScheduler.

**RSS sources:** Reuters, CNBC, MarketWatch, Yahoo Finance

**Files to create:**
- `app/tools/news_tools.py` — RSS feed parser + article HTML fetch
- `app/pipeline/news_ingestion.py` — fetch, deduplicate by URL, store to `articles` table
- `app/pipeline/scheduler.py` — APScheduler wired into FastAPI lifespan
- `app/agents/news_agent.py`

**Milestone:** On startup, news is fetched and rows appear in the `articles` table.

---

## Phase 6 — Dynamic Prompt Suggestions `pending`

**Goal:** Replace the four static prompt cards in the chat UI with four LLM-generated questions that reflect today's market moves and top news headlines. The LLM also picks a relevant icon for each question from a fixed allowlist so the UI stays consistent.

**Trigger:** Runs once per session on frontend load (after Phase 5 news is in DB). Results are cached server-side for 15 minutes so repeated page loads don't burn API quota.

**Data inputs fed to the LLM:**
- Live market snapshot from `fetch_snapshot()` (top movers by `|change_pct|`)
- Top 8 article titles from the `articles` table ordered by `published_at DESC`

**Icon allowlist** (Lucide icon names the LLM may return — frontend maps name → component):

| Name | When to use |
|---|---|
| `TrendingUp` | Bullish move, rally, breakout |
| `TrendingDown` | Selloff, decline, bearish signal |
| `BarChart2` | General market snapshot or comparison |
| `Activity` | Volatility, intraday swings |
| `Landmark` | Central bank, Fed, rate decision |
| `Globe` | Global / macro / geopolitical |
| `CalendarDays` | Earnings calendar, scheduled events |
| `Newspaper` | Breaking news, press release |
| `Zap` | Fast-moving story, surprise event |
| `AlertTriangle` | Risk, warning, potential downside |
| `DollarSign` | Currency, USD pairs, forex |
| `Bitcoin` | Crypto assets (BTC, ETH) |
| `Flame` | Hot sector, momentum play |
| `Sparkles` | AI / tech theme, general insight |

**LLM response schema** (strict JSON, validated with Pydantic):
```json
[
  {
    "icon": "TrendingDown",
    "title": "Why is NVDA selling off today?",
    "desc": "Technicals, news catalysts, and sector rotation."
  }
]
```

**Files to create:**
- `app/api/suggestions.py` — `GET /suggestions` endpoint; returns 4 `{ icon, title, desc }` objects; 15-min in-process TTL cache
- `app/llm/suggestions.py` — builds prompt from market snapshot + headlines, calls OpenRouter api, parses and validates JSON response

**Files to update:**
- `app/api/__init__.py` — register `suggestions` router
- `app/main.py` — `include_router(suggestions.router)`

**Frontend changes (same phase):**
- `src/api/argus.js` — add `fetchSuggestions()` wrapper for `GET /suggestions`
- `src/hooks/useSuggestions.js` — fetches on mount, falls back to static suggestions on error
- `src/pages/ChatPage.jsx` — `PromptSuggestions` reads from hook; icon name mapped to Lucide component via a `ICON_MAP` const; static `SUGGESTIONS` array kept as fallback

**Milestone:** On page load the four prompt cards show questions derived from today's actual market data and news. Each card displays an LLM-selected icon from the allowlist. A network failure gracefully falls back to the static cards.

---

## Phase 7 — RAG (Qdrant) `done`

**Issues hit during this phase (dead feeds, missing article content, scraped boilerplate) are logged in [`PHASE7_ISSUES.md`](./PHASE7_ISSUES.md).**

**Goal:** Embed unprocessed articles and store in Qdrant. Retriever for semantic search at query time.

**Config:** model `BAAI/bge-small-en-v1.5` (384-dim), chunk size 512 tokens / 50 overlap, top-k = 5, collection `argus_articles`

**Files to create:**
- `app/rag/embedder.py` — batch embed with sentence-transformers
- `app/rag/chunker.py` — tiktoken chunking (512 tokens, 50 overlap)
- `app/rag/retriever.py` — Qdrant top-k search
- `app/tools/vector_tools.py` — search wrapper for agents
- `app/agents/rag_agent.py`

**Milestone:** News pipeline marks articles `embedded=True` after Qdrant upsert. Retriever returns relevant chunks for a test query.

---

## Phase 8 — LangGraph Orchestration `done`

**Goal:** Wire all agents into a LangGraph graph. `/chat` runs the full pipeline and returns cited sources.

**Pipeline (as built):**
```
START ──┬──▶ market_agent ───┐
        ├──▶ news_agent ─────┤
        └──▶ rag_agent ──────┼──▶ reasoning_agent ──▶ END
                              │
                              ▼
                { answer, sources, market_snapshot, conversation_id }
```

Each context-gathering node runs concurrently from `START` and writes a disjoint `ChatState` key (`market_snapshot` / `news_headlines` / `rag_hits`), fanning in to `reasoning_agent`. Blocking tool calls (yfinance, Qdrant, DB) are wrapped in `asyncio.to_thread` so the `async def` `/chat` route never stalls the event loop. `news_agent` here queries the last 8 headlines already in the `articles` table (via `crud.get_recent_articles`) rather than re-hitting RSS — RSS ingestion stays the scheduler's job (Phase 5); this node just answers "what's been happening" fast.

`reasoning_agent` builds one prompt from all contexts, calls `get_llm()`, and returns `answer` + `sources` — sources are the deduped RAG-hit payloads (`title`/`url`/`source`), not LLM-generated, so citation accuracy never depends on the model getting JSON right.

**Files created:**
- `app/agents/state.py` — `ChatState` TypedDict shared by all nodes
- `app/agents/market_agent.py`, `app/agents/news_agent.py`, `app/agents/rag_agent.py` — thin async wrappers around existing tools, each with a try/except → safe empty default
- `app/agents/reasoning_agent.py` — prompt assembly + LLM call + source dedup
- `app/agents/graph.py` — `build_graph()`, module-level compiled singleton, `run_chat_graph(question, db, conversation_id)`

**Files updated:**
- `app/llm/prompts.py` / `app/llm/__init__.py` — replaced the unused `chat_prompt` with `reasoning_prompt`
- `app/api/chat.py` — replaced the bare LLM call with `run_chat_graph`; added `db: Session = Depends(get_db)`

**Milestone met:** `/chat` returns the full contract `{ answer, sources, market_snapshot, conversation_id }` — verified live: a market question returned a cited answer, 5 deduped sources, and a populated 24-asset `market_snapshot`.

---

## Phase 9 — Conversation Persistence `done`

**Goal:** Persist all messages to DB. Support multi-turn context via `conversation_id`.

**Design:** conversation history is treated as a 4th parallel fan-out node (`history_agent`) alongside market/news/RAG, so multi-turn context flows through the same `reasoning_agent` prompt instead of being bolted on separately. To avoid the current turn contaminating its own history read, `chat.py` runs the graph (which reads *prior* messages only) before persisting the current user + assistant messages — so `history_agent` never sees the in-flight turn.

**Files created:**
- `app/agents/history_agent.py` — 4th fan-out node; pulls `conversation_id` from `ChatState`, `db` from `RunnableConfig`, returns `[{"role", "content"}, ...]`

**Files updated:**
- `app/db/crud.py` — added `get_history(db, conversation_id, limit=10)` (last 10 messages, oldest-first); also fixed a pre-existing bug where `Article` was never imported (used by `get_recent_articles`, added in Phase 8, but silently only surfaced once something actually called it)
- `app/agents/state.py` — added `conversation_id`, `conversation_history`
- `app/agents/graph.py` — wired `history_agent` into the fan-out/fan-in; `run_chat_graph` gained a `conversation_id` param
- `app/agents/reasoning_agent.py`, `app/llm/prompts.py` — prompt gained a `CONVERSATION HISTORY` section
- `app/api/chat.py` — look up/create `Conversation` (400 on malformed UUID, 404 on unknown one), `append_message` for user then assistant (with `sources`) after the graph runs

**Milestone met:** sending the same `conversation_id` twice produces coherent multi-turn context — verified live: a follow-up question with no ticker name mentioned ("what was the price again?") correctly recalled Nvidia's price from the prior turn.

---

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Gemini daily cap hit during dev | Medium | OpenRouter fallback already designed in `provider.py` |
| Render cold start kills APScheduler | Low | In-process scheduler is fine for v1; 30s cold start is documented and acceptable |
| Qdrant Cloud free tier limits | Low | 1 GB vector storage is sufficient for v1 news volume |
| Supabase SSL connection | Low | Add `?sslmode=require` to `DATABASE_URL` |
| Unbounded conversation history inflates prompt size | Medium | `get_history` caps at last 10 messages |

---

## Build Order Rationale

Phases 1–3 unblock frontend integration fastest (bare chat works after Phase 3).  
Phases 4–6 add data richness and can be built independently of each other.  
Phase 7 is the final integration that assembles everything.  
Phase 8 wires that integration into the live `/chat` pipeline.  
Phase 9 is persistence polish on top of the working pipeline.

---

## Status: All Phases Complete

Phases 1–9 are `done`. Remaining work is v2 scope (auth, streaming, Redis) — see `CLAUDE.md`'s Key Constraints.
