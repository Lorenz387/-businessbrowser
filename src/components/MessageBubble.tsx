import { useState } from 'react';
import { Copy, Check, Eye } from 'lucide-react';
import { marked } from 'marked';
import type { Message } from '../types';
import { AGENTS } from '../types';

interface MessageBubbleProps {
  message: Message;
}

// Configure marked for safe rendering
marked.setOptions({
  breaks: true,
  gfm: true,
});

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 py-2 px-1">
      <span className="text-slate-400 text-sm mr-1">VisioraVision analysiert</span>
      <span className="typing-dot w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />
      <span className="typing-dot w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />
      <span className="typing-dot w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />
    </div>
  );
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const agentConfig = message.agent ? AGENTS.find((a) => a.id === message.agent) : null;
  const isUser = message.role === 'user';
  const isEmpty = !message.content && !isUser;

  if (isUser) {
    const hasImage = !!message.imageBase64 && !!message.imageMimeType;
    return (
      <div className="flex justify-end animate-fade-in">
        <div className="max-w-[80%] sm:max-w-[70%] flex flex-col items-end gap-1.5">
          {/* Image thumbnail */}
          {hasImage && (
            <div className="relative">
              <img
                src={`data:${message.imageMimeType};base64,${message.imageBase64}`}
                alt={message.imageName ?? 'Bild'}
                className="max-h-48 max-w-xs rounded-xl object-contain border border-white/10 shadow-lg cursor-zoom-in"
                onClick={() => {
                  window.open(`data:${message.imageMimeType};base64,${message.imageBase64}`, '_blank');
                }}
              />
              {message.imageName && (
                <span className="absolute bottom-1 left-1 right-1 text-center text-[10px] text-white/60 bg-black/50 rounded px-1 py-0.5 truncate">
                  {message.imageName}
                </span>
              )}
            </div>
          )}
          {/* Text bubble */}
          {message.content && (
            <div className="bg-gradient-to-br from-violet-600 to-blue-600 rounded-2xl rounded-tr-sm px-4 py-3 text-white text-sm leading-relaxed shadow-lg shadow-violet-500/20">
              {message.content}
            </div>
          )}
          <p className="text-xs text-slate-600 pr-1">
            {message.timestamp.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 animate-slide-up">
      {/* Avatar */}
      <div className="flex-shrink-0 mt-1">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shadow-md shadow-violet-500/30">
          <Eye className="w-4 h-4 text-white" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-semibold gradient-text">VisioraVision</span>
          {agentConfig && (
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full glass border border-white/10 text-slate-400">
              <span>{agentConfig.icon}</span>
              <span>{agentConfig.name}</span>
            </span>
          )}
          <span className="text-xs text-slate-600">
            {message.timestamp.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Message body */}
        <div className="glass rounded-2xl rounded-tl-sm px-4 py-3">
          {isEmpty ? (
            <TypingIndicator />
          ) : (
            <div
              className="markdown-content text-sm"
              dangerouslySetInnerHTML={{
                __html: marked(message.content) as string,
              }}
            />
          )}
        </div>

        {/* Actions */}
        {!isEmpty && (
          <div className="flex items-center gap-2 mt-2 pl-1">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-300 transition-colors py-1 px-2 rounded-lg hover:bg-white/5"
              title="Kopieren"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Kopiert!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Kopieren</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default MessageBubble;
