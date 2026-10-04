from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, Dict, Any, Literal
from datetime import datetime

STEP_TYPE_LITERAL = Literal[
    "model_call",
    "tool_call",
    "retrieval",
    "decision",
    "validation",
    "transformation",
    "external_action"
]

class StepBase(BaseModel):
    step_type: STEP_TYPE_LITERAL
    action: Optional[str] = None
    tool_name: Optional[str] = None
    input_state: Optional[Dict[str, Any]] = None
    output_state: Optional[Dict[str, Any]] = None
    retrieved_context: Optional[Dict[str, Any]] = None
    decision: Optional[str] = None
    latency_ms: Optional[float] = None
    token_count: Optional[int] = None
    status: str = Field(..., description="Step execution status (e.g. success, failed)")
    error: Optional[str] = None
    parent_step_id: Optional[str] = None

class StepCreate(StepBase):
    step_id: Optional[str] = None
    sequence_number: int

class StepResponse(StepBase):
    model_config = ConfigDict(from_attributes=True)

    step_id: str
    run_id: str
    sequence_number: int
    state_hash: Optional[str] = None
    timestamp: datetime
