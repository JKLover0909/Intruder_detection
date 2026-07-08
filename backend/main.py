import cv2
import time
from fastapi import FastAPI, Depends
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from database import get_db, Event
from engine import processor, list_videos, VIDEOS_DIR
import os

BASE_DIR = os.path.dirname(os.path.dirname(__file__))

app = FastAPI(title="Factory Perimeter Security AI")

snapshots_dir = os.path.join(BASE_DIR, "data", "snapshots")
app.mount("/snapshots", StaticFiles(directory=snapshots_dir), name="snapshots")


@app.on_event("startup")
def startup_event():
    videos = list_videos()
    if videos:
        # Prefer videos that better demonstrate perimeter intrusion / people movement
        preferred = ["pedestrians.mp4", "worker.mp4", "walking.mp4", "demo.mp4"]
        chosen = next((v for v in preferred if v in videos), videos[0])
        processor.video_source = os.path.join(VIDEOS_DIR, chosen)
    processor.start()


@app.on_event("shutdown")
def shutdown_event():
    processor.stop()


@app.get("/")
def serve_frontend():
    return FileResponse(os.path.join(os.path.dirname(__file__), "static", "index.html"))


def generate_frames():
    while True:
        frame = processor.process_frame()
        if frame is None:
            time.sleep(0.03)
            continue
        ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
        if not ret:
            continue
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')


@app.get("/video_feed")
def video_feed():
    return StreamingResponse(generate_frames(),
                             media_type="multipart/x-mixed-replace; boundary=frame")


@app.get("/api/events")
def get_events(limit: int = 50, db: Session = Depends(get_db)):
    events = db.query(Event).order_by(Event.timestamp.desc()).limit(limit).all()
    return events


@app.get("/api/stats")
def get_stats(db: Session = Depends(get_db)):
    total = db.query(Event).count()
    intrusions = db.query(Event).filter(Event.event_type == "Intrusion").count()
    climbing = db.query(Event).filter(Event.event_type == "Climbing").count()
    loitering = db.query(Event).filter(Event.event_type == "Loitering").count()
    crossing = db.query(Event).filter(Event.event_type == "Line Crossing").count()
    return {
        "active_cameras": 1,
        "total_alerts_today": total,
        "intrusions": intrusions,
        "climbing_suspects": climbing,
        "loitering_events": loitering,
        "line_crossings": crossing,
        "system_status": "Online",
        "roi_active": True,
    }


@app.get("/api/videos")
def get_videos():
    return list_videos()


@app.post("/api/videos/switch")
def switch_video(filename: str):
    path = os.path.join(VIDEOS_DIR, filename)
    if not os.path.exists(path):
        return {"error": "Video not found"}
    processor.switch_video(path)
    return {"status": "ok", "video": filename}


@app.post("/api/events/clear")
def clear_events(db: Session = Depends(get_db)):
    db.query(Event).delete()
    db.commit()
    return {"status": "cleared"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
