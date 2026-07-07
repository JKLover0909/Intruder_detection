import { X, Download } from 'lucide-react'
import type { SecurityEvent } from '../types'
import { severityBadge, eventTypeIcon, formatDateTime } from '../utils'

interface Props {
  event: SecurityEvent
  onClose: () => void
}

export default function SnapshotModal({ event, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-soc-800 border border-slate-700 rounded-xl max-w-lg w-full shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
          <div className="flex items-center gap-2">
            <span className="text-xl">{eventTypeIcon(event.event_type)}</span>
            <div>
              <h3 className="font-semibold text-slate-100">{event.event_type} Detected</h3>
              <p className="text-xs text-slate-500">{formatDateTime(event.timestamp)}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Snapshot image */}
        <div className="p-5">
          {event.snapshot_path ? (
            <img
              src={`/snapshots/${event.snapshot_path}`}
              alt="Evidence snapshot"
              className="w-full rounded-lg border border-slate-600/40 mb-4"
            />
          ) : (
            <div className="w-full h-40 bg-soc-900 rounded-lg border border-slate-600/40 flex items-center justify-center mb-4">
              <p className="text-slate-600 text-sm">No snapshot available</p>
            </div>
          )}

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Severity</span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${severityBadge(event.severity)}`}>
                {event.severity}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Type</span>
              <span className="text-slate-200">{event.event_type}</span>
            </div>
            <div className="flex justify-between items-start gap-4">
              <span className="text-slate-500 flex-shrink-0">Detail</span>
              <span className="text-slate-200 text-right">{event.message}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-4 flex gap-2 justify-end">
          {event.snapshot_path && (
            <a
              href={`/snapshots/${event.snapshot_path}`}
              download
              className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors border border-blue-600/30"
            >
              <Download className="w-4 h-4" /> Download
            </a>
          )}
          <button
            onClick={onClose}
            className="text-sm px-4 py-2 rounded-lg bg-soc-700 text-slate-300 hover:bg-soc-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
