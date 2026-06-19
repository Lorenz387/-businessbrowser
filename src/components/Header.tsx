import { useState, useRef, useEffect } from 'react'
import { Search, Bell, Plus, Check, User, Settings, LogOut, ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { defaultNotifications } from '../data/mockData'

export default function Header() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState(defaultNotifications)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [search, setSearch] = useState('')
  const profileRef = useRef<HTMLDivElement>(null)
  const unread = notifications.filter(n => !n.read).length

  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })))

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfile(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center gap-4 px-6 sticky top-0 z-10">
      <div className="flex-1 relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Suche in LifeOS..."
          className="w-full max-w-md bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/ki-editor')}
          className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus size={16} />
          Erstellen
        </button>

        <div className="relative">
          <button
            onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false) }}
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
                  <Check size={12} /> Alle gelesen
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

        <div className="relative" ref={profileRef}>
          <button
            onClick={() => { setShowProfile(!showProfile); setShowNotifications(false) }}
            className="flex items-center gap-2 hover:bg-slate-100 rounded-lg px-2 py-1 transition-colors"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
              LP
            </div>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {showProfile && (
            <div className="absolute right-0 top-12 w-52 bg-white rounded-xl shadow-xl border border-slate-200 z-50 py-1">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-800">Lorenz P.</p>
                <p className="text-xs text-slate-400">lorenzpannicke14@gmail.com</p>
              </div>
              {[
                { label: 'Mein Profil', icon: User, path: '/profil' },
                { label: 'Einstellungen', icon: Settings, path: '/einstellungen' },
              ].map(({ label, icon: Icon, path }) => (
                <button key={path} onClick={() => { navigate(path); setShowProfile(false) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                  <Icon size={15} className="text-slate-400" /> {label}
                </button>
              ))}
              <div className="border-t border-slate-100 mt-1">
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                  <LogOut size={15} /> Abmelden
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
