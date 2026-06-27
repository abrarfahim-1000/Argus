const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

/**
 * POST /chat
 * @param {{ message: string, conversationId?: string }} params
 * @returns {Promise<{ answer: string, sources: any[], market_snapshot: object, conversation_id: string }>}
 */
export async function sendChatMessage({ message, conversationId }) {
  const res = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, conversation_id: conversationId ?? null }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Chat request failed (${res.status}): ${err}`)
  }
  return res.json()
}

/**
 * GET /market/snapshot
 * @returns {Promise<Record<string, { price: number, change_pct: number }>>}
 */
export async function fetchMarketSnapshot() {
  const res = await fetch(`${BASE_URL}/market/snapshot`)
  if (!res.ok) throw new Error(`Market snapshot failed: ${res.status}`)
  return res.json()
}

/**
 * GET /suggestions
 * @returns {Promise<Array<{ icon: string, title: string, desc: string }>>}
 */
export async function fetchSuggestions() {
  const res = await fetch(`${BASE_URL}/suggestions`)
  if (!res.ok) throw new Error(`Suggestions failed: ${res.status}`)
  return res.json()
}
