# Argus v1 — Project Scaffold & Source of Truth

> Living document. Direction over rules. Update as decisions evolve.

---

## 1. What We're Building

AI-powered financial intelligence chatbot. User asks a question ("why is the market down?"), system pulls live market data + recent news, retrieves relevant context via RAG, generates a cited explanation.

**Not** a trading tool. Not real-time tick data. Not financial advice.

---

## 2. Stack Decisions

### Frontend
| Tool | Role | Why |
|---|---|---|
| React | UI framework | Standard, easy to deploy |
| Vite | Build tool | Fast dev server, fast builds |
| Tailwind CSS | Styling | Utility-first, shadcn foundation |
| shadcn/ui | Component library | Owned components, not a black box — built on Radix UI + Tailwind |
| Radix UI | Primitives (via shadcn) | Accessible headless components |
| Lucide React | Icons | Ships with shadcn by default |
| Recharts | Market data charts | Lightweight, React-native, composable |
| Axios | HTTP client | Simple REST calls to FastAPI |

**shadcn components used:** `Card`, `ScrollArea`, `Input`, `Button`, `Badge`, `Separator`, `Skeleton`, `Tooltip`

**Deploy:** Vercel (free, zero config for React)

**Note:** shadcn/ui components are copied into `src/components/ui/` — you own and edit them directly. Not a node_modules dependency.

---

### Backend
| Tool | Role | Why |
|---|---|---|
| FastAPI | API server | Async, fast, auto-docs |
| LangGraph | Agent orchestration | Stateful multi-agent graphs |
| langchain-core | Prompt/chain abstractions | LLM-agnostic interfaces |
| langchain-google-genai | Gemini integration | Native LangChain support |
| Pydantic | Request/response validation | Built into FastAPI |
| python-dotenv | Secrets management | `.env` file loading |
| uvicorn | ASGI server | Runs FastAPI |

**Deploy:** Render (free tier, spins down after inactivity — acceptable for portfolio)

---

### LLM
| Provider | Role | Limits |
|---|---|---|
| Gemini 2.5 Flash | Primary LLM | ~1,500 RPD, 15 RPM, free, no card |
| OpenRouter (Llama 3.3 70B `:free`) | Fallback | 20 RPM, free, no card |

**Strategy:** Env var `LLM_PROVIDER` switches between them. Same LangChain interface — zero code change. Gemini primary, OpenRouter fallback when daily cap hits.

**Note:** Free tier Gemini prompts may be used for model training. Acceptable for portfolio/demo use.

---

### Market Data
| Tool | Role |
|---|---|
| yfinance | Stock, index, crypto, commodity prices |
| pandas | Data processing |
| pytz | Timezone handling (market hours) |

Assets tracked: SPY, QQQ, DJI, VIX, GC=F (Gold), SI=F (Silver), CL=F (Oil), BTC-USD, ETH-USD

---

### News Pipeline
| Tool | Role |
|---|---|
| feedparser | RSS feed ingestion |
| httpx | Async HTTP fetching |
| beautifulsoup4 | Article body parsing |
| APScheduler | Scheduled feed refresh (every 15 min) |

Sources: Reuters RSS, CNBC RSS, MarketWatch RSS, Yahoo Finance RSS

---

### RAG
| Tool | Role |
|---|---|
| sentence-transformers | Local embeddings (all-MiniLM-L6-v2) |
| qdrant-client | Vector DB client |
| tiktoken | Token-aware text chunking |

**Deploy:** Qdrant Cloud free tier (1GB, no card needed)

---

### Database
| Tool | Role |
|---|---|
| PostgreSQL | Article metadata, conversation history |
| SQLAlchemy | ORM |
| Alembic | Migrations |
| psycopg2-binary | Postgres driver |

**Deploy:** Supabase free tier (500MB, no card needed)

---

## 3. Folder Structure

```
argus/
├── frontend/                        # React app (Vite)
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                  # shadcn/ui owned components (auto-generated)
│   │   │   │   ├── button.jsx
│   │   │   │   ├── card.jsx
│   │   │   │   ├── input.jsx
│   │   │   │   ├── badge.jsx
│   │   │   │   ├── scroll-area.jsx
│   │   │   │   ├── skeleton.jsx
│   │   │   │   ├── separator.jsx
│   │   │   │   └── tooltip.jsx
│   │   │   ├── ChatWindow.jsx       # Main chat UI
│   │   │   ├── MessageBubble.jsx    # Individual message (user + assistant)
│   │   │   ├── SourceList.jsx       # Citation chips below answer
│   │   │   ├── MarketSnapshot.jsx   # Ticker strip (Recharts sparklines)
│   │   │   └── MarketCard.jsx       # Single asset card (price + % change)
│   │   ├── hooks/
│   │   │   └── useChat.js           # Chat state + API calls
│   │   ├── api/
│   │   │   └── argus.js             # Axios calls to backend
│   │   ├── lib/
│   │   │   └── utils.js             # shadcn cn() helper
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── components.json              # shadcn/ui config
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
│
├── backend/                         # FastAPI app
│   ├── app/
│   │   ├── main.py                  # FastAPI entry point
│   │   ├── config.py                # Settings, env vars
│   │   │
│   │   ├── api/                     # Route handlers
│   │   │   ├── chat.py              # POST /chat
│   │   │   ├── market.py            # GET /market/snapshot
│   │   │   └── health.py            # GET /health
│   │   │
│   │   ├── agents/                  # LangGraph agents
│   │   │   ├── graph.py             # LangGraph graph definition
│   │   │   ├── market_agent.py      # Fetches + analyzes market data
│   │   │   ├── news_agent.py        # Retrieves relevant news
│   │   │   ├── rag_agent.py         # Vector search + context assembly
│   │   │   └── reasoning_agent.py   # Final response + citations
│   │   │
│   │   ├── tools/                   # Agent tools
│   │   │   ├── market_tools.py      # yfinance wrappers
│   │   │   ├── news_tools.py        # RSS + article fetch
│   │   │   └── vector_tools.py      # Qdrant search
│   │   │
│   │   ├── pipeline/                # Background jobs
│   │   │   ├── scheduler.py         # APScheduler setup
│   │   │   └── news_ingestion.py    # Fetch → parse → embed → store
│   │   │
│   │   ├── db/                      # Database layer
│   │   │   ├── models.py            # SQLAlchemy models
│   │   │   ├── session.py           # DB session factory
│   │   │   └── crud.py              # DB operations
│   │   │
│   │   ├── rag/                     # RAG system
│   │   │   ├── embedder.py          # sentence-transformers wrapper
│   │   │   ├── chunker.py           # tiktoken chunking
│   │   │   └── retriever.py         # Qdrant search wrapper
│   │   │
│   │   └── llm/                     # LLM abstraction
│   │       ├── provider.py          # Gemini / OpenRouter switcher
│   │       └── prompts.py           # All prompt templates
│   │
│   ├── alembic/                     # DB migrations
│   ├── alembic.ini
│   ├── requirements.txt
│   └── .env.example
│
├── docker-compose.yml               # Local dev: Qdrant + Postgres
└── README.md
```

---

## 4. Data Flow

```
User query
    │
    ▼
POST /chat (FastAPI)
    │
    ▼
LangGraph Orchestrator
    │
    ├──► Market Agent        → yfinance → current prices, % changes
    │
    ├──► News Agent          → RAG retriever → top-k relevant articles
    │
    └──► Reasoning Agent     → LLM → cited explanation
    │
    ▼
Response { answer, sources, market_data }
    │
    ▼
Frontend renders answer + citations
```

---

## 5. API Contracts

### POST /chat
```json
Request:
{
  "message": "Why is the market down today?",
  "conversation_id": "uuid (optional)"
}

Response:
{
  "answer": "...",
  "sources": [
    { "title": "...", "url": "...", "source": "Reuters" }
  ],
  "market_snapshot": {
    "SPY": { "price": 512.3, "change_pct": -1.2 }
  },
  "conversation_id": "uuid"
}
```

### GET /market/snapshot
```json
Response:
{
  "SPY": { "price": 512.3, "change_pct": -1.2 },
  "QQQ": { "price": 430.1, "change_pct": -2.0 },
  "BTC-USD": { "price": 67000, "change_pct": 1.5 }
}
```

### GET /health
```json
{ "status": "ok", "llm_provider": "gemini" }
```

---

## 6. Database Schema

### articles
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| title | TEXT | |
| url | TEXT UNIQUE | Dedup key |
| source | TEXT | Reuters, CNBC, etc. |
| published_at | TIMESTAMP | |
| content | TEXT | Parsed article body |
| embedded | BOOLEAN | Whether vector stored |
| created_at | TIMESTAMP | |

### conversations
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| created_at | TIMESTAMP | |

### messages
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| conversation_id | UUID FK | |
| role | TEXT | user / assistant |
| content | TEXT | |
| sources | JSONB | Citations array |
| created_at | TIMESTAMP | |

---

## 7. LLM Provider Abstraction

`backend/app/llm/provider.py` exposes one function used everywhere:

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

Switch providers by changing one env var. No other code changes.

---

## 8. Environment Variables

```bash
# backend/.env

# LLM
LLM_PROVIDER=gemini                  # gemini | openrouter
GOOGLE_API_KEY=...
OPENROUTER_API_KEY=...               # fallback

# Database
DATABASE_URL=postgresql://...        # Supabase connection string

# Qdrant
QDRANT_URL=https://...qdrant.io
QDRANT_API_KEY=...

# App
ENVIRONMENT=development              # development | production
```

---

## 9. Phase Roadmap

| Phase | Goal | Key deliverable |
|---|---|---|
| 1 | Foundation | FastAPI + React chat works end-to-end with Gemini |
| 2 | Market data | Live prices in every response |
| 3 | News pipeline | RSS ingestion + background scheduler running |
| 4 | RAG | Embeddings in Qdrant, semantic retrieval working |
| 5 | Agents | LangGraph graph wiring all agents together |
| 6 | Deploy | Vercel + Render + Supabase + Qdrant Cloud live |

Each phase = shippable. Don't start phase N+1 until phase N works end-to-end.

---

## 10. Python Dependencies

```txt
# backend/requirements.txt

# Server
fastapi
uvicorn[standard]
pydantic
python-dotenv

# LLM + Agents
langchain-core
langchain-google-genai
langchain-openai
langgraph
google-generativeai

# Market Data
yfinance
pandas
pytz

# News Pipeline
feedparser
httpx
beautifulsoup4
apscheduler

# RAG
sentence-transformers
qdrant-client
tiktoken

# Database
sqlalchemy
alembic
psycopg2-binary
```

---

## 11. Frontend Dependencies

```bash
# Install shadcn/ui (run inside frontend/)
npx shadcn@latest init

# Add components as needed
npx shadcn@latest add button card input badge scroll-area skeleton separator tooltip
```

```json
// package.json key deps
{
  "dependencies": {
    "react": "^18",
    "react-dom": "^18",
    "axios": "^1",
    "recharts": "^2",
    "lucide-react": "latest",
    "class-variance-authority": "latest",
    "clsx": "latest",
    "tailwind-merge": "latest"
  },
  "devDependencies": {
    "vite": "^5",
    "@vitejs/plugin-react": "latest",
    "tailwindcss": "^3",
    "autoprefixer": "latest",
    "postcss": "latest"
  }
}
```

---

## 12. Key Constraints & Decisions

- **No auth in v1.** Public demo. Add in v2 if needed.
- **No streaming responses in v1.** Simple request/response. Add SSE in v2.
- **Embeddings run on Render server.** all-MiniLM-L6-v2 is small enough (~80MB). No separate embedding service.
- **News refresh every 15 min.** APScheduler inside FastAPI process. No Celery/Redis needed in v1.
- **No caching layer in v1.** Identical queries hit the LLM every time. Add Redis cache in v2.
- **Qdrant collection name:** `argus_articles`
- **Chunk size:** 512 tokens, 50 token overlap.
- **Top-k retrieval:** 5 articles per query.
- **Render free tier sleeps after 15 min inactivity.** First request after sleep is slow (~30s). Acceptable for portfolio.

---

## 13. What v2 Adds (Don't Build Now)

- Streaming responses (SSE)
- Redis caching
- Auth / user accounts
- Sentiment analysis agent
- Event extraction + driver ranking
- Historical market context
- Daily brief generator
- Portfolio watchlists

---

*Last updated: project scaffold. Revise any section as implementation reveals better paths.*
