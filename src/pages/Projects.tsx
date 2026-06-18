import { useState } from 'react'
import { Search, Plus, Folder } from 'lucide-react'
import { defaultProjects } from '../data/mockData'
import { useLocalStorage } from '../hooks/useLocalStorage'
import CreateProjectModal from '../components/CreateProjectModal'
import type { Project } from '../types'

export default function Projects() {
  const [projects, setProjects] = useLocalStorage<Project[]>('projects', defaultProjects)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

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

      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Projekte suchen..."
          className="w-full max-w-sm border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {filtered.map(project => (
          <div
            key={project.id}
            className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all cursor-pointer group"
          >
            <div className={`h-20 bg-gradient-to-r ${project.color} flex items-center px-5`}>
              <span className="text-3xl">{project.icon}</span>
            </div>
            <div className="p-4">
              <div className="font-semibold text-slate-800">{project.name}</div>
              <div className="text-xs text-slate-500 mt-1">{project.description}</div>
              <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                <Folder size={12} />
                {project.fileCount} Dateien
              </div>
              <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-slate-400">Aktualisiert: {project.updatedAt}</span>
                <button className="text-xs bg-violet-50 text-violet-600 px-3 py-1 rounded-lg hover:bg-violet-100 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Öffnen
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <CreateProjectModal
          onClose={() => setShowModal(false)}
          onCreate={project => setProjects(prev => [...prev, project])}
        />
      )}
    </div>
  )
}
