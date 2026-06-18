import { useState, useRef } from 'react'
import { Plus, Layout } from 'lucide-react'
import type { Whiteboard, StickyNote } from '../types'

const noteColors = ['bg-yellow-200', 'bg-blue-200', 'bg-green-200', 'bg-pink-200']

const defaultBoards: Whiteboard[] = [
  {
    id: '1',
    name: 'Brainstorming',
    createdAt: '2026-06-18',
    notes: [
      { id: 'n1', content: 'Neue Idee: KI-Integration', x: 80, y: 80, color: 'bg-yellow-200', whiteboardId: '1' },
      { id: 'n2', content: 'Feature Request: Dark Mode', x: 280, y: 120, color: 'bg-blue-200', whiteboardId: '1' },
      { id: 'n3', content: 'Bug: Login Issue auf Mobile', x: 500, y: 60, color: 'bg-pink-200', whiteboardId: '1' },
    ],
  },
]

export default function Whiteboards() {
  const [boards, setBoards] = useState<Whiteboard[]>(defaultBoards)
  const [selected, setSelected] = useState<Whiteboard>(defaultBoards[0])
  const [noteColor, setNoteColor] = useState(noteColors[0])
  const dragging = useRef<{ id: string; ox: number; oy: number } | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  const addNote = () => {
    const note: StickyNote = {
      id: Date.now().toString(),
      content: 'Neue Notiz',
      x: 50 + Math.random() * 300,
      y: 50 + Math.random() * 200,
      color: noteColor,
      whiteboardId: selected.id,
    }
    updateNotes([...selected.notes, note])
  }

  const updateNotes = (notes: StickyNote[]) => {
    const updated = { ...selected, notes }
    setSelected(updated)
    setBoards(prev => prev.map(b => b.id === updated.id ? updated : b))
  }

  const updateNoteContent = (id: string, content: string) => {
    updateNotes(selected.notes.map(n => n.id === id ? { ...n, content } : n))
  }

  const deleteNote = (id: string) => {
    updateNotes(selected.notes.filter(n => n.id !== id))
  }

  const startDrag = (e: React.MouseEvent, id: string) => {
    const note = selected.notes.find(n => n.id === id)
    if (!note) return
    dragging.current = { id, ox: e.clientX - note.x, oy: e.clientY - note.y }
  }

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return
    const { id, ox, oy } = dragging.current
    updateNotes(selected.notes.map(n => n.id === id ? { ...n, x: e.clientX - ox, y: e.clientY - oy } : n))
  }

  const addBoard = () => {
    const board: Whiteboard = {
      id: Date.now().toString(),
      name: 'Neues Whiteboard',
      notes: [],
      createdAt: new Date().toISOString().split('T')[0],
    }
    setBoards(prev => [...prev, board])
    setSelected(board)
  }

  return (
    <div className="flex h-[calc(100vh-56px)]">
      <div className="w-52 border-r border-slate-200 bg-white flex flex-col">
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800 text-sm">Whiteboards</span>
            <button onClick={addBoard} className="p-1 hover:bg-violet-50 rounded-lg">
              <Plus size={16} className="text-violet-600" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {boards.map(b => (
            <button
              key={b.id}
              onClick={() => setSelected(b)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${selected.id === b.id ? 'bg-violet-50 text-violet-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <Layout size={14} />
              {b.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="px-4 py-2 bg-white border-b border-slate-200 flex items-center gap-3">
          <button
            onClick={addNote}
            className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm px-3 py-1.5 rounded-lg"
          >
            <Plus size={14} />
            Notiz
          </button>
          <div className="flex gap-1">
            {noteColors.map(c => (
              <button
                key={c}
                onClick={() => setNoteColor(c)}
                className={`w-6 h-6 rounded-full ${c} ${noteColor === c ? 'ring-2 ring-offset-1 ring-violet-500' : ''}`}
              />
            ))}
          </div>
        </div>

        <div
          ref={canvasRef}
          className="flex-1 bg-slate-50 relative overflow-hidden"
          onMouseMove={onMouseMove}
          onMouseUp={() => { dragging.current = null }}
          style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        >
          {selected.notes.map(note => (
            <div
              key={note.id}
              className={`absolute ${note.color} rounded-lg shadow-md w-40 min-h-28 p-3 cursor-move select-none`}
              style={{ left: note.x, top: note.y }}
              onMouseDown={e => startDrag(e, note.id)}
            >
              <button
                onMouseDown={e => e.stopPropagation()}
                onClick={() => deleteNote(note.id)}
                className="absolute top-1 right-1 text-slate-500 hover:text-red-500 text-xs px-1"
              >
                x
              </button>
              <textarea
                value={note.content}
                onChange={e => updateNoteContent(note.id, e.target.value)}
                onMouseDown={e => e.stopPropagation()}
                className="w-full bg-transparent text-xs text-slate-700 resize-none focus:outline-none mt-2"
                rows={4}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
