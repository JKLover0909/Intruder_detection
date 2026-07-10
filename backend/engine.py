import cv2
import numpy as np
from ultralytics import YOLO
import datetime
import time
import os
import math
import threading
from concurrent.futures import ThreadPoolExecutor
from database import SessionLocal, Event
from demos import (
    DEFAULT_DEMO_ID, get_demo, list_demo_summaries, VIDEOS_DIR,
)

# Re-export for main.py / callers
__all__ = ["processor", "list_videos", "VIDEOS_DIR"]

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
SNAPSHOTS_DIR = os.path.join(BASE_DIR, "data", "snapshots")

FRAME_W, FRAME_H = 960, 540

detect_model = YOLO(os.path.join(MODELS_DIR, "yolov8s.pt"))
pose_model = YOLO(os.path.join(MODELS_DIR, "yolov8n-pose.pt"))

# Mỗi demo trong lưới 4-cam cần YOLO riêng — .track() không thread-safe khi share 1 model
_detect_models: dict[str, YOLO] = {}
_pose_models: dict[str, YOLO] = {}


def _get_detect_model(demo_id: str) -> YOLO:
    if demo_id not in _detect_models:
        _detect_models[demo_id] = YOLO(os.path.join(MODELS_DIR, "yolov8s.pt"))
    return _detect_models[demo_id]


def _get_pose_model(demo_id: str) -> YOLO:
    if demo_id not in _pose_models:
        _pose_models[demo_id] = YOLO(os.path.join(MODELS_DIR, "yolov8n-pose.pt"))
    return _pose_models[demo_id]

LOITER_THRESHOLD_SEC = 8.0
CLIMBING_WRIST_ABOVE_NOSE = True
ALERT_COOLDOWN_SEC = 5.0
TRACK_STATE_TTL_SEC = 30.0

# Retention — giữ DB/snapshot có giới hạn để FPS không tụt khi chạy lâu
MAX_STORED_EVENTS = 300
SNAPSHOT_JPEG_QUALITY = 70

# Background I/O — tránh block luồng xử lý video khi ghi DB/ảnh
_event_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="event-io")
_writes_since_prune = 0
_PRUNE_EVERY_N_WRITES = 25

# Default overlay visibility (toggled from the dashboard)
DEFAULT_OVERLAYS = {
    "roi": True,
    "fence": True,
    "boxes": True,
    "labels": True,
}


def _scale_polygon(poly_norm):
    return np.array([[int(x * FRAME_W), int(y * FRAME_H)] for x, y in poly_norm], dtype=np.int32)


def _scale_point(p_norm):
    return (int(p_norm[0] * FRAME_W), int(p_norm[1] * FRAME_H))


def _point_in_polygon(px, py, polygon):
    return cv2.pointPolygonTest(polygon, (float(px), float(py)), False) >= 0


def _foot_point(bbox):
    x1, y1, x2, y2 = bbox
    return ((x1 + x2) / 2, y1 + (y2 - y1) * 0.9)


def _pseudo_track_id(x1, y1, x2, y2):
    """Stable-ish ID when ByteTrack has not assigned one yet."""
    cx, cy = (x1 + x2) / 2, (y1 + y2) * 0.9
    return int(cx / 20) * 10000 + int(cy / 20)


def _enhance_low_light(frame):
    """CLAHE on L channel — giúp detect người trong video đêm tối."""
    lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    merged = cv2.merge([clahe.apply(l), a, b])
    return cv2.cvtColor(merged, cv2.COLOR_LAB2BGR)


def _box_iou(a, b):
    x1 = max(a[0], b[0])
    y1 = max(a[1], b[1])
    x2 = min(a[2], b[2])
    y2 = min(a[3], b[3])
    inter = max(0, x2 - x1) * max(0, y2 - y1)
    if inter <= 0:
        return 0.0
    area_a = max(0, a[2] - a[0]) * max(0, a[3] - a[1])
    area_b = max(0, b[2] - b[0]) * max(0, b[3] - b[1])
    return inter / (area_a + area_b - inter + 1e-6)


def _merge_person_boxes(primary_boxes, primary_ids, primary_confs, extra_boxes, extra_confs, iou_thr=0.35):
    """Keep track boxes; add supplemental detections that don't overlap."""
    persons = []
    used = set()
    for i, box in enumerate(primary_boxes):
        tid = primary_ids[i] if i < len(primary_ids) else _pseudo_track_id(*map(int, box))
        conf = primary_confs[i] if i < len(primary_confs) else 0.0
        persons.append((box, tid, conf))
        for j, ebox in enumerate(extra_boxes):
            if j not in used and _box_iou(box, ebox) >= iou_thr:
                used.add(j)
    for j, ebox in enumerate(extra_boxes):
        if j not in used:
            persons.append((ebox, _pseudo_track_id(*map(int, ebox)), float(extra_confs[j])))
    return persons


def _line_cross(prev_pt, curr_pt, lp1, lp2):
    def cross_product(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    d1 = cross_product(lp1, lp2, prev_pt)
    d2 = cross_product(lp1, lp2, curr_pt)
    if d1 * d2 < 0:
        d3 = cross_product(prev_pt, curr_pt, lp1)
        d4 = cross_product(prev_pt, curr_pt, lp2)
        if d3 * d4 < 0:
            return "in" if d2 < 0 else "out"
    return None


def save_snapshot(frame, event_type):
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    fname = f"{event_type}_{ts}.jpg"
    path = os.path.join(SNAPSHOTS_DIR, fname)
    cv2.imwrite(path, frame, [cv2.IMWRITE_JPEG_QUALITY, SNAPSHOT_JPEG_QUALITY])
    return fname


def _delete_snapshot_file(filename):
    if not filename:
        return
    path = os.path.join(SNAPSHOTS_DIR, filename)
    try:
        if os.path.isfile(path):
            os.remove(path)
    except OSError:
        pass


def prune_old_events(keep: int = MAX_STORED_EVENTS):
    """Giữ tối đa `keep` sự kiện mới nhất; xóa bản ghi cũ + ảnh liên quan."""
    db = SessionLocal()
    try:
        total = db.query(Event).count()
        if total <= keep:
            return 0
        overflow = total - keep
        old_rows = (
            db.query(Event)
            .order_by(Event.timestamp.asc(), Event.id.asc())
            .limit(overflow)
            .all()
        )
        for row in old_rows:
            _delete_snapshot_file(row.snapshot_path)
            db.delete(row)
        db.commit()
        return overflow
    finally:
        db.close()


def cleanup_orphan_snapshots():
    """Xóa ảnh snapshot không còn được tham chiếu trong DB."""
    db = SessionLocal()
    try:
        referenced = {
            row.snapshot_path
            for row in db.query(Event.snapshot_path).all()
            if row.snapshot_path
        }
    finally:
        db.close()

    removed = 0
    if not os.path.isdir(SNAPSHOTS_DIR):
        return 0
    for name in os.listdir(SNAPSHOTS_DIR):
        if not name.lower().endswith((".jpg", ".jpeg", ".png")):
            continue
        if name not in referenced:
            _delete_snapshot_file(name)
            removed += 1
    return removed


def _record_alert(frame, event_type, severity, message, camera=None):
    """Ghi ảnh + DB ở background để không làm chậm xử lý frame."""
    global _writes_since_prune
    snap = frame.copy()
    cam = camera

    def _write():
        global _writes_since_prune
        fname = save_snapshot(snap, event_type)
        db = SessionLocal()
        try:
            db.add(Event(
                timestamp=datetime.datetime.utcnow(),
                event_type=event_type,
                severity=severity,
                message=message,
                snapshot_path=fname,
                camera=cam,
            ))
            db.commit()
        finally:
            db.close()

        _writes_since_prune += 1
        if _writes_since_prune >= _PRUNE_EVERY_N_WRITES:
            _writes_since_prune = 0
            prune_old_events()

    _event_executor.submit(_write)


# ── COCO keypoint indices ────────────────────────────────────────────
KP_NOSE = 0
KP_L_WRIST = 9
KP_R_WRIST = 10
KP_L_ANKLE = 15
KP_R_ANKLE = 16


class VideoProcessor:
    def __init__(self, demo_id: str | None = None):
        self.video_source = None
        self.current_filename = ""
        self.cap = None
        self.running = False
        self._lock = threading.Lock()
        self._track_reset = False

        self.track_positions = {}     # track_id -> list of (cx, foot_y, time)
        self.zone_enter_time = {}     # (track_id, zone_name) -> first_seen time
        self.line_prev_side = {}      # track_id -> last foot point
        self.alert_cooldown = {}      # (track_id, event_type) -> last alert time
        self.frame_count = 0
        self.fps = 0.0
        self._fps_last_t = time.time()
        self._fps_frame_acc = 0

        self.overlays = dict(DEFAULT_OVERLAYS)

        self._scaled_zones = {}
        self._scaled_lines = []
        self._zones_scaled = False
        self._zone_config_version = 0

        # Active demo pack (zones + lines + video)
        start_id = demo_id or DEFAULT_DEMO_ID
        self.demo_id = start_id
        self._apply_demo_config(get_demo(start_id), switch_video=False)
        self.detect_model = _get_detect_model(self.demo_id)
        self.pose_model = _get_pose_model(self.demo_id)

        # Shared MJPEG pipeline — 1 YOLO loop for all browser clients of THIS demo
        self._jpeg_lock = threading.Lock()
        self._jpeg_cond = threading.Condition(self._jpeg_lock)
        self._latest_jpeg = None
        self._frame_version = 0
        self._pipeline_stop = threading.Event()
        self._pipeline_thread = None
        self.stream_clients = 0

    def _apply_demo_config(self, demo, switch_video=True):
        """Load zones/lines from a demo pack. Demo 1 config stays untouched in demos.py."""
        if not demo:
            return False
        self.demo_id = demo["id"]
        self.demo_name = demo["name"]
        self.demo_short = demo.get("short", demo["name"])
        self.demo_group = demo.get("group", "perimeter")
        self.demo_focus = demo.get("focus", "roi_line")
        self.camera_label = demo.get("camera_label", "CAM-01")
        self.zones = demo["zones"]
        self.divider_lines_norm = demo["divider_lines"]
        self._zone_config_version = demo.get("zone_version", 1)
        self._zones_scaled = False
        self._junction = None
        self.detect_model = _get_detect_model(self.demo_id)
        self.pose_model = _get_pose_model(self.demo_id)
        # Junction marker only for Demo 1 Y-model (3 lines meet)
        if demo["id"] == "perimeter_y" and len(demo["divider_lines"]) >= 3:
            self._junction = demo["divider_lines"][0]["p1"]
        if switch_video:
            return self.switch_video(demo["video_path"])
        self.video_source = demo["video_path"]
        self.current_filename = os.path.basename(demo["video_path"])
        return True

    def switch_demo(self, demo_id: str):
        demo = get_demo(demo_id)
        if not demo:
            return {"error": "Demo not found"}
        if not os.path.isfile(demo["video_path"]):
            return {"error": "Video file missing", "path": demo["video_path"]}
        ok = self._apply_demo_config(demo, switch_video=True)
        if not ok:
            return {"error": "Failed to open demo video"}
        return self.demo_info()

    def demo_info(self):
        return {
            "id": self.demo_id,
            "name": self.demo_name,
            "short": self.demo_short,
            "group": self.demo_group,
            "focus": self.demo_focus,
            "camera_label": self.camera_label,
            "video": self.current_filename,
            "video_rel": get_demo(self.demo_id).get("video") if get_demo(self.demo_id) else self.current_filename,
        }

    def set_overlays(self, **kwargs):
        for key, val in kwargs.items():
            if key in self.overlays and isinstance(val, bool):
                self.overlays[key] = val
        return self.overlays

    def _update_fps(self):
        self._fps_frame_acc += 1
        now = time.time()
        elapsed = now - self._fps_last_t
        if elapsed >= 1.0:
            self.fps = round(self._fps_frame_acc / elapsed, 1)
            self._fps_frame_acc = 0
            self._fps_last_t = now

    def _ensure_zones_scaled(self):
        if self._zones_scaled:
            return
        self._scaled_zones = {}
        for name, z in self.zones.items():
            self._scaled_zones[name] = {
                "polygon": _scale_polygon(z["polygon_norm"]),
                "color_safe": z["color_safe"],
                "color_alert": z["color_alert"],
                "type": z["type"],
                "label": z.get("label", name),
            }
        self._scaled_lines = [
            (_scale_point(ln["p1"]), _scale_point(ln["p2"]))
            for ln in self.divider_lines_norm
        ]
        self._zones_scaled = True

    def _open_capture(self, path):
        cap = cv2.VideoCapture(path)
        if not cap.isOpened():
            return None
        # Warm up decoder and skip stale buffered frames after a switch.
        for _ in range(5):
            cap.grab()
        cap.read()
        return cap

    def _reset_tracking_state(self):
        self.track_positions.clear()
        self.zone_enter_time.clear()
        self.line_prev_side.clear()
        self.alert_cooldown.clear()
        self.frame_count = 0
        # Chỉ reset ByteTrack qua persist=False ở frame kế tiếp.
        # KHÔNG hủy predictor: re-init làm phân mảnh GPU / FPS tụt.
        self._track_reset = True

    def start(self):
        if self.video_source:
            with self._lock:
                self.cap = self._open_capture(self.video_source)
        self.running = True
        self._start_pipeline()

    def stop(self):
        self.running = False
        self._stop_pipeline()
        with self._lock:
            if self.cap:
                self.cap.release()
                self.cap = None

    def _start_pipeline(self):
        if self._pipeline_thread and self._pipeline_thread.is_alive():
            return
        self._pipeline_stop.clear()
        self._pipeline_thread = threading.Thread(
            target=self._pipeline_loop,
            name=f"pipeline-{self.demo_id}",
            daemon=True,
        )
        self._pipeline_thread.start()

    def _stop_pipeline(self):
        self._pipeline_stop.set()
        with self._jpeg_cond:
            self._jpeg_cond.notify_all()
        t = self._pipeline_thread
        if t and t.is_alive():
            t.join(timeout=2.0)
        self._pipeline_thread = None

    def _pipeline_loop(self):
        """Single inference loop for this demo — clients consume latest JPEG."""
        while not self._pipeline_stop.is_set():
            if not self.running:
                time.sleep(0.05)
                continue
            frame = self.process_frame()
            if frame is None:
                time.sleep(0.03)
                continue
            ok, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 75])
            if not ok:
                continue
            with self._jpeg_cond:
                self._latest_jpeg = buf.tobytes()
                self._frame_version += 1
                self._jpeg_cond.notify_all()

    def get_jpeg(self, last_version: int = 0, timeout: float = 1.0):
        """Wait for a newer frame than last_version; return (bytes|None, version)."""
        with self._jpeg_cond:
            if self._frame_version == last_version or self._latest_jpeg is None:
                self._jpeg_cond.wait(timeout=timeout)
            return self._latest_jpeg, self._frame_version

    def register_stream_client(self):
        self.stream_clients += 1
        return self.stream_clients

    def unregister_stream_client(self):
        self.stream_clients = max(0, self.stream_clients - 1)
        return self.stream_clients

    def switch_video(self, path):
        filename = os.path.basename(path)
        new_cap = self._open_capture(path)
        if new_cap is None:
            return False

        with self._lock:
            if self.cap:
                self.cap.release()
            self.cap = new_cap
            self.video_source = path
            self.current_filename = filename

        self._reset_tracking_state()
        self.running = True
        if not self._pipeline_thread or not self._pipeline_thread.is_alive():
            self._start_pipeline()
        return True

    def _can_alert(self, track_id, event_type):
        key = (track_id, event_type)
        now = time.time()
        last = self.alert_cooldown.get(key, 0)
        if now - last > ALERT_COOLDOWN_SEC:
            self.alert_cooldown[key] = now
            return True
        return False

    def _prune_stale_track_state(self, active_ids, now):
        """Remove state for lost tracks so dicts don't grow across loops."""
        active = set(active_ids)
        for tid in list(self.track_positions):
            if tid not in active:
                hist = self.track_positions[tid]
                if not hist or now - hist[-1][2] > TRACK_STATE_TTL_SEC:
                    self.track_positions.pop(tid, None)
                    self.line_prev_side.pop(tid, None)
        for key in list(self.zone_enter_time):
            if key[0] not in active:
                self.zone_enter_time.pop(key, None)
        for key in list(self.alert_cooldown):
            if key[0] not in active and now - self.alert_cooldown[key] > TRACK_STATE_TTL_SEC:
                self.alert_cooldown.pop(key, None)

    def process_frame(self):
        if not self.running:
            return None

        with self._lock:
            if not self.cap or not self.cap.isOpened():
                return None
            ret, frame = self.cap.read()

        if not ret:
            with self._lock:
                if not self.cap:
                    return None
                self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            self._reset_tracking_state()
            with self._lock:
                if not self.cap:
                    return None
                ret, frame = self.cap.read()
            if not ret:
                return None

        frame = cv2.resize(frame, (FRAME_W, FRAME_H))
        self._ensure_zones_scaled()
        self.frame_count += 1
        self._update_fps()
        now = time.time()
        show = self.overlays

        # ── Draw zones (bỏ qua nếu demo leo rào — không có ROI/line/area) ──
        if self.demo_focus != "climbing" and (show["roi"] or show["fence"]):
            overlay = frame.copy()
            for name, z in self._scaled_zones.items():
                ztype = z["type"]
                if ztype in ("restricted", "warning", "safe") and not show["roi"]:
                    continue
                if ztype == "fence" and not show["fence"]:
                    continue
                cv2.fillPoly(overlay, [z["polygon"]], z["color_safe"])
            cv2.addWeighted(overlay, 0.15, frame, 0.85, 0, frame)

            for name, z in self._scaled_zones.items():
                ztype = z["type"]
                if ztype in ("restricted", "warning", "safe") and not show["roi"]:
                    continue
                if ztype == "fence" and not show["fence"]:
                    continue
                thickness = 1 if ztype == "safe" else 2
                cv2.polylines(frame, [z["polygon"]], True, z["color_safe"], thickness)
                if ztype != "safe":
                    cx = int(z["polygon"][:, 0].mean())
                    cy = int(z["polygon"][:, 1].mean())
                    cv2.putText(frame, z["label"], (cx - 55, cy),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.45, z["color_safe"], 1, cv2.LINE_AA)
                elif show["roi"]:
                    cx = int(z["polygon"][:, 0].mean())
                    cy = int(z["polygon"][:, 1].mean())
                    cv2.putText(frame, z["label"], (cx - 55, cy),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.4, (180, 180, 180), 1, cv2.LINE_AA)

        # Virtual divider lines — chỉ Demo chu vi
        if self.demo_focus != "climbing" and show["fence"]:
            for i, (lp1, lp2) in enumerate(self._scaled_lines):
                cv2.line(frame, lp1, lp2, (255, 0, 255), 2, cv2.LINE_AA)
                if self.demo_id == "perimeter_y" and i == 1:
                    mid_y = (lp1[1] + lp2[1]) // 2
                    cv2.putText(frame, "Hàng rào ảo", (lp1[0] + 5, mid_y),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 0, 255), 1, cv2.LINE_AA)
            if self._junction is not None:
                jx, jy = _scale_point(self._junction)
                cv2.circle(frame, (jx, jy), 6, (0, 0, 255), -1, cv2.LINE_AA)
                cv2.circle(frame, (jx, jy), 8, (255, 255, 255), 1, cv2.LINE_AA)

        # ── YOLO detection + tracking ──────────────────────────────
        climb_only = self.demo_focus == "climbing"
        infer_frame = _enhance_low_light(frame) if climb_only else frame
        det_conf = 0.18 if climb_only else 0.35
        pose_conf = 0.12 if climb_only else 0.3
        # Lưới 4-cam: giữ imgsz=640 để GPU chịu được 4 pipeline song song
        imgsz = 640

        persist_tracks = not self._track_reset
        det_results = self.detect_model.track(
            infer_frame, persist=persist_tracks, classes=[0],
            conf=det_conf, iou=0.5, imgsz=imgsz, verbose=False,
        )
        if self._track_reset:
            self._track_reset = False

        # Pose: mỗi 2 frame leo rào / mỗi 3 frame chu vi (tiết kiệm GPU khi multi-cam)
        pose_kps = {}
        pose_boxes = np.empty((0, 4))
        pose_confs = np.empty(0)
        run_pose = (climb_only and self.frame_count % 2 == 0) or (
            not climb_only and self.frame_count % 3 == 0
        )
        if run_pose:
            pose_results = self.pose_model(
                infer_frame, conf=pose_conf, imgsz=imgsz, verbose=False,
            )
            if pose_results and pose_results[0].boxes is not None:
                pose_boxes = pose_results[0].boxes.xyxy.cpu().numpy()
                pose_confs = pose_results[0].boxes.conf.cpu().numpy()
            if pose_results and pose_results[0].keypoints is not None:
                kp_data = pose_results[0].keypoints.data.cpu().numpy()
                for kp, pb in zip(kp_data, pose_boxes):
                    cx = (pb[0] + pb[2]) / 2
                    pose_kps[int(cx)] = kp

        zone_intruded = set()
        zone_warned = set()

        # Collect person boxes — không bỏ qua khi ByteTrack chưa gán id
        boxes = np.empty((0, 4))
        track_ids = []
        confs = np.empty(0)
        if det_results[0].boxes is not None and len(det_results[0].boxes) > 0:
            boxes = det_results[0].boxes.xyxy.cpu().numpy()
            confs = det_results[0].boxes.conf.cpu().numpy()
            if det_results[0].boxes.id is not None:
                track_ids = det_results[0].boxes.id.int().cpu().tolist()
            else:
                track_ids = [_pseudo_track_id(*map(int, b)) for b in boxes]

        # Demo leo rào: bổ sung detect + pose khi track bỏ sót (đoạn đầu tối)
        if climb_only:
            if len(boxes) == 0:
                sup = self.detect_model(
                    infer_frame, classes=[0], conf=0.12, imgsz=imgsz, verbose=False,
                )[0]
                if sup.boxes is not None and len(sup.boxes) > 0:
                    boxes = sup.boxes.xyxy.cpu().numpy()
                    confs = sup.boxes.conf.cpu().numpy()
                    track_ids = [_pseudo_track_id(*map(int, b)) for b in boxes]
            if len(pose_boxes) > 0:
                merged = _merge_person_boxes(boxes, track_ids, confs, pose_boxes, pose_confs)
                if merged:
                    boxes = np.array([m[0] for m in merged])
                    track_ids = [m[1] for m in merged]
                    confs = np.array([m[2] for m in merged])

        if len(boxes) > 0:
            self._prune_stale_track_state(track_ids, now)

            for box, tid, conf in zip(boxes, track_ids, confs):
                x1, y1, x2, y2 = map(int, box)
                foot = _foot_point((x1, y1, x2, y2))
                cx = (x1 + x2) / 2.0

                # Update track history
                hist = self.track_positions.setdefault(tid, [])
                hist.append((cx, foot[1], now))
                if len(hist) > 60:
                    hist.pop(0)

                # ── 1–3. Zone / line / loitering — chỉ Demo chu vi (có zones) ──
                in_restricted = False
                in_warning = False
                near_fence = False

                if not climb_only:
                    for zname, z in self._scaled_zones.items():
                        if _point_in_polygon(foot[0], foot[1], z["polygon"]):
                            if z["type"] == "restricted":
                                in_restricted = True
                                zone_intruded.add(zname)
                                if self._can_alert(tid, "Intrusion"):
                                    _record_alert(frame, "Intrusion", "High",
                                                  f"Người #{tid} xâm nhập {zname}",
                                                  camera=self.camera_label)
                            elif z["type"] == "warning":
                                in_warning = True
                                zone_warned.add(zname)
                                if self._can_alert(tid, "Warning"):
                                    _record_alert(frame, "Intrusion", "Medium",
                                                  f"Người #{tid} vào {zname}",
                                                  camera=self.camera_label)
                            elif z["type"] == "fence":
                                near_fence = True

                    prev_foot = self.line_prev_side.get(tid)
                    if prev_foot is not None:
                        for lp1, lp2 in self._scaled_lines:
                            cross = _line_cross(prev_foot, foot, lp1, lp2)
                            if cross:
                                sev = "High" if cross == "in" else "Medium"
                                direction = "đi vào chu vi" if cross == "in" else "đi ra khỏi chu vi"
                                if self._can_alert(tid, "Line Crossing"):
                                    _record_alert(frame, "Line Crossing", sev,
                                                  f"Người #{tid} {direction}",
                                                  camera=self.camera_label)
                                    cv2.line(frame, lp1, lp2, (0, 0, 255), 4, cv2.LINE_AA)
                                break
                    self.line_prev_side[tid] = foot

                    for zname, z in self._scaled_zones.items():
                        if z["type"] != "restricted":
                            continue
                        key = (tid, zname)
                        if _point_in_polygon(foot[0], foot[1], z["polygon"]):
                            if key not in self.zone_enter_time:
                                self.zone_enter_time[key] = now
                            dwell = now - self.zone_enter_time[key]
                            if dwell > LOITER_THRESHOLD_SEC:
                                if self._can_alert(tid, "Loitering"):
                                    _record_alert(frame, "Loitering", "Medium",
                                                  f"Người #{tid} đi lảng vẫn tại {zname} ({dwell:.0f}s)",
                                                  camera=self.camera_label)
                        else:
                            self.zone_enter_time.pop(key, None)

                # ── 4. Climbing Detection (pose heuristic) ───────
                # Demo leo rào: luôn kiểm tra hành động (không cần ROI/fence).
                # Demo chu vi: chỉ khi gần hàng rào / vùng cấm / cảnh báo.
                climbing_suspect = False
                if climb_only or near_fence or in_restricted or in_warning:
                    # Match pose keypoints by nearest center-x
                    best_kp = None
                    best_dist = 80 if climb_only else 50
                    for kcx, kp in pose_kps.items():
                        d = abs(kcx - cx)
                        if d < best_dist:
                            best_dist = d
                            best_kp = kp

                    if best_kp is not None:
                        nose = best_kp[KP_NOSE]
                        l_wrist = best_kp[KP_L_WRIST]
                        r_wrist = best_kp[KP_R_WRIST]
                        l_ankle = best_kp[KP_L_ANKLE]
                        r_ankle = best_kp[KP_R_ANKLE]

                        wrist_above = False
                        if l_wrist[2] > 0.3 and nose[2] > 0.3 and l_wrist[1] < nose[1]:
                            wrist_above = True
                        if r_wrist[2] > 0.3 and nose[2] > 0.3 and r_wrist[1] < nose[1]:
                            wrist_above = True

                        ankle_raised = False
                        bbox_h = y2 - y1
                        for ankle in [l_ankle, r_ankle]:
                            if ankle[2] > 0.3 and (y2 - ankle[1]) > bbox_h * 0.25:
                                ankle_raised = True

                        if wrist_above or ankle_raised:
                            climbing_suspect = True
                            if self._can_alert(tid, "Climbing"):
                                _record_alert(frame, "Climbing", "Critical",
                                              f"Người #{tid} nghi leo hàng rào",
                                              camera=self.camera_label)

                    # Fallback: upward motion heuristic
                    up_thresh = 25 if climb_only else 40
                    if not climbing_suspect and len(hist) >= 10:
                        y_start = hist[-10][1]
                        y_end = hist[-1][1]
                        if y_start - y_end > up_thresh:
                            climbing_suspect = True
                            if self._can_alert(tid, "Climbing"):
                                msg = (
                                    f"Người #{tid} chuyển động lên nhanh (leo)"
                                    if climb_only else
                                    f"Người #{tid} chuyển động lên nhanh gần hàng rào"
                                )
                                _record_alert(frame, "Climbing", "Critical", msg,
                                              camera=self.camera_label)

                # ── Draw bounding box ────────────────────────────
                # Không vẽ class "Người" thường — chỉ vẽ khi có sự kiện.
                # Demo leo rào: chỉ khung khi đang leo.
                if show["boxes"]:
                    draw_box = False
                    color = (0, 220, 0)
                    label = ""
                    if climbing_suspect:
                        draw_box = True
                        color = (0, 0, 255)
                        label = f"#{tid} LEO RÀO"
                        cv2.rectangle(frame, (x1 - 2, y1 - 2), (x2 + 2, y2 + 2), (0, 0, 200), 3)
                    elif not climb_only and in_restricted:
                        draw_box = True
                        color = (0, 0, 255)
                        label = f"#{tid} XÂM NHẬP"
                    elif not climb_only and in_warning:
                        draw_box = True
                        color = (0, 165, 255)
                        label = f"#{tid} CẢNH BÁO"

                    if draw_box:
                        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

                        if show["labels"]:
                            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
                            cv2.rectangle(frame, (x1, max(0, y1 - th - 8)), (x1 + tw + 4, max(0, y1 - 2)), color, -1)
                            cv2.putText(frame, label, (x1 + 2, max(0, y1 - 5)),
                                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1, cv2.LINE_AA)
                            cv2.putText(frame, f"{conf:.0%}", (x1, y2 + 15),
                                        cv2.FONT_HERSHEY_SIMPLEX, 0.35, color, 1, cv2.LINE_AA)

                        if len(hist) > 2:
                            pts = [(int(h[0]), int(h[1])) for h in hist[-15:]]
                            for i in range(1, len(pts)):
                                cv2.line(frame, pts[i - 1], pts[i], color, 1, cv2.LINE_AA)

        # ── Zone alert overlay (chỉ Demo chu vi) ───────────────────
        if self.demo_focus != "climbing" and show["roi"]:
            for zname in zone_intruded:
                z = self._scaled_zones[zname]
                cv2.polylines(frame, [z["polygon"]], True, z["color_alert"], 3)
                overlay2 = frame.copy()
                cv2.fillPoly(overlay2, [z["polygon"]], (0, 0, 180))
                cv2.addWeighted(overlay2, 0.12, frame, 0.88, 0, frame)
            for zname in zone_warned:
                z = self._scaled_zones[zname]
                cv2.polylines(frame, [z["polygon"]], True, z["color_alert"], 3)
                overlay2 = frame.copy()
                cv2.fillPoly(overlay2, [z["polygon"]], (0, 120, 200))
                cv2.addWeighted(overlay2, 0.10, frame, 0.90, 0, frame)

        # ── HUD overlay ────────────────────────────────────────────
        cv2.rectangle(frame, (0, 0), (280, 35), (0, 0, 0), -1)
        cv2.putText(frame, "GIAM SAT CHU VI", (8, 15),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 200, 200), 1, cv2.LINE_AA)
        ts_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cv2.putText(frame, ts_str, (8, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.35, (150, 150, 150), 1, cv2.LINE_AA)

        # FPS badge
        cv2.putText(frame, f"FPS {self.fps:.0f}", (FRAME_W - 70, FRAME_H - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 200, 100), 1, cv2.LINE_AA)

        if zone_intruded:
            cv2.rectangle(frame, (FRAME_W - 220, 0), (FRAME_W, 30), (0, 0, 180), -1)
            cv2.putText(frame, "!! CANH BAO XAM NHAP !!", (FRAME_W - 215, 20),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv2.LINE_AA)
        elif zone_warned:
            cv2.rectangle(frame, (FRAME_W - 240, 0), (FRAME_W, 30), (0, 120, 200), -1)
            cv2.putText(frame, "!! VUNG CANH BAO !!", (FRAME_W - 225, 20),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv2.LINE_AA)

        return frame


def list_videos():
    """Legacy helper — prefer list_demo_summaries() for UI."""
    return [d["video"] for d in list_demo_summaries() if d["available"]]


def _build_processors() -> dict[str, VideoProcessor]:
    """Một VideoProcessor + YOLO riêng cho mỗi demo (lưới 4-cam)."""
    from demos import DEMOS
    out: dict[str, VideoProcessor] = {}
    for demo_id in DEMOS:
        out[demo_id] = VideoProcessor(demo_id=demo_id)
    return out


processors: dict[str, VideoProcessor] = _build_processors()
processor = processors[DEFAULT_DEMO_ID]  # tương thích API cũ (overlays / switch)


def get_processor(demo_id: str | None = None) -> VideoProcessor | None:
    if not demo_id:
        return processor
    return processors.get(demo_id)


def start_all_processors():
    for p in processors.values():
        p.start()


def stop_all_processors():
    for p in processors.values():
        p.stop()


def set_overlays_all(**kwargs):
    result = None
    for p in processors.values():
        result = p.set_overlays(**kwargs)
    return result or processor.overlays


def aggregate_fps() -> float:
    vals = [p.fps for p in processors.values() if p.fps > 0]
    return sum(vals) / len(vals) if vals else 0.0
