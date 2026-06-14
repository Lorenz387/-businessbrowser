import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { AgentType } from '../types';
import { AGENTS } from '../types';

interface AgentSelectorProps {
  currentAgent: AgentType;
  onChange: (agent: AgentType) => void;
}

export function AgentSelector({ currentAgent, onChange }: AgentSelectorProps) {
  const [open, setOpen] = useState(false);
  const active = AGENTS.find((a) => a.id === currentAgent)!;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 glass rounded-xl px-3 py-2 text-sm hover:border-white/20 transition-all"
      >
        <span className="text-base">{active.icon}</span>
        <span className="text-slate-200 font-medium hidden sm:inline">{active.name}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />

          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-72 glass-strong rounded-2xl p-2 z-20 shadow-2xl shadow-black/50 animate-fade-in">
            <p className="text-xs text-slate-500 uppercase tracking-wider px-2 py-1.5 font-medium">
              Agent auswählen
            </p>
            <div className="grid grid-cols-1 gap-1">
              {AGENTS.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => {
                    onChange(agent.id);
                    setOpen(false);
                  }}
                  className={`w-full flex items-start gap-3 p-2.5 rounded-xl text-left transition-all ${
                    currentAgent === agent.id
                      ? 'bg-violet-600/20 border border-violet-500/30'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg bg-gradient-to-br ${agent.color} bg-opacity-20 flex-shrink-0`}
                  >
                    {agent.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-100">{agent.name}</div>
                    <div className="text-xs text-slate-500 leading-relaxed mt-0.5 line-clamp-2">
                      {agent.description}
                    </div>
                  </div>
                  {currentAgent === agent.id && (
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-2 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default AgentSelector;
