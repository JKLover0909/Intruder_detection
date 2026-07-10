import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Camera, AlertCircle, Eye, EyeOff, Maximize2, Minimize2,
  Grid2x2, ChevronLeft, Settings2, ShieldAlert,
} from 'lucide-react'
import type { SecurityEvent } from '../types'
import { getAlertStatus } from '../utils'

interface CameraInfo {
  id: string
  short?: string
  camera_label?: string
  video?: string
  focus?: string
  available?: boolean
}

interface Props {
  backendAvailable: boolean
  fps?: number
  fpsByCamera?: Record<string, number>
  events?: SecurityEvent[]
}

type OverlayKey = 'roi' | 'fence' | 'boxes' | 'labels'

const OVERLAY_LABELS: Record<OverlayKey, string> = {
  roi: 'Vùng',
  fence: 'Rào',
  boxes: 'Khung',
  labels: 'Nhãn',
}

const DEFAULT_OVERLAYS: Record<OverlayKey, boolean> = {
  roi: true,
  fence: true,
  boxes: true,
  labels: true,
}

const FALLBACK_CAMERAS: CameraInfo[] = [
  { id: 'perimeter_y', short: 'Chu vi', camera_label: 'CAM-01 · Chu vi Bắc', focus: 'roi_line' },
  { id: 'climb_park', short: 'Công viên', camera_label: 'CAM-02 · Hàng rào công viên', focus: 'climbing' },
  { id: 'climb_night', short: 'Ban đêm', camera_label: 'CAM-03 · Hàng rào đêm', focus: 'climbing' },
  { id: 'climb_gym', short: 'Phòng tập', camera_label: 'CAM-04 · Hàng rào tập luyện', focus: 'climbing' },
]

/** Map sự kiện → camera id để highlight đúng ô. */
function inferAlertCamIds(events: SecurityEvent[], cameras: CameraInfo[]): Set<string> {
  const pending = events.filter(e => {
    const s = getAlertStatus(e)
    return s === 'New' || s === 'Reviewing'
  })
  const ids = new Set<string>()
  const perimeterId = cameras.find(c => c.focus !== 'climbing')?.id || 'perimeter_y'

  for (const e of pending) {
    const hint = (e.camera || '').toLowerCase()
    if (hint) {
      const matched = cameras.find(c => {
        const label = (c.camera_label || '').toLowerCase()
        const short = (c.short || '').toLowerCase()
        return (
          (label && hint.includes(label)) ||
          (label && label.includes(hint)) ||
          (hint.includes('cam-01') && c.id === 'perimeter_y') ||
          (hint.includes('cam-02') && c.id === 'climb_park') ||
          (hint.includes('cam-03') && c.id === 'climb_night') ||
          (hint.includes('cam-04') && c.id === 'climb_gym') ||
          (short && hint.includes(short))
        )
      })
      if (matched) {
        ids.add(matched.id)
        continue
      }
    }
    if (e.event_type === 'Climbing') {
      continue
    }
    ids.add(perimeterId)
  }
  return ids
}

function focusLabel(focus?: string) {
  return focus === 'climbing'
    ? { text: 'Phát hiện leo rào', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' }
    : { text: 'Giám sát vùng', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' }
}

export default function VideoPanel({
  backendAvailable,
  fps = 0,
  fpsByCamera = {},
  events = [],
}: Props) {
  const [cameras, setCameras] = useState<CameraInfo[]>(FALLBACK_CAMERAS)
  const [streamKey, setStreamKey] = useState(() => Date.now())
  const [showOverlays, setShowOverlays] = useState(DEFAULT_OVERLAYS)
  const [showTech, setShowTech] = useState(false)
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [tileErrors, setTileErrors] = useState<Record<string, boolean>>({})
  const containerRef = useRef<HTMLDivElement>(null)
  const wasOnline = useRef(false)

  const alertCamIds = useMemo(
    () => inferAlertCamIds(events, cameras),
    [events, cameras],
  )

  useEffect(() => {
    if (!backendAvailable) {
      wasOnline.current = false
      return
    }
    if (!wasOnline.current) {
      wasOnline.current = true
      setStreamKey(Date.now())
      setTileErrors({})
    }
    fetch('/api/overlays')
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (data) setShowOverlays(prev => ({ ...prev, ...data })) })
      .catch(() => {})
    fetch('/api/demos')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        const list: CameraInfo[] = data?.cameras?.length
          ? data.cameras
          : (data?.demos || []).map((d: CameraInfo & { available?: boolean }) => d)
        if (list.length) {
          setCameras(list.filter(c => c.available !== false).slice(0, 4))
        }
      })
      .catch(() => {})
  }, [backendAvailable])

  const toggleOverlay = useCallback(async (key: OverlayKey) => {
    const next = !showOverlays[key]
    setShowOverlays(prev => ({ ...prev, [key]: next }))
    if (!backendAvailable) return
    try {
      const params = new URLSearchParams({ [key]: String(next) })
      const res = await fetch(`/api/overlays?${params}`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setShowOverlays(prev => ({ ...prev, ...data }))
      }
    } catch { /* giữ trạng thái local */ }
  }, [showOverlays, backendAvailable])

  const toggleFullscreen = async () => {
    const el = containerRef.current
    if (!el) return
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch (e) {
      console.error('Fullscreen failed', e)
    }
  }

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  const focusedCam = focusedId ? cameras.find(c => c.id === focusedId) : null
  const visibleCams = focusedCam ? [focusedCam] : cameras
  const alertCount = alertCamIds.size

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-soc-700/80 bg-soc-900/90 text-xs gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {focusedCam ? (
            <button
              onClick={() => setFocusedId(null)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-soc-800 hover:bg-soc-700 rounded-md text-slate-100 transition-colors duration-200 shrink-0 border border-soc-600/60"
              title="Quay lại lưới 4 camera"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <Grid2x2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-medium">Tất cả camera</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-soc-800 rounded-md shrink-0 border border-soc-700/80">
              <Camera className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-medium text-slate-100">4 camera đang giám sát</span>
            </div>
          )}
          {alertCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md border border-red-500/40 bg-red-500/10 text-red-200 shrink-0">
              <ShieldAlert className="w-3 h-3" />
              {alertCount} cam có cảnh báo
            </span>
          )}
          {showTech && (
            <span className="text-[10px] text-slate-500 font-mono tabular-nums shrink-0">
              FPS {fps > 0 ? fps.toFixed(0) : '—'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setShowTech(v => !v)}
            className={`px-2 py-1 rounded-md flex items-center gap-1 border text-[10px] transition-colors duration-200 ${
              showTech
                ? 'bg-soc-700 text-slate-100 border-soc-500'
                : 'bg-soc-800 text-slate-400 border-soc-700 hover:text-slate-200'
            }`}
            title="Hiện tùy chọn kỹ thuật"
          >
            <Settings2 className="w-3 h-3" />
            <span className="hidden sm:inline">Chi tiết</span>
          </button>

          {showTech && (
            <div className="flex items-center gap-0.5">
              {(['roi', 'fence', 'boxes', 'labels'] as const).map(key => (
                <button
                  key={key}
                  onClick={() => toggleOverlay(key)}
                  className={`px-1.5 py-1 rounded-md flex items-center gap-0.5 transition-colors duration-200 border text-[10px] ${
                    showOverlays[key]
                      ? 'bg-soc-700 text-emerald-400 border-soc-600'
                      : 'bg-soc-800 text-slate-500 border-soc-700'
                  }`}
                  title={`Bật/tắt ${OVERLAY_LABELS[key]}`}
                >
                  {showOverlays[key] ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  <span className="hidden md:inline">{OVERLAY_LABELS[key]}</span>
                </button>
              ))}
            </div>
          )}

          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1 px-2 py-1 bg-soc-700 hover:bg-soc-600 rounded-md text-slate-200 transition-colors duration-200 border border-soc-600/50"
            title={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className={`relative flex-1 bg-soc-950 overflow-hidden ${
          focusedCam ? 'grid grid-cols-1 grid-rows-1' : 'grid grid-cols-2 grid-rows-2 gap-0.5'
        }`}
      >
        {visibleCams.map(cam => (
          <CameraTile
            key={cam.id}
            cam={cam}
            backendAvailable={backendAvailable}
            streamKey={streamKey}
            fps={fpsByCamera[cam.id]}
            showTech={showTech}
            hasAlert={alertCamIds.has(cam.id)}
            isFocused={!!focusedCam}
            hasError={!!tileErrors[cam.id]}
            onError={() => setTileErrors(prev => ({ ...prev, [cam.id]: true }))}
            onSelect={() => setFocusedId(prev => (prev === cam.id ? null : cam.id))}
          />
        ))}
      </div>

      <div className="px-3 py-1.5 text-[10px] bg-soc-900 border-t border-soc-700/80 flex items-center justify-between text-slate-500 gap-2">
        <span className="truncate">
          {focusedCam
            ? `Đang xem · ${focusedCam.camera_label || focusedCam.short}`
            : 'Bấm vào camera để phóng to · Bấm lại hoặc «Tất cả camera» để về lưới'}
        </span>
        <span className={`shrink-0 font-medium ${backendAvailable ? 'text-emerald-400' : 'text-amber-400'}`}>
          {backendAvailable ? 'Đang giám sát' : 'Chế độ mô phỏng'}
        </span>
      </div>
    </div>
  )
}

function CameraTile({
  cam,
  backendAvailable,
  streamKey,
  fps,
  showTech,
  hasAlert,
  isFocused,
  hasError,
  onError,
  onSelect,
}: {
  cam: CameraInfo
  backendAvailable: boolean
  streamKey: number
  fps?: number
  showTech: boolean
  hasAlert: boolean
  isFocused: boolean
  hasError: boolean
  onError: () => void
  onSelect: () => void
}) {
  const badge = focusLabel(cam.focus)
  const fpsLabel = fps && fps > 0 ? fps.toFixed(0) : '—'

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative bg-soc-950 flex flex-col min-h-0 min-w-0 overflow-hidden text-left transition-shadow duration-200 focus:outline-none ${
        hasAlert
          ? 'ring-2 ring-inset ring-red-500 animate-pulse-red'
          : 'hover:ring-1 hover:ring-inset hover:ring-soc-500'
      }`}
      title={isFocused ? 'Bấm để quay lại lưới' : 'Bấm để phóng to camera này'}
    >
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between gap-1 px-2.5 py-2 bg-gradient-to-b from-black/90 via-black/40 to-transparent pointer-events-none">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[11px] font-medium text-slate-50 truncate">
            {cam.camera_label || cam.short || cam.id}
          </span>
          <span className={`text-[9px] px-1.5 py-px rounded border shrink-0 ${badge.cls}`}>
            {badge.text}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {hasAlert && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-600 text-white font-semibold animate-pulse-critical">
              Cảnh báo
            </span>
          )}
          {showTech && (
            <span className="text-[9px] font-mono text-emerald-400/90 tabular-nums">
              {fpsLabel} fps
            </span>
          )}
        </div>
      </div>

      {!isFocused && cam.focus !== 'climbing' && (
        <div className="absolute bottom-1.5 left-1.5 z-10 pointer-events-none flex gap-1 text-[8px]">
          <span className="px-1 py-px rounded bg-black/60 text-red-300">Cấm</span>
          <span className="px-1 py-px rounded bg-black/60 text-amber-300">Cảnh báo</span>
          <span className="px-1 py-px rounded bg-black/60 text-slate-400">An toàn</span>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center min-h-0 w-full">
        {backendAvailable && !hasError ? (
          <img
            src={`/video_feed/${cam.id}?ts=${streamKey}`}
            alt={cam.camera_label || cam.id}
            className="video-feed w-full h-full object-contain pointer-events-none"
            onError={onError}
            draggable={false}
          />
        ) : backendAvailable && hasError ? (
          <div className="text-center text-slate-500 px-2">
            <AlertCircle className="mx-auto w-5 h-5 mb-1" />
            <p className="text-[10px]">Không xem được camera này</p>
          </div>
        ) : (
          <div className="text-center text-slate-500 px-2">
            <AlertCircle className="mx-auto w-5 h-5 mb-1" />
            <p className="text-[10px]">Hệ thống tạm ngắt kết nối</p>
          </div>
        )}
      </div>
    </button>
  )
}
