# Factory Perimeter Security AI

AI-powered video analytics for factory perimeter intrusion detection. Detects unauthorized intrusions, fence climbing, loitering, and boundary crossing in real-time using YOLOv8 + ByteTrack.

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

# 3. Add sample video (optional — falls back to webcam 0)
# Copy any CCTV .mp4 file to:
#   data/sample_videos/demo.mp4

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
| Person detection (YOLOv8n) | ✅ |
| ByteTrack multi-person tracking | ✅ |
| ROI intrusion detection | ✅ |
| MJPEG live stream | ✅ |
| Event log (SQLite) | ✅ |
| Snapshot evidence saving | ✅ |
| SOC Dashboard (React) | ✅ |
| Alert panel with severity badges | ✅ |
| Line crossing detection | 🔜 |
| Loitering detection | 🔜 |
| Pose-based climbing detection | 🔜 |

## Architecture

```
Video File / Webcam
  → OpenCV Frame Reader
  → YOLOv8n + ByteTrack     (backend/engine.py)
  → Rule Engine              (ROI check, cooldown)
  → SQLite Event Store       (data/events.db)
  → Snapshot Saver           (data/snapshots/)
  → FastAPI MJPEG Stream     (localhost:8000/video_feed)
  → React Dashboard          (localhost:5173)
```

## Configuration

Edit `backend/engine.py` to change ROI polygon coordinates:

```python
ROI_POLYGON = np.array([[200, 200], [600, 200], [700, 500], [100, 500]])
```

Coordinates are `[x, y]` pixel positions relative to the **resized 800×600 frame**.

## Project Structure

```
factory-intrusion-demo/
├── backend/
│   ├── main.py          # FastAPI server + MJPEG stream
│   ├── engine.py        # YOLO inference + rule engine
│   ├── database.py      # SQLite models
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── App.tsx               # Main layout
│       ├── components/
│       │   ├── Header.tsx        # Top bar + status
│       │   ├── VideoPanel.tsx    # Camera feed
│       │   ├── AlertPanel.tsx    # Real-time alerts
│       │   ├── StatsBar.tsx      # KPI cards
│       │   ├── EventTable.tsx    # Full event log
│       │   └── SnapshotModal.tsx # Evidence viewer
│       └── hooks/
│           └── useSecurityData.ts # Data fetching + mock
├── data/
│   ├── sample_videos/   # Put demo.mp4 here
│   ├── snapshots/       # Auto-saved alert images
│   └── events.db        # SQLite (auto-created)
└── models/              # YOLO weights (auto-downloaded)
```
