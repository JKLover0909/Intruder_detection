import { useState, useEffect, useCallback } from 'react'
import type { SecurityEvent, Stats } from '../types'

const MOCK_EVENTS: SecurityEvent[] = [
  { id: 1, timestamp: new Date(Date.now() - 12000).toISOString(), event_type: 'Intrusion', severity: 'High', message: 'Person #3 entered restricted area Zone-A', snapshot_path: null },
  { id: 2, timestamp: new Date(Date.now() - 45000).toISOString(), event_type: 'Loitering', severity: 'Medium', message: 'Person #5 loitering near fence > 15s', snapshot_path: null },
  { id: 3, timestamp: new Date(Date.now() - 120000).toISOString(), event_type: 'Line Crossing', severity: 'High', message: 'Person #2 crossed virtual boundary', snapshot_path: null },
  { id: 4, timestamp: new Date(Date.now() - 300000).toISOString(), event_type: 'Climbing', severity: 'High', message: 'Possible climbing detected near north fence', snapshot_path: null },
  { id: 5, timestamp: new Date(Date.now() - 600000).toISOString(), event_type: 'After Hours', severity: 'Medium', message: 'Person detected outside working hours (22:15)', snapshot_path: null },
]

const MOCK_STATS: Stats = {
  active_cameras: 1,
  total_alerts_today: 5,
  system_status: 'Online',
  roi_active: true,
}

export function useSecurityData(backendAvailable: boolean) {
  const [events, setEvents] = useState<SecurityEvent[]>(MOCK_EVENTS)
  const [stats, setStats] = useState<Stats>(MOCK_STATS)

  const fetchData = useCallback(async () => {
    if (!backendAvailable) return
    try {
      const [evRes, stRes] = await Promise.all([
        fetch('/api/events?limit=20'),
        fetch('/api/stats'),
      ])
      if (evRes.ok) setEvents(await evRes.json())
      if (stRes.ok) setStats(await stRes.json())
    } catch {
      // Backend chưa lên → dùng mock
    }
  }, [backendAvailable])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 3000)
    return () => clearInterval(interval)
  }, [fetchData])

  return { events, stats }
}
