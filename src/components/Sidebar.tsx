import { NavLink, useNavigate } from 'react-router-dom'
import {
  Home, FolderKanban, FileText, Folder, Pencil, MessageSquare,
  Network, Image, BarChart3, Workflow, Layout, BookTemplate, Store, Zap,
  Video, Music, Link, User, Settings
} from 'lucide-react'

const navSections = [
  {
    title: 'Main',
    items: [
      { label: 'Dashboard', icon: Home, path: '/', exact: true },
      { label: 'Projekte', icon: FolderKanban, path: '/projekte' },
      { label: 'Dokumente', icon: FileText, path: '/dokumente' },
      { label: 'Ordner', icon: Folder, path: '/ordner' },
    ]
  },
  {
    title: 'KI Tools',
    items: [
      { label: 'KI Editor', icon: Pencil, path: '/ki-editor' },
      { label: 'KI Chat', icon: MessageSquare, path: '/ki-chat' },
      { label: 'Mindmaps', icon: Network, path: '/mindmaps' },
      { label: 'Bild Generator', icon: Image, path: '/bild-generator' },
      { label: 'Video Generator', icon: Video, path: '/video-generator' },
      { label: 'Musik Generator', icon: Music, path: '/musik-generator' },
      { label: 'Analysen', icon: BarChart3, path: '/analysen' },
    ]
  },
  {
    title: 'Automatisierung',
    items: [
      { label: 'Workflows', icon: Workflow, path: '/workflow-automation' },
      { label: 'Whiteboards', icon: Layout, path: '/whiteboards' },
    ]
  },
  {
    title: 'Bibliothek',
    items: [
      { label: 'Vorlagen', icon: BookTemplate, path: '/vorlagen' },
      { label: 'Marktplatz', icon: Store, path: '/marktplatz' },
      { label: 'Verbindungen', icon: Link, path: '/verbindungen' },
    ]
  },
]

export default function Sidebar() {
  return (
    <div className="fixed left-0 top-0 h-screen w-64 bg-slate-900 text-white flex flex-col z-20">
      <div className="p-5 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-white text-sm">LifeOS</div>
            <div className="text-xs text-slate-400">AI Workspace</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {navSections.map((section) => (
          <div key={section.title} className="mb-5">
            <div className="text-xs text-slate-500 uppercase tracking-wider px-3 mb-2">{section.title}</div>
            {section.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.exact}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg mb-0.5 text-sm transition-all ${
                    isActive
                      ? 'bg-violet-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`
                }
              >
                <item.icon size={16} />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl p-3">
          <div className="text-xs font-semibold text-white mb-1">Upgrade zu Pro</div>
          <div className="text-xs text-violet-200 mb-2">Unbegrenzte KI-Anfragen & mehr</div>
          <button className="w-full bg-white text-violet-600 text-xs font-semibold py-1.5 rounded-lg hover:bg-violet-50 transition-colors">
            Jetzt upgraden
          </button>
        </div>
      </div>
    </div>
  )
}
