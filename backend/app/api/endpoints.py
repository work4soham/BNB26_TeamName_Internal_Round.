from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional, Dict, Any
import logging

from backend.app.database.session import get_db
from backend.app.schemas.run import (
    RunCreate,
    RunUpdate,
    RunResponse,
    RunDetailResponse,
    TraceIngestRequest,
    TraceIngestResponse
)
from backend.app.schemas.step import StepCreate, StepResponse
from backend.app.schemas.checkpoint import CheckpointResponse
from backend.app.schemas.ml_schemas import (
    DiagnosisResponse,
    ReplayRequest,
    ReplayResponse,
    CompareRequest,
    CompareResponse,
    ModelTrainRequest,
    ModelTrainResponse,
    EvaluationRunRequest,
    EvaluationRunResponse
)
from backend.app.services import trace_service, replay_service, demo_service
from backend.app.models.run import Run
from backend.app.models.step import Step
from backend.app.models.checkpoint import Checkpoint
from ml.model_manager import ModelManager
from ml.dataset import FlightRecorderDataset
from ml.evaluator import BenchmarkEvaluator

logger = logging.getLogger("blackbox.api")

router = APIRouter()

# In-memory cache for recent diagnoses
_diagnosis_cache: Dict[str, Dict[str, Any]] = {}

@router.get("/health", tags=["System"])
def health_check(db: Session = Depends(get_db)):
    """Health check endpoint validating service and database connectivity."""
    try:
        db.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception as e:
        logger.error(f"Health check DB probe failed: {e}")
        db_status = "unhealthy"

    return {
        "status": "ok" if db_status == "healthy" else "degraded",
        "database": db_status,
        "service": "Black Box AI Flight Recorder"
    }

@router.post("/runs", response_model=RunResponse, status_code=status.HTTP_201_CREATED, tags=["Runs"])
def create_run(run: RunCreate, db: Session = Depends(get_db)):
    """Create a new agent execution run entry."""
    try:
        return trace_service.create_run(db=db, run=run)
    except Exception as e:
        logger.error(f"Error creating run: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/runs", response_model=List[RunResponse], tags=["Runs"])
def list_runs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[str] = Query(None),
    task_type: Optional[str] = Query(None),
    agent_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """List execution runs with optional filtering and pagination."""
    return trace_service.get_runs(
        db=db,
        skip=skip,
        limit=limit,
        status=status,
        task_type=task_type,
        agent_id=agent_id
    )

@router.get("/runs/{run_id}", response_model=RunDetailResponse, tags=["Runs"])
def get_run(run_id: str, db: Session = Depends(get_db)):
    """Retrieve full details of an execution run, including its trace steps and checkpoints."""
    if run_id == demo_service.DEMO_RUN_ID:
        demo_service.ensure_curated_demo_run(db)

    db_run = trace_service.get_run(db=db, run_id=run_id)
    if not db_run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Run '{run_id}' not found"
        )
    return db_run

@router.patch("/runs/{run_id}", response_model=RunResponse, tags=["Runs"])
def update_run(run_id: str, run_update: RunUpdate, db: Session = Depends(get_db)):
    """Update execution run state, completion status, or failure reason."""
    db_run = trace_service.update_run(db=db, run_id=run_id, run_update=run_update)
    if not db_run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Run '{run_id}' not found"
        )
    return db_run

@router.post("/runs/{run_id}/steps", response_model=StepResponse, status_code=status.HTTP_201_CREATED, tags=["Traces"])
def add_step(run_id: str, step: StepCreate, db: Session = Depends(get_db)):
    """Ingest a single trace step for an ongoing execution run with automatic state hashing and checkpointing."""
    db_run = trace_service.get_run(db=db, run_id=run_id)
    if not db_run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Run '{run_id}' not found"
        )
    try:
        return trace_service.add_step(db=db, run_id=run_id, step=step)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(ve))
    except Exception as e:
        logger.error(f"Error adding step to run {run_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/traces/ingest", response_model=TraceIngestResponse, status_code=status.HTTP_201_CREATED, tags=["Traces"])
def ingest_complete_trace(request: TraceIngestRequest, db: Session = Depends(get_db)):
    """Batch ingest a complete execution trace (run metadata and full sequence of steps)."""
    try:
        db_run, steps_count, checkpoints_count = trace_service.ingest_trace(db=db, request=request)
        return TraceIngestResponse(
            run=db_run,
            ingested_steps=steps_count,
            checkpoints_created=checkpoints_count
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(ve))
    except Exception as e:
        logger.error(f"Error during trace ingestion: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/checkpoints/{state_hash}", response_model=CheckpointResponse, tags=["Checkpoints"])
def get_checkpoint(state_hash: str, db: Session = Depends(get_db)):
    """Retrieve checkpoint state and provenance by its deterministic state hash."""
    checkpoint = trace_service.get_checkpoint_by_hash(db=db, state_hash=state_hash)
    if not checkpoint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Checkpoint with state hash '{state_hash}' not found"
        )
    return checkpoint

@router.get("/runs/{run_id}/checkpoints", response_model=List[CheckpointResponse], tags=["Checkpoints"])
def get_run_checkpoints(run_id: str, db: Session = Depends(get_db)):
    """Retrieve all state checkpoints recorded for a specific execution run."""
    if run_id == demo_service.DEMO_RUN_ID:
        demo_service.ensure_curated_demo_run(db)

    db_run = trace_service.get_run(db=db, run_id=run_id)
    if not db_run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Run '{run_id}' not found")
    return db.query(Checkpoint).filter(Checkpoint.run_id == run_id).order_by(Checkpoint.created_at).all()

# ==================== RESEARCH ML & DIAGNOSIS ENDPOINTS ====================

def _build_trace_dict(db_run: Run) -> Dict[str, Any]:
    steps = sorted(db_run.steps, key=lambda s: s.sequence_number)
    return {
        "run": {
            "run_id": db_run.run_id,
            "agent_id": db_run.agent_id,
            "task_type": db_run.task_type,
            "status": db_run.status,
            "final_output": db_run.final_output,
            "failure_reason": db_run.failure_reason,
            "metadata": db_run.run_metadata
        },
        "steps": [
            {
                "step_id": s.step_id,
                "sequence_number": s.sequence_number,
                "step_type": s.step_type,
                "action": s.action,
                "tool_name": s.tool_name,
                "input_state": s.input_state,
                "output_state": s.output_state,
                "retrieved_context": s.retrieved_context,
                "decision": s.decision,
                "latency_ms": s.latency_ms,
                "token_count": s.token_count,
                "status": s.status,
                "error": s.error,
                "state_hash": s.state_hash
            }
            for s in steps
        ]
    }

@router.post("/runs/{run_id}/diagnose", response_model=DiagnosisResponse, tags=["Diagnostics & ML"])
def diagnose_run(run_id: str, db: Session = Depends(get_db)):
    """
    Executes learning-based failure localization on an execution trace.
    Ranks steps by suspiciousness score and distinguishes between visible failure and root-cause step.
    """
    if run_id == demo_service.DEMO_RUN_ID:
        demo_service.ensure_curated_demo_run(db)

    db_run = trace_service.get_run(db=db, run_id=run_id)
    if not db_run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Run '{run_id}' not found")

    trace_dict = _build_trace_dict(db_run)
    engine = ModelManager.get_instance().get_diagnosis_engine()
    diagnosis = engine.diagnose_trace(trace_dict)
    _diagnosis_cache[run_id] = diagnosis
    return diagnosis

@router.get("/runs/{run_id}/diagnosis", response_model=DiagnosisResponse, tags=["Diagnostics & ML"])
def get_run_diagnosis(run_id: str, db: Session = Depends(get_db)):
    """Retrieve cached diagnosis or execute fresh diagnosis for the specified run."""
    if run_id in _diagnosis_cache:
        return _diagnosis_cache[run_id]
    return diagnose_run(run_id=run_id, db=db)

@router.post("/runs/{run_id}/replay", response_model=ReplayResponse, tags=["Counterfactual Replay"])
def replay_run(run_id: str, request: ReplayRequest, db: Session = Depends(get_db)):
    """
    Resumes execution from a selected checkpoint step with structured alternative action data,
    reusing prefix steps and recomputing downstream suffix steps without shell/arbitrary code execution.
    """
    if run_id == demo_service.DEMO_RUN_ID:
        demo_service.ensure_curated_demo_run(db)

    try:
        return replay_service.execute_replay(
            db=db,
            original_run_id=run_id,
            checkpoint_step_id=request.checkpoint_step_id,
            checkpoint_sequence_number=request.checkpoint_sequence_number,
            alternative_action=request.alternative_action
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        logger.error(f"Error during replay of run {run_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/runs/{run_id}/compare", response_model=CompareResponse, tags=["Counterfactual Replay"])
def compare_runs(run_id: str, request: CompareRequest, db: Session = Depends(get_db)):
    """
    Compares two execution traces: detects unchanged steps, changed steps, first divergence,
    downstream effects, and outcome differences.
    """
    try:
        return replay_service.compare_traces(db=db, base_run_id=run_id, target_run_id=request.target_run_id)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        logger.error(f"Error comparing runs {run_id} vs {request.target_run_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/model/train", response_model=ModelTrainResponse, tags=["Diagnostics & ML"])
def train_model_pipeline(request: ModelTrainRequest = ModelTrainRequest()):
    """
    Triggers zero-leakage ML pipeline training (IsolationForest + RandomForest)
    with optional holdout categories for unseen-failure evaluation.
    """
    try:
        manager = ModelManager.get_instance()
        metadata = manager.train_pipeline(
            holdout_categories=request.holdout_categories,
            test_ratio=request.test_ratio or 0.2,
            val_ratio=request.val_ratio or 0.1
        )
        return metadata
    except Exception as e:
        logger.error(f"Error training model pipeline: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/evaluation/run", response_model=EvaluationRunResponse, tags=["Diagnostics & ML"])
def run_evaluation(request: EvaluationRunRequest = EvaluationRunRequest()):
    """
    Evaluates current trained models against test split and unseen holdout categories,
    calculating Top-1, Top-3, MRR, Anomaly Precision/Recall, and hidden root-cause metrics.
    """
    try:
        manager = ModelManager.get_instance()
        engine = manager.get_diagnosis_engine()
        dataset = FlightRecorderDataset(request.data_dir or "data")
        traces = dataset.load_inference_traces()
        ground_truth = dataset.load_ground_truth()

        evaluator = BenchmarkEvaluator(ground_truth)
        failed_traces = [t for t in traces if t["run"]["status"] == "failed"]
        diagnoses = [engine.diagnose_trace(t) for t in failed_traces]
        metrics = evaluator.evaluate_diagnoses(diagnoses)

        # Unseen category evaluation if metadata is available
        unseen_metrics = manager.last_training_metadata.get("unseen_category_metrics")

        return {
            **metrics,
            "unseen_category_metrics": unseen_metrics
        }
    except Exception as e:
        logger.error(f"Error during benchmark evaluation: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/training/status", tags=["Diagnostics & ML"])
def get_training_status(db: Session = Depends(get_db)):
    """Diagnostics and training pipeline status endpoint."""
    total_runs = db.query(Run).count()
    failed_runs = db.query(Run).filter(Run.status == "failed").count()
    successful_runs = db.query(Run).filter(Run.status == "success").count()
    total_checkpoints = db.query(Checkpoint).count()

    meta = ModelManager.get_instance().last_training_metadata

    return {
        "status": "ready",
        "model_version": "v1.0.0-rc",
        "dataset_statistics": {
            "total_runs": total_runs,
            "successful_runs": successful_runs,
            "failed_runs": failed_runs,
            "total_checkpoints": total_checkpoints
        },
        "last_trained_at": meta.get("trained_at"),
        "last_training_metrics": meta.get("test_metrics"),
        "message": "Offline root-cause analysis benchmark ready for evaluation."
    }
