import { useState } from 'react'
import { FileText, Search, Trash2, Edit3, Plus } from 'lucide-react'
import type { Document } from '../types'
import { useLocalStorage } from '../hooks/useLocalStorage'

const defaultDocs: Document[] = [
  { id: '1', name: 'Marketing Brief Q1', content: 'Inhalt des Marketing Briefs...', createdAt: '2026-06-01', updatedAt: '2026-06-18' },
  { id: '2', name: 'Produktbeschreibung App', content: 'Die App bietet...', createdAt: '2026-06-05', updatedAt: '2026-06-17' },
  { id: '3', name: 'Content Strategie Notizen', content: 'Notizen zur Content Strategie...', createdAt: '2026-06-10', updatedAt: '2026-06-15' },
  { id: '4', name: 'Meeting Protokoll', content: 'Protokoll vom...', createdAt: '2026-06-12', updatedAt: '2026-06-14' },
  { id: '5', name: 'Keyword Research', content: 'Keywords: ...', createdAt: '2026-06-14', updatedAt: '2026-06-14' },
]

export default function Dokumente() {
  const [docs, setDocs] = useLocalStorage<Document[]>('documents', defaultDocs)
  const [search, setSearch] = useState('')
  const [editingDoc, setEditingDoc] = useState<Document | null>(null)

  const filtered = docs.filter(d => d.name.toLowerCase().includes(search.toLowerCase()))

  const deleteDoc = (id: string) => {
    setDocs(prev => prev.filter(d => d.id !== id))
  }

  const saveDoc = (doc: Document) => {
    setDocs(prev => prev.map(d => d.id === doc.id ? { ...doc, updatedAt: new Date().toISOString().split('T')[0] } : d))
    setEditingDoc(null)
  }

  const createDoc = () => {
    const newDoc: Document = {
      id: Date.now().toString(),
      name: 'Neues Dokument',
      content: '',
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    }
    setDocs(prev => [newDoc, ...prev])
    setEditingDoc(newDoc)
  }

  if (editingDoc) {
    return (
      <div className="p-6 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <input
            value={editingDoc.name}
            onChange={e => setEditingDoc({ ...editingDoc, name: e.target.value })}
            className="text-xl font-bold text-slate-800 bg-transparent border-b border-slate-200 focus:outline-none focus:border-violet-500 pb-1"
          />
          <div className="flex gap-2">
            <button onClick={() => setEditingDoc(null)} className="text-sm border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50">Abbrechen</button>
            <button onClick={() => saveDoc(editingDoc)} className="text-sm bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700">Speichern</button>
          </div>
        </div>
        <textarea
          value={editingDoc.content}
          onChange={e => setEditingDoc({ ...editingDoc, content: e.target.value })}
          className="flex-1 border border-slate-200 rounded-xl p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
          placeholder="Dokument schreiben..."
        />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dokumente</h1>
          <p className="text-slate-500 text-sm mt-1">{docs.length} Dokumente</p>
        </div>
        <button onClick={createDoc} className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium">
          <Plus size={16} />
          Neues Dokument
        </button>
      </div>

      <div className="relative mb-6 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Dokumente suchen..."
          className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>

      <div className="space-y-2">
        {filtered.map(doc => (
          <div key={doc.id} className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
            <div className="w-10 h-10 bg-violet-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText size={20} className="text-violet-500" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-slate-800">{doc.name}</div>
              <div className="text-xs text-slate-400 mt-0.5">Aktualisiert: {doc.updatedAt}</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditingDoc(doc)}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-violet-600 transition-colors"
              >
                <Edit3 size={16} />
              </button>
              <button
                onClick={() => deleteDoc(doc.id)}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
