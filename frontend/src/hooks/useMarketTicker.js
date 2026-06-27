import { useState, useEffect } from 'react'
import { fetchMarketSnapshot } from '@/api/argus'

const DISPLAY_ORDER = ['SPY', 'QQQ', 'NVDA', 'MSFT', 'AAPL', 'META', 'INTC', 'VIX', 'BTC', 'GC=F', 'ETH', 'DJI', 'CL=F']

function formatPrice(symbol, price) {
  if (['BTC', 'ETH'].includes(symbol)) return price.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (price > 1000) return price.toLocaleString('en-US', { maximumFractionDigits: 0 })
  return price.toFixed(2)
}

export function useMarketTicker(intervalMs = 30_000) {
  const [items, setItems] = useState([])
  const [error, setError] = useState(null)

  const load = async () => {
    try {
      const data = await fetchMarketSnapshot()
      const mapped = DISPLAY_ORDER
        .filter(sym => data[sym])
        .map(sym => ({
          symbol: sym,
          price: formatPrice(sym, data[sym].price),
          change: `${data[sym].change_pct >= 0 ? '+' : ''}${data[sym].change_pct.toFixed(1)}%`,
          up: data[sym].change_pct >= 0,
        }))
      setItems(mapped)
      setError(null)
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return { items, error }
}
