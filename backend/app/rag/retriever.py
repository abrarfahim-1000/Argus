import uuid

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams

from app.config import settings

from .embedder import embed_texts

COLLECTION_NAME = "argus_articles"
VECTOR_SIZE = 384

_client = QdrantClient(url=settings.qdrant_url, api_key=settings.qdrant_api_key)


def ensure_collection() -> None:
    if not _client.collection_exists(COLLECTION_NAME):
        _client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
        )


def upsert_chunks(article_id: str, title: str, url: str, source: str, chunks: list[str]) -> None:
    vectors = embed_texts(chunks)
    points = [
        PointStruct(
            id=str(uuid.uuid4()),
            vector=vector,
            payload={
                "article_id": article_id,
                "title": title,
                "url": url,
                "source": source,
                "chunk_text": chunk,
            },
        )
        for chunk, vector in zip(chunks, vectors)
    ]
    _client.upsert(collection_name=COLLECTION_NAME, points=points)


def search(query: str, top_k: int = 5) -> list[dict]:
    query_vector = embed_texts([query])[0]
    hits = _client.query_points(
        collection_name=COLLECTION_NAME, query=query_vector, limit=top_k
    ).points
    return [{"payload": hit.payload, "score": hit.score} for hit in hits]
