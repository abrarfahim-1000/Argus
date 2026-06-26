import { useState, useEffect } from 'react'
import LandingPage from './LandingPage'
import ChatPage from './pages/ChatPage'

export default function App() {
  const [isDark, setIsDark] = useState(true)
  const [view, setView] = useState('landing')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  const toggle = () => setIsDark(p => !p)

  if (view === 'chat') {
    return (
      <ChatPage
        isDark={isDark}
        onToggle={toggle}
        onBack={() => setView('landing')}
      />
    )
  }

  return (
    <LandingPage
      isDark={isDark}
      onToggle={toggle}
      onLaunch={() => setView('chat')}
    />
  )
}
