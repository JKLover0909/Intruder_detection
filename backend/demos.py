"""
Demo packs: mỗi demo = video + ROI/zones + divider lines.
Demo 1 (perimeter_y) giữ nguyên cấu hình Y-zone hiện tại — không đụng.
Demo leo rào dùng layout riêng, chọn qua /api/demos.
"""
import os

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
VIDEOS_DIR = os.path.join(BASE_DIR, "data", "sample_videos")
DEMOS_DIR = os.path.join(VIDEOS_DIR, "demos")

# ── Demo 1: Chu vi nhà máy (worker.mp4) — GIỮ NGUYÊN ─────────────────
_JUNCTION = [0.506, 0.445]
_PILLAR_TOP = [0.506, 0.02]
_STRIPE_BL = [0.233, 0.983]
_DIAG_BR = [0.98, 0.80]

DEMO_PERIMETER = {
    "id": "perimeter_y",
    "name": "Demo 1 · Chu vi nhà máy",
    "short": "Chu vi / ROI",
    "group": "perimeter",
    "description": "3 vùng chữ Y + hàng rào ảo — dễ hiểu ROI / line / area",
    "video": "worker.mp4",
    "video_path": os.path.join(VIDEOS_DIR, "worker.mp4"),
    "camera_label": "CAM-01 · Chu vi Bắc",
    "focus": "roi_line",
    "zone_version": 10,
    "divider_lines": [
        {"p1": _JUNCTION, "p2": _STRIPE_BL},
        {"p1": _JUNCTION, "p2": _PILLAR_TOP},
        {"p1": _JUNCTION, "p2": _DIAG_BR},
    ],
    "zones": {
        "Vùng cấm": {
            "polygon_norm": [
                [0.02, 0.05], _PILLAR_TOP, _JUNCTION, _STRIPE_BL, [0.02, 0.98],
            ],
            "color_safe": (0, 180, 0),
            "color_alert": (0, 0, 255),
            "type": "restricted",
            "label": "1 - Vùng cấm",
        },
        "Vùng cảnh báo": {
            "polygon_norm": [_JUNCTION, _STRIPE_BL, _DIAG_BR],
            "color_safe": (0, 200, 255),
            "color_alert": (0, 140, 255),
            "type": "warning",
            "label": "2 - Vùng cảnh báo",
        },
        "Vùng an toàn": {
            "polygon_norm": [
                _PILLAR_TOP, [0.98, 0.05], [0.98, 0.98], _DIAG_BR, _JUNCTION,
            ],
            "color_safe": (140, 140, 140),
            "color_alert": (140, 140, 140),
            "type": "safe",
            "label": "3 - Vùng an toàn",
        },
        "Đường hàng rào": {
            "polygon_norm": [
                [0.224, 0.977], [0.497, 0.439], [0.515, 0.451], [0.242, 0.989],
            ],
            "color_safe": (0, 200, 255),
            "color_alert": (0, 100, 255),
            "type": "fence",
        },
    },
}

# ── Demo leo rào: công viên (ngang, leo rõ) ───────────────────────────
# Hàng rào ngang ~ y=0.28; phía trên = sân (xa), phía dưới = gần camera.
DEMO_CLIMB_PARK = {
    "id": "climb_park",
    "name": "Demo 2 · Leo rào công viên",
    "short": "Leo rào · Công viên",
    "group": "climbing",
    "description": "Chỉ phát hiện hành động leo — không ROI / line / area",
    "video": "demos/climb_park.mp4",
    "video_path": os.path.join(DEMOS_DIR, "climb_park.mp4"),
    "camera_label": "CAM-02 · Hàng rào công viên",
    "focus": "climbing",
    "zone_version": 2,
    "divider_lines": [],
    "zones": {},
}

# ── Demo leo rào: đêm / gym (không ROI — chỉ hành động leo) ──────────
DEMO_CLIMB_NIGHT = {
    "id": "climb_night",
    "name": "Demo 3 · Leo rào ban đêm",
    "short": "Leo rào · Đêm",
    "group": "climbing",
    "description": "Chỉ phát hiện hành động leo — không ROI / line / area",
    "video": "demos/climb_night.mp4",
    "video_path": os.path.join(DEMOS_DIR, "climb_night.mp4"),
    "camera_label": "CAM-03 · Hàng rào đêm",
    "focus": "climbing",
    "zone_version": 2,
    "divider_lines": [],
    "zones": {},
}

# ── Demo leo rào: phòng tập (dọc letterbox) ───────────────────────────
DEMO_CLIMB_GYM = {
    "id": "climb_gym",
    "name": "Demo 4 · Leo rào phòng tập",
    "short": "Leo rào · Gym",
    "group": "climbing",
    "description": "Chỉ phát hiện hành động leo — không ROI / line / area",
    "video": "demos/climb_gym.mp4",
    "video_path": os.path.join(DEMOS_DIR, "climb_gym.mp4"),
    "camera_label": "CAM-04 · Hàng rào tập luyện",
    "focus": "climbing",
    "zone_version": 2,
    "divider_lines": [],
    "zones": {},
}

DEMOS = {
    DEMO_PERIMETER["id"]: DEMO_PERIMETER,
    DEMO_CLIMB_PARK["id"]: DEMO_CLIMB_PARK,
    DEMO_CLIMB_NIGHT["id"]: DEMO_CLIMB_NIGHT,
    DEMO_CLIMB_GYM["id"]: DEMO_CLIMB_GYM,
}

DEFAULT_DEMO_ID = "perimeter_y"


def list_demo_summaries():
    out = []
    for d in DEMOS.values():
        exists = os.path.isfile(d["video_path"])
        out.append({
            "id": d["id"],
            "name": d["name"],
            "short": d["short"],
            "group": d["group"],
            "description": d["description"],
            "video": d["video"],
            "camera_label": d["camera_label"],
            "focus": d["focus"],
            "available": exists,
        })
    return out


def get_demo(demo_id: str):
    return DEMOS.get(demo_id)
