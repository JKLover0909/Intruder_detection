import { useState, useEffect, useCallback } from 'react'
import type { SecurityEvent, Stats, AlertStatus } from '../types'

const MOCK_EVENTS: SecurityEvent[] = [
  { id: 1, timestamp: new Date(Date.now() - 8000).toISOString(), event_type: 'Intrusion', severity: 'High', message: 'Person #12 entered Zone-A Restricted', snapshot_path: null, camera: 'CAM-01', person_id: 12, status: 'New' },
  { id: 2, timestamp: new Date(Date.now() - 28000).toISOString(), event_type: 'Climbing', severity: 'Critical', message: 'Person #9 rapid upward movement near fence', snapshot_path: null, camera: 'CAM-01', person_id: 9, status: 'New' },
  { id: 3, timestamp: new Date(Date.now() - 65000).toISOString(), event_type: 'Line Crossing', severity: 'High', message: 'Person #7 crossed virtual boundary inbound', snapshot_path: null, camera: 'CAM-01', person_id: 7, status: 'Acknowledged' },
  { id: 4, timestamp: new Date(Date.now() - 140000).toISOString(), event_type: 'Climbing', severity: 'High', message: 'Person #5 possible climbing detected', snapshot_path: null, camera: 'CAM-01', person_id: 5, status: 'Reviewing' },
  { id: 5, timestamp: new Date(Date.now() - 320000).toISOString(), event_type: 'Loitering', severity: 'Medium', message: 'Person #3 loitering in restricted zone > 12s', snapshot_path: null, camera: 'CAM-01', person_id: 3, status: 'Resolved' },
]

const MOCK_STATS: Stats = {
  active_cameras: 1,
  total_alerts_today: 5,
  intrusions: 2,
  climbing_suspects: 2,
  loitering_events: 1,
  line_crossings: 1,
  system_status: 'Online',
  roi_active: true,
}

export function useSecurityData(backendAvailable: boolean) {
  const [events, setEvents] = useState<SecurityEvent[]>(MOCK_EVENTS)
  const [stats, setStats] = useState<Stats>(MOCK_STATS)

  const updateEventStatus = useCallback((id: number, newStatus: AlertStatus) => {
    setEvents(prev => prev.map(ev => 
      ev.id === id ? { ...ev, status: newStatus } : ev
    ))
  }, [])

  const fetchData = useCallback(async () => {
    if (!backendAvailable) return
    try {
      const [evRes, stRes] = await Promise.all([
        fetch('/api/events?limit=25'),
        fetch('/api/stats'),
      ])
      if (evRes.ok) {
        const apiEvents: SecurityEvent[] = await evRes.json()
        // Merge with local status if we have it (for demo)
        setEvents(prev => {
          const localStatusMap = new Map(prev.map(e => [e.id, e.status]))
          return apiEvents.map(ev => ({
            ...ev,
            camera: ev.camera || 'CAM-01',
            person_id: ev.person_id || parseInt(ev.message.match(/#(\d+)/)?.[1] || '0'),
            status: localStatusMap.get(ev.id) || 'New'
          }))
        })
      }
      if (stRes.ok) setStats(await stRes.json())
    } catch {
      // use current state (mock or previous)
    }
  }, [backendAvailable])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 2800)
    return () => clearInterval(interval)
  }, [fetchData])

  return { events, stats, updateEventStatus }
}
