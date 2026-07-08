import { useState } from 'react'
import { TableProperties } from 'lucide-react'
import type { SecurityEvent, AlertStatus } from '../types'
import { severityBadge, eventTypeBadge, eventTypeIcon, formatDateTime, statusBadge, getAlertStatus } from '../utils'

interface Props {
  events: SecurityEvent[]
  onUpdateStatus?: (id: number, status: AlertStatus) => void
}

export default function EventTable({ events, onUpdateStatus }: Props) {
  const [search, setSearch] = useState('')

  const filtered = events
    .filter(e => 
      !search || 
      e.message.toLowerCase().includes(search.toLowerCase()) ||
      String(e.person_id || '').includes(search)
    )
    .slice(0, 12) // Limit for performance on small screens

  return (
    <div className="flex flex-col h-full text-xs">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-soc-700/60 bg-soc-900">
        <div className="flex items-center gap-2">
          <TableProperties className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-slate-300">EVENT LOG</span>
          <span className="text-[10px] text-slate-500">({events.length})</span>
        </div>
        <input
          type="text"
          placeholder="Search ID or message..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-soc-800 border border-soc-700 text-xs px-2 py-0.5 rounded placeholder:text-slate-600 w-40 focus:outline-none focus:border-soc-500"
        />
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-soc-800 z-10 text-[10px] text-slate-400 border-b border-soc-700">
            <tr>
              <th className="text-left px-2 py-1 font-medium w-8">ID</th>
              <th className="text-left px-2 py-1 font-medium">TIME</th>
              <th className="text-left px-2 py-1 font-medium">TYPE</th>
              <th className="text-left px-2 py-1 font-medium">SEV</th>
              <th className="text-left px-2 py-1 font-medium">DESC</th>
              <th className="text-left px-2 py-1 font-medium">STATUS</th>
              <th className="text-left px-2 py-1 font-medium w-16">EVIDENCE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-soc-800/80 text-slate-300">
            {filtered.map((evt, idx) => {
              const status = getAlertStatus(evt)
              const isHigh = evt.severity === 'Critical' || evt.severity === 'High'
              return (
                <tr 
                  key={evt.id} 
                  className={`hover:bg-soc-700/50 ${isHigh && idx < 3 ? 'bg-red-950/20' : ''}`}
                >
                  <td className="px-2 py-1 font-mono text-slate-500 text-[10px]">{evt.id}</td>
                  <td className="px-2 py-1 font-mono text-[10px] text-slate-400 whitespace-nowrap">
                    {formatDateTime(evt.timestamp).slice(11, 19)}
                  </td>
                  <td className="px-2 py-1">
                    <span className={`inline px-1 py-px rounded text-[9px] ${eventTypeBadge(evt.event_type)}`}>
                      {eventTypeIcon(evt.event_type)} {evt.event_type.replace('Line Crossing', 'CROSS')}
                    </span>
                  </td>
                  <td className="px-2 py-1">
                    <span className={`px-1.5 py-px rounded text-[9px] font-bold ${severityBadge(evt.severity)}`}>
                      {evt.severity}
                    </span>
                  </td>
                  <td className="px-2 py-1 max-w-[180px] truncate text-slate-300 text-[10px]">{evt.message}</td>
                  <td className="px-2 py-1">
                    <span className={`text-[9px] px-1 py-px rounded ${statusBadge(status)}`}>{status}</span>
                  </td>
                  <td className="px-2 py-1">
                    {evt.snapshot_path ? (
                      <a 
                        href={`/snapshots/${evt.snapshot_path}`} 
                        target="_blank" 
                        className="text-blue-400 hover:underline text-[10px]"
                        onClick={e => e.stopPropagation()}
                      >
                        VIEW
                      </a>
                    ) : '—'}
                    {onUpdateStatus && status !== 'Resolved' && status !== 'False Positive' && (
                      <button 
                        onClick={() => onUpdateStatus(evt.id, 'Resolved')}
                        className="ml-2 text-emerald-400 hover:text-emerald-300 text-[9px]"
                      >
                        ✓
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="p-4 text-center text-slate-500 text-xs">No matching events</div>}
      </div>
    </div>
  )
}
