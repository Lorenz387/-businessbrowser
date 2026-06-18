import { useState } from 'react';
import { Plus, Zap, X, Play, Pause } from 'lucide-react';
import { store, Workflow } from '../store';

export default function WorkflowAutomation() {
  const [workflows, setWorkflows] = useState<Workflow[]>(store.getWorkflows());
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState('');
  const [action, setAction] = useState('');

  const toggle = (id: string) => {
    const updated = workflows.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w);
    setWorkflows(updated);
    store.saveWorkflows(updated);
  };

  const deleteWorkflow = (id: string) => {
    const updated = workflows.filter(w => w.id !== id);
    setWorkflows(updated);
    store.saveWorkflows(updated);
  };

  const create = () => {
    if (!name.trim()) return;
    const wf: Workflow = {
      id: Date.now().toString(),
      name: name.trim(),
      trigger: trigger || 'Manuell',
      actions: action ? [action] : ['Aktion ausführen'],
      enabled: true,
      createdAt: new Date().toISOString().split('T')[0],
    };
    const updated = [...workflows, wf];
    setWorkflows(updated);
    store.saveWorkflows(updated);
    setShowCreate(false);
    setName(''); setTrigger(''); setAction('');
  };

  const TRIGGERS = ['Manuell', 'Neues Dokument erstellt', 'Täglich 09:00', 'Wöchentlich Montag', 'Datei hochgeladen'];
  const ACTIONS = ['KI analysiert Inhalt', 'Auf Instagram posten', 'E-Mail senden', 'Google Drive Sync', 'Slack-Nachricht senden', 'PDF erstellen'];

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Workflow-Automation</h1>
          <p className="text-sm text-gray-500 mt-1">Automatisiere wiederkehrende Aufgaben</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Neuer Workflow
        </button>
      </div>

      <div className="space-y-3">
        {workflows.map(wf => (
          <div key={wf.id} className={`bg-white rounded-xl border ${wf.enabled ? 'border-blue-200' : 'border-gray-100'} p-5 shadow-sm`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${wf.enabled ? 'bg-blue-100' : 'bg-gray-100'}`}>
                  <Zap size={18} className={wf.enabled ? 'text-blue-600' : 'text-gray-400'} />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{wf.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Erstellt: {wf.createdAt}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggle(wf.id)}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${wf.enabled ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  {wf.enabled ? <><Play size={12} /> Aktiv</> : <><Pause size={12} /> Pausiert</>}
                </button>
                <button onClick={() => deleteWorkflow(wf.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-gray-400 hover:text-red-500">
                  <X size={15} />
                </button>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <span className="text-xs bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full font-medium">⚡ {wf.trigger}</span>
              <span className="text-gray-300 text-sm">→</span>
              {wf.actions.map((a, i) => (
                <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">{a}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="font-semibold text-gray-800">Neuer Workflow</h2>
              <button onClick={() => setShowCreate(false)}><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Name *</label>
                <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Workflow-Name" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Auslöser</label>
                <select value={trigger} onChange={e => setTrigger(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Auslöser wählen...</option>
                  {TRIGGERS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Aktion</label>
                <select value={action} onChange={e => setAction(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Aktion wählen...</option>
                  {ACTIONS.map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t">
              <button onClick={() => setShowCreate(false)} className="flex-1 border border-gray-200 text-gray-700 rounded-lg py-2.5 text-sm hover:bg-gray-50">Abbrechen</button>
              <button onClick={create} disabled={!name.trim()} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium">Erstellen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
