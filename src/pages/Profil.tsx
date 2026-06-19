import { useState } from 'react'
import { Camera, Edit2, Heart, MessageCircle, Bookmark, Users, Star } from 'lucide-react'

const publicPosts = [
  { id: '1', title: 'KI-Workflow für Content Creator', gradient: 'from-violet-500 to-purple-600', likes: 89, comments: 12 },
  { id: '2', title: 'Mein Marketing-Framework 2026', gradient: 'from-blue-500 to-cyan-500', likes: 142, comments: 28 },
  { id: '3', title: 'Mindmap: Produktstrategie', gradient: 'from-green-500 to-teal-500', likes: 67, comments: 9 },
  { id: '4', title: 'Top Prompts für Business', gradient: 'from-orange-500 to-red-500', likes: 203, comments: 44 },
]

export default function Profil() {
  const [bio, setBio] = useState('Content Creator & KI-Enthusiast 🚀 | Ich teile Workflows, Templates und KI-Tipps.')
  const [editingBio, setEditingBio] = useState(false)
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())

  const toggleLike = (id: string) => {
    setLikedPosts(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Banner */}
      <div className="relative mb-16">
        <div className="h-40 bg-gradient-to-br from-violet-600 via-purple-600 to-blue-600 rounded-2xl overflow-hidden">
          <button className="absolute top-3 right-3 bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1.5 rounded-lg backdrop-blur flex items-center gap-1.5 transition-colors">
            <Camera size={13} /> Banner ändern
          </button>
        </div>
        {/* Avatar */}
        <div className="absolute -bottom-12 left-6 group">
          <div className="w-24 h-24 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full border-4 border-white flex items-center justify-center text-white text-3xl font-bold shadow-lg">
            LP
          </div>
          <button className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera size={18} className="text-white" />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Lorenz P.</h1>
          <p className="text-slate-500 text-sm">@lorenzp · Pro Plan</p>
          {editingBio ? (
            <div className="mt-2">
              <textarea value={bio} onChange={e => setBio(e.target.value)}
                className="w-full border border-slate-200 rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
                rows={2} />
              <button onClick={() => setEditingBio(false)}
                className="mt-1 bg-violet-600 text-white text-xs px-3 py-1 rounded-lg">Speichern</button>
            </div>
          ) : (
            <p className="text-sm text-slate-600 mt-2 max-w-md">{bio}</p>
          )}
        </div>
        <button onClick={() => setEditingBio(true)}
          className="flex items-center gap-2 border border-slate-200 text-slate-600 text-sm px-4 py-2 rounded-xl hover:bg-slate-50 transition-colors">
          <Edit2 size={14} /> Profil bearbeiten
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Projekte', value: '12', icon: Star },
          { label: 'Follower', value: '847', icon: Users },
          { label: 'Likes', value: '2.4K', icon: Heart },
          { label: 'Beiträge', value: '34', icon: Bookmark },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-100 p-4 text-center shadow-sm">
            <Icon size={18} className="text-violet-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-slate-800">{value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Public Posts */}
      <div>
        <h2 className="font-bold text-slate-800 mb-4">Öffentliche Beiträge</h2>
        <div className="grid grid-cols-2 gap-4">
          {publicPosts.map(post => (
            <div key={post.id} className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className={`h-28 bg-gradient-to-br ${post.gradient} flex items-end p-3`}>
                <span className="text-white font-semibold text-sm leading-tight">{post.title}</span>
              </div>
              <div className="p-3 flex items-center gap-4">
                <button onClick={() => toggleLike(post.id)}
                  className={`flex items-center gap-1.5 text-sm ${likedPosts.has(post.id) ? 'text-red-500' : 'text-slate-400 hover:text-red-400'} transition-colors`}>
                  <Heart size={15} fill={likedPosts.has(post.id) ? 'currentColor' : 'none'} />
                  {post.likes + (likedPosts.has(post.id) ? 1 : 0)}
                </button>
                <button className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-blue-500 transition-colors">
                  <MessageCircle size={15} /> {post.comments}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
