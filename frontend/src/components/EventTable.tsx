import { TableProperties } from 'lucide-react'
import type { SecurityEvent } from '../types'
import { severityBadge, eventTypeBadge, eventTypeIcon, formatDateTime } from '../utils'

interface Props {
  events: SecurityEvent[]
}

export default function EventTable({ events }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-700/50">
        <TableProperties className="w-4 h-4 text-slate-400" />
        <span className="text-sm font-semibold text-slate-300">Event Log</span>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-soc-800 border-b border-slate-700/50">
            <tr>
              {['#', 'Time', 'Type', 'Severity', 'Message', 'Evidence'].map(h => (
                <th key={h} className="text-left px-4 py-2 text-slate-500 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {events.map((evt, i) => (
              <tr
                key={evt.id}
                className={`border-b border-slate-700/20 hover:bg-soc-700/30 transition-colors ${evt.severity === 'High' && i < 2 ? 'bg-red-900/5' : ''}`}
              >
                <td className="px-4 py-2.5 text-slate-600 font-mono">{evt.id}</td>
                <td className="px-4 py-2.5 text-slate-400 font-mono whitespace-nowrap">{formatDateTime(evt.timestamp)}</td>
                <td className="px-4 py-2.5">
                  <span className={`px-2 py-0.5 rounded font-semibold ${eventTypeBadge(evt.event_type)}`}>
                    {eventTypeIcon(evt.event_type)} {evt.event_type}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <span className={`px-2 py-0.5 rounded-full font-bold ${severityBadge(evt.severity)}`}>
                    {evt.severity}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-slate-300 max-w-xs truncate">{evt.message}</td>
                <td className="px-4 py-2.5">
                  {evt.snapshot_path ? (
                    <a
                      href={`/snapshots/${evt.snapshot_path}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
                    >
                      View
                    </a>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {events.length === 0 && (
          <div className="flex items-center justify-center h-24 text-slate-600">No events logged</div>
        )}
      </div>
    </div>
  )
}
