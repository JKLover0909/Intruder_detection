import { useState } from 'react'
import {
  Bell, PanelRightClose, Trash2,
  ShieldAlert, TrendingUp, ArrowRightLeft, Clock, Moon,
} from 'lucide-react'
import type { SecurityEvent, EventType, AlertStatus } from '../types'
import {
  severityBadge, eventTypeBadge, timeAgo, statusBadge,
  getAlertStatus, eventTypeLabel, severityLabel, statusLabel, formatEventMessage,
} from '../utils'
import SnapshotModal from './SnapshotModal'

const ALL_TYPES: (EventType | 'All')[] = ['All', 'Intrusion', 'Climbing', 'Line Crossing', 'Loitering', 'After Hours']
const SEVERITIES: (SecurityEvent['severity'] | 'All')[] = ['All', 'Critical', 'High', 'Medium', 'Low']

interface Props {
  events: SecurityEvent[]
  onUpdateStatus?: (id: number, status: AlertStatus) => void
  onClearEvents?: () => void
  onCollapse?: () => void
  backendAvailable?: boolean
}

function TypeIcon({ type, className = 'w-5 h-5' }: { type: EventType; className?: string }) {
  switch (type) {
    case 'Intrusion':
      return <ShieldAlert className={`${className} text-red-400`} />
    case 'Climbing':
      return <TrendingUp className={`${className} text-amber-400`} />
    case 'Line Crossing':
      return <ArrowRightLeft className={`${className} text-sky-400`} />
    case 'Loitering':
      return <Clock className={`${className} text-amber-300`} />
    case 'After Hours':
      return <Moon className={`${className} text-slate-400`} />
  }
}

export default function AlertPanel({ events, onUpdateStatus, onClearEvents, onCollapse, backendAvailable }: Props) {
  const [typeFilter, setTypeFilter] = useState<EventType | 'All'>('All')
  const [sevFilter, setSevFilter] = useState<SecurityEvent['severity'] | 'All'>('All')
  const [showPendingOnly, setShowPendingOnly] = useState(true)
  const [selected, setSelected] = useState<SecurityEvent | null>(null)

  const pendingStatuses: AlertStatus[] = ['New', 'Reviewing']

  const filtered = events
    .filter(e => !showPendingOnly || pendingStatuses.includes(getAlertStatus(e)))
    .filter(e => typeFilter === 'All' || e.event_type === typeFilter)
    .filter(e => sevFilter === 'All' || e.severity === sevFilter)
    .sort((a, b) => {
      const prio = (ev: SecurityEvent) => {
        if (ev.severity === 'Critical') return 100
        if (ev.severity === 'High') return 50
        return 10
      }
      return prio(b) - prio(a) || new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })
    .slice(0, 40)

  const newCount = events.filter(e => getAlertStatus(e) === 'New').length

  const handleAction = (e: React.MouseEvent, id: number, status: AlertStatus) => {
    e.stopPropagation()
    onUpdateStatus?.(id, status)
  }

  const handleClear = async () => {
    if (!backendAvailable) {
      onClearEvents?.()
      return
    }
    if (!confirm('Xóa toàn bộ cảnh báo trong database?')) return
    try {
      await fetch('/api/events/clear', { method: 'POST' })
      onClearEvents?.()
    } catch { /* ignore */ }
  }

  return (
    <div className="flex flex-col h-full bg-soc-900/40">
      <div className="px-3 py-2.5 border-b border-soc-700/70 bg-soc-900 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-red-400" />
          <span className="font-semibold text-sm text-slate-100">Cảnh báo</span>
          {newCount > 0 ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-600 text-white font-bold tabular-nums">{newCount} mới</span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-soc-700 text-slate-400 tabular-nums">{filtered.length}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleClear}
            className="p-1.5 text-slate-500 hover:text-red-400 rounded-md transition-colors duration-200"
            title="Xóa tất cả cảnh báo"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {onCollapse && (
            <button
              onClick={onCollapse}
              className="p-1.5 text-slate-500 hover:text-slate-200 rounded-md transition-colors duration-200"
              title="Ẩn bảng cảnh báo"
            >
              <PanelRightClose className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="px-2.5 py-2 border-b border-soc-700/50 bg-soc-800/60 space-y-1.5">
        <div className="flex gap-1">
          <button
            onClick={() => setShowPendingOnly(true)}
            className={`text-[10px] px-2.5 py-1 rounded-md font-medium transition-colors duration-200 ${showPendingOnly ? 'bg-red-600 text-white' : 'bg-soc-700 text-slate-400 hover:text-slate-200'}`}
          >
            Chưa xử lý
          </button>
          <button
            onClick={() => setShowPendingOnly(false)}
            className={`text-[10px] px-2.5 py-1 rounded-md font-medium transition-colors duration-200 ${!showPendingOnly ? 'bg-soc-600 text-white' : 'bg-soc-700 text-slate-400 hover:text-slate-200'}`}
          >
            Tất cả
          </button>
        </div>
        <div className="flex flex-wrap gap-1">
          {ALL_TYPES.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition-colors duration-200 ${typeFilter === t ? 'bg-sky-600 text-white' : 'bg-soc-700 text-slate-400 hover:text-slate-200'}`}
            >
              {eventTypeLabel(t)}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {SEVERITIES.map(s => (
            <button
              key={s}
              onClick={() => setSevFilter(s)}
              className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors duration-200 ${sevFilter === s ? 'bg-orange-600 text-white border-orange-500' : 'bg-soc-700 text-slate-400 border-transparent hover:text-slate-200'}`}
            >
              {s === 'All' ? 'Mọi mức' : severityLabel(s)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-soc-700/40 text-sm">
        {filtered.length === 0 && (
          <div className="p-8 text-center text-slate-500 text-xs">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-slate-300 font-medium mb-1">
              {showPendingOnly ? 'Không có sự cố cần xử lý' : 'Chưa có cảnh báo'}
            </p>
            <p className="text-slate-500">Hệ thống đang giám sát bình thường</p>
          </div>
        )}
        {filtered.map((evt, idx) => (
          <AlertCard
            key={evt.id}
            event={evt}
            isLatest={idx === 0 && getAlertStatus(evt) === 'New'}
            onClick={() => setSelected(evt)}
            onQuickAction={handleAction}
          />
        ))}
      </div>

      {selected && <SnapshotModal event={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function AlertCard({
  event, isLatest, onClick, onQuickAction,
}: {
  event: SecurityEvent; isLatest: boolean; onClick: () => void
  onQuickAction?: (e: React.MouseEvent, id: number, status: AlertStatus) => void
}) {
  const status = getAlertStatus(event)
  const isActionable = status === 'New' || status === 'Reviewing'

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
      className={`group px-3 py-2.5 hover:bg-soc-700/40 cursor-pointer text-left transition-colors duration-200 ${
        isLatest ? 'bg-red-950/30 border-l-2 border-red-500' : 'border-l-2 border-transparent'
      }`}
    >
      <div className="flex gap-2.5">
        {event.snapshot_path ? (
          <img
            src={`/snapshots/${event.snapshot_path}`}
            className="w-16 h-14 object-cover rounded-md border border-soc-600/60 shrink-0"
            alt="Bằng chứng sự cố"
          />
        ) : (
          <div className="w-16 h-14 rounded-md border border-soc-700 bg-soc-950 flex items-center justify-center shrink-0">
            <TypeIcon type={event.event_type} className="w-5 h-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <span className={`text-[10px] px-1.5 py-px rounded font-semibold ${eventTypeBadge(event.event_type)}`}>
              {eventTypeLabel(event.event_type)}
            </span>
            <span className={`text-[10px] px-1.5 py-px rounded-full font-bold ${severityBadge(event.severity)}`}>
              {severityLabel(event.severity)}
            </span>
            <span className={`text-[10px] px-1 py-px rounded ml-auto ${statusBadge(status)}`}>
              {statusLabel(status)}
            </span>
          </div>
          <div className="text-xs text-slate-100 leading-snug line-clamp-2">{formatEventMessage(event.message)}</div>
          <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1.5">
            <span>{timeAgo(event.timestamp)}</span>
            {event.camera && (
              <>
                <span className="text-soc-600">·</span>
                <span className="truncate">{event.camera}</span>
              </>
            )}
          </div>
          {isActionable && onQuickAction && (
            <div className="mt-1.5 flex gap-1" onClick={e => e.stopPropagation()}>
              <button
                onClick={(e) => onQuickAction(e, event.id, 'Acknowledged')}
                className="text-[10px] px-2 py-1 rounded-md bg-sky-600 hover:bg-sky-500 text-white font-medium transition-colors duration-200"
              >
                Đã xem
              </button>
              <button
                onClick={(e) => onQuickAction(e, event.id, 'False Positive')}
                className="text-[10px] px-2 py-1 rounded-md bg-soc-600 hover:bg-soc-500 text-slate-100 transition-colors duration-200"
              >
                Báo nhầm
              </button>
              <button
                onClick={(e) => onQuickAction(e, event.id, 'Resolved')}
                className="text-[10px] px-2 py-1 rounded-md bg-emerald-700 hover:bg-emerald-600 text-white font-medium transition-colors duration-200"
              >
                Đã xử lý
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
