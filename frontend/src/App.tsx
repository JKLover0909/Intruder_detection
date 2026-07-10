import { useState, useEffect } from 'react'
import { PanelRightOpen } from 'lucide-react'
import Header from './components/Header'
import VideoPanel from './components/VideoPanel'
import AlertPanel from './components/AlertPanel'
import StatsBar from './components/StatsBar'
import { useSecurityData } from './hooks/useSecurityData'

export default function App() {
  const [backendAvailable, setBackendAvailable] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    let alive = true
    const check = () => {
      fetch('/api/stats')
        .then(r => { if (alive) setBackendAvailable(r.ok) })
        .catch(() => { if (alive) setBackendAvailable(false) })
    }
    check()
    const id = setInterval(check, 3000)
    return () => { alive = false; clearInterval(id) }
  }, [])

  const { events, stats, updateEventStatus, clearEvents } = useSecurityData(backendAvailable)

  const criticalCount = events.filter(e => e.severity === 'Critical').length
  const activeHigh = events.filter(
    e => (e.severity === 'Critical' || e.severity === 'High')
      && (!e.status || e.status === 'New' || e.status === 'Reviewing')
  ).length

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-soc-950 text-slate-200">
      <Header
        stats={stats}
        backendAvailable={backendAvailable}
        criticalCount={criticalCount}
        activeHigh={activeHigh}
      />

      <StatsBar events={events} stats={stats} />

      <div className="flex flex-1 overflow-hidden min-h-0 relative">
        <div className="flex-1 overflow-hidden bg-soc-900 flex flex-col min-w-0">
          <VideoPanel
            backendAvailable={backendAvailable}
            fps={stats.fps}
            fpsByCamera={stats.fps_by_camera}
            events={events}
          />
        </div>

        {sidebarOpen ? (
          <div className="w-80 xl:w-[360px] flex-shrink-0 bg-soc-900 border-l border-soc-700/70 overflow-hidden flex flex-col">
            <AlertPanel
              events={events}
              onUpdateStatus={updateEventStatus}
              onClearEvents={clearEvents}
              onCollapse={() => setSidebarOpen(false)}
              backendAvailable={backendAvailable}
            />
          </div>
        ) : (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute right-3 top-3 z-20 flex items-center gap-1.5 px-2.5 py-1.5 bg-soc-800 hover:bg-soc-700 border border-soc-600 rounded-md text-xs text-slate-200 transition-colors duration-200 shadow-lg"
          >
            <PanelRightOpen className="w-4 h-4" />
            Cảnh báo
            {activeHigh > 0 && (
              <span className="px-1.5 py-px rounded-full bg-red-600 text-white text-[10px] font-bold">{activeHigh}</span>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
