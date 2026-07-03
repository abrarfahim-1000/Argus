# Argus Render Deployment & Memory Optimization Notes

## Current Issue

Render Free instances provide **512 MB RAM**. The backend is being
terminated before it opens a listening port because it exceeds the
memory limit during startup.

Symptoms:

-   `No open ports detected`
-   `Out of memory (used over 512Mi)`

The issue is **not** caused by `$PORT`.

------------------------------------------------------------------------

# Root Cause

`embedder.py` loads the embedding model immediately at module import:

``` python
_model = SentenceTransformer("BAAI/bge-small-en-v1.5")
```

Since `retriever.py` imports `embedder.py`, and `main.py` imports
`ensure_collection()`, the model is loaded before FastAPI starts serving
requests.

Startup chain:

    main.py
     └── ensure_collection()
          └── retriever.py
               └── embedder.py
                    └── SentenceTransformer(...)

As a result, PyTorch + SentenceTransformers + the embedding model are
initialized before the server binds to the Render port.

------------------------------------------------------------------------

# Recommendation 1 (Highest Priority)

Lazy-load the embedding model.

Current:

``` python
_model = SentenceTransformer(...)
```

Recommended:

``` python
_model = None

def get_model():
    global _model
    if _model is None:
        _model = SentenceTransformer("BAAI/bge-small-en-v1.5")
    return _model
```

Then call `get_model()` inside `embed_texts()`.

Benefits:

-   Faster startup
-   Lower startup memory
-   Model loads only when actually needed

------------------------------------------------------------------------

# Recommendation 2

Avoid loading the embedding model during application startup.

`ensure_collection()` only needs Qdrant.

It should not indirectly import or initialize SentenceTransformers.

Separate responsibilities into modules such as:

    collection.py
    embedder.py
    retriever.py
    ingestion.py

This keeps startup lightweight.

------------------------------------------------------------------------

# Recommendation 3

Review the scheduler startup.

Current startup:

``` python
ensure_collection()
start_scheduler()
```

If the scheduler immediately:

-   downloads feeds
-   chunks articles
-   generates embeddings
-   uploads vectors

then memory usage spikes immediately after launch.

Possible improvements:

-   Delay first scheduled execution
-   Trigger ingestion after startup
-   Run ingestion in a separate worker

------------------------------------------------------------------------

# Recommendation 4

Long-term architecture

API Service

-   FastAPI
-   Chat endpoints
-   Search endpoints
-   Health endpoint

Background Worker

-   RSS ingestion
-   Embedding generation
-   Qdrant upserts

Advantages:

-   Smaller API memory footprint
-   Better scalability
-   Easier deployment

------------------------------------------------------------------------

# Recommendation 5

Deployment order

1.  Deploy Render backend
2.  Verify `/health`
3.  Deploy Vercel frontend
4.  Set `VITE_API_URL`
5.  Update CORS
6.  Redeploy backend

------------------------------------------------------------------------

# Render Configuration

Root Directory

    backend

Build Command

``` bash
pip install -r requirements.txt
```

Start Command

``` bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Do **not** add `PORT` as an environment variable.

Render supplies it automatically.

------------------------------------------------------------------------

# Future Improvements

-   Use Background Workers for ingestion.
-   Consider remote embedding APIs if memory remains constrained.
-   Keep the API process focused on serving requests instead of
    ingestion work.
-   Profile memory usage after lazy-loading to determine whether
    upgrading the Render instance is necessary.
