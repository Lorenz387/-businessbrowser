import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Image, Film, Wand2, SlidersHorizontal, Columns2, RefreshCw } from 'lucide-react'
import VideoPlayer from '../components/VideoPlayer'

const EDIT_PROMPTS = [
  'Add rain',
  'Replace background',
  'Change clothing',
  'Add cinematic lighting',
  'Turn day into night',
  'Make character smile',
  'Slow motion effect',
  'Increase realism',
]

export default function EditPage() {
  const [videoSrc, setVideoSrc] = useState(null)
  const [editPrompt, setEditPrompt] = useState('')
  const [refImages, setRefImages] = useState([])
  const [compareMode, setCompareMode] = useState('slider') // slider | side
  const [status, setStatus] = useState('idle')
  const fileRef = useRef()
  const imgRef = useRef()

  const onVideoFile = (e) => {
    const file = e.target.files?.[0]
    if (file) setVideoSrc(URL.createObjectURL(file))
  }

  const onDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('video/')) setVideoSrc(URL.createObjectURL(file))
  }

  const addRefImage = (e) => {
    const files = Array.from(e.target.files || [])
    const urls = files.map(f => URL.createObjectURL(f))
    setRefImages(r => [...r, ...urls].slice(0, 3))
  }

  const startEdit = async () => {
    if (!videoSrc || !editPrompt.trim()) return
    setStatus('processing')
    await new Promise(r => setTimeout(r, 3000))
    setStatus('done')
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Edit Video</h1>
        <p className="text-sm text-white/40 mt-0.5">Upload a video and describe the changes you want</p>
      </div>

      <div className="grid grid-cols-5 gap-5">
        <div className="col-span-3 space-y-4">
          {/* Upload area */}
          {!videoSrc ? (
            <motion.div
              onDrop={onDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              whileHover={{ scale: 1.01 }}
              className="glass rounded-2xl border-2 border-dashed border-white/15 p-12 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-violet-500/40 transition-all"
            >
              <div className="w-12 h-12 rounded-2xl bg-violet-600/15 flex items-center justify-center border border-violet-500/20">
                <Upload className="w-6 h-6 text-violet-400" />
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-white/70">Drag & drop your video</div>
                <div className="text-xs text-white/30 mt-1">or click to browse</div>
              </div>
              <div className="flex gap-2 mt-1">
                {['MP4', 'MOV', 'AVI', 'WEBM'].map(f => (
                  <span key={f} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/30">{f}</span>
                ))}
              </div>
              <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={onVideoFile} />
            </motion.div>
          ) : (
            <div>
              <VideoPlayer src={videoSrc} className="w-full" />
              <button onClick={() => setVideoSrc(null)} className="mt-2 text-xs text-white/30 hover:text-white/50 transition-colors">
                Remove video
              </button>
            </div>
          )}

          {/* Edit prompt */}
          <div className="glass rounded-2xl p-4 border border-white/8">
            <label className="text-xs font-semibold text-white/40 mb-2 block">EDITING PROMPT</label>
            <textarea
              value={editPrompt}
              onChange={e => setEditPrompt(e.target.value)}
              placeholder="Describe what you want to change..."
              rows={3}
              className="w-full bg-transparent text-white/90 text-sm resize-none placeholder-white/20"
            />
            <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-white/5">
              {EDIT_PROMPTS.map(p => (
                <button
                  key={p}
                  onClick={() => setEditPrompt(p)}
                  className="text-[11px] px-2 py-1 rounded-lg bg-white/4 border border-white/8 text-white/50 hover:border-violet-500/30 hover:text-violet-300 transition-all cursor-pointer"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Reference media */}
          <div className="glass rounded-2xl p-4 border border-white/8">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold text-white/40">REFERENCE MEDIA</label>
              <span className="text-[10px] text-white/25">Up to 3 images</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {refImages.map((url, i) => (
                <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-white/10">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setRefImages(r => r.filter((_, j) => j !== i))}
                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 flex items-center justify-center text-white/70 text-[10px]"
                  >×</button>
                </div>
              ))}
              {refImages.length < 3 && (
                <button
                  onClick={() => imgRef.current?.click()}
                  className="w-16 h-16 rounded-xl border-2 border-dashed border-white/15 flex items-center justify-center hover:border-violet-500/40 transition-all cursor-pointer"
                >
                  <Image className="w-5 h-5 text-white/25" />
                </button>
              )}
              <input ref={imgRef} type="file" accept="image/*" multiple className="hidden" onChange={addRefImage} />
            </div>
          </div>

          <motion.button
            onClick={startEdit}
            disabled={!videoSrc || !editPrompt.trim() || status === 'processing'}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className={`w-full py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
              videoSrc && editPrompt.trim() && status !== 'processing'
                ? 'bg-gradient-to-r from-violet-600 to-purple-500 text-white glow-accent cursor-pointer'
                : 'bg-white/5 text-white/30 cursor-not-allowed border border-white/8'
            }`}
          >
            <Wand2 className="w-4 h-4" />
            {status === 'processing' ? 'Processing...' : 'Apply Edits'}
          </motion.button>
        </div>

        {/* Right panel */}
        <div className="col-span-2 space-y-4">
          <div className="glass rounded-2xl p-4 border border-white/8">
            <div className="flex items-center gap-2 mb-3">
              <SlidersHorizontal className="w-4 h-4 text-white/40" />
              <span className="text-xs font-semibold text-white/40">COMPARISON MODE</span>
            </div>
            <div className="flex gap-2">
              {[{ id: 'slider', label: 'Slider', icon: SlidersHorizontal }, { id: 'side', label: 'Side by Side', icon: Columns2 }].map(m => (
                <button
                  key={m.id}
                  onClick={() => setCompareMode(m.id)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    compareMode === m.id
                      ? 'bg-violet-600/20 border border-violet-500/40 text-violet-300'
                      : 'bg-white/4 border border-white/8 text-white/40 hover:text-white/60'
                  }`}
                >
                  <m.icon className="w-3 h-3" />
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence>
            {status === 'done' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl p-4 border border-emerald-500/20">
                <div className="text-sm font-semibold text-emerald-400 mb-1">Edit applied!</div>
                <p className="text-xs text-white/40">
                  This is a preview environment. Connect a real AI editing API to see the result.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="glass rounded-2xl p-4 border border-white/8">
            <div className="text-xs font-semibold text-white/40 mb-3">EDITING TOOLS</div>
            <div className="space-y-2 text-xs text-white/40">
              <div className="flex items-center gap-2"><Film className="w-3.5 h-3.5" /> Video-to-Video transfer</div>
              <div className="flex items-center gap-2"><RefreshCw className="w-3.5 h-3.5" /> Loop playback</div>
              <div className="flex items-center gap-2"><Columns2 className="w-3.5 h-3.5" /> Before/After compare</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
