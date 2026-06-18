import { useState } from 'react';
import { Sparkles, Play } from 'lucide-react';

const STYLES = ['Cinematic', 'Animation', 'Documentary', 'Short Reel', 'Tutorial'];
const DURATIONS = ['15 Sek.', '30 Sek.', '60 Sek.', '3 Min.'];

interface GeneratedVideo { prompt: string; style: string; duration: string; gradient: string; }

const GRADIENTS = ['from-purple-600 to-blue-600', 'from-orange-500 to-red-500', 'from-green-500 to-teal-500', 'from-pink-500 to-violet-500'];

export default function VideoGenerator() {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('Cinematic');
  const [duration, setDuration] = useState('30 Sek.');
  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState<GeneratedVideo[]>([]);

  const generate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 2000 + Math.random() * 1000));
    setVideos(prev => [{ prompt: prompt.trim(), style, duration, gradient: GRADIENTS[prev.length % GRADIENTS.length] }, ...prev]);
    setLoading(false);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Video-Generator</h1>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Video-Beschreibung</label>
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Beschreibe das Video..." rows={3} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Stil</label>
              <div className="flex flex-wrap gap-2">
                {STYLES.map(s => <button key={s} onClick={() => setStyle(s)} className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${style === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{s}</button>)}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Länge</label>
              <div className="flex flex-wrap gap-2">
                {DURATIONS.map(d => <button key={d} onClick={() => setDuration(d)} className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${duration === d ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{d}</button>)}
              </div>
            </div>
          </div>
          <button onClick={generate} disabled={!prompt.trim() || loading} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">
            <Sparkles size={16} /> {loading ? 'Wird generiert...' : 'Video erstellen'}
          </button>
        </div>
        {videos.map((v, i) => (
          <div key={i} className={`rounded-2xl bg-gradient-to-br ${v.gradient} p-6 mb-4 text-white relative overflow-hidden`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold mb-1">{v.prompt}</p>
                <p className="text-sm text-white/70">{v.style} • {v.duration}</p>
              </div>
              <button className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors">
                <Play size={20} className="ml-1" />
              </button>
            </div>
          </div>
        ))}
        {videos.length === 0 && !loading && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-6xl mb-3">🎬</div>
            <p className="text-lg font-medium text-gray-500">Noch keine Videos</p>
          </div>
        )}
      </div>
    </div>
  );
}
