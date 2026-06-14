import { PlusCircle, MessageSquare } from 'lucide-react';
import type { AgentType } from '../types';
import { AGENTS } from '../types';

interface SidebarProps {
  currentAgent: AgentType;
  onAgentChange: (agent: AgentType) => void;
  onNewChat: () => void;
  messageCount: number;
}

export function Sidebar({ currentAgent, onAgentChange, onNewChat, messageCount }: SidebarProps) {
  return (
    <aside className="w-56 flex-shrink-0 flex flex-col h-full border-r border-white/5 bg-black/20">
      {/* New Chat button */}
      <div className="p-3 border-b border-white/5">
        <button
          onClick={onNewChat}
          className="w-full btn-primary flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium"
        >
          <PlusCircle className="w-4 h-4" />
          Neuer Chat
        </button>
      </div>

      {/* Current session */}
      {messageCount > 0 && (
        <div className="px-3 py-2 border-b border-white/5">
          <p className="text-slate-600 text-xs uppercase tracking-wider mb-2 px-1">Aktuell</p>
          <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-violet-600/10 border border-violet-500/20 text-sm text-slate-300">
            <MessageSquare className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
            <span className="truncate">Chat ({messageCount / 2 | 0} Nachrichten)</span>
          </div>
        </div>
      )}

      {/* Agents */}
      <div className="flex-1 p-3 overflow-y-auto">
        <p className="text-slate-600 text-xs uppercase tracking-wider mb-2 px-1">Agenten</p>
        <nav className="flex flex-col gap-1">
          {AGENTS.map((agent) => (
            <button
              key={agent.id}
              onClick={() => onAgentChange(agent.id)}
              className={`w-full flex items-start gap-2.5 px-2.5 py-2.5 rounded-xl text-left transition-all group ${
                currentAgent === agent.id
                  ? 'bg-violet-600/20 border border-violet-500/30 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              <span className="text-lg leading-none mt-0.5 flex-shrink-0">{agent.icon}</span>
              <div className="min-w-0">
                <div className="text-sm font-medium leading-tight">{agent.name}</div>
                <div className="text-xs text-slate-600 leading-tight mt-0.5 truncate group-hover:text-slate-500 transition-colors">
                  {agent.description.split(' ').slice(0, 4).join(' ')}...
                </div>
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/5">
        <div className="glass rounded-lg p-2.5 text-center">
          <p className="text-xs text-slate-600">
            DSGVO-konform · Datenschutz
          </p>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
