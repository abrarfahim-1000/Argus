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

## Phase 7 — RAG (Qdrant) `pending`

**Goal:** Embed unprocessed articles and store in Qdrant. Retriever for semantic search at query time.

**Config:** model `all-MiniLM-L6-v2`, chunk size 512 tokens / 50 overlap, top-k = 5, collection `argus_articles`

**Files to create:**
- `app/rag/embedder.py` — batch embed with sentence-transformers
- `app/rag/chunker.py` — tiktoken chunking (512 tokens, 50 overlap)
- `app/rag/retriever.py` — Qdrant top-k search
- `app/tools/vector_tools.py` — search wrapper for agents
- `app/agents/rag_agent.py`

**Milestone:** News pipeline marks articles `embedded=True` after Qdrant upsert. Retriever returns relevant chunks for a test query.

---

## Phase 8 — LangGraph Orchestration `pending`

**Goal:** Wire all agents into a LangGraph graph. `/chat` runs the full pipeline and returns cited sources.

**Pipeline:**
```
POST /chat
    │
    ▼
LangGraph Orchestrator (graph.py)
    ├──▶ Market Agent
    ├──▶ News Agent
    ├──▶ RAG Agent
    └──▶ Reasoning Agent → cited answer
    │
    ▼
{ answer, sources, market_snapshot, conversation_id }
```

**Files to create/update:**
- `app/agents/graph.py` — LangGraph graph definition
- `app/agents/reasoning_agent.py` — LLM synthesis with citations
- `app/api/chat.py` — replace bare LLM call with graph invocation

**Milestone:** `/chat` returns the full contract: `{ answer, sources, market_snapshot, conversation_id }`.

---

## Phase 9 — Conversation Persistence `pending`

**Goal:** Persist all messages to DB. Support multi-turn context via `conversation_id`.

**Files to update:**
- `app/api/chat.py` — create/lookup conversation, persist user + assistant messages
- `app/db/crud.py` — `create_conversation`, `append_message`, `get_history`

**Milestone:** Sending the same `conversation_id` twice produces coherent multi-turn context.

---

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Gemini daily cap hit during dev | Medium | OpenRouter fallback already designed in `provider.py` |
| Render cold start kills APScheduler | Low | In-process scheduler is fine for v1; 30s cold start is documented and acceptable |
| Qdrant Cloud free tier limits | Low | 1 GB vector storage is sufficient for v1 news volume |
| Supabase SSL connection | Low | Add `?sslmode=require` to `DATABASE_URL` |

---

## Build Order Rationale

Phases 1–3 unblock frontend integration fastest (bare chat works after Phase 3).  
Phases 4–6 add data richness and can be built independently of each other.  
Phase 7 is the final integration that assembles everything.  
Phase 8 is persistence polish.
