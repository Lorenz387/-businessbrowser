import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronDown, Heart, MessageCircle, Bookmark, MoreHorizontal, Trash2, Edit2, ExternalLink, Filter } from 'lucide-react';
import { store, Project, FeedPost } from '../store';

const MODELS = ['GPT-4.5', 'Claude', 'Gemini', 'Mistral', 'DeepSeek'];
const PROJECT_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#14b8a6'];
type Tab = 'forDich' | 'trending' | 'newest';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Guten Morgen';
  if (h < 18) return 'Guten Tag';
  return 'Guten Abend';
}

interface Props {
  onCreateProject: () => void;
  refreshKey: number;
}

export default function Dashboard({ onCreateProject, refreshKey }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [model, setModel] = useState(store.getSelectedModel());
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [feed, setFeed] = useState<FeedPost[]>(store.getFeed());
  const [tab, setTab] = useState<Tab>('forDich');
  const [projectMenu, setProjectMenu] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');

  useEffect(() => {
    setProjects(store.getProjects().slice(0, 5));
  }, [refreshKey]);

  const selectModel = (m: string) => {
    setModel(m);
    store.saveSelectedModel(m);
    setShowModelMenu(false);
  };

  const submitQuery = () => {
    if (!query.trim()) return;
    navigate(`/ki-chat?q=${encodeURIComponent(query)}&model=${encodeURIComponent(model)}`);
  };

  const toggleLike = (id: string) => {
    const updated = feed.map(p => p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p);
    setFeed(updated);
    store.saveFeed(updated);
  };

  const toggleBookmark = (id: string) => {
    const updated = feed.map(p => p.id === id ? { ...p, bookmarked: !p.bookmarked } : p);
    setFeed(updated);
    store.saveFeed(updated);
  };

  const deleteProject = (id: string) => {
    const all = store.getProjects().filter(p => p.id !== id);
    store.saveProjects(all);
    setProjects(all.slice(0, 5));
    setProjectMenu(null);
  };

  const startRename = (p: Project) => {
    setRenamingId(p.id);
    setRenameVal(p.name);
    setProjectMenu(null);
  };

  const saveRename = () => {
    if (!renameVal.trim()) { setRenamingId(null); return; }
    const all = store.getProjects().map(p => p.id === renamingId ? { ...p, name: renameVal.trim() } : p);
    store.saveProjects(all);
    setProjects(all.slice(0, 5));
    setRenamingId(null);
  };

  const filteredFeed = feed.filter(p => tab === 'forDich' ? true : p.category === tab);
  const quickActions = [
    { label: 'Neues Projekt', sub: 'Projekt starten', emoji: '📁', action: onCreateProject },
    { label: 'KI-Analyse', sub: 'Dokument analysieren', emoji: '🤖', action: () => navigate('/ki-editor') },
    { label: 'Mindmap', sub: 'Ideen visualisieren', emoji: '🗺️', action: () => navigate('/mindmaps') },
    { label: 'Bild erstellen', sub: 'Mit KI generieren', emoji: '🎨', action: () => navigate('/bild-generator') },
    { label: 'Workflow', sub: 'Automatisieren', emoji: '⚡', action: () => navigate('/workflow-automation') },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      {/* Hero */}
      <div className="relative h-64 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-teal-500 to-emerald-500" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />
        {/* Decorative circles */}
        <div className="absolute top-4 right-1/4 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 text-center">
          <h1 className="text-3xl font-bold text-white mb-1">{greeting()}, Elias 👋</h1>
          <p className="text-white/80 mb-5 text-sm">Was möchtest du heute erstellen?</p>
          {/* Search bar */}
          <div className="flex items-center gap-2 bg-white rounded-xl shadow-lg px-4 py-3 w-full max-w-2xl">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitQuery()}
              placeholder="Erstelle, analysiere oder frage die KI..."
              className="flex-1 text-sm text-gray-700 outline-none placeholder-gray-400"
            />
            <div className="relative">
              <button
                onClick={() => setShowModelMenu(!showModelMenu)}
                className="flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg px-3 py-1.5 transition-colors"
              >
                {model} <ChevronDown size={12} />
              </button>
              {showModelMenu && (
                <div className="absolute right-0 top-9 bg-white rounded-xl shadow-xl border border-gray-100 z-50 min-w-32 py-1">
                  {MODELS.map(m => (
                    <button key={m} onClick={() => selectModel(m)} className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${model === m ? 'text-blue-600 font-medium' : 'text-gray-700'}`}>{m}</button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={submitQuery} className="w-8 h-8 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center justify-center transition-colors flex-shrink-0">
              <ArrowRight size={16} className="text-white" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-5 gap-3">
          {quickActions.map(({ label, sub, emoji, action }) => (
            <button
              key={label}
              onClick={action}
              className="bg-white rounded-xl p-4 text-center shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all border border-gray-100"
            >
              <div className="text-2xl mb-2">{emoji}</div>
              <div className="text-xs font-semibold text-gray-800">{label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
            </button>
          ))}
        </div>

        {/* Projects */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-800">Deine Projekte</h2>
            <button onClick={() => navigate('/projekte')} className="text-sm text-blue-600 hover:text-blue-700">Alle anzeigen</button>
          </div>
          <div className="grid grid-cols-5 gap-3">
            {projects.map(p => (
              <div
                key={p.id}
                className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-gray-100 cursor-pointer group"
                onClick={() => navigate(`/projekte/${p.id}`)}
              >
                <div className="h-28 flex items-center justify-center text-4xl" style={{ background: `linear-gradient(135deg, ${p.color}22, ${p.color}44)` }}>
                  {p.icon}
                </div>
                <div className="p-3">
                  {renamingId === p.id ? (
                    <input
                      autoFocus
                      value={renameVal}
                      onChange={e => setRenameVal(e.target.value)}
                      onBlur={saveRename}
                      onKeyDown={e => e.key === 'Enter' && saveRename()}
                      className="text-xs font-semibold text-gray-800 w-full outline-none border-b border-blue-400"
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <p className="text-xs font-semibold text-gray-800 truncate">{p.name}</p>
                  )}
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-400">{p.fileCount} Dateien</span>
                    <div className="relative">
                      <button
                        onClick={e => { e.stopPropagation(); setProjectMenu(projectMenu === p.id ? null : p.id); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-gray-100 rounded"
                      >
                        <MoreHorizontal size={14} className="text-gray-400" />
                      </button>
                      {projectMenu === p.id && (
                        <div className="absolute right-0 bottom-6 bg-white rounded-lg shadow-xl border border-gray-100 z-10 py-1 min-w-32">
                          <button onClick={e => { e.stopPropagation(); navigate(`/projekte/${p.id}`); setProjectMenu(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50">
                            <ExternalLink size={12} /> Öffnen
                          </button>
                          <button onClick={e => { e.stopPropagation(); startRename(p); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50">
                            <Edit2 size={12} /> Umbenennen
                          </button>
                          <button onClick={e => { e.stopPropagation(); deleteProject(p.id); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50">
                            <Trash2 size={12} /> Löschen
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feed */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <h2 className="font-bold text-gray-800">Entdecke Inhalte</h2>
              <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
                {([['forDich', 'Für dich'], ['trending', 'Trending'], ['newest', 'Neueste']] as [Tab, string][]).map(([id, label]) => (
                  <button key={id} onClick={() => setTab(id)} className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${tab === id ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5">
              <Filter size={14} /> Filter
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {filteredFeed.slice(0, 6).map(post => (
              <div key={post.id} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-gray-100">
                <div className="flex items-center gap-2 p-3 pb-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: post.authorColor }}>
                    {post.authorInitials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800">{post.author}</p>
                    <p className="text-xs text-gray-400">{post.timeAgo}</p>
                  </div>
                  <button className="p-1 hover:bg-gray-100 rounded"><MoreHorizontal size={14} className="text-gray-400" /></button>
                </div>
                <p className="px-3 pb-2 text-sm font-medium text-gray-800">{post.title}</p>
                <div className="h-32 mx-3 mb-3 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${post.authorColor}22, ${post.authorColor}44)` }}>
                  <span className="text-3xl">🖼️</span>
                </div>
                <div className="flex items-center gap-4 px-3 pb-3">
                  <button onClick={() => toggleLike(post.id)} className={`flex items-center gap-1 text-xs transition-colors ${post.liked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}`}>
                    <Heart size={14} fill={post.liked ? 'currentColor' : 'none'} /> {post.likes}
                  </button>
                  <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-500 transition-colors">
                    <MessageCircle size={14} /> {post.comments}
                  </button>
                  <button onClick={() => toggleBookmark(post.id)} className={`ml-auto transition-colors ${post.bookmarked ? 'text-blue-500' : 'text-gray-400 hover:text-blue-400'}`}>
                    <Bookmark size={14} fill={post.bookmarked ? 'currentColor' : 'none'} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
