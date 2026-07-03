import gc

import yfinance as yf

TICKERS: dict[str, str] = {
    "S&P 500":      "SPY",
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
    "N225":     "^N225",    # Nikkei 225 (Japan)
    "FTSE":     "^FTSE",    # FTSE 100 (UK)
    "DAX":      "^GDAXI",   # DAX (Germany / Eurozone proxy)
}

BATCH_SIZE = 6


def _fetch_batch(tickers: list[str]) -> dict[str, dict]:
    data = yf.download(
        tickers,
        period="1d",
        interval="1m",
        progress=False,
        auto_adjust=True,
        threads=False,
    )
    closes = data["Close"]
    batch_result: dict[str, dict] = {}
    for ticker in tickers:
        try:
            series = closes[ticker].dropna() if len(tickers) > 1 else closes.dropna()
            if len(series) < 2:
                continue
            prev, curr = float(series.iloc[-2]), float(series.iloc[-1])
            change_pct = ((curr - prev) / prev) * 100
            batch_result[ticker] = {"price": curr, "change_pct": round(change_pct, 2)}
        except Exception:
            continue
    del data, closes
    return batch_result


def fetch_snapshot() -> dict[str, dict]:
    all_tickers = list(TICKERS.values())
    by_ticker: dict[str, dict] = {}
    for i in range(0, len(all_tickers), BATCH_SIZE):
        batch = all_tickers[i : i + BATCH_SIZE]
        by_ticker.update(_fetch_batch(batch))
        gc.collect()

    result: dict[str, dict] = {}
    for label, ticker in TICKERS.items():
        if ticker in by_ticker:
            result[label] = by_ticker[ticker]
    return result
