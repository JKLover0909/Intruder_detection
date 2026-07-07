export type Severity = 'High' | 'Medium' | 'Low'

export type EventType = 'Intrusion' | 'Line Crossing' | 'Loitering' | 'Climbing' | 'After Hours'

export interface SecurityEvent {
  id: number
  timestamp: string
  event_type: EventType
  severity: Severity
  message: string
  snapshot_path: string | null
}

export interface Stats {
  active_cameras: number
  total_alerts_today: number
  system_status: string
  roi_active: boolean
}
