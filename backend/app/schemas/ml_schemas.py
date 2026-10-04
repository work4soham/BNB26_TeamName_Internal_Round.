from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, Dict, Any, List

class RankedStep(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    step_id: Optional[str] = None
    sequence_number: int
    step_name: str
    step_type: Optional[str] = None
    suspicion_score: float
    anomaly_score: float
    classifier_probability: float
    reason_codes: List[str] = []
    evidence: Dict[str, Any] = {}

class DiagnosisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    run_id: str
    status: str
    confidence: float
    probable_root_cause_step: Optional[Dict[str, Any]] = None
    visible_failure_step: Optional[Dict[str, Any]] = None
    is_hidden_root_cause: bool = False
    ranked_steps: List[RankedStep] = []

class ReplayRequest(BaseModel):
    checkpoint_step_id: Optional[str] = None
    checkpoint_sequence_number: Optional[int] = None
    alternative_action: Dict[str, Any] = Field(default_factory=dict)

class ReplayResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    replay_run_id: str
    original_run_id: str
    checkpoint_step_id: str
    checkpoint_sequence_number: int
    reused_steps: Dict[str, Any]
    recomputed_steps: Dict[str, Any]
    execution_time_ms: float
    original_outcome: str
    alternative_outcome: str
    status: str
    final_output: Optional[str] = None

class CompareRequest(BaseModel):
    target_run_id: str

class CompareResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    base_run_id: str
    target_run_id: str
    unchanged_steps_count: int
    changed_steps_count: int
    first_meaningful_divergence: Optional[Dict[str, Any]] = None
    unchanged_steps: List[Dict[str, Any]] = []
    changed_steps: List[Dict[str, Any]] = []
    downstream_effects: List[Dict[str, Any]] = []
    final_outcome_difference: Dict[str, Any] = {}

class ModelTrainRequest(BaseModel):
    holdout_categories: Optional[List[str]] = None
    test_ratio: Optional[float] = 0.2
    val_ratio: Optional[float] = 0.1

class ModelTrainResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    training_duration_seconds: float
    total_runs: int
    splits: Dict[str, int]
    holdout_categories: List[str]
    test_metrics: Dict[str, Any]
    unseen_category_metrics: Dict[str, Any]
    trained_at: str

class EvaluationRunRequest(BaseModel):
    data_dir: Optional[str] = "data"

class EvaluationRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total_evaluated: int
    top_1_accuracy: float
    top_3_accuracy: float
    mean_reciprocal_rank: float
    anomaly_precision: float
    anomaly_recall: float
    hidden_root_cause_metrics: Dict[str, Any]
    unseen_category_metrics: Optional[Dict[str, Any]] = None
