import cv2
import numpy as np
from ultralytics import YOLO
import datetime
import time
import os
import math
from database import SessionLocal, Event

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
SNAPSHOTS_DIR = os.path.join(BASE_DIR, "data", "snapshots")
VIDEOS_DIR = os.path.join(BASE_DIR, "data", "sample_videos")

FRAME_W, FRAME_H = 960, 540

detect_model = YOLO(os.path.join(MODELS_DIR, "yolov8s.pt"))
pose_model = YOLO(os.path.join(MODELS_DIR, "yolov8n-pose.pt"))

# ── Zone configs (normalized 0-1 coords, scaled at runtime) ─────────
ZONES = {
    "Zone-A Restricted": {
        "polygon_norm": [[0.55, 0.15], [0.95, 0.15], [0.95, 0.85], [0.55, 0.85]],
        "color_safe": (0, 180, 0),
        "color_alert": (0, 0, 255),
        "type": "restricted",
    },
    "Fence Line": {
        "polygon_norm": [[0.48, 0.10], [0.52, 0.10], [0.52, 0.90], [0.48, 0.90]],
        "color_safe": (0, 200, 255),
        "color_alert": (0, 100, 255),
        "type": "fence",
    },
}

VIRTUAL_LINE_NORM = {"p1": [0.50, 0.05], "p2": [0.50, 0.95]}

LOITER_THRESHOLD_SEC = 8.0
CLIMBING_WRIST_ABOVE_NOSE = True
ALERT_COOLDOWN_SEC = 5.0


def _scale_polygon(poly_norm):
    return np.array([[int(x * FRAME_W), int(y * FRAME_H)] for x, y in poly_norm], dtype=np.int32)


def _scale_point(p_norm):
    return (int(p_norm[0] * FRAME_W), int(p_norm[1] * FRAME_H))


def _point_in_polygon(px, py, polygon):
    return cv2.pointPolygonTest(polygon, (float(px), float(py)), False) >= 0


def _foot_point(bbox):
    x1, y1, x2, y2 = bbox
    return ((x1 + x2) / 2, y1 + (y2 - y1) * 0.9)


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
    cv2.imwrite(os.path.join(SNAPSHOTS_DIR, fname), frame)
    return fname


def log_event(event_type, severity, message, snapshot_filename):
    db = SessionLocal()
    try:
        db.add(Event(
            timestamp=datetime.datetime.utcnow(),
            event_type=event_type,
            severity=severity,
            message=message,
            snapshot_path=snapshot_filename,
        ))
        db.commit()
    finally:
        db.close()


# ── COCO keypoint indices ────────────────────────────────────────────
KP_NOSE = 0
KP_L_WRIST = 9
KP_R_WRIST = 10
KP_L_ANKLE = 15
KP_R_ANKLE = 16


class VideoProcessor:
    def __init__(self):
        self.video_source = None
        self.cap = None
        self.running = False

        self.track_positions = {}     # track_id -> list of (cx, foot_y, time)
        self.zone_enter_time = {}     # (track_id, zone_name) -> first_seen time
        self.line_prev_side = {}      # track_id -> last foot point
        self.alert_cooldown = {}      # (track_id, event_type) -> last alert time
        self.frame_count = 0

        self._scaled_zones = {}
        self._scaled_line = None
        self._zones_scaled = False

    def _ensure_zones_scaled(self):
        if self._zones_scaled:
            return
        for name, z in ZONES.items():
            self._scaled_zones[name] = {
                "polygon": _scale_polygon(z["polygon_norm"]),
                "color_safe": z["color_safe"],
                "color_alert": z["color_alert"],
                "type": z["type"],
            }
        ln = VIRTUAL_LINE_NORM
        self._scaled_line = (_scale_point(ln["p1"]), _scale_point(ln["p2"]))
        self._zones_scaled = True

    def start(self):
        if self.video_source:
            self.cap = cv2.VideoCapture(self.video_source)
        self.running = True

    def stop(self):
        self.running = False
        if self.cap:
            self.cap.release()

    def switch_video(self, path):
        if self.cap:
            self.cap.release()
        self.cap = cv2.VideoCapture(path)
        self.video_source = path
        self.track_positions.clear()
        self.zone_enter_time.clear()
        self.line_prev_side.clear()
        self.alert_cooldown.clear()
        self.running = True

    def _can_alert(self, track_id, event_type):
        key = (track_id, event_type)
        now = time.time()
        last = self.alert_cooldown.get(key, 0)
        if now - last > ALERT_COOLDOWN_SEC:
            self.alert_cooldown[key] = now
            return True
        return False

    def process_frame(self):
        if not self.running or not self.cap or not self.cap.isOpened():
            return None

        ret, frame = self.cap.read()
        if not ret:
            self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            self.track_positions.clear()
            self.zone_enter_time.clear()
            self.line_prev_side.clear()
            ret, frame = self.cap.read()
            if not ret:
                return None

        frame = cv2.resize(frame, (FRAME_W, FRAME_H))
        self._ensure_zones_scaled()
        self.frame_count += 1
        now = time.time()

        # ── Draw zones ─────────────────────────────────────────────
        overlay = frame.copy()
        for name, z in self._scaled_zones.items():
            cv2.fillPoly(overlay, [z["polygon"]], z["color_safe"] + (30,) if len(z["color_safe"]) == 3 else z["color_safe"])
        cv2.addWeighted(overlay, 0.15, frame, 0.85, 0, frame)

        for name, z in self._scaled_zones.items():
            cv2.polylines(frame, [z["polygon"]], True, z["color_safe"], 2)
            top = z["polygon"][0]
            cv2.putText(frame, name, (top[0] + 5, top[1] - 8),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, z["color_safe"], 1, cv2.LINE_AA)

        # Virtual line
        lp1, lp2 = self._scaled_line
        cv2.line(frame, lp1, lp2, (255, 0, 255), 2, cv2.LINE_AA)
        mid_y = (lp1[1] + lp2[1]) // 2
        cv2.putText(frame, "Virtual Fence", (lp1[0] + 5, mid_y),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 0, 255), 1, cv2.LINE_AA)

        # ── YOLO detection + tracking ──────────────────────────────
        det_results = detect_model.track(frame, persist=True, classes=[0],
                                          conf=0.35, iou=0.5, verbose=False)

        # Run pose every 3 frames to save CPU
        pose_kps = {}
        if self.frame_count % 3 == 0:
            pose_results = pose_model(frame, conf=0.3, verbose=False)
            if pose_results and pose_results[0].keypoints is not None:
                kp_data = pose_results[0].keypoints.data.cpu().numpy()
                kp_boxes = pose_results[0].boxes.xyxy.cpu().numpy() if pose_results[0].boxes is not None else []
                for kp, pb in zip(kp_data, kp_boxes):
                    cx = (pb[0] + pb[2]) / 2
                    pose_kps[int(cx)] = kp

        zone_intruded = set()

        if det_results[0].boxes.id is not None:
            boxes = det_results[0].boxes.xyxy.cpu().numpy()
            track_ids = det_results[0].boxes.id.int().cpu().tolist()
            confs = det_results[0].boxes.conf.cpu().numpy()

            for box, tid, conf in zip(boxes, track_ids, confs):
                x1, y1, x2, y2 = map(int, box)
                foot = _foot_point((x1, y1, x2, y2))
                cx = (x1 + x2) / 2.0

                # Update track history
                hist = self.track_positions.setdefault(tid, [])
                hist.append((cx, foot[1], now))
                if len(hist) > 60:
                    hist.pop(0)

                # ── 1. Zone Intrusion ────────────────────────────
                in_restricted = False
                near_fence = False
                for zname, z in self._scaled_zones.items():
                    if _point_in_polygon(foot[0], foot[1], z["polygon"]):
                        if z["type"] == "restricted":
                            in_restricted = True
                            zone_intruded.add(zname)
                            if self._can_alert(tid, "Intrusion"):
                                snap = save_snapshot(frame, "Intrusion")
                                log_event("Intrusion", "High",
                                          f"Person #{tid} entered {zname}", snap)
                        elif z["type"] == "fence":
                            near_fence = True

                # ── 2. Virtual Line Crossing ─────────────────────
                prev_foot = self.line_prev_side.get(tid)
                if prev_foot is not None:
                    cross = _line_cross(prev_foot, foot, lp1, lp2)
                    if cross:
                        sev = "High" if cross == "in" else "Medium"
                        direction = "entered perimeter" if cross == "in" else "exited perimeter"
                        if self._can_alert(tid, "Line Crossing"):
                            snap = save_snapshot(frame, "LineCrossing")
                            log_event("Line Crossing", sev,
                                      f"Person #{tid} {direction}", snap)
                            # Draw crossing flash
                            cv2.line(frame, lp1, lp2, (0, 0, 255), 4, cv2.LINE_AA)
                self.line_prev_side[tid] = foot

                # ── 3. Loitering Detection ───────────────────────
                for zname, z in self._scaled_zones.items():
                    key = (tid, zname)
                    if _point_in_polygon(foot[0], foot[1], z["polygon"]):
                        if key not in self.zone_enter_time:
                            self.zone_enter_time[key] = now
                        dwell = now - self.zone_enter_time[key]
                        if dwell > LOITER_THRESHOLD_SEC:
                            if self._can_alert(tid, "Loitering"):
                                snap = save_snapshot(frame, "Loitering")
                                log_event("Loitering", "Medium",
                                          f"Person #{tid} loitering in {zname} for {dwell:.0f}s", snap)
                    else:
                        self.zone_enter_time.pop(key, None)

                # ── 4. Climbing Detection (pose heuristic) ───────
                climbing_suspect = False
                if near_fence or in_restricted:
                    # Match pose keypoints by nearest center-x
                    best_kp = None
                    best_dist = 50
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
                                snap = save_snapshot(frame, "Climbing")
                                log_event("Climbing", "High",
                                          f"Person #{tid} possible climbing near fence", snap)

                    # Fallback: upward motion heuristic
                    if not climbing_suspect and len(hist) >= 10:
                        y_start = hist[-10][1]
                        y_end = hist[-1][1]
                        if y_start - y_end > 40:
                            climbing_suspect = True
                            if self._can_alert(tid, "Climbing"):
                                snap = save_snapshot(frame, "Climbing")
                                log_event("Climbing", "High",
                                          f"Person #{tid} rapid upward movement near fence", snap)

                # ── Draw bounding box ────────────────────────────
                if climbing_suspect:
                    color = (0, 0, 255)
                    label = f"#{tid} CLIMBING"
                    cv2.rectangle(frame, (x1 - 2, y1 - 2), (x2 + 2, y2 + 2), (0, 0, 200), 3)
                elif in_restricted:
                    color = (0, 0, 255)
                    label = f"#{tid} INTRUDER"
                else:
                    color = (0, 220, 0)
                    label = f"#{tid} Person"

                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

                # Label background
                (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
                cv2.rectangle(frame, (x1, max(0, y1 - th - 8)), (x1 + tw + 4, max(0, y1 - 2)), color, -1)
                cv2.putText(frame, label, (x1 + 2, max(0, y1 - 5)),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1, cv2.LINE_AA)

                # Confidence
                cv2.putText(frame, f"{conf:.0%}", (x1, y2 + 15),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.35, color, 1, cv2.LINE_AA)

                # Mini trail
                if len(hist) > 2:
                    pts = [(int(h[0]), int(h[1])) for h in hist[-15:]]
                    for i in range(1, len(pts)):
                        alpha = int(80 + 175 * (i / len(pts)))
                        cv2.line(frame, pts[i - 1], pts[i], (*color[:2], alpha) if len(color) > 2 else color, 1, cv2.LINE_AA)

        # ── Zone alert overlay ─────────────────────────────────────
        for zname in zone_intruded:
            z = self._scaled_zones[zname]
            cv2.polylines(frame, [z["polygon"]], True, z["color_alert"], 3)
            overlay2 = frame.copy()
            cv2.fillPoly(overlay2, [z["polygon"]], (0, 0, 180))
            cv2.addWeighted(overlay2, 0.12, frame, 0.88, 0, frame)

        # ── HUD overlay ────────────────────────────────────────────
        # Top-left: system info
        cv2.rectangle(frame, (0, 0), (280, 35), (0, 0, 0), -1)
        cv2.putText(frame, "FACTORY PERIMETER AI", (8, 15),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 200, 200), 1, cv2.LINE_AA)
        ts_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cv2.putText(frame, ts_str, (8, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.35, (150, 150, 150), 1, cv2.LINE_AA)

        # Top-right: alert count
        if zone_intruded:
            cv2.rectangle(frame, (FRAME_W - 220, 0), (FRAME_W, 30), (0, 0, 180), -1)
            cv2.putText(frame, "!! ALERT: INTRUSION !!", (FRAME_W - 215, 20),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv2.LINE_AA)

        return frame


def list_videos():
    vids = []
    for f in sorted(os.listdir(VIDEOS_DIR)):
        if f.lower().endswith((".mp4", ".avi", ".mkv", ".mov")):
            vids.append(f)
    return vids


processor = VideoProcessor()
