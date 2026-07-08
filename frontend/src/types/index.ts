export type Severity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Info'

export type EventType = 'Intrusion' | 'Line Crossing' | 'Loitering' | 'Climbing' | 'After Hours'

export type AlertStatus = 'New' | 'Reviewing' | 'Acknowledged' | 'Resolved' | 'False Positive'

export interface SecurityEvent {
  id: number
  timestamp: string
  event_type: EventType
  severity: Severity
  message: string
  snapshot_path: string | null
  camera?: string
  person_id?: string | number
  status?: AlertStatus
}

export interface Stats {
  active_cameras: number
  total_alerts_today: number
  intrusions: number
  climbing_suspects: number
  loitering_events: number
  line_crossings: number
  system_status: string
  roi_active: boolean
}

export interface CameraStatus {
  id: string
  name: string
  status: 'online' | 'offline' | 'alert'
  fps?: number
}
