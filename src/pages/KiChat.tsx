import { useState, useRef, useEffect } from 'react'
import { Send, Bot, ChevronDown } from 'lucide-react'
import type { ChatMessage } from '../types'

const models = ['GPT-4o', 'Claude 3.5', 'Gemini Pro']

const aiReplies = [
  'Das ist eine sehr gute Frage! Ich helfe dir gerne dabei. Lass mich das für dich analysieren und eine detaillierte Antwort geben...',
  'Natürlich! Hier ist was ich dazu denke: Es gibt mehrere Aspekte zu berücksichtigen. Erstens solltest du...',
  'Interessanter Punkt! Basierend auf meinem Wissen kann ich dir folgendes sagen...',
  'Gerne! Ich habe das analysiert und kann dir eine hilfreiche Antwort geben. Die wichtigsten Punkte sind...',
]

export default function KiChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [model, setModel] = useState(models[0])
  const [typing, setTyping] = useState(false)
  const [showModelMenu, setShowModelMenu] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  const sendMessage = () => {
    if (!input.trim()) return
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      model,
      timestamp: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setTyping(true)

    setTimeout(() => {
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiReplies[Math.floor(Math.random() * aiReplies.length)],
        model,
        timestamp: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages(prev => [...prev, aiMsg])
      setTyping(false)
    }, 1500)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Model selector */}
      <div className="px-4 py-3 border-b border-slate-200 bg-white flex items-center gap-3">
        <span className="text-sm text-slate-500">Modell:</span>
        <div className="relative">
          <button
            onClick={() => setShowModelMenu(!showModelMenu)}
            className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            {model}
            <ChevronDown size={14} />
          </button>
          {showModelMenu && (
            <div className="absolute top-9 left-0 bg-white border border-slate-200 rounded-xl shadow-lg z-10 py-1 min-w-36">
              {models.map(m => (
                <button
                  key={m}
                  onClick={() => { setModel(m); setShowModelMenu(false) }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${model === m ? 'text-violet-600 font-medium' : 'text-slate-700'}`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
              <Bot size={28} className="text-white" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">KI Chat</h3>
            <p className="text-slate-500 text-sm max-w-sm">Stelle mir eine Frage! Ich helfe dir mit Projekten, Content, Analysen und mehr.</p>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                <Bot size={14} className="text-white" />
              </div>
            )}
            <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl text-sm ${
              msg.role === 'user'
                ? 'bg-violet-600 text-white rounded-tr-sm'
                : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm'
            }`}>
              {msg.content}
              <div className={`text-xs mt-1 ${msg.role === 'user' ? 'text-violet-200' : 'text-slate-400'}`}>
                {msg.timestamp}
              </div>
            </div>
          </div>
        ))}

        {typing && (
          <div className="flex justify-start">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center mr-2">
              <Bot size={14} className="text-white" />
            </div>
            <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-tl-sm">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-200 bg-white">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Nachricht eingeben..."
            className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || typing}
            className="bg-gradient-to-r from-violet-600 to-purple-600 text-white p-2.5 rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
