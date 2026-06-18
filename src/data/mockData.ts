import type { Project, FeedItem, Activity, Connection, Notification } from '../types'

export const defaultProjects: Project[] = [
  { id: '1', name: 'Marketing Kampagne Q1', description: 'Social Media Kampagne für Q1', color: 'from-blue-500 to-cyan-500', icon: '📊', fileCount: 12, createdAt: '2026-06-01', updatedAt: '2026-06-18' },
  { id: '2', name: 'Produktlaunch App', description: 'Launch der neuen Mobile App', color: 'from-violet-500 to-purple-500', icon: '🚀', fileCount: 8, createdAt: '2026-06-05', updatedAt: '2026-06-17' },
  { id: '3', name: 'Content Strategie 2026', description: 'Jahresplan für Content', color: 'from-green-500 to-teal-500', icon: '📝', fileCount: 24, createdAt: '2026-05-20', updatedAt: '2026-06-16' },
  { id: '4', name: 'Brand Identity', description: 'Neues Corporate Design', color: 'from-orange-500 to-red-500', icon: '🎨', fileCount: 6, createdAt: '2026-06-10', updatedAt: '2026-06-15' },
  { id: '5', name: 'SEO Optimierung', description: 'Website SEO Verbesserungen', color: 'from-pink-500 to-rose-500', icon: '🔍', fileCount: 15, createdAt: '2026-06-12', updatedAt: '2026-06-14' },
]

export const defaultFeedItems: FeedItem[] = [
  { id: '1', username: 'design_studio', avatar: 'DS', timeAgo: 'vor 2 Stunden', title: '10 Tipps für besseres UI Design', gradient: 'from-blue-400 to-purple-500', likes: 234, comments: 45, liked: false, bookmarked: false },
  { id: '2', username: 'ai_creator', avatar: 'AC', timeAgo: 'vor 4 Stunden', title: 'KI-Tools für Content Creator 2026', gradient: 'from-green-400 to-teal-500', likes: 567, comments: 89, liked: false, bookmarked: false },
  { id: '3', username: 'startup_hub', avatar: 'SH', timeAgo: 'vor 6 Stunden', title: 'Wie ich 10k Follower in 30 Tagen gewann', gradient: 'from-orange-400 to-red-500', likes: 1203, comments: 156, liked: false, bookmarked: false },
  { id: '4', username: 'tech_trends', avatar: 'TT', timeAgo: 'vor 1 Tag', title: 'Die wichtigsten Tech-Trends 2026', gradient: 'from-pink-400 to-violet-500', likes: 892, comments: 112, liked: false, bookmarked: false },
  { id: '5', username: 'content_king', avatar: 'CK', timeAgo: 'vor 2 Tagen', title: 'Content Calendar Template für Profis', gradient: 'from-cyan-400 to-blue-500', likes: 445, comments: 67, liked: false, bookmarked: false },
  { id: '6', username: 'market_mind', avatar: 'MM', timeAgo: 'vor 3 Tagen', title: 'Marketing ROI verbessern mit KI', gradient: 'from-yellow-400 to-orange-500', likes: 321, comments: 44, liked: false, bookmarked: false },
]

export const defaultActivities: Activity[] = [
  { id: '1', description: 'Du hast "Marketing Kampagne Q1" bearbeitet', time: 'vor 5 Min.', avatarColor: 'bg-blue-500' },
  { id: '2', description: 'Neue KI-Analyse für "Produktlaunch App" abgeschlossen', time: 'vor 20 Min.', avatarColor: 'bg-green-500' },
  { id: '3', description: 'Bild erfolgreich generiert', time: 'vor 1 Std.', avatarColor: 'bg-violet-500' },
  { id: '4', description: '"Content Strategie 2026" wurde aktualisiert', time: 'vor 2 Std.', avatarColor: 'bg-orange-500' },
  { id: '5', description: 'Neuer Workflow erstellt', time: 'vor 3 Std.', avatarColor: 'bg-pink-500' },
]

export const defaultConnections: Connection[] = [
  { id: '1', name: 'Instagram', icon: '📸', connected: true, color: 'from-pink-500 to-orange-500' },
  { id: '2', name: 'TikTok', icon: '🎵', connected: true, color: 'from-gray-800 to-gray-600' },
  { id: '3', name: 'Notion', icon: 'N', connected: true, color: 'from-gray-700 to-gray-500' },
  { id: '4', name: 'Google Drive', icon: '📁', connected: true, color: 'from-blue-500 to-green-500' },
  { id: '5', name: 'Slack', icon: '💬', connected: false, color: 'from-purple-600 to-pink-500' },
  { id: '6', name: 'Discord', icon: '🎮', connected: false, color: 'from-indigo-600 to-violet-600' },
]

export const defaultNotifications: Notification[] = [
  { id: '1', message: 'KI-Analyse für dein Projekt ist fertig', time: 'vor 5 Min.', read: false, type: 'success' },
  { id: '2', message: 'Neuer Follower: design_studio hat dir gefolgt', time: 'vor 30 Min.', read: false, type: 'info' },
  { id: '3', message: 'Dein Bild wurde erfolgreich generiert', time: 'vor 1 Std.', read: true, type: 'success' },
  { id: '4', message: 'Erinnerung: Marketing Meeting morgen um 10:00', time: 'vor 2 Std.', read: true, type: 'warning' },
]
