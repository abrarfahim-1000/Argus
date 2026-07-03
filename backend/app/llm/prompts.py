from langchain_core.prompts import ChatPromptTemplate

SYSTEM_PROMPT = (
    "You are Argus, an AI-powered financial intelligence assistant. "
    "You provide clear, data-driven analysis of financial markets, economic events, "
    "and asset movements. Be concise and precise. "
    "If you don't have reliable information on something, say so."
)

reasoning_prompt = ChatPromptTemplate.from_messages(
    [
        ("system", SYSTEM_PROMPT),
        (
            "human",
            "MARKET SNAPSHOT:\n{market_context}\n\n"
            "RECENT HEADLINES:\n{news_context}\n\n"
            "RELEVANT ARTICLES:\n{rag_context}\n\n"
            "CONVERSATION HISTORY:\n{history_context}\n\n"
            "QUESTION: {question}\n\n"
            "Answer using the context above. Cite article titles when you rely on them.",
        ),
    ]
)
