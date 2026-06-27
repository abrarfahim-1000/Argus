import { useState, useEffect } from 'react'
import { fetchSuggestions } from '@/api/argus'

export const STATIC_SUGGESTIONS = [
  { icon: 'TrendingDown', title: 'Why is Nvidia falling today?',      desc: 'Analyze technicals and news driving NVDA.' },
  { icon: 'TrendingUp',   title: 'Why is Bitcoin rising this week?',  desc: 'Check ETF inflows and macro drivers.' },
  { icon: 'CalendarDays', title: 'What should I watch this week?',    desc: 'Upcoming earnings and economic data.' },
  { icon: 'Landmark',     title: 'What did the Fed say about rates?', desc: 'Summary of latest FOMC statements.' },
]

export function useSuggestions() {
  const [suggestions, setSuggestions] = useState(STATIC_SUGGESTIONS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchSuggestions()
      .then(data => {
        if (!cancelled && Array.isArray(data) && data.length === 4) {
          setSuggestions(data)
        }
      })
      .catch(() => {
        // silently keep static fallback
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  return { suggestions, loading }
}
