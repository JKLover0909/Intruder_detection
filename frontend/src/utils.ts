import type { Severity, EventType } from './types'

export function severityBadge(severity: Severity) {
  switch (severity) {
    case 'High':   return 'bg-red-500/20 text-red-400 border border-red-500/40'
    case 'Medium': return 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
    case 'Low':    return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
  }
}

export function eventTypeBadge(type: EventType) {
  switch (type) {
    case 'Intrusion':    return 'bg-red-900/40 text-red-300'
    case 'Line Crossing':return 'bg-purple-900/40 text-purple-300'
    case 'Loitering':   return 'bg-orange-900/40 text-orange-300'
    case 'Climbing':    return 'bg-pink-900/40 text-pink-300'
    case 'After Hours': return 'bg-blue-900/40 text-blue-300'
  }
}

export function eventTypeIcon(type: EventType): string {
  switch (type) {
    case 'Intrusion':    return '🚨'
    case 'Line Crossing':return '⛔'
    case 'Loitering':   return '🕵️'
    case 'Climbing':    return '🧗'
    case 'After Hours': return '🌙'
  }
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN')
}

export function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  return `${Math.floor(seconds / 3600)}h ago`
}
