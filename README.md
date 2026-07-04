# Argus

Argus is an AI-powered financial intelligence assistant that explains market movements through a multi-agent LangGraph pipeline backed by live market data, financial news, retrieval-augmented generation (RAG), and LLM reasoning.

Ask it things like *"Why is the market down today?"* and it fans out across live yfinance quotes, recent financial news, and a Qdrant-backed news archive, then synthesizes a cited, conversational answer.

## Features

- **Multi-agent reasoning pipeline** (LangGraph) — market, news, RAG, and conversation-history agents run concurrently and converge on a reasoning agent that produces a cited answer.
- **Live market ticker** — intraday quotes (1-minute bars) for major indices, mega-cap stocks, crypto, metals, energy, and FX, refreshed hourly server-side and polled by the frontend every 30s.
- **RAG over financial news** — RSS feeds are ingested, chunked, embedded, and stored in Qdrant for semantic retrieval during reasoning.
- **Dynamic suggested prompts** — LLM-generated prompt cards refreshed hourly based on current market conditions.
- **Multi-turn conversations** — conversations and messages persist to Postgres, so a `conversation_id` carries context across turns.
- **Pluggable LLM provider** — switch between Gemini and OpenRouter via a single environment variable.

## Tech Stack

| Layer | Stack |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS 4, shadcn/ui (JSX) |
| Backend | Python, FastAPI, LangGraph, LangChain |
| Database | PostgreSQL (SQLAlchemy + Alembic) |
| Vector store | Qdrant |
| Market data | yfinance |
| News | RSS feeds via APScheduler |
| LLM | Google Gemini (primary) / OpenRouter (fallback) |

## Architecture

```
POST /chat
    │
    ▼
run_chat_graph() (app/agents/graph.py)
    │
    ├──▶ market_agent   — yfinance intraday snapshot
    ├──▶ news_agent     — recent headlines from Postgres
    ├──▶ rag_agent      — Qdrant semantic search over ingested articles
    ├──▶ history_agent  — last 10 messages for this conversation
    │        │
    │        ▼ (fan-in)
    └──▶ reasoning_agent — LLM call → answer + deduped sources
    │
    ▼
{ answer, sources, market_snapshot, conversation_id }
```

The four context agents run concurrently in a single LangGraph superstep since each writes a disjoint piece of shared state. News is ingested from RSS feeds every 60 minutes, embedded remotely via OpenRouter, and upserted into Qdrant. A second hourly job (offset 15 minutes) refreshes the market snapshot and suggestion cards and caches both in Postgres so `/market/snapshot` and `/suggestions` serve pre-computed data.

## Project Structure

```
Argus/
├── frontend/     # React 19 + Vite + Tailwind SPA
├── backend/      # FastAPI + LangGraph service
├── docs/         # Phase plan and RAG pipeline notes
└── docker-compose.yml
```

See `CLAUDE.md` for a detailed file-by-file breakdown of both `frontend/` and `backend/`.

## Getting Started

### Backend

```bash
cd backend
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux

pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload   # http://localhost:8000
```

Create `backend/.env` (see `backend/.env.example`) with:

```bash
LLM_PROVIDER=gemini              # gemini | openrouter
GOOGLE_API_KEY=...
OPENROUTER_API_KEY=...

DATABASE_URL=postgresql://...
QDRANT_URL=https://...qdrant.io
QDRANT_API_KEY=...

ENVIRONMENT=development
```

### Frontend

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
```

## API Overview

| Endpoint | Description |
|---|---|
| `POST /chat` | Runs the LangGraph pipeline and returns a cited answer, sources, market snapshot, and conversation id |
| `GET /market/snapshot` | Cached intraday prices and % change for all tracked assets |
| `GET /suggestions` | Cached LLM-generated suggested prompt cards |
| `GET /health` | Health check, reports the active LLM provider |

Full request/response contracts are documented in `CLAUDE.md`.

## Deployment

- Frontend → Vercel
- Backend → Render (free tier; sleeps after inactivity)
- Database → Supabase (PostgreSQL, free tier)
- Vector store → Qdrant Cloud (free tier)

## Documentation

- `CLAUDE.md` — architecture, conventions, and guidance for working in this codebase with Claude Code
- `docs/BACKEND_PHASES.md` — backend phase plan and status
- `docs/RAG_ISSUES.md` — issues encountered building the RAG pipeline
