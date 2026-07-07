import { Shield, Camera, AlertTriangle, Activity } from 'lucide-react'
import type { Stats } from '../types'

interface Props {
  stats: Stats
  backendAvailable: boolean
}

export default function Header({ stats, backendAvailable }: Props) {
  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-slate-700/50 bg-soc-800/80 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30">
          <Shield className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-100 tracking-wide">
            FACTORY PERIMETER SECURITY AI
          </h1>
          <p className="text-xs text-slate-500">Intrusion Detection & Monitoring System</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-sm">
          <Camera className="w-4 h-4 text-slate-400" />
          <span className="text-slate-400">Cameras:</span>
          <span className="font-semibold text-green-400">{stats.active_cameras} Active</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <AlertTriangle className="w-4 h-4 text-slate-400" />
          <span className="text-slate-400">Alerts Today:</span>
          <span className="font-semibold text-red-400">{stats.total_alerts_today}</span>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4" />
          <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${backendAvailable ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${backendAvailable ? 'bg-green-400' : 'bg-yellow-400'}`} />
            {backendAvailable ? 'LIVE' : 'MOCK MODE'}
          </span>
        </div>
      </div>
    </header>
  )
}
