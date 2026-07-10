# CLAUDE.md

@AGENTS.md

Claude Code project instructions for **Factory Perimeter Security AI** (`Intruder_detection`).
Shared operational rules live in `AGENTS.md` (imported above). Keep this file short — Claude-specific only.

## Role

You are working on a perimeter-security CV demo: FastAPI + YOLOv8 multi-cam backend and a React SOC dashboard. Prefer small, targeted diffs. Explain in Vietnamese when the user writes Vietnamese.

## Claude Code habits

- Read `AGENTS.md` first for run commands, architecture, and the 4-cam stream constraint.
- Before changing detection, open `backend/engine.py` and the relevant pack in `backend/demos.py`.
- Before changing the camera grid/stream UI, open `frontend/src/components/VideoPanel.tsx` — grid uses `/api/frame/{id}` polling; focused view uses MJPEG.
- Historical user requests: `AGENT.md` (log). Do not duplicate long history here; append there only if the user asks to record a requirement.
- Do not create `CLAUDE.local.md` content in-repo; personal overrides stay local/gitignored if used.

## Commands (copy-paste)

```bash
# Backend
cd backend && ../.venv/bin/python main.py

# Frontend
cd frontend && npm run dev -- --host 0.0.0.0 --port 5173

# Smoke-check frames
curl -s -o /dev/null -w "%{http_code} %{size_download}\n" http://127.0.0.1:8000/api/frame/perimeter_y
```

## Safety

- Never commit `.env`, `*.pt`, SQLite DBs, sample videos, or snapshot JPGs.
- Never claim CUDA/GPU unless verified in this environment.
- Never open four long-lived MJPEG connections for the grid UI.
