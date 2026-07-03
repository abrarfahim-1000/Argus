from app.rag import search


def search_articles(query: str, top_k: int = 8) -> list[dict]:
    return search(query, top_k=top_k)
