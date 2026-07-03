import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './LandingPage'
import ChatPage from './pages/ChatPage'

export default function App() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  const toggle = () => setIsDark(p => !p)

  return (
    <Routes>
      <Route path="/" element={<LandingPage isDark={isDark} onToggle={toggle} />} />
      <Route path="/chat" element={<ChatPage isDark={isDark} onToggle={toggle} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
