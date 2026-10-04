from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional, Tuple
import uuid
import datetime
import logging

from backend.app.models.run import Run
from backend.app.models.step import Step, VALID_STEP_TYPES
from backend.app.models.checkpoint import Checkpoint
from backend.app.schemas.run import RunCreate, RunUpdate, TraceIngestRequest
from backend.app.schemas.step import StepCreate
from backend.app.services.hashing import compute_state_hash

logger = logging.getLogger("blackbox.trace_service")

def utc_now():
    return datetime.datetime.now(datetime.timezone.utc)

def create_run(db: Session, run: RunCreate) -> Run:
    db_run = Run(
        run_id=run.run_id or str(uuid.uuid4()),
        agent_id=run.agent_id,
        task_type=run.task_type,
        status=run.status,
        final_output=run.final_output,
        failure_reason=run.failure_reason,
        run_metadata=run.metadata_info,
        created_at=utc_now()
    )
    db.add(db_run)
    db.commit()
    db.refresh(db_run)
    logger.info(f"Created run {db_run.run_id} for agent {db_run.agent_id}")
    return db_run

def update_run(db: Session, run_id: str, run_update: RunUpdate) -> Optional[Run]:
    db_run = db.query(Run).filter(Run.run_id == run_id).first()
    if not db_run:
        return None

    if run_update.status is not None:
        db_run.status = run_update.status
    if run_update.final_output is not None:
        db_run.final_output = run_update.final_output
    if run_update.failure_reason is not None:
        db_run.failure_reason = run_update.failure_reason
    if run_update.completed_at is not None:
        db_run.completed_at = run_update.completed_at
    if run_update.metadata_info is not None:
        db_run.run_metadata = run_update.metadata_info

    db.commit()
    db.refresh(db_run)
    logger.info(f"Updated run {run_id} status={db_run.status}")
    return db_run

def get_run(db: Session, run_id: str) -> Optional[Run]:
    return db.query(Run).filter(Run.run_id == run_id).first()

def get_runs(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    task_type: Optional[str] = None,
    agent_id: Optional[str] = None
) -> List[Run]:
    query = db.query(Run)
    if status:
        query = query.filter(Run.status == status)
    if task_type:
        query = query.filter(Run.task_type == task_type)
    if agent_id:
        query = query.filter(Run.agent_id == agent_id)
    return query.order_by(desc(Run.created_at)).offset(skip).limit(limit).all()

def add_step(db: Session, run_id: str, step: StepCreate) -> Step:
    if step.step_type not in VALID_STEP_TYPES:
        raise ValueError(f"Invalid step_type '{step.step_type}'. Must be one of {VALID_STEP_TYPES}")

    step_id = step.step_id or str(uuid.uuid4())
    state_hash = None
    if step.output_state is not None:
        state_hash = compute_state_hash(step.output_state)

    now = utc_now()
    db_step = Step(
        step_id=step_id,
        run_id=run_id,
        parent_step_id=step.parent_step_id,
        sequence_number=step.sequence_number,
        step_type=step.step_type,
        action=step.action,
        tool_name=step.tool_name,
        input_state=step.input_state,
        output_state=step.output_state,
        retrieved_context=step.retrieved_context,
        decision=step.decision,
        latency_ms=step.latency_ms,
        token_count=step.token_count,
        status=step.status,
        error=step.error,
        state_hash=state_hash,
        timestamp=now
    )
    db.add(db_step)

    # Checkpoint storage
    if state_hash and step.output_state is not None:
        checkpoint = Checkpoint(
            state_hash=state_hash,
            run_id=run_id,
            step_id=step_id,
            state_data=step.output_state,
            created_at=now
        )
        db.add(checkpoint)

    db.commit()
    db.refresh(db_step)
    logger.info(f"Added step {step.sequence_number} ({step.step_type}) to run {run_id}")
    return db_step

def ingest_trace(db: Session, request: TraceIngestRequest) -> Tuple[Run, int, int]:
    existing_run = get_run(db, request.run.run_id) if request.run.run_id else None
    now = utc_now()

    if not existing_run:
        db_run = Run(
            run_id=request.run.run_id or str(uuid.uuid4()),
            agent_id=request.run.agent_id,
            task_type=request.run.task_type,
            status=request.run.status,
            final_output=request.run.final_output,
            failure_reason=request.run.failure_reason,
            run_metadata=request.run.metadata_info,
            created_at=now
        )
        db.add(db_run)
        db.flush()
    else:
        db_run = existing_run
        db_run.status = request.run.status
        db_run.final_output = request.run.final_output
        db_run.failure_reason = request.run.failure_reason
        if request.run.metadata_info:
            db_run.run_metadata = request.run.metadata_info

    steps_count = 0
    checkpoints_count = 0

    for step in sorted(request.steps, key=lambda s: s.sequence_number):
        if step.step_type not in VALID_STEP_TYPES:
            raise ValueError(f"Invalid step_type '{step.step_type}'. Must be one of {VALID_STEP_TYPES}")

        step_id = step.step_id or str(uuid.uuid4())
        state_hash = None
        if step.output_state is not None:
            state_hash = compute_state_hash(step.output_state)

        step_time = now + datetime.timedelta(milliseconds=steps_count * 100)
        db_step = Step(
            step_id=step_id,
            run_id=db_run.run_id,
            parent_step_id=step.parent_step_id,
            sequence_number=step.sequence_number,
            step_type=step.step_type,
            action=step.action,
            tool_name=step.tool_name,
            input_state=step.input_state,
            output_state=step.output_state,
            retrieved_context=step.retrieved_context,
            decision=step.decision,
            latency_ms=step.latency_ms,
            token_count=step.token_count,
            status=step.status,
            error=step.error,
            state_hash=state_hash,
            timestamp=step_time
        )
        db.add(db_step)
        steps_count += 1

        if state_hash and step.output_state is not None:
            checkpoint = Checkpoint(
                state_hash=state_hash,
                run_id=db_run.run_id,
                step_id=step_id,
                state_data=step.output_state,
                created_at=step_time
            )
            db.add(checkpoint)
            checkpoints_count += 1

    db.commit()
    db.refresh(db_run)
    logger.info(f"Ingested trace for run {db_run.run_id}: {steps_count} steps, {checkpoints_count} checkpoints")
    return db_run, steps_count, checkpoints_count

def get_checkpoint_by_hash(db: Session, state_hash: str) -> Optional[Checkpoint]:
    return db.query(Checkpoint).filter(Checkpoint.state_hash == state_hash).first()
