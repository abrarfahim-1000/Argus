# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Argus** is an AI-powered financial intelligence assistant that explains market movements through a multi-agent LangGraph pipeline backed by live market data (yfinance), financial news (RSS feeds), RAG over Qdrant, and LLM reasoning (Gemini primary / OpenRouter fallback).

The repo is a monorepo:

| Directory | Stack |
|---|---|
| `frontend/` | React 19, Vite 8, Tailwind CSS 4, shadcn/ui (JSX, not TSX) |
| `backend/` | Python / FastAPI, LangGraph, LangChain, SQLAlchemy + Alembic, Qdrant |

**Current state:** Phases 1–6 are complete. The chat UI is live end-to-end: the backend serves `/health`, `/chat`, `/market/snapshot`, and `/suggestions`; the frontend polls market data every 30 s, renders the live ticker, and loads dynamic LLM-generated prompt cards on startup. News is ingested from four RSS feeds every 15 min via APScheduler. Next milestone is Phase 7: RAG pipeline (Qdrant embeddings).

See `docs/BACKEND_PHASES.md` for the full phase plan and statuses.

---

## Development Commands

### Frontend

```bash
cd frontend
npm install          # first-time setup
npm run dev          # dev server at http://localhost:5173
npm run build        # production build → frontend/dist/
npm run lint         # ESLint
npm run preview      # preview production build locally
```

**Adding shadcn components** (run from `frontend/`):
```bash
npx shadcn add <component-name>
```

The root `package.json` only contains `shadcn` as a dev dependency — all real app dependencies live in `frontend/package.json`.

### Backend

The `.venv` is already present at `backend/.venv/`.

```bash
cd backend
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux

pip install -r requirements.txt

uvicorn app.main:app --reload   # http://localhost:8000
```

Database migrations (Alembic):
```bash
alembic revision --autogenerate -m "description"
alembic upgrade head
```

---

## Architecture

### Frontend — Current State

```
frontend/src/
├── api/
│   └── argus.js             # fetch wrappers for all FastAPI endpoints
├── components/
│   └── ui/                  # shadcn components (badge, button, card, …)
├── hooks/
│   ├── useChat.js           # chat state + POST /chat
│   ├── useMarketTicker.js   # polls GET /market/snapshot every 30 s
│   └── useSuggestions.js    # fetches GET /suggestions on mount; falls back to static
├── pages/
│   └── ChatPage.jsx         # full chat UI: ticker, nav, suggestions, messages, input
├── LandingPage.jsx          # marketing landing page (complete)
├── App.jsx                  # thin router shell
└── lib/utils.js             # cn() helper (clsx + tailwind-merge)
```

- `@` alias → `frontend/src/` (set in `vite.config.js` and `jsconfig.json`).
- Shadcn components live in `frontend/src/components/ui/` — generated, not hand-written. Edit them directly when customization is needed.
- Tailwind 4 with CSS variables for theming; tokens defined in `frontend/src/index.css`.
- shadcn `components.json`: `style: "radix-nova"`, `baseColor: "neutral"`, `@` alias — keep consistent when adding components.

**Planned frontend additions:**

None for Phases 7–9 — all remaining work is backend-only.

### Backend — Current File Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI entry point, CORS, lifespan hooks, logging config
│   ├── config.py            # pydantic-settings reading .env
│   ├── api/
│   │   ├── __init__.py
│   │   ├── health.py        # GET /health
│   │   ├── chat.py          # POST /chat
│   │   ├── market.py        # GET /market/snapshot
│   │   └── suggestions.py   # GET /suggestions — 4 dynamic prompt cards, 15-min TTL cache
│   ├── db/
│   │   ├── __init__.py
│   │   ├── models.py        # Article, Conversation, Message (SQLAlchemy)
│   │   ├── session.py       # get_db FastAPI dependency
│   │   └── crud.py          # insert/query helpers
│   ├── llm/
│   │   ├── __init__.py
│   │   ├── provider.py      # get_llm() — Gemini | OpenRouter switcher
│   │   ├── prompts.py       # prompt templates
│   │   └── suggestions.py   # prompt builder + LLM call + Pydantic validation
│   ├── pipeline/
│   │   ├── __init__.py
│   │   ├── news_ingestion.py  # fetch → deduplicate by URL → store to articles table
│   │   └── scheduler.py       # APScheduler (15-min interval), wired into lifespan
│   └── tools/
│       ├── __init__.py
│       ├── market_tools.py  # fetch_snapshot() — intraday yfinance (1 m bars)
│       └── news_tools.py    # parse_feeds() — RSS parser for 4 sources
├── alembic/
├── alembic.ini
├── requirements.txt
└── .env.example
```

**Planned backend additions (Phases 7–9):**

| File | Phase | Purpose |
|---|---|---|
| `app/rag/embedder.py` | 7 | sentence-transformers batch embed |
| `app/rag/chunker.py` | 7 | tiktoken chunking (512 tokens, 50 overlap) |
| `app/rag/retriever.py` | 7 | Qdrant top-k search |
| `app/tools/vector_tools.py` | 7 | Search wrapper for agents |
| `app/agents/rag_agent.py` | 7 | RAG agent stub |
| `app/agents/graph.py` | 8 | LangGraph graph definition |
| `app/agents/market_agent.py` | 8 | Market agent |
| `app/agents/reasoning_agent.py` | 8 | LLM synthesis with citations |

### LangGraph Agent Pipeline (Phase 8 target)

```
POST /chat
    │
    ▼
LangGraph Orchestrator (graph.py)
    │
    ├──▶ Market Agent    — yfinance intraday snapshot
    ├──▶ News Agent      — RSS: Reuters, CNBC, MarketWatch, Yahoo Finance
    ├──▶ RAG Agent       — Qdrant semantic search, collection: "argus_articles"
    └──▶ Reasoning Agent — LLM → cited explanation
    │
    ▼
{ answer, sources, market_snapshot, conversation_id }
```

### LLM Provider Abstraction

`app/llm/provider.py` exposes a single `get_llm()` used everywhere. Switch providers via `LLM_PROVIDER` env var — no other code changes:

```python
def get_llm():
    provider = os.getenv("LLM_PROVIDER", "gemini")
    if provider == "gemini":
        return ChatGoogleGenerativeAI(model="gemini-2.5-flash")
    elif provider == "openrouter":
        return ChatOpenAI(
            model="nvidia/nemotron-3-super-120b-a12b:free",
            base_url="https://openrouter.ai/api/v1",
            api_key=os.getenv("OPENROUTER_API_KEY"),
        )
```

### API Contracts

**POST /chat**
```json
// Request
{ "message": "Why is the market down today?", "conversation_id": "uuid (optional)" }

// Response
{
  "answer": "...",
  "sources": [{ "title": "...", "url": "...", "source": "Reuters" }],
  "market_snapshot": { "SPY": { "price": 512.3, "change_pct": -1.2 } },
  "conversation_id": "uuid"
}
```

**GET /market/snapshot** — returns intraday prices + `change_pct` for all tracked assets.

Tracked assets: `SPY`, `QQQ`, `NVDA`, `MSFT`, `AAPL`, `META`, `INTC`, `VIX`, `BTC`, `GC=F`, `ETH`, `DJI`, `CL=F`

**GET /suggestions** — returns 4 LLM-generated prompt cards (15-min server-side cache):
```json
[{ "icon": "TrendingDown", "title": "...", "desc": "..." }]
```

**GET /health** — `{ "status": "ok", "llm_provider": "gemini" }`

### Database Schema

**articles** — `id` (UUID PK), `title`, `url` (UNIQUE — dedup key), `source`, `published_at`, `content`, `embedded` (bool), `created_at`

**conversations** — `id` (UUID PK), `created_at`

**messages** — `id` (UUID PK), `conversation_id` (FK), `role` (user/assistant), `content`, `sources` (JSONB), `created_at`

---

## Environment Variables (`backend/.env`)

```bash
LLM_PROVIDER=gemini              # gemini | openrouter
GOOGLE_API_KEY=...
OPENROUTER_API_KEY=...           # fallback when Gemini daily cap hits; also used for /suggestions

DATABASE_URL=postgresql://...    # Supabase free tier
QDRANT_URL=https://...qdrant.io  # Qdrant Cloud free tier
QDRANT_API_KEY=...

ENVIRONMENT=development          # development | production
```

---

## Key Constraints (v1)

- No auth, no streaming responses, no Redis cache — all deferred to v2.
- News refresh runs every 15 min via APScheduler inside the FastAPI process (no Celery/Redis needed).
- Market ticker uses intraday yfinance data: `period="1d", interval="1m"`, comparing the last two 1-minute bars for `change_pct`.
- Embeddings run on the server — all-MiniLM-L6-v2 (~80 MB) is small enough; no separate embedding service.
- Qdrant collection name: `argus_articles`. Chunk size: 512 tokens, 50-token overlap. Top-k retrieval: 5 articles.
- Deploy targets: Vercel (frontend), Render free tier (backend — sleeps after 15 min inactivity, ~30s cold start is acceptable), Supabase free tier (PostgreSQL), Qdrant Cloud free tier.

## Conventions

- Frontend uses **JSX** (not TSX) — no TypeScript.
- Tailwind 4 with CSS variables for theming; tokens defined in `frontend/src/index.css`.
- shadcn `components.json`: `style: "radix-nova"`, `baseColor: "neutral"`, `@` alias — keep consistent when adding components.
- `backend/.venv` is in the repo directory but excluded from git.
