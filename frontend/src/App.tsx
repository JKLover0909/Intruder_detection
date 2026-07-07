import { useState, useEffect } from 'react'
import Header from './components/Header'
import VideoPanel from './components/VideoPanel'
import AlertPanel from './components/AlertPanel'
import StatsBar from './components/StatsBar'
import EventTable from './components/EventTable'
import { useSecurityData } from './hooks/useSecurityData'

export default function App() {
  const [backendAvailable, setBackendAvailable] = useState(false)

  // Probe backend once on mount
  useEffect(() => {
    fetch('/api/stats')
      .then(r => { if (r.ok) setBackendAvailable(true) })
      .catch(() => setBackendAvailable(false))
  }, [])

  const { events, stats } = useSecurityData(backendAvailable)

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-soc-900 text-slate-200">
      {/* Top bar */}
      <Header stats={stats} backendAvailable={backendAvailable} />

      {/* Stats row */}
      <StatsBar events={events} totalAlertsToday={stats.total_alerts_today} />

      {/* Main content: Video + Alert panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Video (70%) */}
        <div className="flex-1 border-r border-slate-700/50 overflow-hidden bg-soc-900">
          <VideoPanel backendAvailable={backendAvailable} />
        </div>

        {/* Right: Alert panel (30%) */}
        <div className="w-80 xl:w-96 flex-shrink-0 bg-soc-800 overflow-hidden">
          <AlertPanel events={events} />
        </div>
      </div>

      {/* Bottom: Event table */}
      <div className="h-52 border-t border-slate-700/50 bg-soc-800/60 overflow-hidden">
        <EventTable events={events} />
      </div>
    </div>
  )
}
