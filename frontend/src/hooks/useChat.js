import { useState } from 'react'
import { sendChatMessage } from '@/api/argus'

export function useChat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState(null)

  const sendMessage = async (text) => {
    const trimmed = (text ?? input).trim()
    if (!trimmed || isLoading) return

    setMessages(prev => [
      ...prev,
      { id: crypto.randomUUID(), role: 'user', content: trimmed },
    ])
    setInput('')
    setIsLoading(true)

    try {
      const data = await sendChatMessage({ message: trimmed, conversationId })
      setConversationId(data.conversation_id)
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.answer,
          sources: data.sources ?? [],
        },
      ])
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Something went wrong. Please try again.',
          sources: [],
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return { messages, input, setInput, isLoading, sendMessage }
}
