import { AlertTriangle, Shield, Clock, TrendingUp } from 'lucide-react'
import type { SecurityEvent } from '../types'

interface Props {
  events: SecurityEvent[]
  totalAlertsToday: number
}

export default function StatsBar({ events, totalAlertsToday }: Props) {
  const high = events.filter(e => e.severity === 'High').length
  const climbing = events.filter(e => e.event_type === 'Climbing').length
  const loitering = events.filter(e => e.event_type === 'Loitering').length

  return (
    <div className="grid grid-cols-4 gap-3 px-4 py-3 border-b border-slate-700/50 bg-soc-800/40">
      <StatCard
        icon={<AlertTriangle className="w-4 h-4 text-red-400" />}
        label="Total Alerts Today"
        value={totalAlertsToday}
        accent="red"
      />
      <StatCard
        icon={<Shield className="w-4 h-4 text-orange-400" />}
        label="High Severity"
        value={high}
        accent="orange"
      />
      <StatCard
        icon={<TrendingUp className="w-4 h-4 text-pink-400" />}
        label="Climbing Suspects"
        value={climbing}
        accent="pink"
      />
      <StatCard
        icon={<Clock className="w-4 h-4 text-yellow-400" />}
        label="Loitering Events"
        value={loitering}
        accent="yellow"
      />
    </div>
  )
}

function StatCard({ icon, label, value, accent }: {
  icon: React.ReactNode
  label: string
  value: number
  accent: string
}) {
  const accents: Record<string, string> = {
    red:    'border-red-500/30 bg-red-500/5',
    orange: 'border-orange-500/30 bg-orange-500/5',
    pink:   'border-pink-500/30 bg-pink-500/5',
    yellow: 'border-yellow-500/30 bg-yellow-500/5',
  }
  return (
    <div className={`rounded-lg border px-4 py-3 ${accents[accent]}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-slate-500 truncate">{label}</span>
      </div>
      <p className="text-2xl font-bold text-slate-100">{value}</p>
    </div>
  )
}
