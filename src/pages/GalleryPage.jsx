import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Download, Trash2, Copy, Play, Search, Filter } from 'lucide-react'
import { toggleFavorite, deleteVideo } from '../store/videoStore'
import { MODELS } from '../lib/models'
import VideoPlayer from '../components/VideoPlayer'

const FILTERS = ['All', 'Favorites', ...MODELS.map(m => m.name)]
const SORT = ['Newest', 'Oldest']

export default function GalleryPage({ gallery, onUpdate, favoritesOnly }) {
  const [filter, setFilter] = useState(favoritesOnly ? 'Favorites' : 'All')
  const [sort, setSort] = useState('Newest')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)

  let items = [...gallery]
  if (filter === 'Favorites') items = items.filter(v => v.favorite)
  else if (filter !== 'All') items = items.filter(v => v.model === filter)
  if (search) items = items.filter(v => v.prompt?.toLowerCase().includes(search.toLowerCase()))
  if (sort === 'Oldest') items.reverse()

  const handleFavorite = (id) => {
    const updated = toggleFavorite(id)
    onUpdate(updated)
  }

  const handleDelete = (id) => {
    const updated = deleteVideo(id)
    onUpdate(updated)
    if (selected?.id === id) setSelected(null)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">{favoritesOnly ? 'Favorites' : 'Gallery'}</h1>
          <p className="text-sm text-white/40 mt-0.5">{items.length} video{items.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 glass rounded-xl px-3 py-2 border border-white/8">
            <Search className="w-3.5 h-3.5 text-white/30" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search prompts..."
              className="bg-transparent text-sm text-white/70 placeholder-white/20 w-40"
            />
          </div>
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="glass rounded-xl px-3 py-2 text-xs text-white/50 border border-white/8 bg-transparent cursor-pointer"
          >
            {SORT.map(s => <option key={s} value={s} className="bg-[#0a0a0f]">{s}</option>)}
          </select>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.slice(0, 8).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
              filter === f
                ? 'bg-violet-600/25 border-violet-500/50 text-violet-300'
                : 'bg-white/4 border-white/8 text-white/40 hover:text-white/60'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="glass rounded-2xl p-12 border border-white/8 text-center">
          <div className="text-white/20 text-sm">No videos found</div>
          <div className="text-white/10 text-xs mt-1">Generate your first video to see it here</div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <AnimatePresence>
            {items.map((v, i) => (
              <VideoCard
                key={v.id}
                video={v}
                index={i}
                onPlay={() => setSelected(v)}
                onFavorite={() => handleFavorite(v.id)}
                onDelete={() => handleDelete(v.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-8"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
              className="glass rounded-2xl border border-white/10 p-4 max-w-2xl w-full"
            >
              <VideoPlayer src={selected.url} className="w-full" />
              <div className="mt-3 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-white/70">{selected.prompt}</p>
                  <div className="flex gap-3 mt-1 text-xs text-white/30">
                    <span>{selected.model}</span>
                    <span>{selected.duration}</span>
                    <span>{selected.resolution}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleFavorite(selected.id)}
                    className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/12 transition-all"
                  >
                    <Heart className={`w-4 h-4 ${selected.favorite ? 'fill-rose-400 text-rose-400' : 'text-white/50'}`} />
                  </button>
                  {selected.url && (
                    <a href={selected.url} download className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/12 transition-all">
                      <Download className="w-4 h-4 text-white/50" />
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function VideoCard({ video, index, onPlay, onFavorite, onDelete }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.04 }}
      whileHover={{ y: -2 }}
      className="glass rounded-2xl border border-white/8 overflow-hidden group"
    >
      <div
        className="relative aspect-video bg-violet-900/20 cursor-pointer overflow-hidden"
        onClick={onPlay}
      >
        {video.url ? (
          <video src={video.url} className="w-full h-full object-cover" muted />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-8 h-8 text-violet-400/50" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Play className="w-5 h-5 text-white" />
          </div>
        </div>
        <div className="absolute top-2 right-2 text-[10px] bg-black/60 px-1.5 py-0.5 rounded-md text-white/60">
          {video.duration || '10s'}
        </div>
      </div>
      <div className="p-3">
        <p className="text-xs text-white/60 line-clamp-2 leading-relaxed">{video.prompt || 'Untitled'}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-white/25">{video.model}</span>
          <div className="flex gap-1">
            <button onClick={onFavorite} className="w-6 h-6 rounded-lg hover:bg-white/8 flex items-center justify-center transition-all cursor-pointer">
              <Heart className={`w-3.5 h-3.5 ${video.favorite ? 'fill-rose-400 text-rose-400' : 'text-white/30'}`} />
            </button>
            <button onClick={onDelete} className="w-6 h-6 rounded-lg hover:bg-red-500/10 flex items-center justify-center transition-all cursor-pointer">
              <Trash2 className="w-3.5 h-3.5 text-white/30 hover:text-red-400" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
