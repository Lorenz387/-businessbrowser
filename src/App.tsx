import { useState } from 'react';
import type { AgentType, SearchMode } from './types';
import { useChat } from './hooks/useChat';
import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { FeatureGrid } from './components/FeatureGrid';
import { Sidebar } from './components/Sidebar';
import { ChatInterface } from './components/ChatInterface';

type ViewType = 'home' | 'chat';

// Decorative orb component for the hero background
function HeroOrb({ className }: { className: string }) {
  return (
    <div
      className={`absolute rounded-full blur-3xl opacity-20 pointer-events-none ${className}`}
    />
  );
}

export default function App() {
  const [view, setView] = useState<ViewType>('home');
  const { messages, isLoading, currentAgent, setCurrentAgent, sendMessage, clearMessages } =
    useChat('research');

  const handleSearch = (query: string, _mode: SearchMode) => {
    setView('chat');
    sendMessage(query, currentAgent);
  };

  const handleNewChat = () => {
    clearMessages();
    setView('home');
  };

  const handleAgentChange = (agent: AgentType) => {
    setCurrentAgent(agent);
  };

  return (
    <div className="h-screen flex flex-col bg-[#080818] overflow-hidden">
      <Header
        currentAgent={currentAgent}
        onAgentChange={handleAgentChange}
        onNewChat={handleNewChat}
        view={view}
        onLogoClick={() => setView('home')}
      />

      <main className="flex-1 overflow-hidden">
        {view === 'home' ? (
          /* ===== HOME VIEW ===== */
          <div className="h-full overflow-y-auto">
            <div className="relative min-h-full flex flex-col items-center justify-start px-4 py-16 sm:py-20">
              {/* Background decorative orbs */}
              <HeroOrb className="w-96 h-96 bg-violet-600 top-0 left-1/4 -translate-x-1/2 -translate-y-1/2" />
              <HeroOrb className="w-80 h-80 bg-blue-600 top-40 right-1/4 translate-x-1/2" />
              <HeroOrb className="w-64 h-64 bg-cyan-600 bottom-0 left-1/2 -translate-x-1/2" />

              {/* Hero content */}
              <div className="relative z-10 w-full max-w-4xl mx-auto text-center mb-12">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-sm text-slate-400 mb-6 border border-white/10">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>KI-Browser der nächsten Generation</span>
                </div>

                {/* Main title */}
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold mb-4 leading-tight tracking-tight">
                  <span className="gradient-text">VisioraVision</span>
                </h1>

                {/* Subtitle */}
                <p className="text-lg sm:text-xl text-slate-400 mb-2 font-light max-w-2xl mx-auto">
                  Der intelligente KI-Browser der nächsten Generation
                </p>
                <p className="text-sm text-slate-600 mb-10 max-w-xl mx-auto">
                  Analysiert, verknüpft und versteht Informationen aus dem Web, Dokumenten,
                  Bildern und mehr – strukturiert und handlungsorientiert.
                </p>

                {/* Search bar */}
                <SearchBar
                  onSearch={handleSearch}
                  compact={false}
                  isLoading={isLoading}
                />
              </div>

              {/* Feature grid */}
              <FeatureGrid />

              {/* Stats row */}
              <div className="relative z-10 flex items-center gap-8 sm:gap-12 mt-12 text-center">
                {[
                  { value: '10+', label: 'Sprachen' },
                  { value: '6', label: 'KI-Agenten' },
                  { value: '∞', label: 'Analysen' },
                  { value: 'DSGVO', label: 'Konform' },
                ].map(({ value, label }) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <span className="text-xl sm:text-2xl font-bold gradient-text">{value}</span>
                    <span className="text-xs text-slate-600 uppercase tracking-wider">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ===== CHAT VIEW ===== */
          <div className="h-full flex">
            {/* Sidebar - hidden on mobile */}
            <div className="hidden md:flex flex-col h-full">
              <Sidebar
                currentAgent={currentAgent}
                onAgentChange={handleAgentChange}
                onNewChat={handleNewChat}
                messageCount={messages.length}
              />
            </div>

            {/* Chat area */}
            <div className="flex-1 min-w-0 h-full">
              <ChatInterface
                messages={messages}
                isLoading={isLoading}
                currentAgent={currentAgent}
                onSendMessage={(text, agent) => sendMessage(text, agent ?? currentAgent)}
                onAgentChange={handleAgentChange}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
