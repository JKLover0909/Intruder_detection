import cv2
import time
from fastapi import FastAPI, Depends
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db, Event
from engine import (
    processor, processors, get_processor, list_videos, VIDEOS_DIR,
    prune_old_events, cleanup_orphan_snapshots,
    start_all_processors, stop_all_processors,
    set_overlays_all, aggregate_fps,
)
from demos import list_demo_summaries, DEFAULT_DEMO_ID, DEMOS
import os
import threading

BASE_DIR = os.path.dirname(os.path.dirname(__file__))

app = FastAPI(title="Factory Perimeter Security AI")

snapshots_dir = os.path.join(BASE_DIR, "data", "snapshots")
app.mount("/snapshots", StaticFiles(directory=snapshots_dir), name="snapshots")

# Cache stats — tránh 5 COUNT query mỗi lần frontend poll
_stats_cache: dict = {}
_stats_cache_at = 0.0
_STATS_CACHE_SEC = 5.0
_RETENTION_INTERVAL_SEC = 300.0  # dọn định kỳ mỗi 5 phút
_retention_stop = threading.Event()


def _get_cached_stats(db: Session) -> dict:
    global _stats_cache, _stats_cache_at
    now = time.time()
    if now - _stats_cache_at < _STATS_CACHE_SEC and _stats_cache:
        return _stats_cache

    rows = (
        db.query(Event.event_type, func.count(Event.id))
        .group_by(Event.event_type)
        .all()
    )
    counts = {etype: cnt for etype, cnt in rows}
    total = sum(counts.values())
    _stats_cache = {
        "total_alerts_today": total,
        "intrusions": counts.get("Intrusion", 0),
        "climbing_suspects": counts.get("Climbing", 0),
        "loitering_events": counts.get("Loitering", 0),
        "line_crossings": counts.get("Line Crossing", 0),
    }
    _stats_cache_at = now
    return _stats_cache


def invalidate_stats_cache():
    global _stats_cache_at
    _stats_cache_at = 0.0


def _retention_loop():
    while not _retention_stop.wait(_RETENTION_INTERVAL_SEC):
        try:
            prune_old_events()
            cleanup_orphan_snapshots()
            invalidate_stats_cache()
        except Exception:
            pass


@app.on_event("startup")
def startup_event():
    # Dọn ngay khi khởi động + chạy retention định kỳ
    try:
        prune_old_events()
        cleanup_orphan_snapshots()
    except Exception:
        pass
    _retention_stop.clear()
    threading.Thread(target=_retention_loop, name="retention", daemon=True).start()

    # Khởi động cả 4 pipeline (mỗi demo 1 YOLO riêng) cho lưới multi-cam
    start_all_processors()


@app.on_event("shutdown")
def shutdown_event():
    _retention_stop.set()
    stop_all_processors()


@app.get("/")
def serve_frontend():
    return FileResponse(os.path.join(os.path.dirname(__file__), "static", "index.html"))


def generate_frames(proc):
    """Serve shared pipeline frames — does NOT run YOLO per client."""
    proc.register_stream_client()
    last_version = 0
    try:
        while True:
            jpeg, last_version = proc.get_jpeg(last_version, timeout=1.0)
            if jpeg is None:
                time.sleep(0.05)
                continue
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + jpeg + b'\r\n')
    finally:
        proc.unregister_stream_client()


@app.get("/video_feed")
def video_feed():
    """Legacy: stream demo đang active (mặc định chu vi)."""
    return StreamingResponse(
        generate_frames(processor),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers={"Cache-Control": "no-cache, no-store, must-revalidate"},
    )


@app.get("/video_feed/{demo_id}")
def video_feed_demo(demo_id: str):
    proc = get_processor(demo_id)
    if proc is None:
        return {"error": "Unknown demo", "demo_id": demo_id}
    return StreamingResponse(
        generate_frames(proc),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers={"Cache-Control": "no-cache, no-store, must-revalidate"},
    )


@app.get("/api/events")
def get_events(limit: int = 50, db: Session = Depends(get_db)):
    events = db.query(Event).order_by(Event.timestamp.desc()).limit(limit).all()
    return events


@app.get("/api/stats")
def get_stats(db: Session = Depends(get_db)):
    cached = _get_cached_stats(db)
    cam_fps = {did: round(p.fps, 1) for did, p in processors.items()}
    return {
        "active_cameras": len(processors),
        **cached,
        "system_status": "Online",
        "roi_active": True,
        "fps": round(aggregate_fps(), 1),
        "fps_by_camera": cam_fps,
        "stream_clients": sum(p.stream_clients for p in processors.values()),
    }


@app.get("/api/overlays")
def get_overlays():
    return processor.overlays


@app.post("/api/overlays")
def set_overlays(roi: bool | None = None, fence: bool | None = None,
                 boxes: bool | None = None, labels: bool | None = None):
    updates = {}
    if roi is not None:
        updates["roi"] = roi
    if fence is not None:
        updates["fence"] = fence
    if boxes is not None:
        updates["boxes"] = boxes
    if labels is not None:
        updates["labels"] = labels
    return set_overlays_all(**updates)


@app.get("/api/videos")
def get_videos():
    return list_videos()


@app.get("/api/demos")
def get_demos():
    return {
        "active": processor.demo_info(),
        "cameras": [processors[d].demo_info() for d in DEMOS if d in processors],
        "demos": list_demo_summaries(),
    }


@app.post("/api/demos/switch")
def switch_demo(demo_id: str):
    """Legacy single-view switch — lưới 4-cam không cần; giữ để tương thích."""
    result = processor.switch_demo(demo_id)
    if "error" in result:
        return result
    return {"status": "ok", "active": result}


@app.post("/api/videos/switch")
def switch_video(filename: str):
    """Legacy: map filename → demo pack nếu có, else mở file thô."""
    for d in list_demo_summaries():
        if d["video"] == filename or os.path.basename(d["video"]) == filename:
            return switch_demo(d["id"])
    path = os.path.join(VIDEOS_DIR, filename)
    if not os.path.exists(path):
        return {"error": "Video not found"}
    if not processor.switch_video(path):
        return {"error": "Failed to open video"}
    return {"status": "ok", "video": filename}


@app.post("/api/events/clear")
def clear_events(db: Session = Depends(get_db)):
    db.query(Event).delete()
    db.commit()
    invalidate_stats_cache()
    return {"status": "cleared"}


if __name__ == "__main__":
    import uvicorn
    # reload=False: tránh crash/treo khi sửa engine.py (YOLO + MJPEG stream)
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
