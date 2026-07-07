from sqlalchemy import create_engine, Column, Integer, String, DateTime
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
    event_type = Column(String, index=True) # "Intrusion", "Line Crossing", "Climbing"
    severity = Column(String)               # "High", "Medium", "Low"
    message = Column(String)
    snapshot_path = Column(String)

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
