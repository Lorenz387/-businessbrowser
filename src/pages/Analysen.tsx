import { store } from '../store';

export default function Analysen() {
  const projects = store.getProjects();
  const docs = store.getDocuments();
  const chats = store.getChats();

  const stats = [
    { label: 'Projekte', value: projects.length, color: '#6366f1', icon: '📁' },
    { label: 'Dokumente', value: docs.length, color: '#10b981', icon: '📝' },
    { label: 'KI-Anfragen', value: chats.filter(c => c.role === 'user').length, color: '#3b82f6', icon: '🤖' },
    { label: 'Verbindungen', value: store.getConnections().filter(c => c.connected).length, color: '#f59e0b', icon: '🔗' },
  ];

  const projectData = projects.slice(0, 6).map(p => ({ name: p.name, files: p.fileCount, color: p.color }));
  const maxFiles = Math.max(...projectData.map(p => p.files), 1);

  const activityData = [
    { day: 'Mo', value: 4 }, { day: 'Di', value: 7 }, { day: 'Mi', value: 3 },
    { day: 'Do', value: 9 }, { day: 'Fr', value: 6 }, { day: 'Sa', value: 2 }, { day: 'So', value: 5 },
  ];
  const maxActivity = Math.max(...activityData.map(d => d.value));

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Analysen</h1>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{s.icon}</span>
              <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
            </div>
            <p className="text-3xl font-bold text-gray-800">{s.value}</p>
            <p className="text-sm text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Project files bar chart */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-4">Dateien pro Projekt</h2>
          {projectData.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Keine Projekte vorhanden</p>
          ) : (
            <div className="space-y-3">
              {projectData.map(p => (
                <div key={p.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600 truncate max-w-32">{p.name}</span>
                    <span className="text-xs font-medium text-gray-700">{p.files}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${(p.files / maxFiles) * 100}%`, background: p.color }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Weekly activity */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-4">Wöchentliche Aktivität</h2>
          <div className="flex items-end gap-2 h-32">
            {activityData.map(d => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-md bg-blue-500 hover:bg-blue-600 transition-colors cursor-default"
                  style={{ height: `${(d.value / maxActivity) * 100}%` }}
                  title={`${d.value} Aktionen`}
                />
                <span className="text-xs text-gray-400">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Model usage */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-4">KI-Modell Nutzung</h2>
          {[{ name: 'GPT-4.5', pct: 45, color: '#10b981' }, { name: 'Claude', pct: 30, color: '#6366f1' }, { name: 'Gemini', pct: 15, color: '#f59e0b' }, { name: 'Andere', pct: 10, color: '#94a3b8' }].map(m => (
            <div key={m.name} className="mb-3">
              <div className="flex justify-between mb-1">
                <span className="text-xs text-gray-600">{m.name}</span>
                <span className="text-xs font-medium text-gray-700">{m.pct}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${m.pct}%`, background: m.color }} />
              </div>
            </div>
          ))}
        </div>

        {/* Quick tips */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-5 text-white">
          <h2 className="font-semibold mb-3">💡 KI-Tipp</h2>
          <p className="text-sm text-blue-100 leading-relaxed">Nutze Workflows, um wiederkehrende Aufgaben zu automatisieren. Du kannst bis zu 70% Zeit sparen!</p>
          <div className="mt-4 pt-4 border-t border-white/20">
            <p className="text-xs text-blue-200">Gesamt-Aktivität diese Woche</p>
            <p className="text-2xl font-bold mt-1">36 Aktionen</p>
          </div>
        </div>
      </div>
    </div>
  );
}
