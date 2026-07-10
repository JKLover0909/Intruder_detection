import { AlertTriangle, Shield, TrendingUp, CheckCircle2 } from 'lucide-react'
import type { SecurityEvent, Stats } from '../types'
import { formatCompactNumber, getAlertStatus } from '../utils'

interface Props {
  events: SecurityEvent[]
  stats: Stats
}

export default function StatsBar({ events, stats }: Props) {
  const pending = events.filter(e => {
    const s = getAlertStatus(e)
    return s === 'New' || s === 'Reviewing'
  }).length
  const critical = events.filter(
    e => e.severity === 'Critical' && (getAlertStatus(e) === 'New' || getAlertStatus(e) === 'Reviewing'),
  ).length

  const intrusion = stats.intrusions ?? events.filter(e => e.event_type === 'Intrusion').length
  const climbing = stats.climbing_suspects ?? events.filter(e => e.event_type === 'Climbing').length
  const allClear = pending === 0

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 px-3 py-2.5 border-b border-soc-700/70 bg-soc-950">
      <MetricCard
        label="Cần xử lý"
        value={formatCompactNumber(pending)}
        sub={critical > 0 ? `${critical} nghiêm trọng` : allClear ? 'Không có sự cố mới' : 'Đang chờ xác nhận'}
        accent={pending > 0 ? 'critical' : 'ok'}
        icon={pending > 0 ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
      />
      <MetricCard
        label="Xâm nhập"
        value={formatCompactNumber(intrusion)}
        sub="Vào vùng cấm"
        accent="intrusion"
        icon={<Shield className="w-3.5 h-3.5" />}
      />
      <MetricCard
        label="Leo rào"
        value={formatCompactNumber(climbing)}
        sub="Nghi leo hàng rào"
        accent="climbing"
        icon={<TrendingUp className="w-3.5 h-3.5" />}
      />
      <MetricCard
        label="Trạng thái"
        value={allClear ? 'An toàn' : 'Có cảnh báo'}
        sub={`${stats.active_cameras ?? 4} camera đang chạy`}
        accent={allClear ? 'ok' : 'warn'}
        icon={<CheckCircle2 className="w-3.5 h-3.5" />}
      />
    </div>
  )
}

function MetricCard({ label, value, sub, accent, icon }: {
  label: string; value: number | string; sub: string; accent: string; icon: React.ReactNode
}) {
  const accentStyles: Record<string, string> = {
    ok: 'border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-400',
    warn: 'border-amber-500/35 bg-amber-500/[0.08] text-amber-400',
    critical: 'border-red-500/40 bg-red-500/[0.08] text-red-400',
    intrusion: 'border-red-500/30 bg-red-500/[0.06] text-red-400',
    climbing: 'border-amber-500/30 bg-amber-500/[0.06] text-amber-400',
  }

  return (
    <div className={`rounded-lg border px-3 py-2 flex flex-col justify-between gap-1 transition-colors duration-200 ${accentStyles[accent] || accentStyles.ok}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="label-caps">{label}</span>
        <span className="opacity-80">{icon}</span>
      </div>
      <div>
        <div className="text-xl font-semibold tabular-nums text-slate-50 leading-none tracking-tight">{value}</div>
        <div className="text-[10px] text-slate-500 mt-1">{sub}</div>
      </div>
    </div>
  )
}
