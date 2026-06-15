import { useEffect, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import type { Message, AgentType } from '../types';
import { AGENTS } from '../types';
import { MessageBubble } from './MessageBubble';
import { SearchBar } from './SearchBar';
import { FileUpload } from './FileUpload';
import { AgentSelector } from './AgentSelector';

interface ChatInterfaceProps {
  messages: Message[];
  isLoading: boolean;
  currentAgent: AgentType;
  onSendMessage: (text: string, agent?: AgentType, file?: File) => void;
  onAgentChange: (agent: AgentType) => void;
}

function WelcomeMessage({ agent }: { agent: AgentType }) {
  const agentConfig = AGENTS.find((a) => a.id === agent)!;

  const prompts: Record<AgentType, string[]> = {
    research: ['Was sind die neuesten Trends in KI?', 'Analysiere den Klimawandel 2024', 'Erkläre Quantencomputing'],
    business: ['SWOT-Analyse für ein Startup', 'Businessplan Vorlage erstellen', 'Marktanalyse E-Commerce'],
    analyst: ['Analysiere diese Verkaufsdaten', 'KPI-Dashboard Empfehlungen', 'ROI-Berechnung Methoden'],
    creative: ['Schreibe einen Produkttext', 'Content-Strategie für Instagram', 'Slogan für mein Unternehmen'],
    seo: ['SEO-Audit meiner Website', 'Keyword-Recherche für "KI-Tools"', 'Meta-Descriptions optimieren'],
    coding: ['React Component erstellen', 'Python API mit FastAPI', 'SQL-Abfrage optimieren'],
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center text-3xl mb-4 shadow-xl shadow-violet-500/30">
        {agentConfig.icon}
      </div>
      <h2 className="text-xl font-bold text-slate-100 mb-1">
        {agentConfig.name}-Agent bereit
      </h2>
      <p className="text-slate-500 text-sm mb-8 max-w-sm">
        {agentConfig.description}
      </p>

      <div className="w-full max-w-md">
        <p className="text-xs text-slate-600 uppercase tracking-wider mb-3">Beispiel-Anfragen</p>
        <div className="grid gap-2">
          {prompts[agent].map((prompt) => (
            <div
              key={prompt}
              className="glass rounded-xl px-4 py-3 text-sm text-slate-400 text-left cursor-default hover:text-slate-200 hover:border-violet-500/30 transition-all card-hover"
            >
              {prompt}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ChatInterface({
  messages,
  isLoading,
  currentAgent,
  onSendMessage,
  onAgentChange,
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSearch = (text: string) => {
    onSendMessage(text, currentAgent, selectedFile ?? undefined);
    setSelectedFile(null);
    setFileError(null);
  };

  const handleFileSelect = (file: File) => {
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      setFileError('Datei zu groß (max. 20 MB)');
      return;
    }
    setFileError(null);
    setSelectedFile(file);
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        {!hasMessages ? (
          <WelcomeMessage agent={currentAgent} />
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-6">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-white/5 bg-black/20 p-3 sm:p-4">
        <div className="max-w-3xl mx-auto">
          {/* File error */}
          {fileError && (
            <div className="flex items-center gap-2 text-red-400 text-xs mb-2 px-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{fileError}</span>
            </div>
          )}

          {/* Selected file indicator */}
          {selectedFile && (
            <div className="mb-2">
              <FileUpload
                selectedFile={selectedFile}
                onFileSelect={handleFileSelect}
                onFileClear={() => { setSelectedFile(null); setFileError(null); }}
              />
            </div>
          )}

          <div className="flex items-end gap-2">
            {/* Agent selector */}
            <div className="flex-shrink-0">
              <AgentSelector currentAgent={currentAgent} onChange={onAgentChange} />
            </div>

            {/* Search bar */}
            <div className="flex-1 min-w-0">
              <SearchBar
                onSearch={handleSearch}
                onFileSelect={handleFileSelect}
                compact
                isLoading={isLoading}
              />
            </div>

            {/* File upload (when no file selected) */}
            {!selectedFile && (
              <div className="flex-shrink-0">
                <FileUpload
                  selectedFile={null}
                  onFileSelect={handleFileSelect}
                  onFileClear={() => setSelectedFile(null)}
                />
              </div>
            )}
          </div>

          <p className="text-xs text-slate-700 text-center mt-2">
            VisioraVision kann Fehler machen. Wichtige Entscheidungen bitte überprüfen.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ChatInterface;
