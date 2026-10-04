from pydantic import BaseModel, ConfigDict, Field, AliasChoices
from typing import List, Optional, Dict, Any
from datetime import datetime
from .step import StepResponse, StepCreate
from .checkpoint import CheckpointResponse

class RunBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    agent_id: str
    task_type: str
    status: str
    final_output: Optional[str] = None
    failure_reason: Optional[str] = None
    metadata_info: Optional[Dict[str, Any]] = Field(
        default=None,
        validation_alias=AliasChoices("run_metadata", "metadata"),
        serialization_alias="metadata"
    )

class RunCreate(RunBase):
    run_id: Optional[str] = None

class RunUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    status: Optional[str] = None
    final_output: Optional[str] = None
    failure_reason: Optional[str] = None
    completed_at: Optional[datetime] = None
    metadata_info: Optional[Dict[str, Any]] = Field(
        default=None,
        validation_alias=AliasChoices("run_metadata", "metadata"),
        serialization_alias="metadata"
    )

class RunResponse(RunBase):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    run_id: str
    created_at: datetime
    completed_at: Optional[datetime] = None

class RunDetailResponse(RunResponse):
    steps: List[StepResponse] = []
    checkpoints: List[CheckpointResponse] = []

class TraceIngestRequest(BaseModel):
    run: RunCreate
    steps: List[StepCreate] = []

class TraceIngestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    run: RunResponse
    ingested_steps: int
    checkpoints_created: int
