import { useState, useEffect } from 'react'
import Header from './components/Header'
import VideoPanel from './components/VideoPanel'
import AlertPanel from './components/AlertPanel'
import StatsBar from './components/StatsBar'
import EventTable from './components/EventTable'
import { useSecurityData } from './hooks/useSecurityData'

export default function App() {
  const [backendAvailable, setBackendAvailable] = useState(false)

  useEffect(() => {
    fetch('/api/stats')
      .then(r => { if (r.ok) setBackendAvailable(true) })
      .catch(() => setBackendAvailable(false))
  }, [])

  const { events, stats, updateEventStatus } = useSecurityData(backendAvailable)

  // Calculate critical counts for better overview
  const criticalCount = events.filter(e => e.severity === 'Critical').length
  const activeHigh = events.filter(e => (e.severity === 'Critical' || e.severity === 'High') && (!e.status || e.status === 'New' || e.status === 'Reviewing')).length

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-soc-950 text-slate-200">
      {/* Compact Professional Header */}
      <Header 
        stats={stats} 
        backendAvailable={backendAvailable} 
        criticalCount={criticalCount} 
        activeHigh={activeHigh} 
      />

      {/* Prioritized Metrics Row */}
      <StatsBar events={events} stats={stats} />

      {/* Main Monitoring Area */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Video Feed - Primary Focus (larger proportion) */}
        <div className="flex-1 border-r border-soc-700/60 overflow-hidden bg-soc-900 flex flex-col">
          <VideoPanel backendAvailable={backendAvailable} />
        </div>

        {/* Alerts Sidebar - Actionable & Quick Scan */}
        <div className="w-80 xl:w-[340px] 2xl:w-96 flex-shrink-0 bg-soc-800 border-l border-soc-700/60 overflow-hidden flex flex-col">
          <AlertPanel 
            events={events} 
            onUpdateStatus={updateEventStatus} 
          />
        </div>
      </div>

      {/* Event Log - Compact History */}
      <div className="h-44 border-t border-soc-700/60 bg-soc-800/70 overflow-hidden flex-shrink-0">
        <EventTable events={events} onUpdateStatus={updateEventStatus} />
      </div>
    </div>
  )
}
