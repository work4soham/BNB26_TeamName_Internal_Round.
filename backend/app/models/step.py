from sqlalchemy import Column, String, Integer, DateTime, JSON, Text, ForeignKey, Float
from sqlalchemy.orm import relationship
import datetime
import uuid

from backend.app.models.base import Base

def utc_now():
    return datetime.datetime.now(datetime.timezone.utc)

VALID_STEP_TYPES = {
    "model_call",
    "tool_call",
    "retrieval",
    "decision",
    "validation",
    "transformation",
    "external_action"
}

class Step(Base):
    __tablename__ = "steps"

    step_id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    run_id = Column(String, ForeignKey("runs.run_id"), nullable=False, index=True)
    parent_step_id = Column(String, ForeignKey("steps.step_id"), nullable=True)
    
    sequence_number = Column(Integer, nullable=False)
    step_type = Column(String, nullable=False) # model_call, tool_call, retrieval, decision, validation, transformation, external_action
    action = Column(String, nullable=True)
    tool_name = Column(String, nullable=True)
    
    input_state = Column(JSON, nullable=True)
    output_state = Column(JSON, nullable=True)
    retrieved_context = Column(JSON, nullable=True)
    decision = Column(Text, nullable=True)
    
    latency_ms = Column(Float, nullable=True)
    token_count = Column(Integer, nullable=True)
    status = Column(String, nullable=False) # success, failed
    error = Column(Text, nullable=True)
    state_hash = Column(String, index=True, nullable=True)
    
    timestamp = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    run = relationship("Run", back_populates="steps")
    checkpoints = relationship("Checkpoint", back_populates="step", cascade="all, delete-orphan")
