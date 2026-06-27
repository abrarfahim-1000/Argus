from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI

from app.config import settings


def get_llm():
    """OpenRouter is primary; Gemini is the fallback when no OpenRouter key is configured."""
    if settings.llm_provider == "openrouter" and settings.openrouter_api_key:
        return ChatOpenAI(
            model="nvidia/nemotron-3-super-120b-a12b:free",
            base_url="https://openrouter.ai/api/v1",
            api_key=settings.openrouter_api_key,
        )
    return ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=settings.google_api_key,
    )
