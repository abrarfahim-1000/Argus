import uuid

from langgraph.graph import END, START, StateGraph
from sqlalchemy.orm import Session

from .history_agent import history_agent
from .market_agent import market_agent
from .news_agent import news_agent
from .rag_agent import rag_agent
from .reasoning_agent import reasoning_agent
from .state import ChatState


def build_graph():
    graph = StateGraph(ChatState)
    graph.add_node("market_agent", market_agent)
    graph.add_node("news_agent", news_agent)
    graph.add_node("rag_agent", rag_agent)
    graph.add_node("history_agent", history_agent)
    graph.add_node("reasoning_agent", reasoning_agent)

    graph.add_edge(START, "market_agent")
    graph.add_edge(START, "news_agent")
    graph.add_edge(START, "rag_agent")
    graph.add_edge(START, "history_agent")
    graph.add_edge("market_agent", "reasoning_agent")
    graph.add_edge("news_agent", "reasoning_agent")
    graph.add_edge("rag_agent", "reasoning_agent")
    graph.add_edge("history_agent", "reasoning_agent")
    graph.add_edge("reasoning_agent", END)
    return graph


_compiled_graph = build_graph().compile()


async def run_chat_graph(question: str, db: Session, conversation_id: uuid.UUID) -> ChatState:
    initial_state: ChatState = {
        "question": question,
        "conversation_id": conversation_id,
        "market_snapshot": {},
        "news_headlines": [],
        "rag_hits": [],
        "conversation_history": [],
        "answer": "",
        "sources": [],
    }
    return await _compiled_graph.ainvoke(
        initial_state, config={"configurable": {"db": db}}
    )
