import { useState } from 'react';
import { Folder, FolderOpen, Plus, ChevronRight, ChevronDown, Trash2 } from 'lucide-react';

interface FolderItem { id: string; name: string; children: FolderItem[]; }

const defaultFolders: FolderItem[] = [
  { id: '1', name: 'Projekte', children: [{ id: '1-1', name: 'Business Plan', children: [] }, { id: '1-2', name: 'Marketing', children: [] }] },
  { id: '2', name: 'Dokumente', children: [{ id: '2-1', name: 'Berichte', children: [] }, { id: '2-2', name: 'Verträge', children: [] }] },
  { id: '3', name: 'Bilder', children: [] },
  { id: '4', name: 'Archiv', children: [{ id: '4-1', name: '2024', children: [] }] },
];

function FolderNode({ folder, depth = 0, onDelete }: { folder: FolderItem; depth?: number; onDelete: (id: string) => void }) {
  const [open, setOpen] = useState(depth === 0);
  const [hovered, setHovered] = useState(false);

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer group transition-colors ${hovered ? 'bg-blue-50' : 'hover:bg-gray-100'}`}
        style={{ paddingLeft: `${12 + depth * 20}px` }}
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {folder.children.length > 0 ? (open ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />) : <span className="w-3.5" />}
        {open && folder.children.length > 0 ? <FolderOpen size={16} className="text-blue-500" /> : <Folder size={16} className="text-blue-400" />}
        <span className="text-sm text-gray-700 flex-1">{folder.name}</span>
        {depth > 0 && (
          <button onClick={e => { e.stopPropagation(); onDelete(folder.id); }} className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-50 rounded text-gray-300 hover:text-red-500 transition-all">
            <Trash2 size={12} />
          </button>
        )}
      </div>
      {open && folder.children.map(child => <FolderNode key={child.id} folder={child} depth={depth + 1} onDelete={onDelete} />)}
    </div>
  );
}

export default function Ordner() {
  const [folders, setFolders] = useState<FolderItem[]>(defaultFolders);
  const [newName, setNewName] = useState('');

  const addFolder = () => {
    if (!newName.trim()) return;
    setFolders(prev => [...prev, { id: Date.now().toString(), name: newName.trim(), children: [] }]);
    setNewName('');
  };

  const deleteFolder = (id: string) => {
    const remove = (items: FolderItem[]): FolderItem[] => items.filter(i => i.id !== id).map(i => ({ ...i, children: remove(i.children) }));
    setFolders(remove);
  };

  return (
    <div className="flex-1 bg-gray-50 p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Ordner</h1>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 max-w-md">
        <div className="flex gap-2 mb-4">
          <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addFolder()} placeholder="Neuer Ordner..." className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          <button onClick={addFolder} disabled={!newName.trim()} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 rounded-lg transition-colors">
            <Plus size={16} />
          </button>
        </div>
        {folders.map(f => <FolderNode key={f.id} folder={f} onDelete={deleteFolder} />)}
      </div>
    </div>
  );
}
