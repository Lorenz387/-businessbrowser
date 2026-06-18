import { useNavigate } from 'react-router-dom';
import { store, Project } from '../store';

const templates = [
  { name: 'Business Plan', desc: 'Vollständiger Unternehmensplan', icon: '📊', color: '#6366f1', category: 'Business' },
  { name: 'Content Kalender', desc: 'Social Media Planung', icon: '📅', color: '#ec4899', category: 'Marketing' },
  { name: 'Reiseplanung', desc: 'Urlaubs- und Reiseorganisation', icon: '✈️', color: '#f59e0b', category: 'Lifestyle' },
  { name: 'Fitness Tracker', desc: 'Sport und Gesundheitsplan', icon: '💪', color: '#10b981', category: 'Gesundheit' },
  { name: 'Lernplan', desc: 'Strukturiertes Lernsystem', icon: '📚', color: '#3b82f6', category: 'Bildung' },
  { name: 'Produktstrategie', desc: 'Produktentwicklung & Roadmap', icon: '🚀', color: '#8b5cf6', category: 'Business' },
  { name: 'Meeting-Notizen', desc: 'Besprechungsprotokoll', icon: '📝', color: '#14b8a6', category: 'Produktivität' },
  { name: 'OKR-Framework', desc: 'Ziele und Schlüsselergebnisse', icon: '🎯', color: '#ef4444', category: 'Business' },
  { name: 'Rezeptsammlung', desc: 'Kochbuch und Ernährungsplan', icon: '🍳', color: '#f97316', category: 'Lifestyle' },
  { name: 'Tagebuch', desc: 'Persönliches Journal', icon: '📓', color: '#a78bfa', category: 'Lifestyle' },
  { name: 'Budgetplanung', desc: 'Finanzen und Ausgaben', icon: '💰', color: '#22c55e', category: 'Finanzen' },
  { name: 'Kunden-CRM', desc: 'Kundenverwaltung', icon: '👥', color: '#0ea5e9', category: 'Business' },
];

export default function Vorlagen() {
  const navigate = useNavigate();

  const useTemplate = (t: typeof templates[0]) => {
    const project: Project = {
      id: Date.now().toString(),
      name: t.name,
      description: t.desc,
      color: t.color,
      icon: t.icon,
      fileCount: 0,
      createdAt: new Date().toISOString().split('T')[0],
    };
    const projects = store.getProjects();
    store.saveProjects([project, ...projects]);
    navigate('/projekte');
  };

  const categories = [...new Set(templates.map(t => t.category))];

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Vorlagen</h1>
        <p className="text-sm text-gray-500 mt-1">Starte schnell mit fertigen Vorlagen</p>
      </div>
      {categories.map(cat => (
        <div key={cat} className="mb-8">
          <h2 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wider">{cat}</h2>
          <div className="grid grid-cols-4 gap-4">
            {templates.filter(t => t.category === cat).map(t => (
              <div key={t.name} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all group overflow-hidden">
                <div className="h-24 flex items-center justify-center text-4xl" style={{ background: `linear-gradient(135deg, ${t.color}22, ${t.color}44)` }}>
                  {t.icon}
                </div>
                <div className="p-4">
                  <p className="font-semibold text-gray-800 text-sm">{t.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t.desc}</p>
                  <button
                    onClick={() => useTemplate(t)}
                    className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-1.5 rounded-lg transition-colors"
                  >
                    Vorlage verwenden
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
