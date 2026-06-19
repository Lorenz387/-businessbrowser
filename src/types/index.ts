export interface Project {
  id: string
  name: string
  description: string
  color: string
  icon: string
  fileCount: number
  createdAt: string
  updatedAt: string
  status?: string
}

export interface Document {
  id: string
  name: string
  content: string
  projectId?: string
  createdAt: string
  updatedAt: string
}

export interface Notification {
  id: string
  message: string
  time: string
  read: boolean
  type: 'info' | 'success' | 'warning'
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  model: string
  timestamp: string
}

export interface FeedItem {
  id: string
  username: string
  avatar: string
  timeAgo: string
  title: string
  gradient: string
  likes: number
  comments: number
  liked: boolean
  bookmarked: boolean
}

export interface Activity {
  id: string
  description: string
  time: string
  avatarColor: string
}

export interface Connection {
  id: string
  name: string
  icon: string
  connected: boolean
  color: string
}

export interface Workflow {
  id: string
  name: string
  trigger: string
  actions: string[]
  enabled: boolean
  createdAt: string
}

export interface Mindmap {
  id: string
  name: string
  nodes: MindmapNode[]
  createdAt: string
}

export interface MindmapNode {
  id: string
  label: string
  x: number
  y: number
  parentId?: string
  color: string
}

export interface StickyNote {
  id: string
  content: string
  x: number
  y: number
  color: string
  whiteboardId: string
}

export interface Whiteboard {
  id: string
  name: string
  notes: StickyNote[]
  createdAt: string
}
