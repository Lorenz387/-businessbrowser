import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, Volume2, VolumeX, Maximize2, RotateCcw } from 'lucide-react'

export default function VideoPlayer({ src, thumbnail, className = '' }) {
  const ref = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [hovered, setHovered] = useState(false)

  const toggle = () => {
    if (!ref.current) return
    if (playing) { ref.current.pause(); setPlaying(false) }
    else { ref.current.play(); setPlaying(true) }
  }

  const onTimeUpdate = () => {
    if (!ref.current) return
    setProgress(ref.current.currentTime / (ref.current.duration || 1))
  }

  const seek = (e) => {
    if (!ref.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    ref.current.currentTime = ratio * ref.current.duration
  }

  const fullscreen = () => ref.current?.requestFullscreen?.()

  if (!src) {
    return (
      <div className={`relative rounded-2xl overflow-hidden bg-white/3 border border-white/8 flex items-center justify-center ${className}`} style={{ minHeight: 300 }}>
        {thumbnail
          ? <img src={thumbnail} alt="" className="w-full h-full object-cover absolute inset-0" />
          : <div className="text-white/20 text-sm">No preview</div>
        }
      </div>
    )
  }

  return (
    <div
      className={`relative rounded-2xl overflow-hidden bg-black border border-white/8 group ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <video
        ref={ref}
        src={src}
        className="w-full h-full object-cover"
        muted={muted}
        loop
        onTimeUpdate={onTimeUpdate}
        onEnded={() => setPlaying(false)}
        onClick={toggle}
        poster={thumbnail}
        style={{ minHeight: 300 }}
      />

      {/* Controls overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: hovered || !playing ? 1 : 0 }}
        className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-3 pointer-events-none"
      >
        <div className="pointer-events-auto">
          {/* Progress bar */}
          <div className="h-1 bg-white/20 rounded-full mb-3 cursor-pointer" onClick={seek}>
            <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${progress * 100}%` }} />
          </div>
          {/* Buttons */}
          <div className="flex items-center gap-2">
            <button onClick={toggle} className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-all">
              {playing ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white" />}
            </button>
            <button onClick={() => setMuted(m => !m)} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
              {muted ? <VolumeX className="w-3.5 h-3.5 text-white/70" /> : <Volume2 className="w-3.5 h-3.5 text-white/70" />}
            </button>
            <div className="flex-1" />
            <button onClick={() => { if (ref.current) { ref.current.currentTime = 0; setProgress(0) } }} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
              <RotateCcw className="w-3.5 h-3.5 text-white/70" />
            </button>
            <button onClick={fullscreen} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
              <Maximize2 className="w-3.5 h-3.5 text-white/70" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
