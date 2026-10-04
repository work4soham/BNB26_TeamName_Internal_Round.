from sqlalchemy import Column, String, DateTime, JSON, Text
from sqlalchemy.orm import relationship
import datetime
import uuid

from backend.app.models.base import Base

def utc_now():
    return datetime.datetime.now(datetime.timezone.utc)

class Run(Base):
    __tablename__ = "runs"

    run_id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    agent_id = Column(String, index=True, nullable=False)
    task_type = Column(String, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, nullable=False) # e.g. success, failed, running
    final_output = Column(Text, nullable=True)
    failure_reason = Column(Text, nullable=True)
    run_metadata = Column("metadata", JSON, nullable=True)

    steps = relationship("Step", back_populates="run", cascade="all, delete-orphan", order_by="Step.sequence_number")
    checkpoints = relationship("Checkpoint", back_populates="run", cascade="all, delete-orphan")
