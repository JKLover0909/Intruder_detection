# Factory Perimeter Security AI

AI-powered video analytics for factory perimeter intrusion detection. Detects unauthorized intrusions, fence climbing, loitering, and boundary crossing in real-time using YOLOv8s + ByteTrack + pose heuristics.

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+

### Backend

```bash
# 1. Create virtualenv
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# 2. Install dependencies
pip install -r backend/requirements.txt

# 3. Add sample videos to data/sample_videos/ (optional)

# 4. Start backend
cd backend
python main.py
# → API running at http://localhost:8000
# → MJPEG stream: http://localhost:8000/video_feed
# → Events API:   http://localhost:8000/api/events
```

### Frontend

```bash
# In a separate terminal, from repo root:
cd frontend
npm install
npm run dev
# → Dashboard at http://localhost:5173
```

## Features

| Feature | Status |
|---|---|
| Person detection (YOLOv8s) | ✅ |
| ByteTrack multi-person tracking | ✅ |
| ROI / zone intrusion detection | ✅ |
| Virtual line crossing | ✅ |
| Loitering detection (>8s dwell) | ✅ |
| Pose-based climbing detection | ✅ |
| MJPEG live stream with HUD | ✅ |
| Event log (SQLite) | ✅ |
| Snapshot evidence saving | ✅ |
| SOC Dashboard (React) | ✅ |
| Overlay toggles (ROI / fence / boxes / labels) | ✅ |
| Real FPS reporting | ✅ |
| Alert panel with severity badges | ✅ |

## Architecture

```
Video File / Webcam
  → OpenCV Frame Reader
  → YOLOv8s + ByteTrack     (backend/engine.py)
  → YOLOv8n-pose (every 3rd frame)
  → Rule Engine              (zone / line / loiter / climb + 5s cooldown)
  → SQLite Event Store       (data/events.db)
  → Snapshot Saver           (data/snapshots/)
  → FastAPI MJPEG Stream     (localhost:8000/video_feed)
  → React Dashboard          (localhost:5173, Vite proxy)
```

## Configuration

Edit zone / line definitions in `backend/engine.py`. Coordinates are **normalized [0–1]** and scaled at runtime to the fixed frame size **960×540**:

```python
ZONES = {
    "Zone-A Restricted": {
        "polygon_norm": [[0.55, 0.15], [0.95, 0.15], [0.95, 0.85], [0.55, 0.85]],
        "type": "restricted",
        ...
    },
    "Fence Line": {
        "polygon_norm": [[0.48, 0.10], [0.52, 0.10], [0.52, 0.90], [0.48, 0.90]],
        "type": "fence",
        ...
    },
}

VIRTUAL_LINE_NORM = {"p1": [0.50, 0.05], "p2": [0.50, 0.95]}
```

Detection thresholds (same file):

| Constant | Default | Meaning |
|---|---|---|
| `LOITER_THRESHOLD_SEC` | 8.0 | Seconds in a zone before Loitering alert |
| `ALERT_COOLDOWN_SEC` | 5.0 | Min seconds between same track+event alerts |
| Detection `conf` | 0.35 | YOLO person confidence |
| Pose interval | every 3 frames | Climbing keypoint inference |

### Severity mapping

| Event | Severity |
|---|---|
| Climbing | Critical |
| Intrusion | High |
| Line Crossing (inbound) | High |
| Line Crossing (outbound) | Medium |
| Loitering | Medium |

## API

| Method | Path | Description |
|---|---|---|
| GET | `/video_feed` | MJPEG stream |
| GET | `/api/events?limit=` | Recent events |
| GET | `/api/stats` | Counts + `fps` |
| GET/POST | `/api/overlays` | Read / set ROI, fence, boxes, labels |
| GET | `/api/videos` | List sample videos |
| POST | `/api/videos/switch?filename=` | Switch video source |
| POST | `/api/events/clear` | Clear event log |
| GET | `/snapshots/*` | Evidence images |

## Project Structure

```
Intruder_detection/
├── backend/
│   ├── main.py          # FastAPI server + MJPEG stream + overlay API
│   ├── engine.py        # YOLO inference + rule engine + FPS
│   ├── database.py      # SQLite Event model
│   ├── requirements.txt
│   └── static/          # Legacy single-page UI (served at /)
├── frontend/
│   └── src/
│       ├── App.tsx
│       ├── components/
│       │   ├── Header.tsx
│       │   ├── VideoPanel.tsx    # Live feed, overlays, fullscreen
│       │   ├── AlertPanel.tsx
│       │   ├── StatsBar.tsx
│       │   ├── EventTable.tsx
│       │   └── SnapshotModal.tsx
│       └── hooks/
│           └── useSecurityData.ts
├── data/
│   ├── sample_videos/   # Put .mp4 demos here
│   ├── snapshots/       # Auto-saved alert images
│   └── events.db        # SQLite (auto-created)
├── models/              # YOLO weights (yolov8s.pt, yolov8n-pose.pt)
└── AGENT.md             # Agent notes / user requirements
```
