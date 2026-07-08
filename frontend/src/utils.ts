import type { Severity, EventType, AlertStatus } from './types'

export function severityBadge(severity: Severity) {
  switch (severity) {
    case 'Critical': return 'bg-red-600/30 text-red-300 border border-red-500/60 font-semibold'
    case 'High':     return 'bg-orange-500/25 text-orange-300 border border-orange-500/50'
    case 'Medium':   return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
    case 'Low':      return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
    case 'Info':     return 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
    default:         return 'bg-slate-500/20 text-slate-300 border border-slate-500/40'
  }
}

export function severityColor(severity: Severity): string {
  switch (severity) {
    case 'Critical': return '#ef4444'
    case 'High':     return '#f97316'
    case 'Medium':   return '#eab308'
    case 'Low':      return '#22c55e'
    default:         return '#64748b'
  }
}

export function eventTypeBadge(type: EventType) {
  switch (type) {
    case 'Intrusion':    return 'bg-red-900/50 text-red-300 border border-red-700/40'
    case 'Line Crossing':return 'bg-purple-900/50 text-purple-300 border border-purple-700/40'
    case 'Loitering':    return 'bg-amber-900/50 text-amber-300 border border-amber-700/40'
    case 'Climbing':     return 'bg-fuchsia-900/50 text-fuchsia-300 border border-fuchsia-700/40'
    case 'After Hours':  return 'bg-sky-900/50 text-sky-300 border border-sky-700/40'
  }
}

export function eventTypeColor(type: EventType): string {
  switch (type) {
    case 'Intrusion':    return '#dc2626'
    case 'Line Crossing':return '#a855f7'
    case 'Loitering':    return '#f59e0b'
    case 'Climbing':     return '#c026ff'
    case 'After Hours':  return '#0ea5e9'
    default:             return '#64748b'
  }
}

export function eventTypeIcon(type: EventType): string {
  switch (type) {
    case 'Intrusion':    return '🚨'
    case 'Line Crossing':return '⛔'
    case 'Loitering':    return '🕵️'
    case 'Climbing':     return '🧗'
    case 'After Hours':  return '🌙'
  }
}

export function statusBadge(status: AlertStatus) {
  switch (status) {
    case 'New':            return 'bg-red-500/20 text-red-400 border border-red-500/40'
    case 'Reviewing':      return 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
    case 'Acknowledged':   return 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
    case 'Resolved':       return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
    case 'False Positive': return 'bg-slate-500/20 text-slate-400 border border-slate-500/40'
  }
}

export function getAlertStatus(event: { status?: AlertStatus }): AlertStatus {
  return event.status || 'New'
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
