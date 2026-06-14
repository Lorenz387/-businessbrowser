import { useState, useRef, type KeyboardEvent } from 'react';
import { Send, Paperclip, Globe, FileText, Building2, Image, Search } from 'lucide-react';
import type { SearchMode } from '../types';

interface SearchBarProps {
  onSearch: (query: string, mode: SearchMode) => void;
  onFileSelect?: (file: File) => void;
  compact?: boolean;
  isLoading?: boolean;
}

const MODES: { id: SearchMode; label: string; icon: React.ReactNode }[] = [
  { id: 'web', label: 'Web', icon: <Globe className="w-3.5 h-3.5" /> },
  { id: 'documents', label: 'Dokumente', icon: <FileText className="w-3.5 h-3.5" /> },
  { id: 'business', label: 'Business', icon: <Building2 className="w-3.5 h-3.5" /> },
  { id: 'images', label: 'Bilder', icon: <Image className="w-3.5 h-3.5" /> },
  { id: 'research', label: 'Recherche', icon: <Search className="w-3.5 h-3.5" /> },
];

export function SearchBar({ onSearch, onFileSelect, compact = false, isLoading = false }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<SearchMode>('web');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const trimmed = query.trim();
    if (!trimmed || isLoading) return;
    onSearch(trimmed, mode);
    setQuery('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileSelect) onFileSelect(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (compact) {
    return (
      <div className="glass rounded-2xl p-2">
        <div className="flex items-end gap-2">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Frage VisioraVision alles..."
            rows={1}
            disabled={isLoading}
            className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 resize-none focus:outline-none text-sm leading-relaxed min-h-[36px] max-h-[120px] py-2 px-2"
            onInput={(e) => {
              const t = e.target as HTMLTextAreaElement;
              t.style.height = 'auto';
              t.style.height = Math.min(t.scrollHeight, 120) + 'px';
            }}
          />
          <div className="flex items-center gap-1 flex-shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
              title="Datei hochladen"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <button
              onClick={handleSubmit}
              disabled={!query.trim() || isLoading}
              className="btn-primary w-8 h-8 flex items-center justify-center rounded-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full animate-slide-up">
      {/* Mode tabs */}
      <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-1">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              mode === m.id
                ? 'bg-violet-600/30 text-violet-300 border border-violet-500/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            {m.icon}
            {m.label}
          </button>
        ))}
      </div>

      {/* Main search box */}
      <div className="glass-strong rounded-2xl p-3 focus-within:border-violet-500/50 transition-all focus-within:shadow-lg focus-within:shadow-violet-500/10">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Frage VisioraVision alles... (Enter zum Senden, Shift+Enter für neue Zeile)"
          rows={3}
          disabled={isLoading}
          className="w-full bg-transparent text-slate-100 placeholder-slate-500 resize-none focus:outline-none text-base leading-relaxed"
        />
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors text-xs"
            >
              <Paperclip className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Datei anhängen</span>
            </button>
            <span className="text-slate-600 text-xs hidden sm:block">PDF, Word, Excel, Bild</span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!query.trim() || isLoading}
            className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
          >
            <span>{isLoading ? 'Analysiere...' : 'Analysieren'}</span>
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      <p className="text-center text-slate-600 text-xs mt-3">
        <kbd className="px-1.5 py-0.5 bg-white/5 rounded text-slate-500 font-mono">Enter</kbd> senden ·{' '}
        <kbd className="px-1.5 py-0.5 bg-white/5 rounded text-slate-500 font-mono">Shift+Enter</kbd> neue Zeile · Powered by Claude AI
      </p>
    </div>
  );
}

export default SearchBar;
