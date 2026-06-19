import { useState } from 'react'
import { Sparkles, Play, Pause, Download, Clock } from 'lucide-react'

const styles = ['Cinematic', 'Animation', 'Documentary', 'Short Reel', 'Tutorial', 'Vlog']
const durations = ['15 Sek.', '30 Sek.', '60 Sek.', '3 Min.', '5 Min.']
const resolutions = ['720p', '1080p', '4K']

const gradients = [
  'from-purple-600 to-blue-600',
  'from-orange-500 to-red-600',
  'from-green-500 to-teal-600',
  'from-pink-500 to-violet-600',
  'from-cyan-500 to-blue-600',
  'from-yellow-500 to-orange-600',
]

interface GeneratedVideo {
  id: string
  prompt: string
  style: string
  duration: string
  resolution: string
  gradient: string
  createdAt: string
}

export default function VideoGenerator() {
  const [prompt, setPrompt] = useState('')
  const [style, setStyle] = useState(styles[0])
  const [duration, setDuration] = useState(durations[1])
  const [resolution, setResolution] = useState(resolutions[1])
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [videos, setVideos] = useState<GeneratedVideo[]>([])
  const [playing, setPlaying] = useState<string | null>(null)

  const generate = () => {
    if (!prompt.trim()) return
    setGenerating(true)
    setProgress(0)
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(interval); return 100 }
        return p + Math.random() * 15
      })
    }, 300)
    setTimeout(() => {
      clearInterval(interval)
      setProgress(100)
      const newVideo: GeneratedVideo = {
        id: Date.now().toString(),
        prompt,
        style,
        duration,
        resolution,
        gradient: gradients[Math.floor(Math.random() * gradients.length)],
        createdAt: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
      }
      setVideos(prev => [newVideo, ...prev])
      setGenerating(false)
      setProgress(0)
    }, 3000)
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Video Generator</h1>
        <p className="text-slate-500 text-sm mt-1">Erstelle KI-Videos aus Text</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Controls */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Beschreibung</label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Beschreibe dein Video..."
              className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
              rows={4}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Stil</label>
            <div className="grid grid-cols-2 gap-2">
              {styles.map(s => (
                <button key={s} onClick={() => setStyle(s)}
                  className={`text-xs py-2 px-3 rounded-lg border transition-all ${style === s ? 'bg-violet-600 text-white border-violet-600' : 'border-slate-200 text-slate-600 hover:border-violet-300'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Länge</label>
            <div className="flex gap-2 flex-wrap">
              {durations.map(d => (
                <button key={d} onClick={() => setDuration(d)}
                  className={`text-xs py-2 px-3 rounded-lg border transition-all ${duration === d ? 'bg-violet-600 text-white border-violet-600' : 'border-slate-200 text-slate-600 hover:border-violet-300'}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Auflösung</label>
            <div className="flex gap-2">
              {resolutions.map(r => (
                <button key={r} onClick={() => setResolution(r)}
                  className={`text-xs py-2 px-3 rounded-lg border flex-1 transition-all ${resolution === r ? 'bg-violet-600 text-white border-violet-600' : 'border-slate-200 text-slate-600 hover:border-violet-300'}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          <button onClick={generate} disabled={!prompt.trim() || generating}
            className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity">
            {generating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generiert... {Math.round(Math.min(progress, 99))}%
              </>
            ) : (
              <><Sparkles size={16} /> Video Generieren</>
            )}
          </button>

          {generating && (
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div className="bg-gradient-to-r from-violet-500 to-purple-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
            </div>
          )}
        </div>

        {/* Output */}
        <div className="col-span-2">
          {videos.length === 0 && !generating && (
            <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed border-slate-200 rounded-2xl">
              <Play size={40} className="text-slate-300 mb-3" />
              <p className="text-slate-400 text-sm">Deine generierten Videos erscheinen hier</p>
            </div>
          )}
          <div className="space-y-4">
            {videos.map(video => (
              <div key={video.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                <div className={`h-40 bg-gradient-to-br ${video.gradient} relative flex items-center justify-center`}>
                  <button
                    onClick={() => setPlaying(playing === video.id ? null : video.id)}
                    className="w-14 h-14 bg-white/30 hover:bg-white/50 backdrop-blur rounded-full flex items-center justify-center transition-all"
                  >
                    {playing === video.id
                      ? <Pause size={22} className="text-white" />
                      : <Play size={22} className="text-white ml-1" />}
                  </button>
                  <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/40 text-white text-xs px-2 py-1 rounded-lg">
                    <Clock size={11} /> {video.duration}
                  </div>
                  <div className="absolute top-3 left-3 bg-black/40 text-white text-xs px-2 py-1 rounded-lg">{video.resolution}</div>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800 truncate max-w-xs">{video.prompt}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{video.style} · {video.createdAt}</p>
                  </div>
                  <button className="flex items-center gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg transition-colors">
                    <Download size={13} /> Speichern
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
