import { motion } from 'framer-motion'
import {
  Wand2, Film, Images, Heart, Cpu, Palette, Camera, Clock, Monitor, Layers,
  Clapperboard, ImagePlay, Type, Paperclip, Settings, HelpCircle, Sparkles,
} from 'lucide-react'

const NAV_MAIN = [
  { id: 'generate', icon: Wand2, label: 'Generate' },
  { id: 'edit', icon: Film, label: 'Edit Video' },
  { id: 'gallery', icon: Images, label: 'Gallery' },
  { id: 'favorites', icon: Heart, label: 'Favorites' },
]

const NAV_FEATURES = [
  { id: 'models', icon: Cpu, label: 'Models' },
  { id: 'styles', icon: Palette, label: 'Styles' },
  { id: 'camera', icon: Camera, label: 'Camera' },
  { id: 'duration', icon: Clock, label: 'Duration' },
  { id: 'resolution', icon: Monitor, label: 'Resolution' },
  { id: 'motion', icon: Layers, label: 'Motion' },
  { id: 'advanced', icon: Sparkles, label: 'Advanced' },
]

const NAV_TOOLS = [
  { id: 'video2video', icon: Clapperboard, label: 'Video to Video' },
  { id: 'img2video', icon: ImagePlay, label: 'Image to Video' },
  { id: 'text2video', icon: Type, label: 'Text to Video' },
  { id: 'reference', icon: Paperclip, label: 'Reference Media' },
]

export default function Sidebar({ active, onChange }) {
  return (
    <aside className="fixed left-0 top-0 h-screen w-52 flex flex-col glass border-r border-white/8 z-20 overflow-y-auto">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/8">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-purple-500 flex items-center justify-center glow-accent-sm">
            <Wand2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white leading-tight">AI Video Studio</div>
            <div className="text-[10px] text-white/40 leading-tight">Create · Edit · Inspire</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-4">
        <NavSection label="MAIN" items={NAV_MAIN} active={active} onChange={onChange} />
        <NavSection label="FEATURES" items={NAV_FEATURES} active={active} onChange={onChange} />
        <NavSection label="TOOLS" items={NAV_TOOLS} active={active} onChange={onChange} />
      </nav>

      <div className="px-2 py-3 border-t border-white/8 space-y-1">
        <NavSection label="SETTINGS" items={[
          { id: 'preferences', icon: Settings, label: 'Preferences' },
          { id: 'help', icon: HelpCircle, label: 'Help & Guide' },
        ]} active={active} onChange={onChange} />
      </div>

      {/* Ready to create card */}
      <div className="m-3 p-3 rounded-2xl bg-gradient-to-br from-violet-900/40 to-purple-900/20 border border-violet-500/20">
        <div className="text-xs font-semibold text-white mb-1">Ready to create</div>
        <div className="text-[11px] text-white/50 mb-2">Pick a model and start generating</div>
        <div className="flex justify-end">
          <Sparkles className="w-4 h-4 text-violet-400" />
        </div>
      </div>
    </aside>
  )
}

function NavSection({ label, items, active, onChange }) {
  return (
    <div>
      <div className="px-2 mb-1 text-[10px] font-semibold tracking-widest text-white/30">{label}</div>
      <div className="space-y-0.5">
        {items.map(item => (
          <NavItem key={item.id} item={item} isActive={active === item.id} onClick={() => onChange(item.id)} />
        ))}
      </div>
    </div>
  )
}

function NavItem({ item, isActive, onClick }) {
  const Icon = item.icon
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.97 }}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all cursor-pointer ${
        isActive
          ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
          : 'text-white/50 hover:text-white/80 hover:bg-white/5'
      }`}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="truncate">{item.label}</span>
    </motion.button>
  )
}
