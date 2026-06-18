import { useState } from 'react'
import { Search, Bell, Plus, Check } from 'lucide-react'
import { defaultNotifications } from '../data/mockData'

export default function Header() {
  const [notifications, setNotifications] = useState(defaultNotifications)
  const [showNotifications, setShowNotifications] = useState(false)
  const unread = notifications.filter(n => !n.read).length

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center gap-4 px-6 sticky top-0 z-10">
      <div className="flex-1 relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Suche in LifeOS..."
          className="w-full max-w-md bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        />
      </div>

      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
          <Plus size={16} />
          Erstellen
        </button>

        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Bell size={20} className="text-slate-600" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unread}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50">
              <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <span className="font-semibold text-slate-800">Benachrichtigungen</span>
                <button onClick={markAllRead} className="text-xs text-violet-600 hover:text-violet-700 flex items-center gap-1">
                  <Check size={12} />
                  Alle gelesen
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.map(n => (
                  <div key={n.id} className={`p-3 border-b border-slate-50 ${!n.read ? 'bg-violet-50' : ''}`}>
                    <div className="text-sm text-slate-700">{n.message}</div>
                    <div className="text-xs text-slate-400 mt-1">{n.time}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold cursor-pointer">
          LP
        </div>
      </div>
    </header>
  )
}
