# AGENTS.md — Factory Perimeter Security AI

Operational guide for coding agents (Cursor, Codex, Copilot, Claude Code, etc.).
For humans, prefer `README.md`. Historical user notes live in `AGENT.md` (do not confuse with this file).

## Project

Real-time factory perimeter video analytics: person detect/track, zone intrusion, line crossing, loitering, pose-based fence climbing. Backend streams annotated frames; React SOC dashboard shows a 4-camera grid + alerts.

## Stack

| Layer | Tech |
|---|---|
| Backend | Python 3.10+, FastAPI, OpenCV, Ultralytics YOLOv8 (`yolov8s.pt` detect+ByteTrack, `yolov8n-pose.pt`), SQLAlchemy + SQLite |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, lucide-react |
| Runtime | Backend `:8000`, frontend `:5173` (Vite proxies `/api`, `/video_feed`, `/snapshots`) |

Inference typically runs on **CPU** unless CUDA is available. Frame size is fixed **960×540**. Zone/line coords are **normalized [0–1]** and scaled at runtime.

## Setup & run

```bash
# Backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
# Place weights in models/ (yolov8s.pt, yolov8n-pose.pt) — gitignored
# Place sample videos under data/sample_videos/ (and demos/ for climb packs)
cd backend && ../.venv/bin/python main.py

# Frontend (separate terminal)
cd frontend && npm install && npm run dev -- --host 0.0.0.0 --port 5173
```

Restart both when changing stream/API contracts:

```bash
fuser -k 8000/tcp 5173/tcp 2>/dev/null
```

UI: http://localhost:5173 · API docs: http://localhost:8000/docs

## Architecture (where to edit)

```
backend/engine.py     # VideoProcessor, YOLO, rules, overlays, FPS, JPEG buffer
backend/demos.py      # Demo packs: video path, zones, labels (4 cams)
backend/main.py       # FastAPI routes, multi-processor registry, MJPEG + frame API
backend/database.py   # Event model (optional camera field)
frontend/src/         # Dashboard — VideoPanel (2×2 grid), AlertPanel, StatsBar, hooks
```

### Multi-camera demos

| id | Label | Focus |
|---|---|---|
| `perimeter_y` | CAM-01 Chu vi Bắc | ROI / line / zones |
| `climb_park` | CAM-02 Hàng rào công viên | Climbing only |
| `climb_night` | CAM-03 Hàng rào đêm | Climbing only |
| `climb_gym` | CAM-04 Hàng rào tập luyện | Climbing only |

All processors start together (`start_all_processors`). Prefer editing `demos.py` for geometry/video; keep detection heuristics in `engine.py`.

### Video delivery (important)

- **Focused single cam:** MJPEG `GET /video_feed/{demo_id}`
- **4-cam grid:** poll `GET /api/frame/{demo_id}` (short JPEG). Do **not** open 4 long-lived MJPEG streams in the browser — HTTP/1.1 ~6 connection limit blacks out lower tiles.
- Default `GET /video_feed` serves the active/default demo.

### Key APIs

| Method | Path | Notes |
|---|---|---|
| GET | `/video_feed`, `/video_feed/{demo_id}` | MJPEG |
| GET | `/api/frame/{demo_id}` | Latest JPEG (grid) |
| GET | `/api/demos` | Demo list + camera metadata |
| GET | `/api/events`, `/api/stats` | Events + FPS/counts |
| GET/POST | `/api/overlays` | `roi`, `fence`, `boxes`, `labels` |
| POST | `/api/demos/switch`, `/api/videos/switch` | Switch source |
| POST | `/api/events/clear` | Clear DB events |

### Severity

| Event | Severity |
|---|---|
| Climbing | Critical |
| Intrusion | High |
| Line Crossing (in) | High |
| Line Crossing (out) | Medium |
| Loitering | Medium |

Alert cooldown: **5s** per track+event. Loiter threshold: **8s**.

## Agent rules

1. Prefer Vietnamese explanations when the user writes in Vietnamese; keep code/identifiers in English unless the UI already uses Vietnamese copy.
2. Do **not** create new files unless the user asks (or the task clearly requires it). Prefer editing existing modules.
3. Do not commit secrets, `.env`, `*.pt`, `data/*.db`, videos, or snapshots (see `.gitignore`).
4. Do not invent GPU usage — check `torch.cuda.is_available()` before claiming CUDA.
5. Preserve detection logic unless the task is to change it; tune thresholds carefully and document why.
6. Frontend: match existing dark SOC theme / Fira fonts; avoid drive-by refactors and unrelated UI rewrites.
7. After stream or API changes, restart backend (and frontend if proxy/types changed) and verify all four cams render.
8. Commit only when asked; follow repo commit style (short why-focused messages). Push only when asked.
9. `AGENT.md` is a chronological user-requirements log — update it when the user asks to record requirements; put durable ops guidance here in `AGENTS.md`.

## Do not

- Commit large media or model weights.
- Replace the grid poll path with 4 concurrent MJPEG `<img>` tags.
- Break normalized zone coordinates or the 960×540 pipeline without updating both engine and demos.
- Treat `backend/static/` as the primary UI (legacy); the real dashboard is `frontend/`.

## Quick verification

```bash
curl -s http://127.0.0.1:8000/api/demos | head
for id in perimeter_y climb_park climb_night climb_gym; do
  curl -s -o /dev/null -w "$id %{http_code} %{size_download}\n" "http://127.0.0.1:8000/api/frame/$id"
done
```

Expect HTTP 200 and non-zero JPEG sizes for available demos.
