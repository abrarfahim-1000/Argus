import { useState, useEffect } from 'react'
import { fetchSuggestions } from '@/api/argus'

export function useSuggestions() {
  const [suggestions, setSuggestions] = useState([])
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
        // leave blank — no misleading static fallback
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  return { suggestions, loading }
}
