import { useState } from 'react'
import { Star } from 'lucide-react'

const categories = ['Vorlagen', 'Plugins', 'KI-Tools', 'Assets']

const items = [
  { id: '1', name: 'Pro Content Pack', category: 'Vorlagen', gradient: 'from-blue-400 to-violet-500', creator: 'DesignPro', price: 9.99, rating: 4.8, reviews: 234, free: false },
  { id: '2', name: 'Social Scheduler Plugin', category: 'Plugins', gradient: 'from-green-400 to-teal-500', creator: 'AutoTools', price: 0, rating: 4.5, reviews: 567, free: true },
  { id: '3', name: 'KI Textgenerator', category: 'KI-Tools', gradient: 'from-violet-400 to-purple-500', creator: 'AI Labs', price: 19.99, rating: 4.9, reviews: 891, free: false },
  { id: '4', name: 'Icon Pack Premium', category: 'Assets', gradient: 'from-orange-400 to-red-500', creator: 'IconStudio', price: 4.99, rating: 4.6, reviews: 345, free: false },
  { id: '5', name: 'Analytics Dashboard', category: 'Plugins', gradient: 'from-pink-400 to-rose-500', creator: 'DataViz', price: 0, rating: 4.3, reviews: 123, free: true },
  { id: '6', name: 'Business Templates', category: 'Vorlagen', gradient: 'from-cyan-400 to-blue-500', creator: 'BizPro', price: 14.99, rating: 4.7, reviews: 456, free: false },
  { id: '7', name: 'SEO Assistant', category: 'KI-Tools', gradient: 'from-yellow-400 to-orange-500', creator: 'SEOBot', price: 29.99, rating: 4.8, reviews: 789, free: false },
  { id: '8', name: 'Stock Photos Pack', category: 'Assets', gradient: 'from-teal-400 to-green-500', creator: 'PhotoPro', price: 0, rating: 4.4, reviews: 234, free: true },
  { id: '9', name: 'Email Templates', category: 'Vorlagen', gradient: 'from-indigo-400 to-violet-500', creator: 'MailCraft', price: 7.99, rating: 4.6, reviews: 312, free: false },
  { id: '10', name: 'Video Editor Plugin', category: 'Plugins', gradient: 'from-red-400 to-orange-500', creator: 'VideoTools', price: 24.99, rating: 4.7, reviews: 445, free: false },
  { id: '11', name: 'KI Bildbearbeitung', category: 'KI-Tools', gradient: 'from-purple-400 to-pink-500', creator: 'PixelAI', price: 0, rating: 4.2, reviews: 167, free: true },
  { id: '12', name: 'Font Collection', category: 'Assets', gradient: 'from-slate-400 to-gray-600', creator: 'TypeCo', price: 3.99, rating: 4.5, reviews: 289, free: false },
]

export default function Marktplatz() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [purchased, setPurchased] = useState<Set<string>>(new Set())

  const filtered = activeCategory ? items.filter(i => i.category === activeCategory) : items

  return (
    <div className="p-6">
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl p-8 mb-8 text-white">
        <div className="text-xs font-semibold uppercase tracking-wider text-violet-200 mb-2">Neu im Marktplatz</div>
        <h2 className="text-2xl font-bold mb-2">KI Textgenerator Pro</h2>
        <p className="text-violet-200 text-sm mb-4">Generiere unbegrenzt hochwertigen Content mit der neuesten KI-Technologie</p>
        <div className="flex items-center gap-4">
          <button className="bg-white text-violet-600 font-semibold text-sm px-5 py-2 rounded-xl hover:bg-violet-50">
            Jetzt kaufen - 19.99 EUR
          </button>
          <span className="text-violet-200 text-sm">4.9 - 891 Bewertungen</span>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-800">Alle Produkte</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveCategory(null)}
            className={`text-sm px-4 py-1.5 rounded-xl transition-all ${activeCategory === null ? 'bg-violet-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
          >
            Alle
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`text-sm px-4 py-1.5 rounded-xl transition-all ${activeCategory === cat ? 'bg-violet-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {filtered.map(item => (
          <div key={item.id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all">
            <div className={`h-28 bg-gradient-to-br ${item.gradient}`} />
            <div className="p-4">
              <div className="font-semibold text-slate-800 text-sm">{item.name}</div>
              <div className="text-xs text-slate-400 mt-0.5">by {item.creator}</div>
              <div className="flex items-center gap-1 mt-2">
                <Star size={12} className="text-yellow-400 fill-yellow-400" />
                <span className="text-xs font-medium text-slate-700">{item.rating}</span>
                <span className="text-xs text-slate-400">({item.reviews})</span>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className={`text-sm font-bold ${item.free ? 'text-green-600' : 'text-slate-800'}`}>
                  {item.free ? 'Gratis' : `${item.price} EUR`}
                </span>
                <button
                  onClick={() => setPurchased(prev => { const next = new Set(prev); next.add(item.id); return next })}
                  className={`text-xs px-3 py-1 rounded-lg font-medium transition-all ${
                    purchased.has(item.id)
                      ? 'bg-green-100 text-green-700'
                      : item.free
                        ? 'bg-violet-50 text-violet-600 hover:bg-violet-100'
                        : 'bg-violet-600 text-white hover:bg-violet-700'
                  }`}
                >
                  {purchased.has(item.id) ? 'Installiert' : item.free ? 'Installieren' : 'Kaufen'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
