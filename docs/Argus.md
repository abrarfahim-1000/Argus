# Argus: AI-Powered Financial Intelligence Assistant

## Problem Statement

Financial markets are influenced by a complex combination of economic indicators, geopolitical events, corporate earnings, central bank decisions, investor sentiment, and breaking news. While vast amounts of financial information are available online, investors, students, researchers, and market enthusiasts often struggle to determine which events are actually responsible for market movements.

Traditional financial news platforms provide articles and data, but they rarely connect market behavior with underlying causes in a structured and explainable manner. Users must manually gather information from multiple sources, compare market data with news events, and form their own conclusions regarding market trends.

At the same time, large language models can summarize information but frequently lack access to current market data, reliable news sources, and structured reasoning mechanisms. As a result, they may provide incomplete, outdated, or unsupported explanations.

This project aims to address these challenges by developing an AI-powered financial intelligence platform capable of retrieving live market data, gathering relevant financial news, analyzing potential causes of market movements, and generating source-backed explanations through a conversational interface.

The system will function as an intelligent financial analyst that combines Retrieval-Augmented Generation (RAG), market data analysis, event extraction, and LLM-based reasoning to help users understand what is happening in financial markets and why.

---

# Project Objectives

The primary objectives of the project are:

1. Provide a conversational interface for financial market analysis.
2. Retrieve and analyze real-time or near-real-time market data.
3. Collect and process financial news from multiple sources.
4. Identify events likely responsible for market movements.
5. Generate explainable, source-backed responses.
6. Build a modular multi-agent architecture capable of future expansion.
7. Demonstrate practical applications of RAG, agentic AI, and financial data analysis.

---

# Target Users

* Students learning financial markets
* Retail investors
* Financial researchers
* Data science enthusiasts
* AI and machine learning practitioners
* Anyone interested in understanding market behavior

---

# Example Use Cases

## Use Case 1: Market Downtrend Analysis

### User Query

> Why is the market down today?

### System Workflow

1. Retrieve current market indicators.
2. Determine whether major indices are declining.
3. Retrieve recent market-related news.
4. Identify significant economic or geopolitical events.
5. Rank likely causes.
6. Generate explanation with citations.

### Example Response

> The market is experiencing a decline primarily due to stronger-than-expected inflation data and rising Treasury yields. Investors are concerned that the Federal Reserve may maintain higher interest rates for longer than previously expected. Technology stocks have been particularly affected due to their sensitivity to interest rate changes.

Sources:

* Reuters
* CNBC
* Financial Times

---

## Use Case 2: Asset-Specific Analysis

### User Query

> Why is Nvidia falling today?

### System Workflow

1. Retrieve Nvidia stock data.
2. Analyze recent price movement.
3. Retrieve Nvidia-related news.
4. Evaluate earnings reports, analyst ratings, and industry developments.
5. Generate explanation.

---

## Use Case 3: Cryptocurrency Analysis

### User Query

> Why is Bitcoin rising this week?

### System Workflow

1. Retrieve Bitcoin price data.
2. Retrieve crypto-specific news.
3. Analyze sentiment.
4. Explain potential drivers.

---

## Use Case 4: Weekly Market Brief

### User Query

> What should I watch this week?

### System Workflow

1. Retrieve upcoming economic events.
2. Retrieve earnings calendar.
3. Retrieve major geopolitical developments.
4. Generate summary of key risks and opportunities.

---

# Proposed Features

## Core Features

### Conversational Financial Assistant

Natural language interface allowing users to ask financial questions.

### Market Snapshot Tool

Provides current information on:

* S&P 500
* Nasdaq
* Dow Jones
* VIX
* Gold
* Silver
* Oil
* Bitcoin
* Ethereum

### News Retrieval System

Collects articles from financial news sources and RSS feeds.

### Retrieval-Augmented Generation (RAG)

Retrieves relevant news articles and market information before generating responses.

### Source Citation

Every explanation must contain references to supporting sources.

---

## Advanced Features

### Event Extraction

Automatically identifies:

* Federal Reserve announcements
* Inflation reports
* Earnings releases
* Geopolitical developments
* Regulatory changes

### Sentiment Analysis

Determines whether market sentiment is:

* Bullish
* Bearish
* Neutral

### Market Driver Ranking

Ranks potential causes of market movement by estimated impact.

### Daily Market Brief Generator

Automatically generates daily market summaries.

### Historical Context Retrieval

Allows users to compare current market conditions with previous events.

---

# Functional Requirements

## FR-1 User Query Processing

The system shall accept natural language financial questions.

## FR-2 Market Data Retrieval

The system shall retrieve current market data from external sources.

## FR-3 News Retrieval

The system shall retrieve recent financial news articles.

## FR-4 Information Storage

The system shall store processed articles for future retrieval.

## FR-5 Semantic Search

The system shall perform vector similarity search over stored content.

## FR-6 Response Generation

The system shall generate coherent explanations using retrieved information.

## FR-7 Citation Generation

The system shall provide source references for generated responses.

## FR-8 Market Analysis

The system shall analyze market indicators and trends.

## FR-9 Sentiment Analysis

The system shall estimate market sentiment from retrieved content.

## FR-10 Multi-Agent Reasoning

The system shall support specialized agents for different analysis tasks.

---

# Non-Functional Requirements

## Performance

Responses should be generated within a few seconds.

## Scalability

Architecture should support future addition of:

* New asset classes
* New news sources
* Additional agents

## Explainability

All conclusions should be supported by retrieved evidence.

## Reliability

The system should continue functioning even if one data source becomes unavailable.

## Modularity

Components should be independently replaceable.

---

# Suggested System Architecture

```text
Frontend (React)
        |
        v
API Layer (FastAPI)
        |
        v
LangGraph Orchestrator
        |
 ------------------------------------------------
 |               |              |               |
 v               v              v               v
Market      News Agent    RAG Agent    Sentiment Agent
Agent
 |               |              |               |
 ------------------------------------------------
                        |
                        v
                 Reasoning Agent
                        |
                        v
                   Final Response
```

---

# Suggested Technology Stack

## Frontend

* React
* Tailwind CSS

## Backend

* Python
* FastAPI

## Agent Framework

* LangGraph

## LLM

* Gemini Free Tier
* Optional local model via llama.cpp

## Vector Database

* Qdrant

## Database

* PostgreSQL
* Supabase (optional)

## Embeddings

* BGE Small
* all-MiniLM-L6-v2

## Market Data

* Yahoo Finance (yfinance)

## News Sources

* RSS feeds
* Reuters RSS
* CNBC RSS
* MarketWatch RSS

---

# Development Roadmap

## Phase 1 — Foundation

### Goal

Build a working chatbot capable of answering financial questions.

Tasks:

* Set up React frontend.
* Set up FastAPI backend.
* Connect Gemini API.
* Create basic chat interface.

Deliverable:

* User can ask financial questions.

---

## Phase 2 — Market Data Integration

Tasks:

* Integrate yfinance.
* Build Market Data Tool.
* Retrieve live market indicators.

Deliverable:

* System can explain current market conditions using real data.

---

## Phase 3 — News Pipeline

Tasks:

* Collect RSS feeds.
* Parse articles.
* Store articles.

Deliverable:

* News database continuously updated.

---

## Phase 4 — RAG System

Tasks:

* Generate embeddings.
* Store vectors in Qdrant.
* Retrieve relevant articles.

Deliverable:

* Context-aware responses grounded in retrieved news.

---

## Phase 5 — LangGraph Agents

Tasks:

* Build Market Agent.
* Build News Agent.
* Build Sentiment Agent.
* Build Reasoning Agent.

Deliverable:

* Multi-agent financial analysis workflow.

---

## Phase 6 — Event Extraction and Ranking

Tasks:

* Extract market-moving events.
* Estimate impact scores.
* Rank likely causes.

Deliverable:

* Market explanation engine.

---

## Phase 7 — Daily Briefs and Analytics

Tasks:

* Generate daily market reports.
* Store summaries.
* Provide historical comparisons.

Deliverable:

* Financial intelligence dashboard.

---

# Future Enhancements

* Portfolio analysis
* Watchlists
* Earnings tracking
* Economic calendar integration
* Multi-language support
* Local LLM deployment
* Agent memory
* Personalized market briefings
* Mobile application

---

# Expected Learning Outcomes

This project demonstrates practical experience in:

* Retrieval-Augmented Generation (RAG)
* Agentic AI systems
* LangGraph orchestration
* Information retrieval
* Financial data analysis
* Vector databases
* LLM application development
* Backend API development
* Full-stack AI engineering
* Explainable AI systems

The final product will serve as both a portfolio project and a practical exploration of AI-powered financial reasoning systems.
