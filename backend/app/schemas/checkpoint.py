from pydantic import BaseModel, ConfigDict
from typing import Dict, Any
from datetime import datetime

class CheckpointResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    checkpoint_id: str
    state_hash: str
    run_id: str
    step_id: str
    state_data: Dict[str, Any]
    created_at: datetime
