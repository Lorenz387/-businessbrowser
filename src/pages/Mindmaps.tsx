import { useState } from 'react';
import { Plus, X, Zap } from 'lucide-react';

interface Node { id: string; label: string; x: number; y: number; color: string; parent?: string; }

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];

const defaultNodes: Node[] = [
  { id: 'root', label: 'Mein Mindmap', x: 400, y: 280, color: '#6366f1' },
  { id: '1', label: 'Idee 1', x: 200, y: 150, color: '#ec4899', parent: 'root' },
  { id: '2', label: 'Idee 2', x: 600, y: 150, color: '#10b981', parent: 'root' },
  { id: '3', label: 'Idee 3', x: 200, y: 400, color: '#f59e0b', parent: 'root' },
  { id: '4', label: 'Idee 4', x: 600, y: 400, color: '#3b82f6', parent: 'root' },
  { id: '5', label: 'Detail A', x: 80, y: 80, color: '#8b5cf6', parent: '1' },
  { id: '6', label: 'Detail B', x: 720, y: 80, color: '#14b8a6', parent: '2' },
];

export default function Mindmaps() {
  const [nodes, setNodes] = useState<Node[]>(defaultNodes);
  const [dragging, setDragging] = useState<string | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [editing, setEditing] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const onMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === id)!;
    setDragging(id);
    setSelected(id);
    setOffset({ x: e.clientX - node.x, y: e.clientY - node.y });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setNodes(prev => prev.map(n => n.id === dragging ? { ...n, x: e.clientX - offset.x, y: e.clientY - offset.y } : n));
  };

  const addNode = () => {
    const parent = selected || 'root';
    const parentNode = nodes.find(n => n.id === parent)!;
    const newNode: Node = {
      id: Date.now().toString(),
      label: 'Neue Idee',
      x: parentNode.x + (Math.random() * 200 - 100),
      y: parentNode.y + (Math.random() * 200 - 100),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      parent,
    };
    setNodes(prev => [...prev, newNode]);
    setSelected(newNode.id);
  };

  const deleteNode = (id: string) => {
    if (id === 'root') return;
    setNodes(prev => prev.filter(n => n.id !== id && n.parent !== id));
    setSelected(null);
  };

  const startEdit = (id: string, label: string) => {
    setEditing(id);
    setEditVal(label);
  };

  const saveEdit = () => {
    if (!editVal.trim()) { setEditing(null); return; }
    setNodes(prev => prev.map(n => n.id === editing ? { ...n, label: editVal } : n));
    setEditing(null);
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between">
        <h1 className="font-bold text-gray-800">Mindmaps</h1>
        <div className="flex gap-2">
          {selected && selected !== 'root' && (
            <button onClick={() => deleteNode(selected)} className="flex items-center gap-1.5 text-sm text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
              <X size={15} /> Löschen
            </button>
          )}
          <button onClick={addNode} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
            <Plus size={15} /> Knoten hinzufügen
          </button>
        </div>
      </div>
      <div className="text-xs text-gray-400 px-6 py-2 bg-white border-b border-gray-100">
        Klicken zum Auswählen • Ziehen zum Verschieben • Doppelklick zum Bearbeiten • Knoten auswählen und dann "+ Knoten" für Verbindung
      </div>
      <div
        className="flex-1 relative overflow-hidden cursor-default select-none"
        onMouseMove={onMouseMove}
        onMouseUp={() => setDragging(null)}
        onClick={() => setSelected(null)}
        style={{ background: 'radial-gradient(circle at center, #f8faff 0%, #f1f5f9 100%)' }}
      >
        {/* SVG connections */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {nodes.filter(n => n.parent).map(n => {
            const parent = nodes.find(p => p.id === n.parent);
            if (!parent) return null;
            return (
              <line key={n.id}
                x1={parent.x} y1={parent.y} x2={n.x} y2={n.y}
                stroke={n.color} strokeWidth="2" strokeOpacity="0.5" strokeDasharray="4 2"
              />
            );
          })}
        </svg>
        {/* Nodes */}
        {nodes.map(node => (
          <div
            key={node.id}
            className={`absolute transform -translate-x-1/2 -translate-y-1/2 rounded-xl px-4 py-2.5 text-white text-sm font-medium shadow-lg cursor-grab active:cursor-grabbing transition-shadow ${selected === node.id ? 'ring-2 ring-white ring-offset-2 shadow-xl' : 'hover:shadow-xl'}`}
            style={{ left: node.x, top: node.y, background: node.color, minWidth: 80, textAlign: 'center' }}
            onMouseDown={e => onMouseDown(e, node.id)}
            onDoubleClick={e => { e.stopPropagation(); startEdit(node.id, node.label); }}
          >
            {editing === node.id ? (
              <input
                autoFocus
                value={editVal}
                onChange={e => setEditVal(e.target.value)}
                onBlur={saveEdit}
                onKeyDown={e => e.key === 'Enter' && saveEdit()}
                className="bg-transparent outline-none text-white text-sm text-center w-full"
                onClick={e => e.stopPropagation()}
              />
            ) : node.label}
          </div>
        ))}
      </div>
    </div>
  );
}
