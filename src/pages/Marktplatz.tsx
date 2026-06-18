import { useState } from 'react';
import { Heart, Download, Star } from 'lucide-react';

const items = [
  { id: '1', name: 'Business Plan Pro', type: 'Vorlage', author: 'Laura M.', price: '9,99€', rating: 4.8, downloads: 1240, icon: '📊', color: '#6366f1', liked: false },
  { id: '2', name: 'Social Media Bundle', type: 'Vorlage', author: 'Max K.', price: 'Kostenlos', rating: 4.5, downloads: 3421, icon: '📱', color: '#ec4899', liked: false },
  { id: '3', name: 'KI-Prompt Paket', type: 'Prompts', author: 'Sarah T.', price: '4,99€', rating: 4.9, downloads: 892, icon: '🤖', color: '#3b82f6', liked: false },
  { id: '4', name: 'Content Creator Kit', type: 'Agent', author: 'Tim W.', price: '19,99€', rating: 4.7, downloads: 567, icon: '🎬', color: '#f59e0b', liked: false },
  { id: '5', name: 'Fitness Tracker 2.0', type: 'Vorlage', author: 'Anna B.', price: 'Kostenlos', rating: 4.6, downloads: 2150, icon: '💪', color: '#10b981', liked: false },
  { id: '6', name: 'Auto-Post Workflow', type: 'Automation', author: 'Daniel R.', price: '7,99€', rating: 4.4, downloads: 435, icon: '⚡', color: '#8b5cf6', liked: false },
  { id: '7', name: 'OKR Jahresplan', type: 'Vorlage', author: 'Lisa M.', price: '2,99€', rating: 4.8, downloads: 987, icon: '🎯', color: '#ef4444', liked: false },
  { id: '8', name: 'Reise-Planer Komplett', type: 'Vorlage', author: 'Chris H.', price: 'Kostenlos', rating: 4.3, downloads: 1876, icon: '✈️', color: '#14b8a6', liked: false },
];

const TYPES = ['Alle', 'Vorlage', 'Prompts', 'Agent', 'Automation'];

export default function Marktplatz() {
  const [items_, setItems] = useState(items);
  const [filter, setFilter] = useState('Alle');
  const [purchased, setPurchased] = useState<Set<string>>(new Set());

  const filtered = items_.filter(i => filter === 'Alle' || i.type === filter);

  const toggleLike = (id: string) => setItems(prev => prev.map(i => i.id === id ? { ...i, liked: !i.liked } : i));
  const buy = (id: string) => { setPurchased(prev => new Set([...prev, id])); };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Marktplatz</h1>
        <p className="text-sm text-gray-500 mt-1">Entdecke Vorlagen, Prompts, Agenten und Automatisierungen</p>
      </div>
      <div className="flex gap-2 mb-6">
        {TYPES.map(t => (
          <button key={t} onClick={() => setFilter(t)}
            className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-all ${filter === t ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-4">
        {filtered.map(item => (
          <div key={item.id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
            <div className="h-32 flex items-center justify-center text-5xl relative" style={{ background: `linear-gradient(135deg, ${item.color}22, ${item.color}44)` }}>
              {item.icon}
              <button onClick={() => toggleLike(item.id)} className="absolute top-2 right-2 w-7 h-7 bg-white/80 rounded-full flex items-center justify-center hover:bg-white transition-colors">
                <Heart size={13} className={item.liked ? 'text-red-500 fill-red-500' : 'text-gray-400'} />
              </button>
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between mb-1">
                <p className="font-semibold text-gray-800 text-sm">{item.name}</p>
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full ml-1 flex-shrink-0">{item.type}</span>
              </div>
              <p className="text-xs text-gray-400 mb-2">von {item.author}</p>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-0.5">
                  <Star size={11} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-xs text-gray-600">{item.rating}</span>
                </div>
                <span className="text-gray-300 text-xs">•</span>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Download size={11} /> {item.downloads.toLocaleString()}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-800">{item.price}</span>
                <button
                  onClick={() => buy(item.id)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${purchased.has(item.id) ? 'bg-green-100 text-green-700' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                >
                  {purchased.has(item.id) ? '✓ Erworben' : item.price === 'Kostenlos' ? 'Herunterladen' : 'Kaufen'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
