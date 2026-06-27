import yfinance as yf

TICKERS: dict[str, str] = {
    "SPY":  "SPY",
    "QQQ":  "QQQ",
    "NVDA": "NVDA",
    "MSFT": "MSFT",
    "AAPL": "AAPL",
    "META": "META",
    "INTC": "INTC",
    "VIX":  "^VIX",
    "BTC":  "BTC-USD",
    "GC=F": "GC=F",
    "ETH":  "ETH-USD",
    "DJI":  "^DJI",
    "CL=F": "CL=F",
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
