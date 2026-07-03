# Argus Render Deployment & Architecture Notes (Revised)

## Deployment Issue

Render Free (512 MB RAM) terminates the backend before it starts
listening because the process exceeds the memory limit during startup.

This is **not** caused by the `$PORT` variable.

------------------------------------------------------------------------

# Root Cause

The embedding model is loaded at import time:

``` python
_model = SentenceTransformer("BAAI/bge-small-en-v1.5")
```

Even with lazy loading, the service may still exceed the free-tier
memory limit the first time embeddings are generated.

------------------------------------------------------------------------

# Decision

**Do not run a local embedding model inside the API service.**

Instead, switch to an external embedding API.

Benefits:

-   No PyTorch dependency in memory
-   No SentenceTransformers runtime
-   Much lower RAM usage
-   Faster cold starts
-   Better suited for Render Free

------------------------------------------------------------------------

# Target Architecture

    Browser
        │
        ▼
    Vercel Frontend
        │
        ▼
    FastAPI API (Render)
        │
        ├── OpenRouter / Gemini (LLM)
        ├── Embedding API
        ├── Qdrant Cloud
        └── Supabase

Flow:

    User Query
        │
        ▼
    Embedding API
        │
    384-d vector
        │
        ▼
    Qdrant Search
        │
    Retrieved Context
        │
        ▼
    LLM

Document ingestion follows the same pattern:

    RSS Feed
        │
    Chunk Text
        │
    Embedding API
        │
    Qdrant Upsert

No local embedding model is required.

------------------------------------------------------------------------

# Code Changes

## Remove

-   `sentence-transformers`
-   Local `SentenceTransformer(...)` loading

## Replace

Create an embedding provider abstraction so the rest of the application
simply requests embeddings.

Example interface:

``` python
def embed_texts(texts: list[str]) -> list[list[float]]:
    ...
```

The implementation can call an external embedding API instead of a local
model.

This also makes future provider changes straightforward.

------------------------------------------------------------------------

# Deployment Checklist

## Backend (Render)

Root Directory

    backend

Build

``` bash
pip install -r requirements.txt
```

Start

``` bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Environment variables:

    LLM_PROVIDER
    OPENROUTER_API_KEY
    GOOGLE_API_KEY
    DATABASE_URL
    QDRANT_URL
    QDRANT_API_KEY
    ENVIRONMENT=production

Do not define `PORT`; Render injects it automatically.

------------------------------------------------------------------------

# Frontend (Vercel)

Environment:

    VITE_API_URL=https://<render-backend>.onrender.com

------------------------------------------------------------------------

# Future Improvements

-   Create a provider abstraction for both LLMs and embeddings.
-   Allow switching between local and hosted embedding providers via
    configuration.
-   If a dedicated worker is added later, it can reuse the same
    abstraction with minimal code changes.
-   Consider removing `sentence-transformers` from the API requirements
    entirely if all embeddings are generated remotely.

------------------------------------------------------------------------

# Final Decision

**Embedding generation will use a hosted embedding API rather than a
locally loaded SentenceTransformer model.**

This keeps the FastAPI service lightweight, reduces memory consumption,
simplifies deployment on Render Free, and leaves room for future
migration to local models if a larger deployment target is available.
