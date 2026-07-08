# AGENT.md

Lưu trữ yêu cầu và hướng dẫn từ người dùng cho agent khi làm việc với repo này.

## Yêu cầu của người dùng (2026-07-07)

- Đọc hiểu toàn bộ repo (Intruder_detection / Factory Perimeter Security AI).
- Giải thích chi tiết bằng tiếng Việt.
- **Không tạo thêm file mới** (trừ file AGENT.md này).
- Tạo luôn file AGENT.md để lưu trữ các yêu cầu của người dùng.

## Tóm tắt dự án (để agent tham khảo sau này)

Đây là hệ thống AI giám sát chu vi nhà máy (perimeter security) sử dụng computer vision:

### Công nghệ chính
- **Backend**: Python, FastAPI, OpenCV, Ultralytics YOLOv8 (yolov8s.pt cho detect+track, yolov8n-pose.pt), SQLAlchemy + SQLite.
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + lucide-react icons.
- **Detection logic**: YOLO person detection + ByteTrack (qua .track()), heuristic pose-based climbing, zone intrusion, line crossing, loitering.
- **Output**: MJPEG live video stream (với overlay), REST API events/stats, snapshot evidence JPGs.

### Các module chính
- `backend/engine.py`: Lõi xử lý frame, định nghĩa ZONES, VIRTUAL_LINE, các rule detection, tracking state, vẽ HUD.
- `backend/main.py`: FastAPI server, streaming, API endpoints (/video_feed, /api/events, /api/stats, video switch, clear).
- `backend/database.py`: Model Event SQLite.
- `frontend/src/`: Dashboard SOC style (Header, VideoPanel, AlertPanel, StatsBar, EventTable, SnapshotModal, useSecurityData hook).
- Dữ liệu: `data/events.db`, `data/snapshots/`, `data/sample_videos/`, `models/`.

### Tính năng hiện tại
- Phát hiện xâm nhập vùng cấm (Intrusion - High).
- Phát hiện vượt đường ảo (Line Crossing).
- Loitering (dừng lại >8s).
- Climbing (cử chỉ tay/cổ chân + chuyển động dọc).
- Lưu snapshot + log event realtime.
- UI dashboard realtime với filter, modal evidence.
- Hỗ trợ chuyển video sample, fallback mock UI.

### Lưu ý khi làm việc
- Gitignore bỏ qua: videos, snapshots, models, *.db (chỉ .gitkeep được commit).
- Frame size cố định: 960x540.
- Zone coords dùng normalized [0-1], scale runtime.
- Cooldown 5s cho alert mỗi track+event.
- Chạy tách biệt: backend (uvicorn 8000) + frontend (vite 5173 với proxy).
- Backend root "/" phục vụ static/index.html (phiên bản legacy inline React).
- Frontend hiện đại ở /frontend.

## Hướng dẫn cho các tương tác sau

Khi nhận yêu cầu mới từ user:
- Luôn tham khảo file này trước.
- Ưu tiên giải thích rõ ràng bằng tiếng Việt nếu được yêu cầu.
- **Không tự ý tạo file mới** trừ khi user chỉ định rõ (ví dụ: AGENT.md updates).
- Khi thực hiện thay đổi code, giữ nguyên cấu trúc hiện tại và logic detection.
- Test bằng cách chạy backend + frontend nếu cần.

## Yêu cầu gốc (nguyên văn)

"Đọc hiểu toàn bộ repo và giải thích bằng tiếng việt, không tạo thêm file mới, tạo luôn cả file AGENT.md để lưu trữ các yêu cầu của người dùng"

---

*File này được tạo tự động theo yêu cầu của người dùng. Nội dung có thể được cập nhật sau.*
