# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Argus** is an AI-powered financial intelligence assistant that explains market movements through a multi-agent LangGraph pipeline backed by live market data (yfinance), financial news (RSS feeds), RAG over Qdrant, and LLM reasoning (Gemini primary / OpenRouter fallback).

The repo is a monorepo:

| Directory | Stack |
|---|---|
| `frontend/` | React 19, Vite 8, Tailwind CSS 4, shadcn/ui (JSX, not TSX) |
| `backend/` | Python / FastAPI, LangGraph, LangChain, SQLAlchemy + Alembic, Qdrant |

**Current state:** The landing page (`frontend/src/LandingPage.jsx`) is complete. The backend source has not been scaffolded yet — only `requirements.txt` exists. The next milestone is Phase 1: wiring FastAPI + React chat end-to-end with Gemini.

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

# Entry point (once app/ is scaffolded):
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

- **Entry**: `frontend/src/main.jsx` → `App.jsx` → `LandingPage.jsx`
- `App.jsx` is a thin shell; add new page components here as routes are introduced.
- Shadcn components live in `frontend/src/components/ui/` — generated, not hand-written. Edit them directly when customization is needed.
- `@` alias → `frontend/src/` (set in `vite.config.js` and `jsconfig.json`).
- `frontend/src/lib/utils.js` exports the `cn()` helper (clsx + tailwind-merge).

**Components planned for Phase 1 (not yet built):**

| File | Purpose |
|---|---|
| `src/components/ChatWindow.jsx` | Main chat UI |
| `src/components/MessageBubble.jsx` | Individual user / assistant message |
| `src/components/SourceList.jsx` | Citation chips below each answer |
| `src/components/MarketSnapshot.jsx` | Ticker strip with Recharts sparklines |
| `src/components/MarketCard.jsx` | Single asset card (price + % change) |
| `src/hooks/useChat.js` | Chat state + API calls |
| `src/api/argus.js` | Axios wrappers for FastAPI endpoints |

### Backend — Planned Folder Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI entry point
│   ├── config.py            # Settings, env vars (pydantic-settings)
│   ├── api/
│   │   ├── chat.py          # POST /chat
│   │   ├── market.py        # GET /market/snapshot
│   │   └── health.py        # GET /health
│   ├── agents/
│   │   ├── graph.py         # LangGraph graph definition (wires all agents)
│   │   ├── market_agent.py
│   │   ├── news_agent.py
│   │   ├── rag_agent.py
│   │   └── reasoning_agent.py
│   ├── tools/
│   │   ├── market_tools.py  # yfinance wrappers
│   │   ├── news_tools.py    # RSS + article fetch
│   │   └── vector_tools.py  # Qdrant search
│   ├── pipeline/
│   │   ├── scheduler.py     # APScheduler (news refresh every 15 min)
│   │   └── news_ingestion.py # fetch → parse → embed → store
│   ├── db/
│   │   ├── models.py        # SQLAlchemy models
│   │   ├── session.py       # DB session factory
│   │   └── crud.py
│   ├── rag/
│   │   ├── embedder.py      # sentence-transformers (all-MiniLM-L6-v2)
│   │   ├── chunker.py       # tiktoken chunking (512 tokens, 50 overlap)
│   │   └── retriever.py     # Qdrant search (top-k = 5)
│   └── llm/
│       ├── provider.py      # Gemini / OpenRouter switcher via LLM_PROVIDER env var
│       └── prompts.py       # All prompt templates
├── alembic/
├── alembic.ini
├── requirements.txt
└── .env.example
```

### LangGraph Agent Pipeline

```
POST /chat
    │
    ▼
LangGraph Orchestrator (graph.py)
    │
    ├──▶ Market Agent    — yfinance: SPY, QQQ, DJI, VIX, GC=F, SI=F, CL=F, BTC-USD, ETH-USD
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
            model="meta-llama/llama-3.3-70b-instruct:free",
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

**GET /market/snapshot** — returns prices + `change_pct` for all tracked assets.

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
OPENROUTER_API_KEY=...           # fallback when Gemini daily cap hits

DATABASE_URL=postgresql://...    # Supabase free tier
QDRANT_URL=https://...qdrant.io  # Qdrant Cloud free tier
QDRANT_API_KEY=...

ENVIRONMENT=development          # development | production
```

---

## Key Constraints (v1)

- No auth, no streaming responses, no Redis cache — all deferred to v2.
- News refresh runs every 15 min via APScheduler inside the FastAPI process (no Celery/Redis needed).
- Embeddings run on the server — all-MiniLM-L6-v2 (~80 MB) is small enough; no separate embedding service.
- Qdrant collection name: `argus_articles`. Chunk size: 512 tokens, 50-token overlap. Top-k retrieval: 5 articles.
- Deploy targets: Vercel (frontend), Render free tier (backend — sleeps after 15 min inactivity, ~30s cold start is acceptable), Supabase free tier (PostgreSQL), Qdrant Cloud free tier.

## Conventions

- Frontend uses **JSX** (not TSX) — no TypeScript.
- Tailwind 4 with CSS variables for theming; tokens defined in `frontend/src/index.css`.
- shadcn `components.json`: `style: "radix-nova"`, `baseColor: "neutral"`, `@` alias — keep consistent when adding components.
- `backend/.venv` is in the repo directory but excluded from git.
