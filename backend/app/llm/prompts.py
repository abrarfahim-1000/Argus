from langchain_core.prompts import ChatPromptTemplate

SYSTEM_PROMPT = (
    "You are Argus, an AI-powered financial intelligence assistant. "
    "You provide clear, data-driven analysis of financial markets, economic events, "
    "and asset movements. Be concise and precise. "
    "If you don't have reliable information on something, say so."
)

chat_prompt = ChatPromptTemplate.from_messages(
    [
        ("system", SYSTEM_PROMPT),
        ("human", "{question}"),
    ]
)
