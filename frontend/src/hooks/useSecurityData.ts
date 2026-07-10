import { useState, useEffect, useCallback } from 'react'
import type { SecurityEvent, Stats, AlertStatus } from '../types'

const MOCK_EVENTS: SecurityEvent[] = [
  { id: 1, timestamp: new Date(Date.now() - 8000).toISOString(), event_type: 'Intrusion', severity: 'High', message: 'Người #12 xâm nhập Vùng cấm', snapshot_path: null, camera: 'CAM-01', person_id: 12, status: 'New' },
  { id: 2, timestamp: new Date(Date.now() - 28000).toISOString(), event_type: 'Climbing', severity: 'Critical', message: 'Người #9 chuyển động lên nhanh gần hàng rào', snapshot_path: null, camera: 'CAM-01', person_id: 9, status: 'New' },
  { id: 3, timestamp: new Date(Date.now() - 65000).toISOString(), event_type: 'Line Crossing', severity: 'High', message: 'Người #7 đi vào chu vi', snapshot_path: null, camera: 'CAM-01', person_id: 7, status: 'Acknowledged' },
]

const MOCK_STATS: Stats = {
  active_cameras: 4,
  total_alerts_today: 5,
  intrusions: 2,
  climbing_suspects: 2,
  loitering_events: 1,
  line_crossings: 1,
  system_status: 'Online',
  roi_active: true,
  fps: 0,
  fps_by_camera: {},
}

export function useSecurityData(backendAvailable: boolean) {
  const [events, setEvents] = useState<SecurityEvent[]>(MOCK_EVENTS)
  const [stats, setStats] = useState<Stats>(MOCK_STATS)

  const updateEventStatus = useCallback((id: number, newStatus: AlertStatus) => {
    setEvents(prev => prev.map(ev =>
      ev.id === id ? { ...ev, status: newStatus } : ev
    ))
  }, [])

  const clearEvents = useCallback(() => {
    setEvents([])
    setStats(prev => ({
      ...prev,
      total_alerts_today: 0,
      intrusions: 0,
      climbing_suspects: 0,
      loitering_events: 0,
      line_crossings: 0,
    }))
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

  return { events, stats, updateEventStatus, clearEvents }
}
