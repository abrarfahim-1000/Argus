import yfinance as yf

TICKERS: dict[str, str] = {
    "SPY":      "SPY",
    "Nasdaq-100":      "QQQ",
    "Dow Jones":"^DJI",
    "Russell":  "IWM",
    "Fear Gauge":      "^VIX",
    "Treasuries":"TLT",
    "Nvidia":   "NVDA",
    "Microsoft":"MSFT",
    "Apple":    "AAPL",
    "Meta":     "META",
    "Google":   "GOOGL",
    "Amazon":   "AMZN",
    "Tesla":    "TSLA",
    "SpaceX":   "SPCX",
    "JPMorgan": "JPM",
    "Intel":    "INTC",
    "Bitcoin":  "BTC-USD",
    "Ethereum": "ETH-USD",
    "Gold":     "GC=F",
    "Silver":   "SI=F",
    "WTI Crude":      "CL=F",
    "Brent Crude": "BZ=F",
    "USD":      "DX-Y.NYB",
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
