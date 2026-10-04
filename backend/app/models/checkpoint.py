import uuid
import datetime
from sqlalchemy import Column, String, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.models.base import Base

def utc_now():
    return datetime.datetime.now(datetime.timezone.utc)

class Checkpoint(Base):
    __tablename__ = "checkpoints"

    checkpoint_id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    state_hash = Column(String, index=True, nullable=False)
    run_id = Column(String, ForeignKey("runs.run_id"), nullable=False, index=True)
    step_id = Column(String, ForeignKey("steps.step_id"), nullable=False, index=True)
    state_data = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    run = relationship("Run", back_populates="checkpoints")
    step = relationship("Step", back_populates="checkpoints")
