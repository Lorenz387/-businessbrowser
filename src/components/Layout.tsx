import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { MessageSquare, X, Send, Sparkles } from 'lucide-react'
import Sidebar from './Sidebar'
import Header from './Header'
import RightSidebar from './RightSidebar'

export default function Layout() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: 'Hallo! Ich bin dein LifeOS KI-Assistent. Wie kann ich dir helfen?' }
  ])
  const navigate = useNavigate()

  const send = () => {
    if (!input.trim()) return
    const userMsg = input.trim()
    setMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setInput('')
    setTimeout(() => {
      let reply = 'Ich helfe dir gerne! Schau dir den KI Chat für erweiterte Gespräche an.'
      if (userMsg.toLowerCase().includes('bild')) reply = 'Für Bilder empfehle ich den Bild Generator!'
      if (userMsg.toLowerCase().includes('projekt')) { reply = 'Navigiere zu deinen Projekten!'; setTimeout(() => navigate('/projekte'), 1000) }
      if (userMsg.toLowerCase().includes('analyse')) { reply = 'Öffne die Analysen für deine Performance!'; setTimeout(() => navigate('/analysen'), 1000) }
      setMessages(prev => [...prev, { role: 'ai', text: reply }])
    }, 600)
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 ml-64 mr-80 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <RightSidebar />

      {/* Floating AI assistant */}
      <div className="fixed bottom-6 right-[340px] z-30">
        {open && (
          <div className="absolute bottom-16 right-0 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden" style={{ height: 380 }}>
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-white" />
                <span className="text-white font-semibold text-sm">KI-Assistent</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-xl text-xs ${m.role === 'user' ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-slate-100 flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                placeholder="Frage stellen..."
                className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <button onClick={send} className="p-2 bg-violet-600 text-white rounded-xl hover:bg-violet-700">
                <Send size={13} />
              </button>
            </div>
          </div>
        )}
        <button
          onClick={() => setOpen(!open)}
          className="w-12 h-12 bg-gradient-to-br from-violet-600 to-purple-600 rounded-full shadow-lg flex items-center justify-center text-white hover:shadow-xl transition-shadow"
        >
          {open ? <X size={20} /> : <MessageSquare size={20} />}
        </button>
      </div>
    </div>
  )
}
