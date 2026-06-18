// Simple localStorage-backed store for LifeOS AI

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  fileCount: number;
  createdAt: string;
  icon: string;
}

export interface Document {
  id: string;
  name: string;
  content: string;
  projectId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  text: string;
  time: string;
  read: boolean;
  avatar?: string;
}

export interface Connection {
  id: string;
  name: string;
  connected: boolean;
  icon: string;
  color: string;
}

export interface FeedPost {
  id: string;
  author: string;
  authorInitials: string;
  authorColor: string;
  timeAgo: string;
  title: string;
  likes: number;
  comments: number;
  liked: boolean;
  bookmarked: boolean;
  category: 'forDich' | 'trending' | 'newest';
}

export interface Workflow {
  id: string;
  name: string;
  trigger: string;
  actions: string[];
  enabled: boolean;
  createdAt: string;
}

export interface StickyNote {
  id: string;
  content: string;
  color: string;
  x: number;
  y: number;
}

function load<T>(key: string, fallback: T): T {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch { return fallback; }
}

function save<T>(key: string, val: T) {
  localStorage.setItem(key, JSON.stringify(val));
}

const defaultProjects: Project[] = [
  { id: '1', name: 'Business Plan', description: 'Unternehmensplanung', color: '#6366f1', fileCount: 12, createdAt: '2025-01-10', icon: '📊' },
  { id: '2', name: 'Content Kalender', description: 'Social Media Planung', color: '#ec4899', fileCount: 8, createdAt: '2025-01-15', icon: '📅' },
  { id: '3', name: 'Reise 2025', description: 'Reiseplanung', color: '#f59e0b', fileCount: 23, createdAt: '2025-01-20', icon: '✈️' },
  { id: '4', name: 'Fitness Tracker', description: 'Gesundheit & Sport', color: '#10b981', fileCount: 11, createdAt: '2025-01-22', icon: '💪' },
  { id: '5', name: 'Lernplattform', description: 'Weiterbildung', color: '#3b82f6', fileCount: 15, createdAt: '2025-01-25', icon: '📚' },
];

const defaultConnections: Connection[] = [
  { id: 'instagram', name: 'Instagram', connected: true, icon: 'instagram', color: '#e1306c' },
  { id: 'tiktok', name: 'TikTok', connected: true, icon: 'tiktok', color: '#000000' },
  { id: 'notion', name: 'Notion', connected: true, icon: 'notion', color: '#000000' },
  { id: 'googledrive', name: 'Google Drive', connected: true, icon: 'drive', color: '#4285f4' },
  { id: 'slack', name: 'Slack', connected: true, icon: 'slack', color: '#4a154b' },
  { id: 'discord', name: 'Discord', connected: false, icon: 'discord', color: '#5865f2' },
  { id: 'github', name: 'GitHub', connected: false, icon: 'github', color: '#333333' },
  { id: 'youtube', name: 'YouTube', connected: false, icon: 'youtube', color: '#ff0000' },
];

const defaultNotifications: Notification[] = [
  { id: '1', text: 'Laura hat ein Dokument geteilt', time: 'vor 2 Stunden', read: false, avatar: 'L' },
  { id: '2', text: 'Dein Dokument wurde analysiert', time: 'vor 3 Stunden', read: false, avatar: '🤖' },
  { id: '3', text: 'Max hat deinen Beitrag geliked', time: 'vor 5 Stunden', read: true, avatar: 'M' },
  { id: '4', text: 'Neue Verbindung: Notion', time: 'vor 6 Stunden', read: true, avatar: 'N' },
  { id: '5', text: 'Workflow "Auto-Post" wurde ausgeführt', time: 'vor 1 Tag', read: true, avatar: '⚡' },
];

const defaultFeed: FeedPost[] = [
  { id: '1', author: 'Laura', authorInitials: 'L', authorColor: '#ec4899', timeAgo: '2 Std.', title: 'Mindmap: Unternehmensentwicklung', likes: 24, comments: 5, liked: false, bookmarked: false, category: 'forDich' },
  { id: '2', author: 'Max', authorInitials: 'M', authorColor: '#3b82f6', timeAgo: '4 Std.', title: 'Reiseplan für Bali 2025', likes: 45, comments: 8, liked: false, bookmarked: false, category: 'forDich' },
  { id: '3', author: 'Daniel', authorInitials: 'D', authorColor: '#10b981', timeAgo: '6 Std.', title: 'KI-gestützter Content Workflow', likes: 32, comments: 3, liked: false, bookmarked: false, category: 'forDich' },
  { id: '4', author: 'Sarah', authorInitials: 'S', authorColor: '#f59e0b', timeAgo: '8 Std.', title: 'Top 10 Produktivitäts-Hacks mit KI', likes: 89, comments: 21, liked: false, bookmarked: false, category: 'trending' },
  { id: '5', author: 'Tim', authorInitials: 'T', authorColor: '#6366f1', timeAgo: '1 Std.', title: 'Mein erster Workflow mit n8n', likes: 12, comments: 2, liked: false, bookmarked: false, category: 'newest' },
  { id: '6', author: 'Anna', authorInitials: 'A', authorColor: '#ef4444', timeAgo: '10 Std.', title: 'Vision Board 2025 erstellen', likes: 67, comments: 14, liked: false, bookmarked: false, category: 'trending' },
];

const defaultWorkflows: Workflow[] = [
  { id: '1', name: 'Auto-Post zu Instagram', trigger: 'Neues Dokument erstellt', actions: ['KI analysiert Inhalt', 'Erstellt Post-Text', 'Postet auf Instagram'], enabled: true, createdAt: '2025-01-10' },
  { id: '2', name: 'Wöchentlicher Report', trigger: 'Jeden Montag 09:00', actions: ['Sammelt Projektdaten', 'Erstellt PDF-Report', 'Sendet per E-Mail'], enabled: true, createdAt: '2025-01-12' },
  { id: '3', name: 'Google Drive Sync', trigger: 'Dokument gespeichert', actions: ['Synchronisiert mit Drive', 'Erstellt Backup'], enabled: false, createdAt: '2025-01-15' },
];

const defaultNotes: StickyNote[] = [
  { id: '1', content: 'Meeting vorbereiten\n- Agenda erstellen\n- Präsentation', color: '#fef3c7', x: 40, y: 60 },
  { id: '2', content: 'Launch-Checkliste\n✓ Design\n✓ Tests\n○ Deploy', color: '#dbeafe', x: 280, y: 80 },
  { id: '3', content: 'Ideen:\n• Podcast starten\n• Newsletter', color: '#dcfce7', x: 520, y: 50 },
];

export const store = {
  getProjects: (): Project[] => load('lifeosai_projects', defaultProjects),
  saveProjects: (p: Project[]) => save('lifeosai_projects', p),

  getDocuments: (): Document[] => load('lifeosai_documents', []),
  saveDocuments: (d: Document[]) => save('lifeosai_documents', d),

  getChats: (): ChatMessage[] => load('lifeosai_chats', []),
  saveChats: (c: ChatMessage[]) => save('lifeosai_chats', c),

  getNotifications: (): Notification[] => load('lifeosai_notifications', defaultNotifications),
  saveNotifications: (n: Notification[]) => save('lifeosai_notifications', n),

  getConnections: (): Connection[] => load('lifeosai_connections', defaultConnections),
  saveConnections: (c: Connection[]) => save('lifeosai_connections', c),

  getFeed: (): FeedPost[] => load('lifeosai_feed', defaultFeed),
  saveFeed: (f: FeedPost[]) => save('lifeosai_feed', f),

  getWorkflows: (): Workflow[] => load('lifeosai_workflows', defaultWorkflows),
  saveWorkflows: (w: Workflow[]) => save('lifeosai_workflows', w),

  getNotes: (): StickyNote[] => load('lifeosai_notes', defaultNotes),
  saveNotes: (n: StickyNote[]) => save('lifeosai_notes', n),

  getSelectedModel: (): string => load('lifeosai_model', 'GPT-4.5'),
  saveSelectedModel: (m: string) => save('lifeosai_model', m),
};
