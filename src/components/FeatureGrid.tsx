interface Feature {
  icon: string;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: '🌐',
    title: 'Echtzeit-Websuche',
    description: 'Aktuelle Informationen aus dem Internet direkt analysiert und strukturiert',
  },
  {
    icon: '📄',
    title: 'Dokumenten-KI',
    description: 'PDF, Word, Excel – intelligente Analyse und Zusammenfassung aller Formate',
  },
  {
    icon: '🏢',
    title: 'Business-Analyse',
    description: 'SWOT, Marktanalysen, Wettbewerbsvergleiche und strategische Empfehlungen',
  },
  {
    icon: '🖼️',
    title: 'Bild-KI',
    description: 'Visuelle Inhalte analysieren, beschreiben und in Erkenntnisse umwandeln',
  },
  {
    icon: '🎯',
    title: 'SEO-Optimierung',
    description: 'Keywords, Content-Strategie und technische SEO-Empfehlungen auf Knopfdruck',
  },
  {
    icon: '🤖',
    title: 'Multi-Agent-System',
    description: 'Spezialisierte KI-Agenten für Research, Business, Coding, Creative und mehr',
  },
  {
    icon: '📊',
    title: 'Datenanalyse',
    description: 'Statistiken, Trends und KPIs in verständliche Erkenntnisse übersetzen',
  },
  {
    icon: '🌍',
    title: 'Mehrsprachig',
    description: 'Deutsch, Englisch und 8 weitere Sprachen – antwortet in deiner Sprache',
  },
];

export function FeatureGrid() {
  return (
    <div className="w-full max-w-4xl mx-auto mt-12 animate-fade-in">
      <p className="text-center text-slate-500 text-sm font-medium mb-6 uppercase tracking-wider">
        Capabilities
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="glass card-hover rounded-xl p-4 cursor-default group"
          >
            <div className="text-2xl mb-2.5 group-hover:scale-110 transition-transform inline-block">
              {feature.icon}
            </div>
            <h3 className="text-slate-100 font-semibold text-sm mb-1 leading-tight">
              {feature.title}
            </h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FeatureGrid;
