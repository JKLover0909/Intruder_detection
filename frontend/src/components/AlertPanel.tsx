import { useState } from 'react'
import { Bell, Filter } from 'lucide-react'
import type { SecurityEvent, EventType } from '../types'
import { severityBadge, eventTypeBadge, eventTypeIcon, timeAgo } from '../utils'
import SnapshotModal from './SnapshotModal'

const ALL_TYPES: EventType[] = ['Intrusion', 'Line Crossing', 'Loitering', 'Climbing', 'After Hours']

interface Props {
  events: SecurityEvent[]
}

export default function AlertPanel({ events }: Props) {
  const [filter, setFilter] = useState<EventType | 'All'>('All')
  const [selected, setSelected] = useState<SecurityEvent | null>(null)

  const filtered = filter === 'All' ? events : events.filter(e => e.event_type === filter)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-red-400" />
          <span className="text-sm font-semibold text-slate-200">Real-time Alerts</span>
          <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 rounded-full px-2 py-0.5 font-semibold">
            {events.length}
          </span>
        </div>
        <Filter className="w-3.5 h-3.5 text-slate-500" />
      </div>

      {/* Filter chips */}
      <div className="flex gap-1.5 p-2 flex-wrap border-b border-slate-700/30">
        {(['All', ...ALL_TYPES] as const).map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
              filter === t
                ? 'bg-blue-600 text-white'
                : 'bg-soc-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Alert list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="flex items-center justify-center h-32 text-slate-600 text-sm">
            No alerts
          </div>
        )}
        {filtered.map((evt, i) => (
          <AlertCard key={evt.id} event={evt} isLatest={i === 0} onClick={() => setSelected(evt)} />
        ))}
      </div>

      {selected && <SnapshotModal event={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function AlertCard({ event, isLatest, onClick }: { event: SecurityEvent; isLatest: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-slate-700/30 hover:bg-soc-700/50 transition-colors ${isLatest ? 'bg-red-900/10' : ''}`}
    >
      <div className="flex items-start gap-2">
        <span className="text-lg flex-shrink-0 mt-0.5">{eventTypeIcon(event.event_type)}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded font-semibold ${eventTypeBadge(event.event_type)}`}>
              {event.event_type}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${severityBadge(event.severity)}`}>
              {event.severity}
            </span>
          </div>
          <p className="text-xs text-slate-300 truncate">{event.message}</p>
          <p className="text-xs text-slate-600 mt-1">{timeAgo(event.timestamp)}</p>
        </div>
      </div>
      {event.snapshot_path && (
        <div className="mt-2 ml-7">
          <img
            src={`/snapshots/${event.snapshot_path}`}
            alt="snapshot"
            className="w-full h-16 object-cover rounded border border-slate-600/30"
          />
        </div>
      )}
    </button>
  )
}
