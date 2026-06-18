import { useState } from 'react'
import { Plus, Network } from 'lucide-react'
import type { Mindmap, MindmapNode } from '../types'

const defaultMindmaps: Mindmap[] = [
  {
    id: '1',
    name: 'Marketing Strategie',
    createdAt: '2026-06-18',
    nodes: [
      { id: 'root', label: 'Marketing', x: 300, y: 200, color: '#8b5cf6' },
      { id: 'n1', label: 'Social Media', x: 150, y: 100, parentId: 'root', color: '#3b82f6' },
      { id: 'n2', label: 'Content', x: 450, y: 100, parentId: 'root', color: '#10b981' },
      { id: 'n3', label: 'SEO', x: 150, y: 300, parentId: 'root', color: '#f59e0b' },
      { id: 'n4', label: 'Ads', x: 450, y: 300, parentId: 'root', color: '#ef4444' },
      { id: 'n5', label: 'Instagram', x: 50, y: 60, parentId: 'n1', color: '#ec4899' },
      { id: 'n6', label: 'TikTok', x: 200, y: 40, parentId: 'n1', color: '#6366f1' },
    ],
  },
]

export default function Mindmaps() {
  const [mindmaps, setMindmaps] = useState<Mindmap[]>(defaultMindmaps)
  const [selected, setSelected] = useState<Mindmap>(defaultMindmaps[0])
  const [selectedNode, setSelectedNode] = useState<string | null>(null)

  const addMindmap = () => {
    const newMap: Mindmap = {
      id: Date.now().toString(),
      name: 'Neue Mindmap',
      createdAt: new Date().toISOString().split('T')[0],
      nodes: [{ id: 'root', label: 'Hauptidee', x: 300, y: 200, color: '#8b5cf6' }],
    }
    setMindmaps(prev => [...prev, newMap])
    setSelected(newMap)
  }

  const renderConnections = (nodes: MindmapNode[]) => {
    return nodes
      .filter(n => n.parentId)
      .map(n => {
        const parent = nodes.find(p => p.id === n.parentId)
        if (!parent) return null
        return (
          <line
            key={`${n.parentId}-${n.id}`}
            x1={parent.x + 40} y1={parent.y + 16}
            x2={n.x + 40} y2={n.y + 16}
            stroke="#cbd5e1"
            strokeWidth="2"
          />
        )
      })
  }

  return (
    <div className="flex h-[calc(100vh-56px)]">
      <div className="w-56 border-r border-slate-200 bg-white flex flex-col">
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-slate-800 text-sm">Mindmaps</span>
            <button onClick={addMindmap} className="p-1 hover:bg-violet-50 rounded-lg">
              <Plus size={16} className="text-violet-600" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {mindmaps.map(mm => (
            <button
              key={mm.id}
              onClick={() => setSelected(mm)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${selected.id === mm.id ? 'bg-violet-50 text-violet-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <Network size={14} />
              {mm.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 bg-slate-50 overflow-hidden relative">
        <div className="absolute top-4 left-4 bg-white rounded-xl px-4 py-2 shadow-sm border border-slate-100">
          <span className="text-sm font-medium text-slate-700">{selected.name}</span>
        </div>
        <svg className="w-full h-full">
          {renderConnections(selected.nodes)}
          {selected.nodes.map(node => (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              onClick={() => setSelectedNode(node.id)}
              className="cursor-pointer"
            >
              <rect
                width="80" height="32" rx="16"
                fill={node.color}
                opacity={selectedNode === node.id ? 1 : 0.85}
                stroke={selectedNode === node.id ? '#fff' : 'none'}
                strokeWidth="2"
              />
              <text
                x="40" y="20"
                textAnchor="middle"
                fill="white"
                fontSize="11"
                fontWeight="500"
              >
                {node.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}
