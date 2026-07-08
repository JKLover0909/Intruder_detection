import { AlertTriangle, Shield, TrendingUp, Clock, ArrowRight } from 'lucide-react'
import type { SecurityEvent, Stats } from '../types'

interface Props {
  events: SecurityEvent[]
  stats: Stats
}

export default function StatsBar({ events, stats }: Props) {
  // Prefer backend counts, fallback to derived
  const total = stats.total_alerts_today ?? events.length
  const high = events.filter(e => e.severity === 'High' || e.severity === 'Critical').length
  const critical = events.filter(e => e.severity === 'Critical').length

  const intrusion = stats.intrusions ?? events.filter(e => e.event_type === 'Intrusion').length
  const climbing = stats.climbing_suspects ?? events.filter(e => e.event_type === 'Climbing').length
  const crossing = stats.line_crossings ?? events.filter(e => e.event_type === 'Line Crossing').length
  const loitering = stats.loitering_events ?? events.filter(e => e.event_type === 'Loitering').length

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 px-4 py-2.5 border-b border-soc-700/60 bg-soc-900">
      <MetricCard 
        label="TOTAL ALERTS" 
        value={total} 
        sub="Today" 
        accent="slate"
        icon={<AlertTriangle className="w-3.5 h-3.5" />} 
      />
      <MetricCard 
        label="CRITICAL / HIGH" 
        value={critical > 0 ? `${critical} / ${high}` : high} 
        sub="Immediate attention" 
        accent="critical"
        icon={<Shield className="w-3.5 h-3.5" />} 
      />
      <MetricCard 
        label="INTRUSION" 
        value={intrusion} 
        sub="Zone violation" 
        accent="intrusion"
        icon={<ArrowRight className="w-3.5 h-3.5" />} 
      />
      <MetricCard 
        label="CLIMBING" 
        value={climbing} 
        sub="Fence / Perimeter" 
        accent="climbing"
        icon={<TrendingUp className="w-3.5 h-3.5" />} 
      />
      <MetricCard 
        label="LINE CROSSING" 
        value={crossing} 
        sub="Virtual boundary" 
        accent="crossing"
        icon={<ArrowRight className="w-3.5 h-3.5" />} 
      />
      <MetricCard 
        label="LOITERING" 
        value={loitering} 
        sub="> 8s dwell" 
        accent="loiter"
        icon={<Clock className="w-3.5 h-3.5" />} 
      />
    </div>
  )
}

function MetricCard({ label, value, sub, accent, icon }: { 
  label: string; 
  value: number | string; 
  sub: string; 
  accent: string; 
  icon: React.ReactNode 
}) {
  const accentStyles: Record<string, string> = {
    slate: 'border-soc-600 bg-soc-800/60 text-slate-400',
    critical: 'border-red-500/40 bg-red-500/5 text-red-400',
    intrusion: 'border-red-600/40 bg-red-950/40 text-red-400',
    climbing: 'border-fuchsia-500/40 bg-fuchsia-950/40 text-fuchsia-400',
    crossing: 'border-purple-500/40 bg-purple-950/40 text-purple-400',
    loiter: 'border-amber-500/40 bg-amber-950/40 text-amber-400',
  }

  return (
    <div className={`rounded-md border px-3 py-2 flex flex-col justify-between transition-colors ${accentStyles[accent] || accentStyles.slate}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium tracking-[0.5px] text-slate-400">{label}</span>
        {icon}
      </div>
      <div className="mt-0.5">
        <div className="text-xl font-semibold tabular-nums text-slate-100 leading-none">{value}</div>
        <div className="text-[10px] text-slate-500 mt-px">{sub}</div>
      </div>
    </div>
  )
}
