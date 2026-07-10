from sqlalchemy import create_engine, Column, Integer, String, DateTime, text
from sqlalchemy.orm import declarative_base, sessionmaker
import datetime
import os

DB_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_DIR}/events.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    event_type = Column(String, index=True)  # Intrusion | Line Crossing | Climbing | Loitering
    severity = Column(String)                # Critical | High | Medium | Low
    message = Column(String)
    snapshot_path = Column(String)
    camera = Column(String, nullable=True)   # CAM-01 · ... — để UI highlight đúng camera

Base.metadata.create_all(bind=engine)


def _ensure_camera_column():
    """SQLite: thêm cột camera nếu DB cũ chưa có."""
    with engine.connect() as conn:
        cols = {row[1] for row in conn.execute(text("PRAGMA table_info(events)")).fetchall()}
        if "camera" not in cols:
            conn.execute(text("ALTER TABLE events ADD COLUMN camera VARCHAR"))
            conn.commit()


_ensure_camera_column()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
