import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Send, ChevronDown, Trash2, Bot } from 'lucide-react';
import { store, ChatMessage } from '../store';

const MODELS = ['GPT-4.5', 'Claude', 'Gemini', 'Mistral', 'DeepSeek'];

const mockResponses = [
  "Ich habe deine Anfrage analysiert und kann dir folgendes mitteilen: Dies ist eine hervorragende Idee! Lass mich dir dabei helfen, sie umzusetzen.",
  "Basierend auf deiner Frage empfehle ich folgendes Vorgehen:\n1. Zunächst den Rahmen definieren\n2. Dann die Details ausarbeiten\n3. Schließlich alles zusammenführen",
  "Das ist eine interessante Perspektive. Ich sehe mehrere Möglichkeiten, wie wir das angehen können. Welchen Aspekt möchtest du zuerst erkunden?",
  "Hier sind meine Gedanken dazu: Die Lösung liegt in einem strukturierten Ansatz. Ich würde vorschlagen, mit den Grundlagen zu beginnen und dann schrittweise zu erweitern.",
  "Ausgezeichnete Frage! Hier ist eine detaillierte Antwort: Es gibt verschiedene Faktoren zu berücksichtigen, aber der wichtigste ist wohl der strategische Ansatz.",
];

export default function KIChat() {
  const [params] = useSearchParams();
  const [model, setModel] = useState(store.getSelectedModel());
  const [messages, setMessages] = useState<ChatMessage[]>(store.getChats());
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const q = params.get('q');
    const m = params.get('model');
    if (m) setModel(m);
    if (q && messages.length === 0) {
      setTimeout(() => sendMessage(q), 100);
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string = input) => {
    if (!text.trim() || loading) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text.trim(), model, timestamp: new Date().toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' }) };
    const updated = [...messages, userMsg];
    setMessages(updated);
    store.saveChats(updated);
    setInput('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 800 + Math.random() * 800));
    const aiMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: mockResponses[Math.floor(Math.random() * mockResponses.length)],
      model,
      timestamp: new Date().toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' }),
    };
    const final = [...updated, aiMsg];
    setMessages(final);
    store.saveChats(final);
    setLoading(false);
  };

  const clearChat = () => { setMessages([]); store.saveChats([]); };

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Bot size={20} className="text-blue-600" />
          <h1 className="font-bold text-gray-800">KI-Chat</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button onClick={() => setShowModelMenu(!showModelMenu)} className="flex items-center gap-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg px-3 py-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              {model} <ChevronDown size={14} />
            </button>
            {showModelMenu && (
              <div className="absolute right-0 top-9 bg-white rounded-xl shadow-xl border border-gray-100 z-50 py-1 min-w-36">
                {MODELS.map(m => (
                  <button key={m} onClick={() => { setModel(m); store.saveSelectedModel(m); setShowModelMenu(false); }}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 ${model === m ? 'text-blue-600 font-medium' : 'text-gray-700'}`}>
                    {m === model && <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={clearChat} className="p-2 hover:bg-gray-100 rounded-lg" title="Chat löschen"><Trash2 size={16} className="text-gray-400" /></button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🤖</div>
            <h2 className="text-xl font-bold text-gray-700 mb-2">Wie kann ich dir helfen?</h2>
            <p className="text-gray-400 text-sm">Stelle mir eine Frage oder gib mir eine Aufgabe</p>
            <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto mt-6">
              {['Schreibe einen Business Plan', 'Erkläre KI in einfachen Worten', 'Erstelle eine Social Media Strategie', 'Hilf mir beim Brainstorming'].map(s => (
                <button key={s} onClick={() => sendMessage(s)} className="bg-white border border-gray-200 rounded-xl p-3 text-sm text-gray-600 hover:bg-gray-50 hover:border-blue-300 text-left transition-all">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-2xl rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-100 text-gray-800 shadow-sm'}`}>
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                    <Bot size={12} className="text-blue-600" />
                  </div>
                  <span className="text-xs font-medium text-blue-600">{msg.model}</span>
                </div>
              )}
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              <p className={`text-xs mt-1.5 ${msg.role === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>{msg.timestamp}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-100 p-4">
        <div className="flex gap-3 max-w-3xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Schreibe eine Nachricht... (Enter zum Senden)"
            rows={1}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none leading-relaxed"
          />
          <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
            className="w-10 h-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl flex items-center justify-center transition-colors self-end">
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
