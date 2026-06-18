import { useState } from 'react';
import { Crown, Check } from 'lucide-react';
import { store, Connection } from '../store';
import { useNavigate } from 'react-router-dom';

export default function RightSidebar() {
  const navigate = useNavigate();
  const notifications = store.getNotifications().slice(0, 4);
  const [connections, setConnections] = useState<Connection[]>(store.getConnections());
  const [showUpgrade, setShowUpgrade] = useState(true);

  const toggleConnection = (id: string) => {
    const updated = connections.map(c => c.id === id ? { ...c, connected: !c.connected } : c);
    setConnections(updated);
    store.saveConnections(updated);
  };

  const displayed = connections.slice(0, 5);

  return (
    <aside className="w-72 min-h-screen bg-white border-l border-gray-100 flex flex-col flex-shrink-0 overflow-y-auto scrollbar-thin">
      {/* Aktivitäten */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800 text-sm">Aktivitäten</h3>
          <button onClick={() => navigate('/aktivitaeten')} className="text-xs text-blue-600 hover:text-blue-700">Alle anzeigen</button>
        </div>
        <div className="space-y-3">
          {notifications.map(n => (
            <div key={n.id} className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs flex-shrink-0">{n.avatar}</div>
              <div>
                <p className="text-xs text-gray-700 leading-relaxed">{n.text}</p>
                <p className="text-xs text-gray-400 mt-0.5">{n.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Verbindungen */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800 text-sm">Verbindungen</h3>
          <button onClick={() => navigate('/verbindungen')} className="text-xs text-blue-600 hover:text-blue-700">Verwalten</button>
        </div>
        <div className="space-y-2">
          {displayed.map(conn => (
            <div key={conn.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: conn.color === '#000000' ? '#1a1a1a' : conn.color }}
                >
                  {conn.name.charAt(0)}
                </div>
                <span className="text-sm text-gray-700">{conn.name}</span>
              </div>
              <button
                onClick={() => toggleConnection(conn.id)}
                className={`text-xs font-medium px-2 py-0.5 rounded-full transition-colors ${
                  conn.connected
                    ? 'text-green-600 bg-green-50 hover:bg-green-100'
                    : 'text-gray-500 bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {conn.connected ? '● Verbunden' : '○ Verbinden'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Upgrade */}
      {showUpgrade && (
        <div className="p-4">
          <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-xl p-4 text-white relative">
            <button
              onClick={() => setShowUpgrade(false)}
              className="absolute top-2 right-2 text-white/60 hover:text-white text-lg leading-none"
            >×</button>
            <div className="flex items-center gap-2 mb-2">
              <Crown size={18} className="text-yellow-300" />
              <span className="font-bold text-sm">Upgrade auf Pro</span>
            </div>
            <ul className="space-y-1.5 mb-4">
              {['Unbegrenzte Projekte', 'Erweiterte KI-Modelle', 'Mehr Speicherplatz', 'Erweiterte Analysen'].map(f => (
                <li key={f} className="flex items-center gap-2 text-xs text-white/90">
                  <Check size={12} className="text-green-300 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => alert('Upgrade-Prozess wird gestartet...')}
              className="w-full bg-white text-violet-700 font-semibold text-sm rounded-lg py-2 hover:bg-gray-50 transition-colors"
            >
              Jetzt upgraden
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
