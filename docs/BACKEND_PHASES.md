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

## Phase 6 — RAG (Qdrant) `pending`

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

## Phase 7 — LangGraph Orchestration `pending`

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

## Phase 8 — Conversation Persistence `pending`

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
