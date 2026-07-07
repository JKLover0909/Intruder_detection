import { useState } from 'react'
import { Camera, AlertCircle } from 'lucide-react'

interface Props {
  backendAvailable: boolean
}

export default function VideoPanel({ backendAvailable }: Props) {
  const [imgError, setImgError] = useState(false)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-300">CAM-01 · North Perimeter</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-red-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            REC
          </span>
          <span className="text-xs text-slate-500">YOLOv8n · ByteTrack</span>
        </div>
      </div>

      <div className="relative flex-1 bg-soc-900 flex items-center justify-center overflow-hidden">
        {backendAvailable && !imgError ? (
          <img
            src="/video_feed"
            alt="Live camera feed"
            className="video-feed w-full h-full object-contain"
            onError={() => setImgError(true)}
          />
        ) : (
          <MockVideoPlaceholder backendAvailable={backendAvailable} />
        )}

        {/* Overlay: Camera info */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-lg backdrop-blur-sm">
          <span className="text-xs text-slate-300 font-mono">
            {new Date().toLocaleString('vi-VN')}
          </span>
        </div>

        {/* Overlay: ROI label */}
        <div className="absolute top-3 right-3 bg-red-500/20 border border-red-500/40 px-2 py-1 rounded text-xs text-red-300 font-semibold">
          ROI ZONE-A ACTIVE
        </div>
      </div>
    </div>
  )
}

function MockVideoPlaceholder({ backendAvailable }: { backendAvailable: boolean }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center p-8">
      <div className="relative">
        {/* Fake CCTV frame */}
        <div className="w-full max-w-lg aspect-video bg-soc-700 rounded-lg border border-slate-600/40 flex items-center justify-center relative overflow-hidden">
          {/* Grid overlay giống camera CCTV cũ */}
          <div className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
              backgroundSize: '40px 40px'
            }}
          />
          {/* Fake bounding box demo */}
          <div className="absolute border-2 border-green-400 rounded" style={{ top: '40%', left: '30%', width: '80px', height: '140px' }}>
            <span className="absolute -top-5 left-0 text-green-400 text-xs font-mono bg-black/60 px-1">ID:2</span>
          </div>
          <div className="absolute border-2 border-red-400 rounded animate-pulse" style={{ top: '35%', left: '55%', width: '75px', height: '130px' }}>
            <span className="absolute -top-5 left-0 text-red-400 text-xs font-mono bg-black/60 px-1">ID:5 ⚠</span>
          </div>
          {/* Fake ROI */}
          <div className="absolute border-2 border-red-500/70 rounded-sm" style={{ top: '25%', left: '50%', width: '45%', height: '60%' }}>
            <span className="absolute -top-5 left-0 text-red-400 text-xs font-mono bg-black/60 px-1">RESTRICTED</span>
          </div>

          <div className="text-slate-400 font-mono text-sm z-10">
            {!backendAvailable && (
              <div className="flex flex-col items-center gap-2">
                <AlertCircle className="w-8 h-8 text-slate-500" />
                <p className="text-xs text-slate-500">Backend offline · Showing mock overlay</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
