import { useState } from 'react'
import { Bell, X } from 'lucide-react'
import type { SecurityEvent, EventType, AlertStatus } from '../types'
import { severityBadge, eventTypeBadge, eventTypeIcon, timeAgo, statusBadge, getAlertStatus } from '../utils'
import SnapshotModal from './SnapshotModal'

const ALL_TYPES: (EventType | 'All')[] = ['All', 'Intrusion', 'Climbing', 'Line Crossing', 'Loitering', 'After Hours']
const SEVERITIES: (SecurityEvent['severity'] | 'All')[] = ['All', 'Critical', 'High', 'Medium', 'Low']

interface Props {
  events: SecurityEvent[]
  onUpdateStatus?: (id: number, status: AlertStatus) => void
}

export default function AlertPanel({ events, onUpdateStatus }: Props) {
  const [typeFilter, setTypeFilter] = useState<EventType | 'All'>('All')
  const [sevFilter, setSevFilter] = useState<SecurityEvent['severity'] | 'All'>('All')
  const [selected, setSelected] = useState<SecurityEvent | null>(null)

  const filtered = events
    .filter(e => typeFilter === 'All' || e.event_type === typeFilter)
    .filter(e => sevFilter === 'All' || e.severity === sevFilter)
    .sort((a, b) => {
      // Prioritize Critical + New first
      const prio = (ev: SecurityEvent) => {
        if (ev.severity === 'Critical') return 100
        if (ev.severity === 'High') return 50
        return 10
      }
      return prio(b) - prio(a) || new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })

  const newCount = events.filter(e => getAlertStatus(e) === 'New').length

  const handleAction = (e: React.MouseEvent, id: number, status: AlertStatus) => {
    e.stopPropagation()
    onUpdateStatus?.(id, status)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Panel Header */}
      <div className="px-3 py-2 border-b border-soc-700/60 bg-soc-900 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-red-400" />
          <span className="font-semibold text-sm">ALERTS</span>
          <span className="text-xs px-1.5 py-px rounded bg-red-500/20 text-red-400 font-mono border border-red-500/30">
            {events.length}
          </span>
          {newCount > 0 && (
            <span className="text-[10px] px-1.5 py-0 rounded-full bg-red-600 text-white font-bold">{newCount} NEW</span>
          )}
        </div>
        <div className="text-[10px] text-slate-500">SORTED BY PRIORITY</div>
      </div>

      {/* Dual Filters */}
      <div className="px-2.5 py-2 border-b border-soc-700/50 bg-soc-800/80">
        <div className="flex flex-wrap gap-1 mb-1.5">
          {ALL_TYPES.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`text-[10px] px-2 py-px rounded font-medium transition ${typeFilter === t ? 'bg-blue-600 text-white' : 'bg-soc-700 text-slate-400 hover:text-slate-200'}`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {SEVERITIES.map(s => (
            <button
              key={s}
              onClick={() => setSevFilter(s)}
              className={`text-[10px] px-1.5 py-px rounded border transition ${sevFilter === s ? 'bg-orange-600 text-white border-orange-500' : 'bg-soc-700 text-slate-400 border-transparent hover:text-slate-200'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts List */}
      <div className="flex-1 overflow-y-auto divide-y divide-soc-700/40 text-sm">
        {filtered.length === 0 && (
          <div className="p-6 text-center text-slate-500 text-xs">No matching alerts</div>
        )}
        {filtered.map((evt, idx) => (
          <AlertCard 
            key={evt.id} 
            event={evt} 
            isLatest={idx === 0} 
            onClick={() => setSelected(evt)} 
            onUpdateStatus={onUpdateStatus}
            onQuickAction={handleAction}
          />
        ))}
      </div>

      {selected && <SnapshotModal event={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function AlertCard({ 
  event, 
  isLatest, 
  onClick, 
  onUpdateStatus, 
  onQuickAction 
}: { 
  event: SecurityEvent; 
  isLatest: boolean; 
  onClick: () => void; 
  onUpdateStatus?: (id: number, status: AlertStatus) => void;
  onQuickAction?: (e: React.MouseEvent, id: number, status: AlertStatus) => void;
}) {
  const status = getAlertStatus(event)
  const isActionable = status === 'New' || status === 'Reviewing'

  return (
    <div 
      onClick={onClick} 
      className={`group px-3 py-2.5 hover:bg-soc-700/60 cursor-pointer text-left transition-colors ${isLatest ? 'bg-red-950/30 border-l-2 border-red-500' : ''}`}
    >
      <div className="flex gap-2">
        <div className="text-base mt-px flex-shrink-0">{eventTypeIcon(event.event_type)}</div>
        
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between mb-0.5">
            <span className={`inline-block text-[10px] px-1.5 py-px rounded font-semibold ${eventTypeBadge(event.event_type)}`}>
              {event.event_type}
            </span>
            <span className={`inline-block text-[10px] px-1.5 py-px rounded-full font-bold ${severityBadge(event.severity)}`}>
              {event.severity}
            </span>
          </div>

          <div className="text-xs text-slate-200 leading-snug pr-1">{event.message}</div>

          <div className="flex items-center justify-between mt-1 text-[10px]">
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="font-mono">{timeAgo(event.timestamp)}</span>
              {event.person_id && <span className="font-mono text-soc-400">#{event.person_id}</span>}
            </div>
            <span className={`text-[10px] px-1 py-px rounded ${statusBadge(status)}`}>{status}</span>
          </div>

          {/* Evidence thumbnail */}
          {event.snapshot_path && (
            <div className="mt-1.5">
              <img 
                src={`/snapshots/${event.snapshot_path}`} 
                className="h-11 w-full object-cover rounded border border-soc-600/60" 
                alt="evidence" 
              />
            </div>
          )}

          {/* Quick Actions */}
          {isActionable && onQuickAction && (
            <div className="mt-1.5 flex gap-1 opacity-80 group-hover:opacity-100" onClick={e => e.stopPropagation()}>
              <button 
                onClick={(e) => onQuickAction(e, event.id, 'Acknowledged')}
                className="text-[9px] px-1.5 py-0.5 rounded bg-blue-600/70 hover:bg-blue-600 text-white"
              >
                ACK
              </button>
              <button 
                onClick={(e) => onQuickAction(e, event.id, 'False Positive')}
                className="text-[9px] px-1.5 py-0.5 rounded bg-slate-600 hover:bg-slate-500"
              >
                FALSE +
              </button>
              <button 
                onClick={(e) => onQuickAction(e, event.id, 'Resolved')}
                className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-700 hover:bg-emerald-600"
              >
                RESOLVE
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
