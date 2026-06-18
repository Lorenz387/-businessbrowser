import { useState } from 'react';
import { Plus } from 'lucide-react';
import { store, StickyNote } from '../store';

const NOTE_COLORS = ['#fef3c7', '#dbeafe', '#dcfce7', '#fce7f3', '#ede9fe', '#fee2e2'];

export default function Whiteboards() {
  const [notes, setNotes] = useState<StickyNote[]>(store.getNotes());
  const [dragging, setDragging] = useState<string | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [editing, setEditing] = useState<string | null>(null);

  const addNote = () => {
    const note: StickyNote = {
      id: Date.now().toString(),
      content: 'Neue Notiz...',
      color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)],
      x: 60 + Math.random() * 400,
      y: 60 + Math.random() * 300,
    };
    const updated = [...notes, note];
    setNotes(updated);
    store.saveNotes(updated);
    setEditing(note.id);
  };

  const updateNote = (id: string, content: string) => {
    const updated = notes.map(n => n.id === id ? { ...n, content } : n);
    setNotes(updated);
    store.saveNotes(updated);
  };

  const deleteNote = (id: string) => {
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated);
    store.saveNotes(updated);
  };

  const onMouseDown = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const note = notes.find(n => n.id === id)!;
    setDragging(id);
    setOffset({ x: e.clientX - note.x, y: e.clientY - note.y });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const updated = notes.map(n => n.id === dragging ? { ...n, x: e.clientX - offset.x, y: e.clientY - offset.y } : n);
    setNotes(updated);
  };

  const onMouseUp = () => {
    if (dragging) { store.saveNotes(notes); setDragging(null); }
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between">
        <h1 className="font-bold text-gray-800">Whiteboard</h1>
        <button onClick={addNote} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
          <Plus size={15} /> Notiz hinzufügen
        </button>
      </div>
      <div
        className="flex-1 relative overflow-hidden select-none"
        style={{ background: 'radial-gradient(#e2e8f0 1px, transparent 1px)', backgroundSize: '24px 24px', backgroundColor: '#f8fafc' }}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
      >
        {notes.map(note => (
          <div
            key={note.id}
            className="absolute w-48 rounded-xl shadow-md"
            style={{ left: note.x, top: note.y, background: note.color }}
          >
            <div
              className="px-3 py-2 cursor-grab active:cursor-grabbing flex items-center justify-between"
              onMouseDown={e => onMouseDown(e, note.id)}
            >
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-black/20" />
                <div className="w-2 h-2 rounded-full bg-black/20" />
                <div className="w-2 h-2 rounded-full bg-black/20" />
              </div>
              <button onClick={() => deleteNote(note.id)} className="text-black/40 hover:text-red-500 text-sm leading-none transition-colors">×</button>
            </div>
            <textarea
              value={note.content}
              onChange={e => updateNote(note.id, e.target.value)}
              onFocus={() => setEditing(note.id)}
              onBlur={() => setEditing(null)}
              className="w-full bg-transparent px-3 pb-3 text-sm text-gray-700 outline-none resize-none"
              rows={4}
              style={{ cursor: editing === note.id ? 'text' : 'inherit' }}
            />
          </div>
        ))}
        {notes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-5xl mb-3">📌</div>
              <p className="text-lg font-medium text-gray-500">Leeres Whiteboard</p>
              <p className="text-sm mt-1">Klicke auf "+ Notiz hinzufügen" um zu beginnen</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
