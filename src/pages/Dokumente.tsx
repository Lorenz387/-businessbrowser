import { useState } from 'react';
import { FileText, Search, Trash2, Edit3, Plus } from 'lucide-react';
import { store, Document } from '../store';
import { useNavigate } from 'react-router-dom';

export default function Dokumente() {
  const navigate = useNavigate();
  const [docs, setDocs] = useState<Document[]>(store.getDocuments());
  const [search, setSearch] = useState('');

  const filtered = docs.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));
  const deleteDoc = (id: string) => {
    const updated = docs.filter(d => d.id !== id);
    store.saveDocuments(updated);
    setDocs(updated);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dokumente</h1>
        <button onClick={() => navigate('/ki-editor')} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Neues Dokument
        </button>
      </div>
      <div className="flex items-center gap-3 mb-6 bg-white rounded-xl border border-gray-200 px-4 py-2.5 max-w-sm">
        <Search size={16} className="text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Dokumente suchen..." className="text-sm outline-none text-gray-700 placeholder-gray-400 flex-1" />
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">📄</div>
          <p className="text-lg font-medium text-gray-600">Keine Dokumente</p>
          <p className="text-sm text-gray-400 mt-1">Erstelle dein erstes Dokument im KI-Editor</p>
          <button onClick={() => navigate('/ki-editor')} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors">KI-Editor öffnen</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-4 text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 border-b border-gray-100 bg-gray-50">
            <span>Name</span><span>Erstellt</span><span>Geändert</span><span className="text-right">Aktionen</span>
          </div>
          {filtered.map(doc => (
            <div key={doc.id} className="grid grid-cols-4 items-center px-4 py-3.5 border-b border-gray-50 hover:bg-gray-50 last:border-0">
              <div className="flex items-center gap-3">
                <FileText size={16} className="text-blue-500" />
                <span className="text-sm font-medium text-gray-800 truncate">{doc.name}</span>
              </div>
              <span className="text-xs text-gray-400">{new Date(doc.createdAt).toLocaleDateString('de')}</span>
              <span className="text-xs text-gray-400">{new Date(doc.updatedAt).toLocaleDateString('de')}</span>
              <div className="flex justify-end gap-2">
                <button onClick={() => navigate('/ki-editor')} className="p-1.5 hover:bg-blue-50 rounded text-gray-400 hover:text-blue-600 transition-colors"><Edit3 size={14} /></button>
                <button onClick={() => deleteDoc(doc.id)} className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
