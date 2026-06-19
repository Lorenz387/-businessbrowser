import { useState } from 'react'
import { defaultActivities, defaultConnections } from '../data/mockData'

export default function RightSidebar() {
  const [connections, setConnections] = useState(defaultConnections)

  const toggleConnection = (id: string) => {
    setConnections(prev => prev.map(c => c.id === id ? { ...c, connected: !c.connected } : c))
  }

  return (
    <div className="fixed right-0 top-0 h-screen w-80 bg-white border-l border-slate-200 flex flex-col z-20 overflow-y-auto">
      <div className="p-5 border-b border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-3">Aktivität</h3>
        <div className="space-y-3">
          {defaultActivities.map(activity => (
            <div key={activity.id} className="flex items-start gap-3">
              <div className={`w-6 h-6 rounded-full ${activity.avatarColor} flex-shrink-0 mt-0.5`} />
              <div>
                <div className="text-xs text-slate-700">{activity.description}</div>
                <div className="text-xs text-slate-400 mt-0.5">{activity.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-800">Verbindungen</h3>
          <a href="/verbindungen" className="text-xs text-violet-600 hover:text-violet-700">Verwalten →</a>
        </div>
        <div className="space-y-2">
          {connections.map(conn => (
            <div key={conn.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 bg-gradient-to-br ${conn.color} rounded-lg flex items-center justify-center text-xs font-bold text-white`}>
                  {conn.icon}
                </div>
                <span className="text-sm text-slate-700">{conn.name}</span>
              </div>
              <button
                onClick={() => toggleConnection(conn.id)}
                className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${
                  conn.connected
                    ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-violet-100 hover:text-violet-700'
                }`}
              >
                {conn.connected ? 'Verbunden' : 'Verbinden'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
