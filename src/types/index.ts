export type AgentType = 'research' | 'business' | 'analyst' | 'creative' | 'seo' | 'coding';

export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  agent?: AgentType;
  timestamp: Date;
  files?: UploadedFile[];
}

export interface UploadedFile {
  name: string;
  type: string;
  base64: string;
}

export type ViewType = 'home' | 'chat';

export type SearchMode = 'web' | 'documents' | 'business' | 'images' | 'research';

export interface AgentConfig {
  id: AgentType;
  name: string;
  icon: string;
  description: string;
  color: string;
}

export const AGENTS: AgentConfig[] = [
  {
    id: 'research',
    name: 'Recherche',
    icon: '🔍',
    description: 'Tiefgehende Informationsrecherche und Wissensaufbereitung',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'business',
    name: 'Business',
    icon: '🏢',
    description: 'SWOT, Businesspläne, Marktanalysen und Strategie',
    color: 'from-violet-500 to-purple-500',
  },
  {
    id: 'analyst',
    name: 'Analyst',
    icon: '📊',
    description: 'Datenanalyse, KPIs, Trends und Business Intelligence',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'creative',
    name: 'Kreativ',
    icon: '🎨',
    description: 'Content, Copywriting, Storytelling und Branding',
    color: 'from-pink-500 to-rose-500',
  },
  {
    id: 'seo',
    name: 'SEO',
    icon: '🎯',
    description: 'Keywords, Optimierung und digitales Marketing',
    color: 'from-orange-500 to-amber-500',
  },
  {
    id: 'coding',
    name: 'Coding',
    icon: '💻',
    description: 'Code, Architektur, Debugging und Entwicklung',
    color: 'from-indigo-500 to-blue-500',
  },
];
