# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Argus** is an AI-powered financial intelligence assistant that explains market movements through a multi-agent LangGraph pipeline backed by live market data (yfinance), financial news (RSS feeds), RAG over Qdrant, and LLM reasoning (Gemini primary / OpenRouter fallback).

The repo is a monorepo:

| Directory | Stack |
|---|---|
| `frontend/` | React 19, Vite 8, Tailwind CSS 4, shadcn/ui (JSX, not TSX) |
| `backend/` | Python / FastAPI, LangGraph, LangChain, SQLAlchemy + Alembic, Qdrant |

**Current state:** All 9 backend phases are complete. `/chat` runs a LangGraph pipeline — `market_agent`, `news_agent`, and `rag_agent` fan out concurrently from `START`, `history_agent` joins them with the conversation's prior turns, and all four converge on `reasoning_agent`, which calls the LLM and returns a cited answer. The backend serves `/health`, `/chat`, `/market/snapshot`, and `/suggestions`; the frontend polls market data every 30 s, renders the live ticker, and loads dynamic LLM-generated prompt cards on startup. News is ingested from RSS feeds every 15 min via APScheduler (some feeds are currently dead — see `docs/RAG_ISSUES.md`), with unembedded articles chunked, embedded (`BAAI/bge-small-en-v1.5`), and upserted into Qdrant (`argus_articles`) on every ingestion run. Conversations and messages persist to Postgres, so repeated `conversation_id`s produce coherent multi-turn context.

See `docs/BACKEND_PHASES.md` for the full phase plan and statuses, and `docs/RAG_ISSUES.md` for issues hit building the RAG pipeline.

---

## GateGuard Fact-Forcing Gate

This repo has a `pre:edit-write:gateguard-fact-force` / `pre:bash:gateguard-fact-force` hook active. Before the **first** `Edit`, `Write`, or `Bash` call in a session (and again whenever it fires), it blocks the call and requires these facts to be stated in the same turn, *before* retrying the identical tool call:

1. The file(s)/line(s) that call or depend on the file being touched (or, for Bash, what the command verifies/produces).
2. Confirmation that no existing file already serves the same purpose (cite a prior Glob/Grep/Read, or run one first).
3. Field names/structure/date format if the change touches a data file (use synthetic values, not real data).
4. The user's current instruction, quoted verbatim.

**To avoid repeated blocks:** state these four facts proactively as plain text immediately before each `Edit`/`Write`/first `Bash` call — don't wait for the gate to reject the call first. Keep it to 1–4 short sentences; it does not need its own heading. This is a per-file, per-tool-type gate (it tracks "first Edit of file X", "first Write of file Y", "first Bash this session"), so later edits to a file already touched this session typically don't refire it.

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

None currently planned — Phases 7–9 (RAG, LangGraph orchestration, conversation persistence) were backend-only; `useChat.js` already sends/receives `conversation_id` so multi-turn context works with no frontend changes.

### Backend — Current File Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI entry point, CORS, lifespan hooks, logging config
│   ├── config.py            # pydantic-settings reading .env
│   ├── agents/
│   │   ├── __init__.py       # exports run_chat_graph
│   │   ├── state.py          # ChatState TypedDict shared by all nodes
│   │   ├── market_agent.py   # wraps tools.fetch_snapshot()
│   │   ├── news_agent.py     # wraps crud.get_recent_articles() (recent DB headlines)
│   │   ├── rag_agent.py      # wraps vector_tools.search_articles()
│   │   ├── history_agent.py  # wraps crud.get_history() via RunnableConfig
│   │   ├── reasoning_agent.py # prompt assembly + LLM call + source dedup
│   │   └── graph.py          # build_graph() + compiled singleton + run_chat_graph()
│   ├── api/
│   │   ├── __init__.py
│   │   ├── health.py        # GET /health
│   │   ├── chat.py          # POST /chat — runs run_chat_graph(), persists messages
│   │   ├── market.py        # GET /market/snapshot
│   │   └── suggestions.py   # GET /suggestions — 4 dynamic prompt cards, 15-min TTL cache
│   ├── db/
│   │   ├── __init__.py
│   │   ├── models.py        # Article, Conversation, Message (SQLAlchemy)
│   │   ├── session.py       # get_db FastAPI dependency
│   │   └── crud.py          # insert/query helpers, incl. get_recent_articles(), get_history()
│   ├── llm/
│   │   ├── __init__.py
│   │   ├── provider.py      # get_llm() — Gemini | OpenRouter switcher
│   │   ├── prompts.py       # prompt templates, incl. reasoning_prompt
│   │   └── suggestions.py   # prompt builder + LLM call + Pydantic validation
│   ├── pipeline/
│   │   ├── __init__.py
│   │   ├── news_ingestion.py  # fetch → dedup by URL → store → chunk/embed/upsert to Qdrant
│   │   └── scheduler.py       # APScheduler (15-min interval), wired into lifespan
│   ├── rag/
│   │   ├── __init__.py
│   │   ├── chunker.py        # chunk_text() — tiktoken sliding window (512 tokens, 50 overlap)
│   │   ├── embedder.py       # embed_texts() — SentenceTransformer("BAAI/bge-small-en-v1.5") singleton
│   │   └── retriever.py      # ensure_collection() / upsert_chunks() / search() — Qdrant client
│   └── tools/
│       ├── __init__.py
│       ├── market_tools.py  # fetch_snapshot() — intraday yfinance (1 m bars)
│       ├── news_tools.py    # parse_feeds() — RSS parser + HTML body fetch fallback
│       └── vector_tools.py  # search_articles() — used by app/agents/rag_agent.py
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
run_chat_graph() (app/agents/graph.py)
    │
    ├──▶ market_agent   — yfinance intraday snapshot (asyncio.to_thread)
    ├──▶ news_agent     — last 8 headlines already in the articles table
    ├──▶ rag_agent      — Qdrant semantic search, collection: "argus_articles"
    ├──▶ history_agent  — last 10 messages for this conversation_id
    │        │
    │        ▼ (fan-in)
    └──▶ reasoning_agent — LLM call → answer + deduped RAG sources
    │
    ▼
{ answer, sources, market_snapshot, conversation_id }
```

The four context nodes run concurrently (LangGraph superstep) since each writes a disjoint `ChatState` key. `app/api/chat.py` persists the user + assistant messages via `crud.append_message` *after* the graph call returns, so `history_agent` never reads the in-flight turn.

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

Tracked assets (see `TICKERS` in `app/tools/market_tools.py`): S&P 500 (`SPY`), Nasdaq-100 (`QQQ`), Dow Jones (`^DJI`), Russell (`IWM`), Fear Gauge/VIX (`^VIX`), Treasuries (`TLT`), Nvidia (`NVDA`), Microsoft (`MSFT`), Apple (`AAPL`), Meta (`META`), Google (`GOOGL`), Amazon (`AMZN`), Tesla (`TSLA`), SpaceX (`SPCX`), JPMorgan (`JPM`), Intel (`INTC`), Bitcoin (`BTC-USD`), Ethereum (`ETH-USD`), Gold (`GC=F`), Silver (`SI=F`), WTI Crude (`CL=F`), Brent Crude (`BZ=F`), USD (`DX-Y.NYB`), N225 (`^N225`), FTSE (`^FTSE`), DAX (`^GDAXI`)

**GET /suggestions** — returns 4 LLM-generated prompt cards (15-min server-side cache):
```json
[{ "icon": "TrendingDown", "title": "...", "desc": "..." }]
```

**GET /health** — `{ "status": "ok", "llm_provider": "openrouter" }` (`llm_provider` reflects whichever provider `get_llm()` actually selected, per `LLM_PROVIDER` env var)

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
- Embeddings run on the server — BAAI/bge-small-en-v1.5 (384-dim, ~130 MB) is small enough; no separate embedding service.
- Qdrant collection name: `argus_articles`. Chunk size: 512 tokens, 50-token overlap. Top-k retrieval: 5 articles.
- Deploy targets: Vercel (frontend), Render free tier (backend — sleeps after 15 min inactivity, ~30s cold start is acceptable), Supabase free tier (PostgreSQL), Qdrant Cloud free tier.

## Conventions

- Frontend uses **JSX** (not TSX) — no TypeScript.
- Tailwind 4 with CSS variables for theming; tokens defined in `frontend/src/index.css`.
- shadcn `components.json`: `style: "radix-nova"`, `baseColor: "neutral"`, `@` alias — keep consistent when adding components.
- `backend/.venv` is in the repo directory but excluded from git.
