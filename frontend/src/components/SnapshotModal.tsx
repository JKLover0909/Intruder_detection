import { X, Download, ShieldAlert, TrendingUp, ArrowRightLeft, Clock, Moon } from 'lucide-react'
import type { SecurityEvent, EventType } from '../types'
import {
  severityBadge, formatDateTime, statusBadge, getAlertStatus,
  eventTypeLabel, severityLabel, statusLabel, formatEventMessage,
} from '../utils'

interface Props {
  event: SecurityEvent
  onClose: () => void
}

function TypeIcon({ type }: { type: EventType }) {
  const cls = 'w-6 h-6'
  switch (type) {
    case 'Intrusion': return <ShieldAlert className={`${cls} text-red-400`} />
    case 'Climbing': return <TrendingUp className={`${cls} text-amber-400`} />
    case 'Line Crossing': return <ArrowRightLeft className={`${cls} text-sky-400`} />
    case 'Loitering': return <Clock className={`${cls} text-amber-300`} />
    case 'After Hours': return <Moon className={`${cls} text-slate-400`} />
  }
}

export default function SnapshotModal({ event, onClose }: Props) {
  const status = getAlertStatus(event)

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-soc-900 border border-soc-600 rounded-xl max-w-xl w-full shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Chi tiết cảnh báo"
      >
        <div className="flex items-center justify-between px-5 py-3 bg-soc-950 border-b border-soc-700">
          <div className="flex items-center gap-3 min-w-0">
            <TypeIcon type={event.event_type} />
            <div className="min-w-0">
              <div className="font-semibold text-base leading-none text-slate-50">{eventTypeLabel(event.event_type)}</div>
              <div className="text-xs text-slate-500 mt-1">{formatDateTime(event.timestamp)}</div>
            </div>
            <span className={`ml-1 text-xs px-2 py-1 rounded font-bold shrink-0 ${severityBadge(event.severity)}`}>
              {severityLabel(event.severity)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-md transition-colors duration-200"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          {event.snapshot_path ? (
            <div className="mb-4">
              <img
                src={`/snapshots/${event.snapshot_path}`}
                alt="Bằng chứng sự cố"
                className="w-full rounded-lg border border-soc-600 max-h-[360px] object-contain bg-black"
              />
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center bg-soc-950 border border-soc-700 rounded-lg mb-4 text-sm text-slate-500">
              Chưa có ảnh chụp
            </div>
          )}

          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <div className="label-caps mb-1">Mức độ</div>
              <div className={`inline-block ${severityBadge(event.severity)} px-2 py-0.5 rounded text-xs font-bold`}>
                {severityLabel(event.severity)}
              </div>
            </div>
            <div>
              <div className="label-caps mb-1">Trạng thái</div>
              <div className={`inline-block text-xs px-2 py-0.5 rounded ${statusBadge(status)}`}>
                {statusLabel(status)}
              </div>
            </div>
            <div>
              <div className="label-caps mb-1">Camera</div>
              <div className="text-slate-200">{event.camera || 'CAM-01'}</div>
            </div>
            <div>
              <div className="label-caps mb-1">Đối tượng</div>
              <div className="font-mono text-slate-200">#{event.person_id || '—'}</div>
            </div>
            <div className="col-span-2">
              <div className="label-caps mb-1">Chi tiết</div>
              <div className="text-slate-200">{formatEventMessage(event.message)}</div>
            </div>
          </div>
        </div>

        <div className="px-5 py-3.5 bg-soc-950 border-t border-soc-700 flex justify-end gap-2">
          {event.snapshot_path && (
            <a
              href={`/snapshots/${event.snapshot_path}`}
              download
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-md bg-sky-600 hover:bg-sky-500 text-white transition-colors duration-200"
            >
              <Download className="w-4 h-4" /> Tải bằng chứng
            </a>
          )}
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-soc-700 hover:bg-soc-600 text-slate-100 transition-colors duration-200"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
