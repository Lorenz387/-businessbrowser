import { useState } from 'react'
import { X } from 'lucide-react'
import type { Project } from '../types'

const colors = [
  'from-blue-500 to-cyan-500',
  'from-violet-500 to-purple-500',
  'from-green-500 to-teal-500',
  'from-orange-500 to-red-500',
  'from-pink-500 to-rose-500',
  'from-yellow-500 to-orange-500',
]

const icons = ['📊', '🚀', '📝', '🎨', '🔍', '💡', '📱', '🌟', '🎯', '⚡']

interface Props {
  onClose: () => void
  onCreate: (project: Project) => void
}

export default function CreateProjectModal({ onClose, onCreate }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(colors[0])
  const [icon, setIcon] = useState(icons[0])

  const handleCreate = () => {
    if (!name.trim()) return
    const project: Project = {
      id: Date.now().toString(),
      name,
      description,
      color,
      icon,
      fileCount: 0,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    }
    onCreate(project)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-800">Neues Projekt</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Projektname..."
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Beschreibung</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              rows={3}
              placeholder="Projektbeschreibung..."
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Farbe</label>
            <div className="flex gap-2 flex-wrap">
              {colors.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-lg bg-gradient-to-br ${c} ${color === c ? 'ring-2 ring-offset-2 ring-violet-500' : ''}`}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Icon</label>
            <div className="flex gap-2 flex-wrap">
              {icons.map(i => (
                <button
                  key={i}
                  onClick={() => setIcon(i)}
                  className={`w-8 h-8 rounded-lg border text-lg flex items-center justify-center ${icon === i ? 'border-violet-500 bg-violet-50' : 'border-slate-200 hover:bg-slate-50'}`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 border border-slate-200 text-slate-700 py-2 rounded-lg text-sm hover:bg-slate-50"
          >
            Abbrechen
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            Erstellen
          </button>
        </div>
      </div>
    </div>
  )
}
