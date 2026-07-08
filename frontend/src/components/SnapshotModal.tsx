import { X, Download, Check, XCircle } from 'lucide-react'
import type { SecurityEvent, AlertStatus } from '../types'
import { severityBadge, eventTypeIcon, formatDateTime, statusBadge, getAlertStatus } from '../utils'

interface Props {
  event: SecurityEvent
  onClose: () => void
}

export default function SnapshotModal({ event, onClose }: Props) {
  const status = getAlertStatus(event)

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-soc-800 border border-soc-600 rounded-xl max-w-xl w-full shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-soc-900 border-b border-soc-700">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{eventTypeIcon(event.event_type)}</span>
            <div>
              <div className="font-semibold text-lg leading-none text-slate-100">{event.event_type}</div>
              <div className="text-xs text-slate-500 mt-1">{formatDateTime(event.timestamp)}</div>
            </div>
            <span className={`ml-3 text-xs px-2 py-1 rounded font-bold ${severityBadge(event.severity)}`}>{event.severity}</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5">
          {/* Evidence */}
          {event.snapshot_path ? (
            <div className="mb-4">
              <img
                src={`/snapshots/${event.snapshot_path}`}
                alt="Evidence"
                className="w-full rounded border border-soc-600 max-h-[360px] object-contain bg-black"
              />
              <div className="text-[10px] text-right text-slate-500 mt-1 font-mono">{event.snapshot_path}</div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center bg-soc-900 border border-soc-700 rounded mb-4 text-sm text-slate-500">No snapshot captured</div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <div className="text-xs text-slate-400">SEVERITY</div>
              <div className={`inline ${severityBadge(event.severity)} px-2 py-0.5 rounded text-xs font-bold`}>{event.severity}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">CURRENT STATUS</div>
              <div className={`inline text-xs px-2 py-0.5 rounded ${statusBadge(status)}`}>{status}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">CAMERA / ID</div>
              <div className="font-mono text-slate-200">{event.camera || 'CAM-01'} • #{event.person_id || '—'}</div>
            </div>
            <div className="col-span-2">
              <div className="text-xs text-slate-400">DETAILS</div>
              <div className="text-slate-200">{event.message}</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 bg-soc-900 border-t border-soc-700 flex justify-end gap-2">
          {event.snapshot_path && (
            <a href={`/snapshots/${event.snapshot_path}`} download className="flex items-center gap-1.5 px-4 py-1.5 text-sm rounded bg-blue-600/80 hover:bg-blue-600 text-white">
              <Download className="w-4 h-4" /> DOWNLOAD EVIDENCE
            </a>
          )}
          <button onClick={onClose} className="px-4 py-1.5 rounded bg-soc-700 hover:bg-soc-600">CLOSE</button>
        </div>
      </div>
    </div>
  )
}
