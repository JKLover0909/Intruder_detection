# AGENT.md

Lưu trữ yêu cầu và hướng dẫn từ người dùng cho agent khi làm việc với repo này.

## Yêu cầu của người dùng (2026-07-07)

- Đọc hiểu toàn bộ repo (Intruder_detection / Factory Perimeter Security AI).
- Giải thích chi tiết bằng tiếng Việt.
- **Không tạo thêm file mới** (trừ file AGENT.md này).
- Tạo luôn file AGENT.md để lưu trữ các yêu cầu của người dùng.

## Yêu cầu của người dùng (2026-07-09)

- Cải thiện các điểm đáng lưu ý đã nêu sau khi đọc hiểu dự án:
  1. README lỗi thời → cập nhật khớp code (YOLOv8s, 960×540, ZONES normalized, features đã có).
  2. VideoPanel: FPS hardcode → FPS thật từ backend; nút FULL không hoạt động → fullscreen API; overlay toggles chỉ trang trí → điều khiển vẽ thật trên stream.
  3. Severity Critical chỉ có trong mock → Climbing dùng Critical ở backend.

## Tóm tắt dự án (để agent tham khảo sau này)

Đây là hệ thống AI giám sát chu vi nhà máy (perimeter security) sử dụng computer vision:

### Công nghệ chính
- **Backend**: Python, FastAPI, OpenCV, Ultralytics YOLOv8 (yolov8s.pt cho detect+track, yolov8n-pose.pt), SQLAlchemy + SQLite.
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + lucide-react icons.
- **Detection logic**: YOLO person detection + ByteTrack (qua .track()), heuristic pose-based climbing, zone intrusion, line crossing, loitering.
- **Output**: MJPEG live video stream (với overlay), REST API events/stats/overlays, snapshot evidence JPGs.

### Các module chính
- `backend/engine.py`: Lõi xử lý frame, định nghĩa ZONES, VIRTUAL_LINE, các rule detection, tracking state, overlay toggles, FPS, vẽ HUD.
- `backend/main.py`: FastAPI server, streaming, API endpoints (/video_feed, /api/events, /api/stats, /api/overlays, video switch, clear).
- `backend/database.py`: Model Event SQLite.
- `frontend/src/`: Dashboard SOC style (Header, VideoPanel, AlertPanel, StatsBar, EventTable, SnapshotModal, useSecurityData hook).
- Dữ liệu: `data/events.db`, `data/snapshots/`, `data/sample_videos/`, `models/`.

### Tính năng hiện tại
- Phát hiện xâm nhập vùng cấm (Intrusion - High).
- Phát hiện vượt đường ảo (Line Crossing).
- Loitering (dừng lại >8s).
- Climbing (Critical — cử chỉ tay/cổ chân + chuyển động dọc).
- Lưu snapshot + log event realtime.
- UI dashboard realtime với filter, modal evidence, fullscreen, overlay toggles thật.
- FPS thật từ backend (`/api/stats.fps`).
- Hỗ trợ chuyển video sample, fallback mock UI.

### Severity mapping
| Event | Severity |
|---|---|
| Climbing | Critical |
| Intrusion | High |
| Line Crossing (in) | High |
| Line Crossing (out) | Medium |
| Loitering | Medium |

### Lưu ý khi làm việc
- Gitignore bỏ qua: videos, snapshots, models, *.db (chỉ .gitkeep được commit).
- Frame size cố định: 960x540.
- Zone coords dùng normalized [0-1], scale runtime.
- Cooldown 5s cho alert mỗi track+event.
- Chạy tách biệt: backend (uvicorn 8000) + frontend (vite 5173 với proxy).
- Backend root "/" phục vụ static/index.html (phiên bản legacy inline React).
- Frontend hiện đại ở /frontend.
- Overlay toggles: POST `/api/overlays?roi=&fence=&boxes=&labels=` điều khiển vẽ trên stream.

## Hướng dẫn cho các tương tác sau

Khi nhận yêu cầu mới từ user:
- Luôn tham khảo file này trước.
- Ưu tiên giải thích rõ ràng bằng tiếng Việt nếu được yêu cầu.
- **Không tự ý tạo file mới** trừ khi user chỉ định rõ (ví dụ: AGENT.md updates).
- Khi thực hiện thay đổi code, giữ nguyên cấu trúc hiện tại và logic detection.
- Test bằng cách chạy backend + frontend nếu cần.

## Danh sách skill hiện tại (cập nhật 2026-07-10)

Nguồn: quét filesystem. Skill built-in nằm ở `~/.cursor/skills-cursor/` (Cursor quản lý — không sửa tay). Skill project nằm ở `.cursor/skills/`. Personal `~/.cursor/skills/` hiện **trống**.

`slash-only` = có `disable-model-invocation: true` (thường chỉ khi user gọi lệnh /skill).

### A. Cursor built-in (`~/.cursor/skills-cursor/`) — 19 skill

| Skill | Slash-only | Khi dùng |
|---|---|---|
| `automate` | | Tạo Cursor Automations |
| `babysit` | | Giữ PR merge-ready (comment, conflict, CI loop) |
| `canvas` | | Artifact phân tích / dashboard dạng Canvas React |
| `create-hook` | | Tạo hooks / hooks.json / hành vi quanh agent events |
| `create-rule` | | Tạo rules, coding standards, RULE.md |
| `create-skill` | | Viết / hỏi về cấu trúc Agent Skill |
| `create-subagent` | có | Tạo loại subagent tùy chỉnh |
| `loop` | | Chạy prompt/skill lặp theo interval (`/loop 5m …`) |
| `migrate-to-skills` | có | Migrate rules/commands → `.cursor/skills/` |
| `onboard` | có | Onboarding Cursor (`/onboard`) |
| `review` | có | Review qua Bugbot hoặc Security Review |
| `review-bugbot` | | Review bằng Bugbot subagent |
| `review-security` | | Review bằng Security Review subagent |
| `sdk` | | Cursor SDK (TS `@cursor/sdk` / Python `cursor-sdk`) |
| `shell` | có | Chạy literal shell khi user gọi `/shell` |
| `split-to-prs` | | Tách work thành nhiều PR nhỏ |
| `statusline` | | Cấu hình CLI status line |
| `update-cli-config` | | Sửa `~/.cursor/cli-config.json` |
| `update-cursor-settings` | | Sửa settings.json (editor/theme/format…) |

### B. Project skills (`.cursor/skills/`) — 7 skill

| Skill | Mục đích ngắn |
|---|---|
| `banner-design` | Banner social/ads/web/print |
| `brand` | Brand voice, identity, messaging, compliance |
| `design` | Logo, CIP, slides, banner, icon, social photos (orchestrator) |
| `design-system` | Design tokens, component specs, slide generation |
| `slides` | HTML presentation + Chart.js + copy formulas |
| `ui-styling` | shadcn/ui + Tailwind + canvas UI |
| `ui-ux-pro-max` | Design guide (styles, palettes, fonts, UX, charts) |

### C. Ghi chú cho agent

- Khi task khớp description của skill → **đọc `SKILL.md` rồi làm theo**, không đoán từ tên.
- Không tạo skill mới trong `~/.cursor/skills-cursor/`.
- Skill project chủ yếu phục vụ design/UI; task detection/backend của repo này thường **không** cần chúng.
- Muốn refresh lại danh sách: quét lại 2 thư mục trên và cập nhật mục này.

## Yêu cầu gốc (nguyên văn)

"Đọc hiểu toàn bộ repo và giải thích bằng tiếng việt, không tạo thêm file mới, tạo luôn cả file AGENT.md để lưu trữ các yêu cầu của người dùng"

"Trước tiên hãy cải thiện những điểm đáng lưu ý"

---

*File này được tạo tự động theo yêu cầu của người dùng. Nội dung có thể được cập nhật sau.*
