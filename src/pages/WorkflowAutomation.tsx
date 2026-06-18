import { useState } from 'react'
import { Plus, Trash2, Zap, ToggleLeft, ToggleRight } from 'lucide-react'
import type { Workflow } from '../types'

const defaultWorkflows: Workflow[] = [
  { id: '1', name: 'Post nach Upload', trigger: 'Datei hochgeladen', actions: ['Bild komprimieren', 'Social Media posten', 'Benachrichtigung senden'], enabled: true, createdAt: '2026-06-01' },
  { id: '2', name: 'Wöchentlicher Report', trigger: 'Jeden Montag 08:00', actions: ['Daten sammeln', 'PDF erstellen', 'Per E-Mail senden'], enabled: true, createdAt: '2026-06-05' },
  { id: '3', name: 'Auto-Backup', trigger: 'Täglich 00:00', actions: ['Alle Dokumente sichern', 'Google Drive sync'], enabled: false, createdAt: '2026-06-10' },
]

export default function WorkflowAutomation() {
  const [workflows, setWorkflows] = useState<Workflow[]>(defaultWorkflows)
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newTrigger, setNewTrigger] = useState('')

  const toggleWorkflow = (id: string) => {
    setWorkflows(prev => prev.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w))
  }

  const deleteWorkflow = (id: string) => {
    setWorkflows(prev => prev.filter(w => w.id !== id))
  }

  const addWorkflow = () => {
    if (!newName.trim()) return
    const wf: Workflow = {
      id: Date.now().toString(),
      name: newName,
      trigger: newTrigger || 'Manuell',
      actions: ['Aktion 1'],
      enabled: false,
      createdAt: new Date().toISOString().split('T')[0],
    }
    setWorkflows(prev => [...prev, wf])
    setNewName('')
    setNewTrigger('')
    setShowForm(false)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Workflow Automation</h1>
          <p className="text-slate-500 text-sm mt-1">{workflows.filter(w => w.enabled).length} aktive Workflows</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium"
        >
          <Plus size={16} />
          Neuer Workflow
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4">Neuer Workflow</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Name</label>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="Workflow Name..."
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Trigger</label>
              <input
                value={newTrigger}
                onChange={e => setNewTrigger(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="z.B. Täglich 08:00..."
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addWorkflow} className="bg-violet-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-violet-700">Erstellen</button>
            <button onClick={() => setShowForm(false)} className="border border-slate-200 text-slate-600 text-sm px-4 py-2 rounded-lg hover:bg-slate-50">Abbrechen</button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {workflows.map(wf => (
          <div key={wf.id} className={`bg-white rounded-xl border p-5 shadow-sm ${wf.enabled ? 'border-violet-200' : 'border-slate-200'}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${wf.enabled ? 'bg-violet-100' : 'bg-slate-100'}`}>
                  <Zap size={18} className={wf.enabled ? 'text-violet-600' : 'text-slate-400'} />
                </div>
                <div>
                  <div className="font-semibold text-slate-800">{wf.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">Trigger: {wf.trigger}</div>
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {wf.actions.map((action, i) => (
                      <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{action}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleWorkflow(wf.id)}
                  className={wf.enabled ? 'text-violet-600' : 'text-slate-400'}
                >
                  {wf.enabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                </button>
                <button
                  onClick={() => deleteWorkflow(wf.id)}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
