import { useState } from 'react';
import { X } from 'lucide-react';
import { store, Project } from '../store';

const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#14b8a6'];
const icons = ['📊', '📅', '✈️', '💪', '📚', '🎨', '🚀', '💡', '🎯', '📝'];

interface Props {
  onClose: () => void;
  onCreated: (p: Project) => void;
}

export default function CreateProjectModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [color, setColor] = useState(colors[0]);
  const [icon, setIcon] = useState(icons[0]);

  const create = () => {
    if (!name.trim()) return;
    const project: Project = {
      id: Date.now().toString(),
      name: name.trim(),
      description: desc.trim(),
      color,
      icon,
      fileCount: 0,
      createdAt: new Date().toISOString().split('T')[0],
    };
    const projects = store.getProjects();
    store.saveProjects([project, ...projects]);
    onCreated(project);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Neues Projekt</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Projektname *</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && create()}
              placeholder="z.B. Marketing Plan 2025"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Beschreibung</label>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Kurze Beschreibung..."
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Icon</label>
            <div className="flex gap-2 flex-wrap">
              {icons.map(i => (
                <button
                  key={i}
                  onClick={() => setIcon(i)}
                  className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${icon === i ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-100'}`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Farbe</label>
            <div className="flex gap-2">
              {colors.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 p-6 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">
            Abbrechen
          </button>
          <button
            onClick={create}
            disabled={!name.trim()}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
          >
            Projekt erstellen
          </button>
        </div>
      </div>
    </div>
  );
}
