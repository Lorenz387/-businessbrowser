import { useState } from 'react'
import { Sparkles, Image as ImageIcon } from 'lucide-react'

const styles = ['Realistisch', 'Anime', 'Digital Art', 'Öl-Gemälde', 'Wasserfarbe', 'Pixel Art']
const ratios = ['1:1', '16:9', '9:16', '4:3']
const qualities = ['Standard', 'HD', 'Ultra']

const gradients = [
  'from-blue-400 to-purple-600',
  'from-green-400 to-teal-600',
  'from-orange-400 to-red-600',
  'from-pink-400 to-violet-600',
  'from-cyan-400 to-blue-600',
  'from-yellow-400 to-orange-600',
]

interface GeneratedImage {
  id: string
  prompt: string
  style: string
  gradient: string
  createdAt: string
}

export default function BildGenerator() {
  const [prompt, setPrompt] = useState('')
  const [style, setStyle] = useState(styles[0])
  const [ratio, setRatio] = useState(ratios[0])
  const [quality, setQuality] = useState(qualities[0])
  const [generating, setGenerating] = useState(false)
  const [images, setImages] = useState<GeneratedImage[]>([])

  const generate = () => {
    if (!prompt.trim()) return
    setGenerating(true)
    setTimeout(() => {
      const newImage: GeneratedImage = {
        id: Date.now().toString(),
        prompt,
        style,
        gradient: gradients[Math.floor(Math.random() * gradients.length)],
        createdAt: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
      }
      setImages(prev => [newImage, ...prev])
      setGenerating(false)
    }, 2000)
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Bild Generator</h1>
        <p className="text-slate-500 text-sm mt-1">Erstelle KI-Bilder aus Text</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Prompt</label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Beschreibe dein Bild..."
              className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
              rows={5}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Stil</label>
            <div className="grid grid-cols-2 gap-2">
              {styles.map(s => (
                <button
                  key={s}
                  onClick={() => setStyle(s)}
                  className={`text-xs py-2 px-3 rounded-lg border transition-all ${style === s ? 'bg-violet-600 text-white border-violet-600' : 'border-slate-200 text-slate-600 hover:border-violet-300'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Seitenverhältnis</label>
            <div className="flex gap-2">
              {ratios.map(r => (
                <button
                  key={r}
                  onClick={() => setRatio(r)}
                  className={`text-xs py-2 px-3 rounded-lg border flex-1 transition-all ${ratio === r ? 'bg-violet-600 text-white border-violet-600' : 'border-slate-200 text-slate-600 hover:border-violet-300'}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Qualität</label>
            <div className="flex gap-2">
              {qualities.map(q => (
                <button
                  key={q}
                  onClick={() => setQuality(q)}
                  className={`text-xs py-2 px-3 rounded-lg border flex-1 transition-all ${quality === q ? 'bg-violet-600 text-white border-violet-600' : 'border-slate-200 text-slate-600 hover:border-violet-300'}`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={generate}
            disabled={!prompt.trim() || generating}
            className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {generating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generiert...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Bild Generieren
              </>
            )}
          </button>
        </div>

        <div className="col-span-2">
          {generating && (
            <div className="aspect-square max-w-sm mx-auto bg-gradient-to-br from-violet-200 to-purple-200 rounded-2xl flex items-center justify-center mb-6 animate-pulse">
              <div className="text-center">
                <Sparkles size={32} className="text-violet-500 mx-auto mb-2 animate-spin" />
                <div className="text-sm text-violet-600 font-medium">Generiere Bild...</div>
              </div>
            </div>
          )}

          {images.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Generierte Bilder ({images.length})</h3>
              <div className="grid grid-cols-2 gap-3">
                {images.map(img => (
                  <div key={img.id} className="rounded-xl overflow-hidden border border-slate-100 shadow-sm">
                    <div className={`aspect-square bg-gradient-to-br ${img.gradient} flex items-end p-3`}>
                      <ImageIcon size={20} className="text-white opacity-50" />
                    </div>
                    <div className="p-2 bg-white">
                      <div className="text-xs text-slate-600 truncate">{img.prompt}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{img.style} · {img.createdAt}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {images.length === 0 && !generating && (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <ImageIcon size={48} className="text-slate-300 mb-4" />
              <p className="text-slate-400 text-sm">Deine generierten Bilder erscheinen hier</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
