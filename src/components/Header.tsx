import { Eye, Settings, Zap, Plus } from 'lucide-react';
import type { AgentType } from '../types';
import { AGENTS } from '../types';

interface HeaderProps {
  currentAgent: AgentType;
  onAgentChange: (agent: AgentType) => void;
  onNewChat: () => void;
  view: 'home' | 'chat';
  onLogoClick: () => void;
}

export function Header({ currentAgent, onAgentChange, onNewChat, view, onLogoClick }: HeaderProps) {
  const activeAgent = AGENTS.find((a) => a.id === currentAgent);

  return (
    <header className="sticky top-0 z-50 glass-strong border-b border-white/10">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <button
          onClick={onLogoClick}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Eye className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-bold gradient-text hidden sm:block">VisioraVision</span>
        </button>

        {/* Center: Agent indicator in chat view */}
        {view === 'chat' && activeAgent && (
          <div className="flex items-center gap-2 glass rounded-full px-3 py-1.5 text-sm flex-shrink-0">
            <span>{activeAgent.icon}</span>
            <span className="text-slate-300 font-medium">{activeAgent.name}-Agent</span>
          </div>
        )}

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:flex items-center gap-1.5 glass rounded-full px-3 py-1 text-xs font-semibold text-violet-300 border border-violet-500/30">
            <Zap className="w-3 h-3" />
            <span>Premium</span>
          </div>

          {/* Quick agent switcher */}
          <div className="hidden lg:flex items-center gap-1">
            {AGENTS.slice(0, 4).map((agent) => (
              <button
                key={agent.id}
                onClick={() => onAgentChange(agent.id)}
                title={agent.name}
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-all ${
                  currentAgent === agent.id
                    ? 'bg-violet-600/30 border border-violet-500/50'
                    : 'hover:bg-white/5 border border-transparent'
                }`}
              >
                {agent.icon}
              </button>
            ))}
          </div>

          {view === 'chat' && (
            <button
              onClick={onNewChat}
              className="btn-primary flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Neu</span>
            </button>
          )}

          <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-slate-400 hover:text-slate-200 transition-colors border border-transparent hover:border-white/10">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
