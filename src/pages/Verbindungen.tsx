import { useState } from 'react';
import { store, Connection } from '../store';

export default function Verbindungen() {
  const [connections, setConnections] = useState<Connection[]>(store.getConnections());

  const toggle = (id: string) => {
    const updated = connections.map(c => c.id === id ? { ...c, connected: !c.connected } : c);
    setConnections(updated);
    store.saveConnections(updated);
  };

  const categories = [
    { label: 'Social Media', ids: ['instagram', 'tiktok', 'youtube'] },
    { label: 'Produktivität', ids: ['notion', 'slack', 'discord', 'github'] },
    { label: 'Datei-Speicher', ids: ['googledrive'] },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Verbindungen</h1>
        <p className="text-sm text-gray-500 mt-1">Verbinde deine Apps und Services</p>
      </div>
      {categories.map(cat => {
        const catConns = connections.filter(c => cat.ids.includes(c.id));
        if (!catConns.length) return null;
        return (
          <div key={cat.label} className="mb-6">
            <h2 className="font-semibold text-gray-700 mb-3 text-sm">{cat.label}</h2>
            <div className="grid grid-cols-3 gap-3">
              {catConns.map(conn => (
                <div key={conn.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ background: conn.color === '#000000' ? '#1a1a1a' : conn.color }}>
                      {conn.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{conn.name}</p>
                      <p className={`text-xs ${conn.connected ? 'text-green-600' : 'text-gray-400'}`}>
                        {conn.connected ? '● Verbunden' : '○ Nicht verbunden'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggle(conn.id)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${conn.connected ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                  >
                    {conn.connected ? 'Trennen' : 'Verbinden'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
