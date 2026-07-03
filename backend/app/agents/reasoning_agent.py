from app.llm import get_llm, reasoning_prompt

from .state import ChatState


def _format_market(snapshot: dict[str, dict]) -> str:
    if not snapshot:
        return "No market data available."
    return "\n".join(
        f"  {label}: {data['price']:.2f} ({data['change_pct']:+.2f}%)"
        for label, data in snapshot.items()
    )


def _format_news(headlines: list[str]) -> str:
    if not headlines:
        return "No recent headlines."
    return "\n".join(f"  - {headline}" for headline in headlines)


def _format_history(history: list[dict]) -> str:
    if not history:
        return "No prior conversation."
    return "\n".join(f"  {turn['role']}: {turn['content']}" for turn in history)


def _format_rag(hits: list[dict]) -> str:
    if not hits:
        return "No relevant articles found."
    return "\n".join(
        f"  - {hit['payload']['title']} ({hit['payload']['source']})" for hit in hits
    )


def _dedup_sources(hits: list[dict]) -> list[dict]:
    seen: set[str] = set()
    sources = []
    for hit in hits:
        payload = hit["payload"]
        url = payload.get("url")
        if not url or url in seen:
            continue
        seen.add(url)
        sources.append(
            {"title": payload.get("title"), "url": url, "source": payload.get("source")}
        )
    return sources


async def reasoning_agent(state: ChatState) -> dict:
    llm = get_llm()
    chain = reasoning_prompt | llm
    result = await chain.ainvoke(
        {
            "question": state["question"],
            "market_context": _format_market(state["market_snapshot"]),
            "news_context": _format_news(state["news_headlines"]),
            "rag_context": _format_rag(state["rag_hits"]),
            "history_context": _format_history(state["conversation_history"]),
        }
    )
    return {"answer": result.content, "sources": _dedup_sources(state["rag_hits"])}
