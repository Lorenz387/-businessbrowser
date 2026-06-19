import { useState } from 'react'
import { Sparkles, Play, Pause, Music, Download } from 'lucide-react'

const genres = ['Lo-Fi', 'Pop', 'Jazz', 'Electronic', 'Classical', 'Rock', 'R&B', 'Ambient', 'Hip-Hop']
const moods = ['Entspannt', 'Energetisch', 'Fröhlich', 'Melancholisch', 'Fokussiert', 'Romantisch', 'Episch']
const instruments = ['Klavier', 'Gitarre', 'Synthesizer', 'Streicher', 'Schlagzeug', 'Bass']
const durations = ['30 Sek.', '1 Min.', '2 Min.', '3 Min.', '5 Min.']

const noteColors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6']

interface Track {
  id: string
  title: string
  genre: string
  mood: string
  duration: string
  color: string
  bpm: number
  createdAt: string
}

export default function MusikGenerator() {
  const [title, setTitle] = useState('')
  const [genre, setGenre] = useState(genres[0])
  const [mood, setMood] = useState(moods[0])
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>(['Klavier'])
  const [duration, setDuration] = useState(durations[2])
  const [generating, setGenerating] = useState(false)
  const [tracks, setTracks] = useState<Track[]>([])
  const [playing, setPlaying] = useState<string | null>(null)
  const [progress, setProgress] = useState<Record<string, number>>({})

  const toggleInstrument = (inst: string) => {
    setSelectedInstruments(prev =>
      prev.includes(inst) ? prev.filter(i => i !== inst) : [...prev, inst]
    )
  }

  const generate = () => {
    setGenerating(true)
    setTimeout(() => {
      const newTrack: Track = {
        id: Date.now().toString(),
        title: title.trim() || `${genre} ${mood} Track`,
        genre,
        mood,
        duration,
        color: noteColors[Math.floor(Math.random() * noteColors.length)],
        bpm: 80 + Math.floor(Math.random() * 80),
        createdAt: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
      }
      setTracks(prev => [newTrack, ...prev])
      setGenerating(false)
    }, 2000)
  }

  const togglePlay = (id: string) => {
    if (playing === id) {
      setPlaying(null)
    } else {
      setPlaying(id)
      setProgress(prev => ({ ...prev, [id]: 0 }))
      const interval = setInterval(() => {
        setProgress(prev => {
          const next = (prev[id] || 0) + 1
          if (next >= 100) { clearInterval(interval); return { ...prev, [id]: 0 } }
          return { ...prev, [id]: next }
        })
      }, 150)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Musik Generator</h1>
        <p className="text-slate-500 text-sm mt-1">Komponiere KI-Musik aus Beschreibungen</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Controls */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Titel (optional)</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="z.B. Sommernacht..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Genre</label>
            <div className="flex gap-2 flex-wrap">
              {genres.map(g => (
                <button key={g} onClick={() => setGenre(g)}
                  className={`text-xs py-1.5 px-3 rounded-lg border transition-all ${genre === g ? 'bg-violet-600 text-white border-violet-600' : 'border-slate-200 text-slate-600 hover:border-violet-300'}`}>
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Stimmung</label>
            <div className="flex gap-2 flex-wrap">
              {moods.map(m => (
                <button key={m} onClick={() => setMood(m)}
                  className={`text-xs py-1.5 px-3 rounded-lg border transition-all ${mood === m ? 'bg-violet-600 text-white border-violet-600' : 'border-slate-200 text-slate-600 hover:border-violet-300'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Instrumente</label>
            <div className="flex gap-2 flex-wrap">
              {instruments.map(inst => (
                <button key={inst} onClick={() => toggleInstrument(inst)}
                  className={`text-xs py-1.5 px-3 rounded-lg border transition-all ${selectedInstruments.includes(inst) ? 'bg-violet-600 text-white border-violet-600' : 'border-slate-200 text-slate-600 hover:border-violet-300'}`}>
                  {inst}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Länge</label>
            <div className="flex gap-2 flex-wrap">
              {durations.map(d => (
                <button key={d} onClick={() => setDuration(d)}
                  className={`text-xs py-1.5 px-3 rounded-lg border transition-all ${duration === d ? 'bg-violet-600 text-white border-violet-600' : 'border-slate-200 text-slate-600 hover:border-violet-300'}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          <button onClick={generate} disabled={generating}
            className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50">
            {generating
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Komponiert...</>
              : <><Sparkles size={16} />Musik Generieren</>}
          </button>
        </div>

        {/* Tracks */}
        <div className="col-span-2">
          {tracks.length === 0 && !generating && (
            <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed border-slate-200 rounded-2xl">
              <Music size={40} className="text-slate-300 mb-3" />
              <p className="text-slate-400 text-sm">Deine Tracks erscheinen hier</p>
            </div>
          )}
          <div className="space-y-3">
            {tracks.map(track => (
              <div key={track.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                <div className="flex items-center gap-4">
                  <button onClick={() => togglePlay(track.id)}
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white flex-shrink-0 hover:scale-105 transition-transform"
                    style={{ background: track.color }}>
                    {playing === track.id ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{track.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{track.genre} · {track.mood} · {track.bpm} BPM · {track.duration}</p>
                    <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-150"
                        style={{ width: `${playing === track.id ? (progress[track.id] || 0) : 0}%`, background: track.color }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-xs text-slate-400 mr-2">{track.createdAt}</span>
                    <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                      <Download size={15} />
                    </button>
                  </div>
                </div>
                {/* Waveform visualization */}
                {playing === track.id && (
                  <div className="mt-3 flex items-center gap-0.5 h-8">
                    {Array.from({ length: 40 }).map((_, i) => (
                      <div key={i} className="flex-1 rounded-full animate-pulse"
                        style={{ height: `${20 + Math.random() * 80}%`, background: track.color, opacity: 0.7, animationDelay: `${i * 0.05}s` }} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
