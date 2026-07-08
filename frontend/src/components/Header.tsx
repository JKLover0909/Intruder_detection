import { Shield, Camera, Activity, Zap } from 'lucide-react'
import type { Stats } from '../types'

interface Props {
  stats: Stats
  backendAvailable: boolean
  criticalCount?: number
  activeHigh?: number
}

export default function Header({ stats, backendAvailable, criticalCount = 0, activeHigh = 0 }: Props) {
  const systemHealthy = backendAvailable && stats.system_status === 'Online'

  return (
    <header className="flex items-center justify-between px-5 py-2.5 border-b border-soc-700/70 bg-soc-900/95 backdrop-blur-md z-10">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-red-500/10 border border-red-500/30">
            <Shield className="w-4.5 h-4.5 text-red-400" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <h1 className="text-sm font-semibold tracking-[0.5px] text-slate-100">FACTORY PERIMETER</h1>
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-soc-700 rounded text-red-400/90">AI v1.2</span>
            </div>
            <p className="text-[10px] text-slate-500 -mt-0.5">Real-time Intrusion & Perimeter Security</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-5 text-sm">
        {/* Camera Status */}
        <div className="flex items-center gap-1.5 text-xs">
          <Camera className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400">CAM-01</span>
          <span className="font-mono font-semibold text-emerald-400">{stats.active_cameras} ONLINE</span>
        </div>

        {/* Critical / Active Alerts Indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-soc-800 border border-soc-700">
          <Zap className="w-3.5 h-3.5 text-red-400" />
          <span className="text-xs text-slate-400">Active High:</span>
          <span className={`font-semibold tabular-nums ${activeHigh > 0 ? 'text-orange-400' : 'text-slate-300'}`}>
            {activeHigh}
          </span>
          {criticalCount > 0 && (
            <span className="ml-1 text-[10px] px-1.5 py-px rounded bg-red-600/30 text-red-400 font-bold">
              {criticalCount} CRIT
            </span>
          )}
        </div>

        {/* System Status */}
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-slate-400" />
          <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border ${
            systemHealthy 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
              : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${systemHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-yellow-400'}`} />
            {backendAvailable ? 'LIVE FEED' : 'SIMULATION'}
          </div>
        </div>

        <div className="text-[10px] font-mono text-slate-500 border-l border-soc-700 pl-4">
          {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>
    </header>
  )
}
