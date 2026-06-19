import { useState } from 'react'
import { Search, Plus, Folder, LayoutGrid, Columns, Calendar, MoreHorizontal, Trash2, CheckCircle2 } from 'lucide-react'
import { defaultProjects } from '../data/mockData'
import { useLocalStorage } from '../hooks/useLocalStorage'
import CreateProjectModal from '../components/CreateProjectModal'
import type { Project } from '../types'

type View = 'grid' | 'kanban' | 'list'

const statusLabels: Record<string, string> = { aktiv: 'Aktiv', planung: 'Planung', abgeschlossen: 'Abgeschlossen' }
const statusColors: Record<string, string> = {
  aktiv: 'bg-green-100 text-green-700',
  planung: 'bg-yellow-100 text-yellow-700',
  abgeschlossen: 'bg-slate-100 text-slate-500',
}

export default function Projects() {
  const [projects, setProjects] = useLocalStorage<Project[]>('projects', defaultProjects)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [view, setView] = useState<View>('grid')
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id))
    setOpenMenu(null)
  }

  const setStatus = (id: string, status: string) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, status } : p))
    setOpenMenu(null)
  }

  const kanbanCols = ['planung', 'aktiv', 'abgeschlossen']

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Projekte</h1>
          <p className="text-slate-500 text-sm mt-1">{projects.length} Projekte insgesamt</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90"
        >
          <Plus size={16} />
          Neues Projekt
        </button>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Projekte suchen..."
            className="w-72 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          {([['grid', LayoutGrid], ['kanban', Columns], ['list', Calendar]] as const).map(([v, Icon]) => (
            <button key={v} onClick={() => setView(v)}
              className={`p-2 rounded-lg transition-all ${view === v ? 'bg-white shadow-sm text-violet-600' : 'text-slate-400 hover:text-slate-600'}`}>
              <Icon size={16} />
            </button>
          ))}
        </div>
      </div>

      {view === 'grid' && (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map(project => (
            <div key={project.id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all cursor-pointer group relative">
              <div className={`h-20 bg-gradient-to-r ${project.color} flex items-center px-5`}>
                <span className="text-3xl">{project.icon}</span>
                <div className="ml-auto">
                  <button
                    onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === project.id ? null : project.id) }}
                    className="p-1 bg-white/20 hover:bg-white/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal size={14} className="text-white" />
                  </button>
                </div>
              </div>
              {openMenu === project.id && (
                <div className="absolute top-16 right-2 z-20 bg-white rounded-xl shadow-xl border border-slate-200 w-44 py-1">
                  {kanbanCols.map(s => (
                    <button key={s} onClick={() => setStatus(project.id, s)}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                      {project.status === s && <CheckCircle2 size={12} className="text-violet-500" />}
                      {statusLabels[s]}
                    </button>
                  ))}
                  <div className="border-t border-slate-100 mt-1">
                    <button onClick={() => deleteProject(project.id)}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                      <Trash2 size={12} /> Löschen
                    </button>
                  </div>
                </div>
              )}
              <div className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-semibold text-slate-800">{project.name}</div>
                  {project.status && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[project.status] || 'bg-slate-100 text-slate-500'}`}>
                      {statusLabels[project.status] || project.status}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-1">{project.description}</div>
                <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                  <Folder size={12} />
                  {project.fileCount} Dateien
                </div>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-slate-400">Aktualisiert: {project.updatedAt}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {kanbanCols.map(col => {
            const colProjects = filtered.filter(p => (p.status || 'aktiv') === col)
            return (
              <div key={col} className="flex-shrink-0 w-72">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[col]}`}>
                    {statusLabels[col]} · {colProjects.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {colProjects.map(project => (
                    <div key={project.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                      <div className={`h-2 w-10 bg-gradient-to-r ${project.color} rounded-full mb-3`} />
                      <div className="font-medium text-slate-800 text-sm">{project.name}</div>
                      <div className="text-xs text-slate-500 mt-1">{project.description}</div>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xl">{project.icon}</span>
                        <span className="text-xs text-slate-400">{project.fileCount} Dateien</span>
                      </div>
                    </div>
                  ))}
                  {colProjects.length === 0 && (
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center text-xs text-slate-400">
                      Keine Projekte
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {view === 'list' && (
        <div className="space-y-2">
          {filtered.map(project => (
            <div key={project.id} className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
              <div className={`w-10 h-10 bg-gradient-to-r ${project.color} rounded-lg flex items-center justify-center text-lg flex-shrink-0`}>
                {project.icon}
              </div>
              <div className="flex-1">
                <div className="font-medium text-slate-800">{project.name}</div>
                <div className="text-xs text-slate-400 mt-0.5">{project.description}</div>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span>{project.fileCount} Dateien</span>
                <span>{project.updatedAt}</span>
                {project.status && (
                  <span className={`px-2 py-0.5 rounded-full font-medium ${statusColors[project.status] || 'bg-slate-100'}`}>
                    {statusLabels[project.status] || project.status}
                  </span>
                )}
              </div>
              <button onClick={() => deleteProject(project.id)} className="p-2 text-slate-300 hover:text-red-400 transition-colors">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <CreateProjectModal
          onClose={() => setShowModal(false)}
          onCreate={project => setProjects(prev => [...prev, project])}
        />
      )}
    </div>
  )
}
