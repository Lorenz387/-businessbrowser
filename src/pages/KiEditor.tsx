import { useState, useRef } from 'react'
import { Bold, Italic, Underline, List, ListOrdered, Sparkles } from 'lucide-react'

const aiResponses: Record<string, string> = {
  improve: 'Hier ist eine verbesserte Version deines Textes mit besserem Stil und Klarheit...',
  summarize: 'Zusammenfassung: Die wichtigsten Punkte des Textes sind erstens die Hauptthematik, zweitens die wesentlichen Argumente und drittens die Schlussfolgerungen.',
  expand: 'Erweiterter Text: Ausgehend von deinem ursprünglichen Inhalt können wir weitere Details, Beispiele und Erklärungen hinzufügen, um die Botschaft vollständiger zu gestalten...',
  translate: 'Here is the translated version of your text in English. The content has been adapted for natural flow in the target language...',
}

export default function KiEditor() {
  const editorRef = useRef<HTMLDivElement>(null)
  const [prompt, setPrompt] = useState('')
  const [aiResult, setAiResult] = useState('')
  const [loading, setLoading] = useState(false)

  const execCommand = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value)
    editorRef.current?.focus()
  }

  const handleAI = (type: string) => {
    setLoading(true)
    setAiResult('')
    setTimeout(() => {
      setAiResult(aiResponses[type] || '')
      setLoading(false)
    }, 1200)
  }

  return (
    <div className="flex h-[calc(100vh-56px)]">
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-200 bg-white flex-wrap">
          {[
            { icon: Bold, cmd: 'bold', title: 'Fett' },
            { icon: Italic, cmd: 'italic', title: 'Kursiv' },
            { icon: Underline, cmd: 'underline', title: 'Unterstrichen' },
          ].map(({ icon: Icon, cmd, title }) => (
            <button
              key={cmd}
              onMouseDown={e => { e.preventDefault(); execCommand(cmd) }}
              title={title}
              className="p-2 rounded hover:bg-slate-100 text-slate-600"
            >
              <Icon size={16} />
            </button>
          ))}
          <div className="w-px h-5 bg-slate-200 mx-1" />
          {[1, 2, 3].map(level => (
            <button
              key={level}
              onMouseDown={e => { e.preventDefault(); execCommand('formatBlock', `h${level}`) }}
              className="px-2 py-1 rounded hover:bg-slate-100 text-slate-600 text-sm font-bold"
            >
              H{level}
            </button>
          ))}
          <div className="w-px h-5 bg-slate-200 mx-1" />
          <button onMouseDown={e => { e.preventDefault(); execCommand('insertUnorderedList') }} className="p-2 rounded hover:bg-slate-100 text-slate-600">
            <List size={16} />
          </button>
          <button onMouseDown={e => { e.preventDefault(); execCommand('insertOrderedList') }} className="p-2 rounded hover:bg-slate-100 text-slate-600">
            <ListOrdered size={16} />
          </button>
        </div>

        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className="flex-1 p-6 text-slate-800 focus:outline-none prose max-w-none overflow-y-auto"
          data-placeholder="Beginne hier zu schreiben..."
        />
      </div>

      <div className="w-80 border-l border-slate-200 bg-slate-50 flex flex-col">
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={16} className="text-violet-500" />
            <span className="font-semibold text-slate-800">KI Assistent</span>
          </div>
          <p className="text-xs text-slate-500">Lass die KI deinen Text verbessern</p>
        </div>

        <div className="p-4 flex flex-col gap-3 flex-1">
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Zusätzliche Anweisungen..."
            className="w-full border border-slate-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
            rows={3}
          />

          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Verbessern', type: 'improve' },
              { label: 'Zusammenfassen', type: 'summarize' },
              { label: 'Erweitern', type: 'expand' },
              { label: 'Übersetzen', type: 'translate' },
            ].map(({ label, type }) => (
              <button
                key={type}
                onClick={() => handleAI(type)}
                disabled={loading}
                className="bg-white border border-slate-200 text-slate-700 text-xs py-2 px-3 rounded-lg hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700 transition-all disabled:opacity-50"
              >
                {label}
              </button>
            ))}
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-sm text-violet-600">
              <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              KI generiert...
            </div>
          )}

          {aiResult && (
            <div className="bg-white border border-violet-200 rounded-lg p-3 text-sm text-slate-700">
              <div className="text-xs font-medium text-violet-600 mb-2">KI Ergebnis:</div>
              {aiResult}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
