from langchain_openai import OpenAIEmbeddings

from app.config import settings

_embeddings: OpenAIEmbeddings | None = None


def _get_embeddings() -> OpenAIEmbeddings:
    global _embeddings
    if _embeddings is None:
        _embeddings = OpenAIEmbeddings(
            model="nvidia/llama-nemotron-embed-vl-1b-v2:free",
            base_url="https://openrouter.ai/api/v1",
            api_key=settings.openrouter_api_key,
            check_embedding_ctx_length=False,
            encoding_format="float",
            dimensions=384,
        )
    return _embeddings


def embed_texts(texts: list[str]) -> list[list[float]]:
    return _get_embeddings().embed_documents(texts)
