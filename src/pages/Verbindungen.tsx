import { useState } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { defaultConnections } from '../data/mockData'
import type { Connection } from '../types'
import { CheckCircle, XCircle, Plus } from 'lucide-react'

const allApps = [
  { id: 'youtube', name: 'YouTube', icon: '▶️', color: 'from-red-500 to-red-600', category: 'Social Media' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'in', color: 'from-blue-600 to-blue-700', category: 'Social Media' },
  { id: 'twitter', name: 'X / Twitter', icon: '𝕏', color: 'from-gray-800 to-gray-900', category: 'Social Media' },
  { id: 'github', name: 'GitHub', icon: '⚙', color: 'from-gray-700 to-gray-800', category: 'Entwicklung' },
  { id: 'figma', name: 'Figma', icon: 'F', color: 'from-pink-500 to-orange-500', category: 'Design' },
  { id: 'trello', name: 'Trello', icon: '▦', color: 'from-blue-500 to-blue-600', category: 'Produktivität' },
  { id: 'asana', name: 'Asana', icon: '◎', color: 'from-red-400 to-pink-500', category: 'Produktivität' },
  { id: 'spotify', name: 'Spotify', icon: '♪', color: 'from-green-500 to-green-600', category: 'Medien' },
  { id: 'dropbox', name: 'Dropbox', icon: '⬡', color: 'from-blue-400 to-blue-500', category: 'Speicher' },
  { id: 'onedrive', name: 'OneDrive', icon: '☁', color: 'from-blue-500 to-cyan-500', category: 'Speicher' },
  { id: 'zapier', name: 'Zapier', icon: '⚡', color: 'from-orange-500 to-orange-600', category: 'Automation' },
  { id: 'make', name: 'Make', icon: 'M', color: 'from-violet-500 to-purple-600', category: 'Automation' },
]

export default function Verbindungen() {
  const [connections, setConnections] = useLocalStorage<Connection[]>('connections', defaultConnections)
  const [filter, setFilter] = useState('Alle')

  const categories = ['Alle', ...new Set(allApps.map(a => a.category))]

  const isConnected = (id: string) => connections.some(c => c.id === id && c.connected)

  const toggle = (app: typeof allApps[0]) => {
    const existing = connections.find(c => c.id === app.id)
    if (existing) {
      setConnections(prev => prev.map(c => c.id === app.id ? { ...c, connected: !c.connected } : c))
    } else {
      const newConn: Connection = { id: app.id, name: app.name, icon: app.icon, connected: true, color: app.color }
      setConnections(prev => [...prev, newConn])
    }
  }

  const filtered = allApps.filter(a => filter === 'Alle' || a.category === filter)
  const connectedCount = [...connections, ...allApps.map(a => ({ id: a.id }))].filter(
    (v, i, arr) => arr.findIndex(x => x.id === v.id) === i
  ).filter(a => connections.find(c => c.id === a.id && c.connected)).length

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Verbindungen</h1>
          <p className="text-slate-500 text-sm mt-1">{connectedCount} Apps verbunden</p>
        </div>
        <button className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90">
          <Plus size={16} /> Eigene API
        </button>
      </div>

      {/* Connected overview */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-6 shadow-sm">
        <h2 className="font-semibold text-slate-800 mb-4 text-sm">Verbundene Apps</h2>
        <div className="flex gap-3 flex-wrap">
          {connections.filter(c => c.connected).map(conn => (
            <div key={conn.id} className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-3 py-2">
              <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${conn.color} flex items-center justify-center text-white text-xs font-bold`}>
                {typeof conn.icon === 'string' ? conn.icon.charAt(0) : conn.icon}
              </div>
              <span className="text-sm text-slate-700">{conn.name}</span>
              <CheckCircle size={14} className="text-green-500" />
            </div>
          ))}
          {connections.filter(c => c.connected).length === 0 && (
            <p className="text-sm text-slate-400">Noch keine Apps verbunden</p>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-5">
        {categories.map(cat => (
          <button key={cat} onClick={() => setFilter(cat)}
            className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-all ${filter === cat ? 'bg-violet-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
            {cat}
          </button>
        ))}
      </div>

      {/* App grid */}
      <div className="grid grid-cols-3 gap-3">
        {filtered.map(app => {
          const connected = isConnected(app.id)
          return (
            <div key={app.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${app.color} flex items-center justify-center text-white text-sm font-bold`}>
                  {app.icon}
                </div>
                <div>
                  <p className="font-medium text-slate-800 text-sm">{app.name}</p>
                  <p className="text-xs text-slate-400">{app.category}</p>
                </div>
              </div>
              <button onClick={() => toggle(app)}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                  connected
                    ? 'bg-green-50 text-green-700 hover:bg-red-50 hover:text-red-600'
                    : 'bg-violet-50 text-violet-700 hover:bg-violet-100'
                }`}>
                {connected ? <><CheckCircle size={13} /> Verbunden</> : <><Plus size={13} /> Verbinden</>}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
