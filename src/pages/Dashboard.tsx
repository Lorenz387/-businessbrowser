import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, MessageSquare, Image, BarChart3, Heart, Bookmark, TrendingUp } from 'lucide-react'
import { defaultProjects, defaultFeedItems } from '../data/mockData'
import type { FeedItem } from '../types'

export default function Dashboard() {
  const navigate = useNavigate()
  const [feedItems, setFeedItems] = useState<FeedItem[]>(defaultFeedItems)

  const toggleLike = (id: string) => {
    setFeedItems(prev => prev.map(item =>
      item.id === id
        ? { ...item, liked: !item.liked, likes: item.liked ? item.likes - 1 : item.likes + 1 }
        : item
    ))
  }

  const toggleBookmark = (id: string) => {
    setFeedItems(prev => prev.map(item =>
      item.id === id ? { ...item, bookmarked: !item.bookmarked } : item
    ))
  }

  const stats = [
    { label: 'Projekte', value: '5', change: '+2', positive: true },
    { label: 'Dokumente', value: '48', change: '+12', positive: true },
    { label: 'KI Anfragen', value: '1,247', change: '+234', positive: true },
    { label: 'Generierte Bilder', value: '89', change: '+18', positive: true },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-blue-600 rounded-2xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">
          Guten Morgen, <span className="text-yellow-300">Lorenzo!</span>
        </h1>
        <p className="text-violet-200 mb-6">Was möchtest du heute erschaffen?</p>
        <div className="flex gap-3 flex-wrap">
          {[
            { label: 'Neues Dokument', icon: FileText, path: '/ki-editor' },
            { label: 'KI Chat', icon: MessageSquare, path: '/ki-chat' },
            { label: 'Bild Generieren', icon: Image, path: '/bild-generator' },
            { label: 'Analyse', icon: BarChart3, path: '/analysen' },
          ].map(action => (
            <button
              key={action.path}
              onClick={() => navigate(action.path)}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur text-white text-sm font-medium px-4 py-2 rounded-xl transition-all"
            >
              <action.icon size={16} />
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(stat => (
          <div key={stat.label} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
            <div className="text-2xl font-bold text-slate-800">{stat.value}</div>
            <div className="text-sm text-slate-500 mt-1">{stat.label}</div>
            <div className={`flex items-center gap-1 text-xs mt-2 ${stat.positive ? 'text-green-600' : 'text-red-500'}`}>
              <TrendingUp size={12} />
              {stat.change} diese Woche
            </div>
          </div>
        ))}
      </div>

      {/* Projects */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">Meine Projekte</h2>
          <button onClick={() => navigate('/projekte')} className="text-sm text-violet-600 hover:text-violet-700">
            Alle ansehen →
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {defaultProjects.slice(0, 4).map(project => (
            <div key={project.id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
              <div className={`h-16 bg-gradient-to-r ${project.color} flex items-center px-4`}>
                <span className="text-2xl">{project.icon}</span>
              </div>
              <div className="p-4">
                <div className="font-semibold text-slate-800 text-sm">{project.name}</div>
                <div className="text-xs text-slate-500 mt-1">{project.description}</div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-slate-400">{project.fileCount} Dateien</span>
                  <button className="text-xs bg-violet-50 text-violet-600 px-3 py-1 rounded-lg hover:bg-violet-100 font-medium">
                    Öffnen
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-4">Community Feed</h2>
        <div className="grid grid-cols-2 gap-4">
          {feedItems.map(item => (
            <div key={item.id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <div className={`h-32 bg-gradient-to-br ${item.gradient} flex items-end p-3`}>
                <span className="text-white font-semibold text-sm leading-tight">{item.title}</span>
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-600">
                      {item.avatar}
                    </div>
                    <div>
                      <div className="text-xs font-medium text-slate-700">@{item.username}</div>
                      <div className="text-xs text-slate-400">{item.timeAgo}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleLike(item.id)}
                      className={`flex items-center gap-1 text-xs ${item.liked ? 'text-red-500' : 'text-slate-400 hover:text-red-500'}`}
                    >
                      <Heart size={14} fill={item.liked ? 'currentColor' : 'none'} />
                      {item.likes}
                    </button>
                    <button
                      onClick={() => toggleBookmark(item.id)}
                      className={`${item.bookmarked ? 'text-violet-500' : 'text-slate-400 hover:text-violet-500'}`}
                    >
                      <Bookmark size={14} fill={item.bookmarked ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
