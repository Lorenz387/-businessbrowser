import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MoreHorizontal, Trash2, Edit2, ExternalLink, Search } from 'lucide-react';
import { store, Project } from '../store';

interface Props { onCreateProject: () => void; refreshKey: number; }

export default function Projects({ onCreateProject, refreshKey }: Props) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [menu, setMenu] = useState<string | null>(null);

  useEffect(() => { setProjects(store.getProjects()); }, [refreshKey]);

  const filtered = projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const deleteProject = (id: string) => {
    const all = store.getProjects().filter(p => p.id !== id);
    store.saveProjects(all);
    setProjects(all);
    setMenu(null);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Projekte</h1>
        <button onClick={onCreateProject} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Neues Projekt
        </button>
      </div>
      <div className="flex items-center gap-3 mb-6 bg-white rounded-xl border border-gray-200 px-4 py-2.5 max-w-sm">
        <Search size={16} className="text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Projekte suchen..." className="text-sm outline-none text-gray-700 placeholder-gray-400 flex-1" />
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">📁</div>
          <p className="text-lg font-medium text-gray-600">Keine Projekte gefunden</p>
          <p className="text-sm mt-1">Erstelle dein erstes Projekt</p>
          <button onClick={onCreateProject} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors">Jetzt starten</button>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {filtered.map(p => (
            <div key={p.id} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-gray-100 cursor-pointer group" onClick={() => navigate(`/projekte/${p.id}`)}>
              <div className="h-36 flex items-center justify-center text-5xl" style={{ background: `linear-gradient(135deg, ${p.color}22, ${p.color}55)` }}>{p.icon}</div>
              <div className="p-4">
                <p className="font-semibold text-gray-800 truncate">{p.name}</p>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{p.description || 'Kein Beschreibung'}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-gray-400">{p.fileCount} Dateien • {p.createdAt}</span>
                  <div className="relative">
                    <button onClick={e => { e.stopPropagation(); setMenu(menu === p.id ? null : p.id); }} className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100 rounded p-1">
                      <MoreHorizontal size={15} className="text-gray-400" />
                    </button>
                    {menu === p.id && (
                      <div className="absolute right-0 bottom-7 bg-white rounded-lg shadow-xl border border-gray-100 z-10 py-1 min-w-36">
                        <button onClick={e => { e.stopPropagation(); navigate(`/projekte/${p.id}`); setMenu(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"><ExternalLink size={13} /> Öffnen</button>
                        <button onClick={e => { e.stopPropagation(); deleteProject(p.id); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"><Trash2 size={13} /> Löschen</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
