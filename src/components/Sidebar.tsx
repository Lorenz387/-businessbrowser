import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home, FolderOpen, Folder, FileText, Layout, Edit3, BarChart2,
  Share2, PenTool, MessageSquare, Image, Video, Music, Zap, Search,
  ChevronRight
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Startseite', icon: Home, exact: true },
  { to: '/projekte', label: 'Projekte', icon: FolderOpen },
  { to: '/ordner', label: 'Ordner', icon: Folder },
  { to: '/dokumente', label: 'Dokumente', icon: FileText },
  { to: '/vorlagen', label: 'Vorlagen', icon: Layout },
  { to: '/ki-editor', label: 'KI-Editor', icon: Edit3 },
  { to: '/analysen', label: 'Analysen', icon: BarChart2 },
  { to: '/mindmaps', label: 'Mindmaps', icon: Share2 },
  { to: '/whiteboards', label: 'Whiteboards', icon: PenTool },
];

const connections = [
  { name: 'Instagram', color: '#e1306c', Icon: () => <span className="font-bold text-xs">IG</span> },
  { name: 'TikTok', color: '#000', Icon: () => <span className="font-bold text-xs">TT</span> },
  { name: 'Notion', color: '#000', Icon: () => <span className="font-bold text-xs">N</span> },
  { name: 'Google Drive', color: '#4285f4', Icon: () => <span className="font-bold text-xs">G</span> },
  { name: 'Slack', color: '#4a154b', Icon: () => <span className="font-bold text-xs">S</span> },
  { name: 'Discord', color: '#5865f2', Icon: () => <span className="font-bold text-xs">D</span> },
];

const tools = [
  { to: '/ki-chat', label: 'KI-Chat', icon: MessageSquare },
  { to: '/bild-generator', label: 'Bild-Generator', icon: Image },
  { to: '/video-generator', label: 'Video-Generator', icon: Video },
  { to: '/musik-generator', label: 'Musik-Generator', icon: Music },
  { to: '/workflow-automation', label: 'Workflow-Automation', icon: Zap },
];

export default function Sidebar() {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const filteredNav = navItems.filter(i => i.label.toLowerCase().includes(search.toLowerCase()));
  const filteredTools = tools.filter(i => i.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <aside className="w-60 min-h-screen bg-slate-900 flex flex-col text-slate-300 flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-slate-800 cursor-pointer" onClick={() => navigate('/')}>
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">L</div>
        <span className="font-bold text-white text-base">LifeOS AI</span>
      </div>

      {/* Search */}
      <div className="px-3 py-3">
        <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2">
          <Search size={14} className="text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Suchen..."
            className="bg-transparent text-sm text-slate-300 placeholder-slate-500 outline-none w-full"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-2">
        {/* HAUPTMENÜ */}
        <div className="mb-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 py-2">Hauptmenü</p>
          {filteredNav.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all mb-0.5 ${
                  isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </div>

        {/* VERBINDUNGEN */}
        {(!search || connections.some(c => c.name.toLowerCase().includes(search.toLowerCase()))) && (
          <div className="mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 py-2">Verbindungen</p>
            {connections
              .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()))
              .map(({ name, color, Icon }) => (
              <NavLink
                key={name}
                to="/verbindungen"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all mb-0.5"
              >
                <span className="w-5 h-5 rounded flex items-center justify-center text-white text-xs" style={{ background: color }}>
                  <Icon />
                </span>
                {name}
              </NavLink>
            ))}
          </div>
        )}

        {/* WERKZEUGE */}
        <div className="mb-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 py-2">Werkzeuge</p>
          {filteredTools.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all mb-0.5 ${
                  isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </div>

        {/* Marktplatz */}
        <div className="mb-4">
          <NavLink
            to="/marktplatz"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`
            }
          >
            <ChevronRight size={16} />
            Marktplatz
          </NavLink>
        </div>
      </div>

      {/* Bottom user */}
      <div className="px-3 py-3 border-t border-slate-800">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">E</div>
          <div>
            <div className="text-slate-200 text-xs font-medium">Elias</div>
            <div className="text-slate-500 text-xs">Pro Plan</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
