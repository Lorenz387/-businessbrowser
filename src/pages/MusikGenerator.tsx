import { useState } from 'react';
import { Sparkles, Play, Pause, Music } from 'lucide-react';

const GENRES = ['Pop', 'Jazz', 'Electronic', 'Classical', 'Lo-Fi', 'Rock', 'R&B', 'Ambient'];
const MOODS = ['Fröhlich', 'Entspannt', 'Energetisch', 'Romantisch', 'Fokussiert', 'Episch'];

interface Track { title: string; genre: string; mood: string; duration: string; color: string; }

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];

export default function MusikGenerator() {
  const [prompt, setPrompt] = useState('');
  const [genre, setGenre] = useState('Lo-Fi');
  const [mood, setMood] = useState('Entspannt');
  const [loading, setLoading] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playing, setPlaying] = useState<number | null>(null);

  const generate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    const durations = ['2:34', '3:12', '4:05', '2:58', '3:45'];
    setTracks(prev => [{ title: prompt.trim(), genre, mood, duration: durations[Math.floor(Math.random() * durations.length)], color: COLORS[prev.length % COLORS.length] }, ...prev]);
    setLoading(false);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Musik-Generator</h1>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Beschreibung</label>
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="z.B. Ruhige Hintergrundmusik zum Arbeiten..." rows={2} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Genre</label>
              <div className="flex flex-wrap gap-2">{GENRES.map(g => <button key={g} onClick={() => setGenre(g)} className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${genre === g ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{g}</button>)}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Stimmung</label>
              <div className="flex flex-wrap gap-2">{MOODS.map(m => <button key={m} onClick={() => setMood(m)} className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${mood === m ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{m}</button>)}</div>
            </div>
          </div>
          <button onClick={generate} disabled={!prompt.trim() || loading} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">
            <Sparkles size={16} /> {loading ? 'Wird komponiert...' : 'Musik generieren'}
          </button>
        </div>
        <div className="space-y-3">
          {tracks.map((track, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0" style={{ background: track.color }}>
                <Music size={18} />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-800 text-sm">{track.title}</p>
                <p className="text-xs text-gray-400">{track.genre} • {track.mood}</p>
              </div>
              <span className="text-xs text-gray-400">{track.duration}</span>
              <button onClick={() => setPlaying(playing === i ? null : i)} className="w-9 h-9 rounded-full flex items-center justify-center transition-colors" style={{ background: playing === i ? track.color : '#f1f5f9' }}>
                {playing === i ? <Pause size={15} className="text-white" /> : <Play size={15} className="text-gray-600 ml-0.5" />}
              </button>
            </div>
          ))}
          {tracks.length === 0 && !loading && (
            <div className="text-center py-16 text-gray-400">
              <div className="text-6xl mb-3">🎵</div>
              <p className="text-lg font-medium text-gray-500">Noch keine Musik generiert</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
