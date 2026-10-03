import { motion } from 'framer-motion'
import { Clock, Pin, ListOrdered, Activity, Play, Heart } from 'lucide-react'
import { MODELS } from '../lib/models'

export default function RightPanel({ gallery, queue, onSelect }) {
  const recent = gallery.slice(0, 5)
  const pinned = gallery.filter(v => v.favorite).slice(0, 3)

  return (
    <aside className="fixed right-0 top-0 h-screen w-56 flex flex-col glass border-l border-white/8 z-20 overflow-y-auto">
      <div className="px-4 py-5 border-b border-white/8">
        <div className="text-xs font-semibold tracking-widest text-white/30">WORKSPACE</div>
      </div>

      <div className="flex-1 px-3 py-3 space-y-5 overflow-y-auto">
        {/* Recent */}
        <Section icon={Clock} label="Recent Videos">
          {recent.length === 0 && <EmptyHint text="No videos yet" />}
          {recent.map(v => <VideoThumb key={v.id} video={v} onClick={() => onSelect(v)} />)}
        </Section>

        {/* Pinned */}
        <Section icon={Pin} label="Pinned Creations">
          {pinned.length === 0 && <EmptyHint text="Favorite a video to pin it" />}
          {pinned.map(v => <VideoThumb key={v.id} video={v} onClick={() => onSelect(v)} pinned />)}
        </Section>

        {/* Queue */}
        <Section icon={ListOrdered} label="Generation Queue">
          {queue.length === 0
            ? <EmptyHint text="Queue is empty" />
            : queue.map((q, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-xl bg-white/3 border border-white/6">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}>
                  <Activity className="w-3 h-3 text-violet-400" />
                </motion.div>
                <span className="text-xs text-white/50 truncate">{q.model}</span>
              </div>
            ))
          }
        </Section>

        {/* Status */}
        <Section icon={Activity} label="System Status">
          <div className="space-y-1.5">
            {MODELS.slice(0, 4).map(m => (
              <div key={m.id} className="flex items-center justify-between">
                <span className="text-[11px] text-white/40 truncate">{m.provider}</span>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] text-emerald-400">Online</span>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </aside>
  )
}

function Section({ icon: Icon, label, children }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className="w-3 h-3 text-white/30" />
        <div className="text-[10px] font-semibold tracking-widest text-white/30">{label}</div>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function EmptyHint({ text }) {
  return <div className="text-[11px] text-white/20 italic px-1">{text}</div>
}

function VideoThumb({ video, onClick, pinned }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ x: 2 }}
      className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-white/5 transition-all cursor-pointer text-left"
    >
      <div className="w-10 h-7 rounded-lg bg-violet-900/30 border border-violet-500/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {video.url
          ? <video src={video.url} className="w-full h-full object-cover" muted />
          : <Play className="w-3 h-3 text-violet-400" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-white/60 truncate">{video.prompt?.slice(0, 28) || 'Untitled'}</div>
        <div className="text-[10px] text-white/30">{video.model}</div>
      </div>
      {pinned && <Heart className="w-3 h-3 text-rose-400 flex-shrink-0" />}
    </motion.button>
  )
}
