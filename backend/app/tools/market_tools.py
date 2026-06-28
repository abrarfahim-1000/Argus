import yfinance as yf

TICKERS: dict[str, str] = {
    # Broad market indices
    "SPY":   "SPY",       # S&P 500
    "QQQ":   "QQQ",       # Nasdaq 100
    "DJI":   "^DJI",      # Dow Jones
    "IWM":   "IWM",       # Russell 2000 small-cap
    # Volatility & bonds
    "VIX":   "^VIX",      # Fear index
    "TLT":   "TLT",       # 20Y Treasury ETF (rate proxy)
    # Mega-cap tech
    "NVDA":  "NVDA",
    "MSFT":  "MSFT",
    "AAPL":  "AAPL",
    "META":  "META",
    "GOOGL": "GOOGL",
    "AMZN":  "AMZN",
    "TSLA":  "TSLA",
    # Financials / industrial movers
    "JPM":   "JPM",
    "INTC":  "INTC",
    # Crypto
    "BTC":   "BTC-USD",
    "ETH":   "ETH-USD",
    # Commodities
    "GC=F":  "GC=F",      # Gold
    "SI=F":  "SI=F",      # Silver
    "CL=F":  "CL=F",      # Crude oil
    # USD strength
    "DXY":   "DX-Y.NYB",  # Dollar index
}


def fetch_snapshot() -> dict[str, dict]:
    data = yf.download(
        list(TICKERS.values()),
        period="1d",
        interval="1m",
        progress=False,
        auto_adjust=True,
    )
    closes = data["Close"]
    result: dict[str, dict] = {}
    for label, ticker in TICKERS.items():
        try:
            series = closes[ticker].dropna()
            if len(series) < 2:
                continue
            prev, curr = float(series.iloc[-2]), float(series.iloc[-1])
            change_pct = ((curr - prev) / prev) * 100
            result[label] = {"price": curr, "change_pct": round(change_pct, 2)}
        except Exception:
            continue
    return result
