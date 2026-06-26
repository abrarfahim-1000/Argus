import { useState } from 'react'

const MOCK_RESPONSE = {
  content:
    'The S&P 500 is down 1.2% primarily on renewed rate concerns. Fed officials signaled prolonged higher rates after CPI came in hotter than expected. Tech stocks are bearing the brunt — QQQ is off 2.0% — due to sensitivity to rising Treasury yields (10Y now 4.72%). Commodity markets are mixed: gold is holding support while crude ticked up on supply data.',
  sources: ['Reuters', 'CNBC', 'Financial Times'],
}

export function useChat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = (text) => {
    const trimmed = (text ?? input).trim()
    if (!trimmed || isLoading) return

    setMessages(prev => [
      ...prev,
      { id: crypto.randomUUID(), role: 'user', content: trimmed },
    ])
    setInput('')
    setIsLoading(true)

    // Stub — replace with real POST /chat once the backend is live
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: MOCK_RESPONSE.content,
          sources: MOCK_RESPONSE.sources,
        },
      ])
      setIsLoading(false)
    }, 1500)
  }

  return { messages, input, setInput, isLoading, sendMessage }
}
