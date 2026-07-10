import type { Severity, EventType, AlertStatus } from './types'

export function formatCompactNumber(n: number): string {
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

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

export function severityLabel(severity: Severity): string {
  switch (severity) {
    case 'Critical': return 'Nghiêm trọng'
    case 'High':     return 'Cao'
    case 'Medium':   return 'Trung bình'
    case 'Low':      return 'Thấp'
    case 'Info':     return 'Thông tin'
    default:         return severity
  }
}

export function eventTypeBadge(type: EventType) {
  switch (type) {
    case 'Intrusion':    return 'bg-red-900/50 text-red-300 border border-red-700/40'
    case 'Line Crossing':return 'bg-purple-900/50 text-purple-300 border border-purple-700/40'
    case 'Loitering':    return 'bg-amber-900/50 text-amber-300 border border-amber-700/40'
    case 'Climbing':     return 'bg-amber-900/40 text-amber-300 border border-amber-700/40'
    case 'After Hours':  return 'bg-sky-900/50 text-sky-300 border border-sky-700/40'
  }
}

export function eventTypeLabel(type: EventType | 'All'): string {
  switch (type) {
    case 'All':            return 'Tất cả'
    case 'Intrusion':      return 'Xâm nhập'
    case 'Line Crossing':  return 'Vượt đường'
    case 'Loitering':      return 'Đi lảng vẫn'
    case 'Climbing':       return 'Leo rào'
    case 'After Hours':    return 'Ngoài giờ'
    default:               return type
  }
}

/** Prefer Lucide icons in UI — kept for legacy callers */
export function eventTypeIcon(type: EventType): string {
  switch (type) {
    case 'Intrusion':    return '!'
    case 'Line Crossing':return '>'
    case 'Loitering':    return '~'
    case 'Climbing':     return '^'
    case 'After Hours':  return '*'
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

export function statusLabel(status: AlertStatus): string {
  switch (status) {
    case 'New':            return 'Mới'
    case 'Reviewing':      return 'Đang xem'
    case 'Acknowledged':   return 'Đã xem'
    case 'Resolved':       return 'Đã xử lý'
    case 'False Positive': return 'Báo nhầm'
    default:               return status
  }
}

export function getAlertStatus(event: { status?: AlertStatus }): AlertStatus {
  return event.status || 'New'
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN')
}

export function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return `${seconds} giây trước`
  if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`
  return `${Math.floor(seconds / 3600)} giờ trước`
}

/** Dịch message cũ từ DB (tiếng Anh) sang tiếng Việt khi hiển thị */
export function formatEventMessage(message: string): string {
  return message
    .replace(/Person #(\d+) entered (.+)/, 'Người #$1 xâm nhập $2')
    .replace(/Person #(\d+) entered perimeter/, 'Người #$1 đi vào chu vi')
    .replace(/Person #(\d+) exited perimeter/, 'Người #$1 đi ra khỏi chu vi')
    .replace(/Person #(\d+) loitering in (.+) for (\d+)s/, 'Người #$1 đi lảng vẫn tại $2 ($3s)')
    .replace(/Person #(\d+) possible climbing near fence/, 'Người #$1 nghi leo hàng rào')
    .replace(/Person #(\d+) rapid upward movement near fence/, 'Người #$1 chuyển động lên nhanh gần hàng rào')
    .replace(/Vùng cấm A/g, 'Vùng cấm')
    .replace(/Zone-A Restricted/g, 'Vùng cấm')
    .replace(/Fence Line/g, 'Đường hàng rào')
}
