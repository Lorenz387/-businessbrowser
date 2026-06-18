import { useState } from 'react'

const categories = ['Alle', 'Marketing', 'Social Media', 'Business', 'KI']

const templates = [
  { id: '1', name: 'Instagram Post', category: 'Social Media', gradient: 'from-pink-400 to-orange-400', creator: 'LifeOS' },
  { id: '2', name: 'Marketing Brief', category: 'Marketing', gradient: 'from-blue-400 to-violet-400', creator: 'LifeOS' },
  { id: '3', name: 'Business Plan', category: 'Business', gradient: 'from-green-400 to-teal-400', creator: 'Pro User' },
  { id: '4', name: 'KI Prompt Template', category: 'KI', gradient: 'from-violet-400 to-purple-500', creator: 'LifeOS' },
  { id: '5', name: 'TikTok Script', category: 'Social Media', gradient: 'from-gray-700 to-gray-500', creator: 'Creator' },
  { id: '6', name: 'Email Newsletter', category: 'Marketing', gradient: 'from-orange-400 to-red-400', creator: 'LifeOS' },
  { id: '7', name: 'Pitch Deck', category: 'Business', gradient: 'from-cyan-400 to-blue-500', creator: 'Startup' },
  { id: '8', name: 'KI Chat Vorlage', category: 'KI', gradient: 'from-rose-400 to-pink-500', creator: 'LifeOS' },
  { id: '9', name: 'YouTube Beschreibung', category: 'Social Media', gradient: 'from-red-500 to-orange-500', creator: 'YouTuber' },
  { id: '10', name: 'Content Kalender', category: 'Marketing', gradient: 'from-teal-400 to-green-500', creator: 'LifeOS' },
  { id: '11', name: 'Angebot Vorlage', category: 'Business', gradient: 'from-yellow-400 to-orange-400', creator: 'Agency' },
  { id: '12', name: 'KI Analyse Report', category: 'KI', gradient: 'from-indigo-400 to-violet-500', creator: 'LifeOS' },
]

export default function Vorlagen() {
  const [activeCategory, setActiveCategory] = useState('Alle')
  const [usedTemplate, setUsedTemplate] = useState<string | null>(null)

  const filtered = templates.filter(t => activeCategory === 'Alle' || t.category === activeCategory)

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Vorlagen</h1>
        <p className="text-slate-500 text-sm mt-1">Starte mit einer professionellen Vorlage</p>
      </div>

      <div className="flex gap-2 mb-6">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`text-sm px-4 py-2 rounded-xl transition-all ${activeCategory === cat ? 'bg-violet-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-violet-300'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {filtered.map(t => (
          <div key={t.id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all">
            <div className={`h-28 bg-gradient-to-br ${t.gradient}`} />
            <div className="p-4">
              <div className="font-semibold text-slate-800 text-sm">{t.name}</div>
              <div className="flex items-center justify-between mt-3">
                <div>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{t.category}</span>
                  <span className="text-xs text-slate-400 ml-2">by {t.creator}</span>
                </div>
                <button
                  onClick={() => setUsedTemplate(t.id)}
                  className={`text-xs px-3 py-1 rounded-lg font-medium transition-all ${usedTemplate === t.id ? 'bg-green-100 text-green-700' : 'bg-violet-50 text-violet-600 hover:bg-violet-100'}`}
                >
                  {usedTemplate === t.id ? 'Verwendet' : 'Verwenden'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
