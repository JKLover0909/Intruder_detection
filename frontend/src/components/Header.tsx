import { useState, useEffect } from 'react'
import { Shield, Camera, Activity, Zap } from 'lucide-react'
import type { Stats } from '../types'

interface Props {
  stats: Stats
  backendAvailable: boolean
  criticalCount?: number
  activeHigh?: number
}

export default function Header({ stats, backendAvailable, criticalCount = 0, activeHigh = 0 }: Props) {
  const [now, setNow] = useState(() => new Date())
  const systemHealthy = backendAvailable && stats.system_status === 'Online'

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <header className="flex items-center justify-between gap-3 px-4 sm:px-5 py-2.5 border-b border-soc-700/80 bg-soc-900/95 backdrop-blur-md z-10">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="p-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/25 shrink-0">
          <Shield className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-semibold tracking-wide text-slate-50 truncate">
            Giám sát chu vi nhà máy
          </h1>
          <p className="text-[10px] text-slate-500 hidden sm:block">Trung tâm điều hành · thời gian thực</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 text-sm shrink-0">
        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-300">
          <Camera className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-medium text-emerald-400 tabular-nums">{stats.active_cameras}</span>
          <span className="text-slate-500">camera</span>
        </div>

        {activeHigh > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-orange-500/10 border border-orange-500/30 transition-colors">
            <Zap className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-xs text-orange-200 font-semibold tabular-nums">{activeHigh} chưa xử lý</span>
            {criticalCount > 0 && (
              <span className="text-[10px] px-1.5 py-px rounded bg-red-600/40 text-red-100 font-semibold">
                {criticalCount} nghiêm trọng
              </span>
            )}
          </div>
        )}

        <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md border transition-colors ${
          systemHealthy
            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
            : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
        }`}>
          <Activity className="w-3 h-3" />
          <span className={`w-1.5 h-1.5 rounded-full ${systemHealthy ? 'bg-emerald-400 animate-status-dot' : 'bg-amber-400'}`} />
          {backendAvailable ? 'Đang giám sát' : 'Mô phỏng'}
        </div>

        <div className="hidden sm:block text-xs font-mono text-slate-300 tabular-nums border-l border-soc-700 pl-3">
          {now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>
    </header>
  )
}
