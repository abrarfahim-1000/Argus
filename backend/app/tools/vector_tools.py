from app.rag.retriever import search


def search_articles(query: str, top_k: int = 5) -> list[dict]:
    return search(query, top_k=top_k)
