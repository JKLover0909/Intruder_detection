import { useEffect, useState } from 'react'
import { Layers, Fence, MapPinned } from 'lucide-react'

export interface DemoInfo {
  id: string
  name: string
  short: string
  group: string
  description: string
  video: string
  camera_label: string
  focus: string
  available: boolean
}

interface Props {
  backendAvailable: boolean
  onSwitched?: (demo: DemoInfo & { video?: string }) => void
}

export default function DemoSwitcher({ backendAvailable, onSwitched }: Props) {
  const [demos, setDemos] = useState<DemoInfo[]>([])
  const [activeId, setActiveId] = useState('perimeter_y')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!backendAvailable) return
    fetch('/api/demos')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!data) return
        setDemos(data.demos || [])
        setActiveId(data.active?.id || 'perimeter_y')
      })
      .catch(() => {})
  }, [backendAvailable])

  const switchDemo = async (id: string) => {
    if (!backendAvailable || busy || id === activeId) return
    setBusy(true)
    try {
      const res = await fetch(`/api/demos/switch?demo_id=${encodeURIComponent(id)}`, {
        method: 'POST',
      })
      const data = await res.json()
      if (data.status === 'ok' && data.active) {
        setActiveId(data.active.id)
        onSwitched?.(data.active)
      }
    } catch { /* ignore */ }
    finally { setBusy(false) }
  }

  const perimeter = demos.filter(d => d.group === 'perimeter')
  const climbing = demos.filter(d => d.group === 'climbing')

  return (
    <div className="px-3 py-2 border-b border-soc-700/60 bg-soc-900/90">
      <div className="flex items-center gap-2 mb-1.5">
        <Layers className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">Gói demo</span>
        {busy && <span className="text-[10px] text-amber-400">Đang chuyển…</span>}
      </div>

      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-[10px] text-slate-500 flex items-center gap-1 mr-0.5">
          <MapPinned className="w-3 h-3" /> ROI
        </span>
        {perimeter.map(d => (
          <DemoChip
            key={d.id}
            demo={d}
            active={activeId === d.id}
            disabled={!d.available || busy}
            onClick={() => switchDemo(d.id)}
            accent="emerald"
          />
        ))}

        <span className="w-px h-4 bg-soc-600 mx-1" />

        <span className="text-[10px] text-slate-500 flex items-center gap-1 mr-0.5">
          <Fence className="w-3 h-3" /> Leo rào
        </span>
        {climbing.map(d => (
          <DemoChip
            key={d.id}
            demo={d}
            active={activeId === d.id}
            disabled={!d.available || busy}
            onClick={() => switchDemo(d.id)}
            accent="fuchsia"
          />
        ))}
      </div>

      {demos.find(d => d.id === activeId)?.description && (
        <p className="mt-1.5 text-[10px] text-slate-500 leading-snug">
          {demos.find(d => d.id === activeId)?.description}
        </p>
      )}
    </div>
  )
}

function DemoChip({
  demo, active, disabled, onClick, accent,
}: {
  demo: DemoInfo
  active: boolean
  disabled: boolean
  onClick: () => void
  accent: 'emerald' | 'fuchsia'
}) {
  const activeCls = accent === 'emerald'
    ? 'bg-emerald-600/90 text-white border-emerald-500'
    : 'bg-fuchsia-600/90 text-white border-fuchsia-500'
  const idleCls = 'bg-soc-800 text-slate-300 border-soc-600 hover:border-soc-500 hover:text-white'

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={demo.description}
      className={`text-[11px] px-2 py-0.5 rounded border font-medium transition ${
        active ? activeCls : idleCls
      } ${disabled && !active ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      {demo.short}
    </button>
  )
}
