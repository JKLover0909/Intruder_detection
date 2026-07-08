import { useState, useEffect } from 'react'
import { Camera, AlertCircle, Eye, EyeOff, Maximize2, Play, Video } from 'lucide-react'

interface Props {
  backendAvailable: boolean
}

export default function VideoPanel({ backendAvailable }: Props) {
  const [imgError, setImgError] = useState(false)
  const [showOverlays, setShowOverlays] = useState({
    roi: true,
    fence: true,
    boxes: true,
    labels: true,
  })
  const [videos, setVideos] = useState<string[]>([])
  const [currentVideo, setCurrentVideo] = useState<string>('')
  const [feedKey, setFeedKey] = useState(0)

  const toggleOverlay = (key: keyof typeof showOverlays) => {
    setShowOverlays(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Fetch available videos
  useEffect(() => {
    if (!backendAvailable) return

    fetch('/api/videos')
      .then(res => res.ok ? res.json() : [])
      .then((list: string[]) => {
        if (!list.length) return
        setVideos(list)

        // Prefer videos that demonstrate intruder detection better
        const preferredOrder = ['pedestrians.mp4', 'worker.mp4', 'walking.mp4', 'demo.mp4']
        const best = preferredOrder.find(v => list.includes(v)) || list[0]

        // If current is a poor demo video (e.g. demo or face), auto switch to better one
        const badDemos = ['demo.mp4', 'face_detection.mp4']
        if (currentVideo && badDemos.includes(currentVideo) && best !== currentVideo) {
          handleSwitchVideo(best)
        } else {
          setCurrentVideo(best)
        }
      })
      .catch(() => {})
  }, [backendAvailable])

  const handleSwitchVideo = async (filename: string) => {
    if (!filename || filename === currentVideo) return

    try {
      const res = await fetch(`/api/videos/switch?filename=${encodeURIComponent(filename)}`, {
        method: 'POST'
      })
      if (res.ok) {
        setCurrentVideo(filename)
        setImgError(false)
        // Force refresh the MJPEG stream
        setFeedKey(k => k + 1)
      }
    } catch (e) {
      console.error('Failed to switch video', e)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Video Toolbar - Professional Controls */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-soc-700/70 bg-soc-800/80 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-soc-900 rounded">
            <Camera className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-medium text-slate-200">CAM-01</span>
            <span className="text-slate-500">North Perimeter</span>
          </div>
          
          <div className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-red-500/10 text-red-400 rounded font-medium border border-red-500/20">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            REC • LIVE
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Video Source Selector - Multiple videos for proper perimeter demo */}
          {backendAvailable && videos.length > 0 && (
            <div className="flex items-center gap-1.5 text-[10px]">
              <Video className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={currentVideo}
                onChange={(e) => handleSwitchVideo(e.target.value)}
                className="bg-soc-900 border border-soc-600 text-slate-200 rounded px-2 py-0.5 text-[10px] font-mono cursor-pointer focus:outline-none focus:border-emerald-600"
                title="Choose a video that better demonstrates perimeter intrusion"
              >
                {videos.map(v => {
                  const isRecommended = ['pedestrians.mp4', 'worker.mp4'].includes(v)
                  return (
                    <option key={v} value={v}>
                      {isRecommended ? '★ ' : ''}{v}{isRecommended ? ' (Recommended)' : ''}
                    </option>
                  )
                })}
              </select>
            </div>
          )}

          {/* Overlay Toggles */}
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <span className="mr-1">OVERLAYS</span>
            {(['roi', 'fence', 'boxes', 'labels'] as const).map(key => (
              <button
                key={key}
                onClick={() => toggleOverlay(key)}
                className={`px-1.5 py-0.5 rounded flex items-center gap-0.5 transition-all border ${
                  showOverlays[key] 
                    ? 'bg-soc-700 text-emerald-400 border-soc-600' 
                    : 'bg-soc-900 text-slate-500 border-soc-700'
                }`}
              >
                {showOverlays[key] ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                <span className="uppercase">{key}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 border-l border-soc-700 pl-3">
            <span>YOLOv8s + ByteTrack + Pose</span>
            <span className="font-mono bg-soc-900 px-1 rounded">960×540</span>
          </div>

          <button 
            className="flex items-center gap-1 px-2 py-1 bg-soc-700 hover:bg-soc-600 rounded text-slate-300 transition-colors"
            title="Fullscreen (demo)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="text-[10px]">FULL</span>
          </button>
        </div>
      </div>

      {/* Video Container */}
      <div className="relative flex-1 bg-[#05070f] flex items-center justify-center overflow-hidden">
        {backendAvailable && !imgError ? (
          <img
            key={feedKey}
            src={`/video_feed?t=${feedKey}`}
            alt="Live camera feed"
            className="video-feed w-full h-full object-contain"
            onError={() => setImgError(true)}
          />
        ) : (
          <MockVideoPlaceholder backendAvailable={backendAvailable} />
        )}

        {/* Professional Video HUD Overlays */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Top status bar */}
          <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-black/70 to-transparent flex items-center px-3 text-[10px] font-mono text-emerald-400/90">
            <div className="flex-1">
              CAM-01 • NORTH PERIMETER • {currentVideo || 'AI DETECTION ACTIVE'}
            </div>
            <div>{new Date().toLocaleTimeString('vi-VN')}</div>
          </div>

          {/* ROI / Fence indicators (conditional) */}
          {showOverlays.roi && (
            <div className="absolute top-8 right-3 bg-red-600/90 text-white text-[10px] px-2 py-0.5 font-bold tracking-wider border border-red-400/70">
              RESTRICTED ZONE-A
            </div>
          )}
          {showOverlays.fence && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 text-[10px] px-1.5 py-px bg-purple-500/70 text-purple-100 font-mono tracking-widest border border-purple-400">
              VIRTUAL FENCE
            </div>
          )}

          {/* Bottom info strip */}
          <div className="absolute bottom-0 left-0 right-0 h-7 bg-gradient-to-t from-black/80 to-transparent flex items-center px-3 text-[10px] text-slate-300 font-mono">
            <div className="flex-1">DETECTION: Person • Tracking: ByteTrack • Pose: Active</div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">FPS: 28</span>
              <span className="text-red-400 font-medium">ALERTS: LIVE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Camera Status Footer */}
      <div className="px-3 py-1 text-[10px] bg-soc-800 border-t border-soc-700 flex items-center justify-between text-slate-400">
        <div className="flex items-center gap-2">
          <Play className="w-3 h-3 text-red-500" /> STREAMING
          <span className="text-emerald-400">•</span> MODEL CONF: 0.35
          {currentVideo && <span className="text-slate-500 ml-2 font-mono">• {currentVideo}</span>}
        </div>
        <div>1 CAMERA • ROI ENABLED • Dùng pedestrians.mp4 hoặc worker.mp4 để demo xâm nhập thực tế hơn</div>
      </div>
    </div>
  )
}

function MockVideoPlaceholder({ backendAvailable }: { backendAvailable: boolean }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-[#05070f]">
      <div className="relative w-[92%] max-w-3xl aspect-video rounded overflow-hidden border border-soc-600/50 bg-soc-800">
        {/* CCTV Grid */}
        <div className="absolute inset-0 opacity-[0.06]" 
          style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '38px 38px' }} />

        {/* Simulated detections */}
        <div className="absolute border border-emerald-400/70" style={{ left: '22%', top: '32%', width: '14%', height: '48%' }}>
          <div className="absolute -top-3.5 left-0 bg-emerald-900/80 text-emerald-300 text-[9px] px-1 font-mono">ID:08</div>
        </div>
        <div className="absolute border-2 border-red-500 animate-pulse" style={{ left: '61%', top: '26%', width: '18%', height: '52%' }}>
          <div className="absolute -top-3.5 left-0 bg-red-600 text-white text-[9px] px-1 font-mono font-bold">ID:11 • INTRUDER</div>
        </div>

        {/* ROI box */}
        <div className="absolute border border-red-500/60" style={{ left: '52%', top: '18%', width: '42%', height: '68%' }}>
          <div className="absolute -top-2 right-1 text-red-400 text-[9px] bg-red-950/80 px-1">ZONE-A</div>
        </div>

        {!backendAvailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center">
              <AlertCircle className="mx-auto w-6 h-6 text-slate-400 mb-1" />
              <p className="text-xs text-slate-400">Backend offline — Demo mode</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
