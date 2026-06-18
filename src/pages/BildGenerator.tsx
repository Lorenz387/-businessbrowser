import { useState } from 'react';
import { Sparkles, Download } from 'lucide-react';

const STYLES = ['Realistisch', 'Künstlerisch', 'Anime', 'Digital Art', 'Aquarell', 'Öl-Gemälde', 'Skizze', 'Pixel Art'];
const GRADIENTS = [
  'from-purple-500 to-pink-500', 'from-blue-500 to-teal-400', 'from-orange-500 to-yellow-400',
  'from-green-500 to-emerald-400', 'from-red-500 to-orange-400', 'from-indigo-500 to-purple-400',
  'from-pink-500 to-rose-400', 'from-cyan-500 to-blue-400',
];

interface GeneratedImage { prompt: string; style: string; gradient: string; }

export default function BildGenerator() {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('Realistisch');
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<GeneratedImage[]>([]);

  const generate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500 + Math.random() * 1000));
    const newImages = Array.from({ length: 4 }, (_, i) => ({
      prompt: prompt.trim(),
      style,
      gradient: GRADIENTS[(images.length + i) % GRADIENTS.length],
    }));
    setImages(prev => [...newImages, ...prev]);
    setLoading(false);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Bild-Generator</h1>
          <p className="text-sm text-gray-500 mt-1">Erstelle Bilder mit KI</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Beschreibung</label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Beschreibe das Bild, das du erstellen möchtest..."
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Stil</label>
            <div className="flex gap-2 flex-wrap">
              {STYLES.map(s => (
                <button key={s} onClick={() => setStyle(s)}
                  className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-all ${style === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <button onClick={generate} disabled={!prompt.trim() || loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">
            <Sparkles size={16} /> {loading ? 'Wird generiert...' : 'Generieren'}
          </button>
        </div>

        {loading && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="aspect-square rounded-xl bg-gray-200 animate-pulse" />
            ))}
          </div>
        )}

        {images.length > 0 && (
          <div>
            <h2 className="font-semibold text-gray-700 mb-3 text-sm">Generierte Bilder</h2>
            <div className="grid grid-cols-4 gap-4">
              {images.map((img, i) => (
                <div key={i} className="group relative aspect-square rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                  <div className={`absolute inset-0 bg-gradient-to-br ${img.gradient} flex items-center justify-center`}>
                    <div className="text-center text-white p-3">
                      <div className="text-3xl mb-2">🎨</div>
                      <p className="text-xs font-medium opacity-90 line-clamp-2">{img.prompt}</p>
                      <p className="text-xs opacity-70 mt-1">{img.style}</p>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <button className="bg-white/90 hover:bg-white text-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1">
                      <Download size={12} /> Speichern
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {images.length === 0 && !loading && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-6xl mb-3">🎨</div>
            <p className="text-lg font-medium text-gray-500">Noch keine Bilder generiert</p>
            <p className="text-sm mt-1">Beschreibe ein Bild und klicke auf "Generieren"</p>
          </div>
        )}
      </div>
    </div>
  );
}
