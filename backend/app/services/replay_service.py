import uuid
import copy
import time
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session

from backend.app.models.run import Run
from backend.app.models.step import Step
from backend.app.models.checkpoint import Checkpoint
from backend.app.services.hashing import compute_state_hash
from backend.app.services import trace_service

DISALLOWED_KEYS = {"__builtins__", "eval", "exec", "system", "os", "subprocess", "import"}

def validate_structured_action(action_data: Dict[str, Any]):
    """
    Guarantees safety: only structured key-value data allowed, no arbitrary code.
    """
    if not isinstance(action_data, dict):
        raise ValueError("alternative_action must be a structured JSON object.")

    for k in action_data.keys():
        if not isinstance(k, str) or any(bad in k.lower() for bad in DISALLOWED_KEYS):
            raise ValueError(f"Invalid or unsafe parameter '{k}' in alternative_action.")

def utc_now():
    return datetime.now(timezone.utc)

def execute_replay(
    db: Session,
    original_run_id: str,
    checkpoint_step_id: Optional[str] = None,
    checkpoint_sequence_number: Optional[int] = None,
    alternative_action: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Resumes execution from an intermediate checkpoint, reusing original prefix steps
    and recomputing downstream suffix steps with the structured alternative action.
    """
    start_time = time.time()
    alternative_action = alternative_action or {}
    validate_structured_action(alternative_action)

    original_run = db.query(Run).filter(Run.run_id == original_run_id).first()
    if not original_run:
        raise ValueError(f"Original run '{original_run_id}' not found.")

    original_steps = sorted(original_run.steps, key=lambda s: s.sequence_number)
    if not original_steps:
        raise ValueError(f"Original run '{original_run_id}' has no trace steps.")

    # Find the target checkpoint step
    chk_step = None
    chk_idx = -1
    for i, s in enumerate(original_steps):
        if checkpoint_step_id and s.step_id == checkpoint_step_id:
            chk_step = s
            chk_idx = i
            break
        elif checkpoint_sequence_number and s.sequence_number == checkpoint_sequence_number:
            chk_step = s
            chk_idx = i
            break

    if chk_step is None:
        raise ValueError(f"Checkpoint step not found (step_id={checkpoint_step_id}, seq={checkpoint_sequence_number}).")

    replay_run_id = f"replay-{original_run_id[:8]}-{uuid.uuid4().hex[:6]}"
    now = utc_now()

    # Determine prefix and current state
    # Prefix is steps 0 up to chk_idx - 1 (reused verbatim)
    # The checkpoint step itself (chk_idx) is where alternative_action takes effect
    reused_steps_records = []
    reused_step_seqs = []

    # If alternative action overrides starting state at checkpoint:
    base_input_state = copy.deepcopy(chk_step.input_state or {})
    current_state = copy.deepcopy(base_input_state)

    # 1. Reuse prefix steps exactly
    parent_id = None
    for s in original_steps[:chk_idx]:
        step_copy_id = f"step-{uuid.uuid4()}"
        reused_step = Step(
            step_id=step_copy_id,
            run_id=replay_run_id,
            parent_step_id=parent_id,
            sequence_number=s.sequence_number,
            step_type=s.step_type,
            action=s.action,
            tool_name=s.tool_name,
            input_state=copy.deepcopy(s.input_state),
            output_state=copy.deepcopy(s.output_state),
            retrieved_context=copy.deepcopy(s.retrieved_context),
            decision=s.decision,
            latency_ms=s.latency_ms,
            token_count=s.token_count,
            status=s.status,
            error=s.error,
            state_hash=s.state_hash,
            timestamp=now
        )
        reused_steps_records.append(reused_step)
        reused_step_seqs.append(s.sequence_number)
        parent_id = step_copy_id

    # 2. Simulate / recompute downstream steps starting from checkpoint step
    WORKFLOW_ACTIONS = [
        "parse_request", "identify_origin", "identify_destination",
        "search_flights", "retrieve_fares", "filter_flights", "select_flight",
        "validate_fare", "validate_passenger", "reserve_seat", "payment",
        "booking_confirmation"
    ]

    recomputed_step_records = []
    recomputed_step_seqs = []
    recomputed_checkpoints = []

    suffix_actions = WORKFLOW_ACTIONS[chk_idx:]
    run_outcome = "success"
    failure_reason = None

    for idx_offset, act_name in enumerate(suffix_actions):
        current_seq = chk_idx + 1 + idx_offset
        step_id = f"step-{uuid.uuid4()}"
        step_status = "success"
        step_error = None

        step_in_state = copy.deepcopy(current_state)

        # Apply alternative action at the checkpoint step
        if idx_offset == 0:
            if "currency" in alternative_action:
                current_state["currency"] = alternative_action["currency"]
            if "override_state" in alternative_action and isinstance(alternative_action["override_state"], dict):
                current_state.update(alternative_action["override_state"])
            for k, v in alternative_action.items():
                if k not in ("currency", "override_state", "step_name"):
                    current_state[k] = v

        # Downstream execution simulation logic
        if act_name == "retrieve_fares":
            curr = alternative_action.get("currency") or current_state.get("currency", "USD")
            current_state["currency"] = curr
            current_state["quoted_fare"] = 420
            current_state["fare_rules"] = "NON-REFUNDABLE"

        elif act_name == "filter_flights":
            current_state["filtered_candidates"] = current_state.get("available_flights", [
                {"flight_no": "SKY-101", "airline": "SkyWay", "price": 420}
            ])

        elif act_name == "select_flight":
            cands = current_state.get("filtered_candidates") or [{"flight_no": "SKY-101"}]
            current_state["selected_flight"] = cands[0]

        elif act_name == "validate_fare":
            curr = current_state.get("currency", "USD")
            if curr != "USD":
                step_status = "failed"
                step_error = f"Fare currency mismatch: expected USD, got {curr}"
            else:
                current_state["fare_validated"] = True

        elif act_name == "validate_passenger":
            pname = current_state.get("passenger_name", "Alice Smith")
            if "INVALID" in pname:
                step_status = "failed"
                step_error = f"Passenger validation failed for {pname}"
            else:
                current_state["passenger_validated"] = True

        elif act_name == "reserve_seat":
            current_state["seat_assigned"] = "14B"
            current_state["pnr"] = f"PNR-RPL-{uuid.uuid4().hex[:6].upper()}"

        elif act_name == "payment":
            curr = current_state.get("currency", "USD")
            if curr != "USD":
                step_status = "failed"
                step_error = f"Payment gateway rejected: currency {curr} does not match USD billing account."
            else:
                current_state["payment_ref"] = f"PAY-RPL-{uuid.uuid4().hex[:8].upper()}"
                current_state["payment_status"] = "settled"

        elif act_name == "booking_confirmation":
            current_state["confirmed"] = True

        state_hash = compute_state_hash(current_state) if step_status == "success" else None

        step_record = Step(
            step_id=step_id,
            run_id=replay_run_id,
            parent_step_id=parent_id,
            sequence_number=current_seq,
            step_type="tool_call" if "call" in act_name or act_name in ("search_flights", "retrieve_fares") else "transformation",
            action=f"execute_{act_name}",
            tool_name=act_name,
            input_state=step_in_state,
            output_state=copy.deepcopy(current_state) if step_status == "success" else None,
            retrieved_context={"replay_mode": True},
            decision=f"Replay execution of {act_name} with counterfactual inputs.",
            latency_ms=45.0,
            token_count=180,
            status=step_status,
            error=step_error,
            state_hash=state_hash,
            timestamp=now
        )
        recomputed_step_records.append(step_record)
        recomputed_step_seqs.append(current_seq)
        parent_id = step_id

        if state_hash:
            recomputed_checkpoints.append(
                Checkpoint(
                    state_hash=state_hash,
                    run_id=replay_run_id,
                    step_id=step_id,
                    state_data=copy.deepcopy(current_state),
                    created_at=now
                )
            )

        if step_status == "failed":
            run_outcome = "failed"
            failure_reason = step_error
            break

    # 3. Create the new Replay Run record
    replay_run = Run(
        run_id=replay_run_id,
        agent_id=original_run.agent_id,
        task_type=original_run.task_type,
        status=run_outcome,
        final_output=f"Replay completed successfully with PNR {current_state.get('pnr', '')}" if run_outcome == "success" else None,
        failure_reason=failure_reason,
        run_metadata={
            **(original_run.run_metadata or {}),
            "is_replay": True,
            "original_run_id": original_run_id,
            "replayed_from_sequence": chk_step.sequence_number,
            "alternative_action": alternative_action
        },
        created_at=now,
        completed_at=now
    )

    db.add(replay_run)
    db.flush()

    for s in reused_steps_records:
        db.add(s)
    for s in recomputed_step_records:
        db.add(s)
    for c in recomputed_checkpoints:
        db.add(c)

    db.commit()
    db.refresh(replay_run)

    execution_time_ms = round((time.time() - start_time) * 1000, 2)

    return {
        "replay_run_id": replay_run_id,
        "original_run_id": original_run_id,
        "checkpoint_step_id": chk_step.step_id,
        "checkpoint_sequence_number": chk_step.sequence_number,
        "reused_steps": {
            "count": len(reused_step_seqs),
            "sequence_numbers": reused_step_seqs
        },
        "recomputed_steps": {
            "count": len(recomputed_step_seqs),
            "sequence_numbers": recomputed_step_seqs
        },
        "execution_time_ms": execution_time_ms,
        "original_outcome": original_run.status,
        "alternative_outcome": run_outcome,
        "status": run_outcome,
        "final_output": replay_run.final_output
    }

def compare_traces(db: Session, base_run_id: str, target_run_id: str) -> Dict[str, Any]:
    """
    Detects unchanged steps, changed steps, first meaningful divergence,
    downstream effects, and final outcome differences between two execution traces.
    """
    base_run = db.query(Run).filter(Run.run_id == base_run_id).first()
    target_run = db.query(Run).filter(Run.run_id == target_run_id).first()

    if not base_run or not target_run:
        raise ValueError("One or both runs not found for comparison.")

    base_steps = sorted(base_run.steps, key=lambda s: s.sequence_number)
    target_steps = sorted(target_run.steps, key=lambda s: s.sequence_number)

    unchanged_steps = []
    changed_steps = []
    first_divergence = None
    downstream_effects = []

    max_seq = max(len(base_steps), len(target_steps))
    base_step_map = {s.sequence_number: s for s in base_steps}
    target_step_map = {s.sequence_number: s for s in target_steps}

    for seq in range(1, max_seq + 1):
        b_step = base_step_map.get(seq)
        t_step = target_step_map.get(seq)

        if b_step and t_step:
            b_hash = b_step.state_hash
            t_hash = t_step.state_hash

            if b_hash == t_hash and b_step.status == t_step.status and b_hash is not None:
                unchanged_steps.append({
                    "sequence_number": seq,
                    "action": b_step.action or b_step.tool_name,
                    "state_hash": b_hash
                })
            else:
                diff_entry = {
                    "sequence_number": seq,
                    "action": t_step.action or t_step.tool_name,
                    "base_status": b_step.status,
                    "target_status": t_step.status,
                    "base_hash": b_hash,
                    "target_hash": t_hash,
                    "base_output": b_step.output_state,
                    "target_output": t_step.output_state
                }
                changed_steps.append(diff_entry)
                if first_divergence is None:
                    first_divergence = {
                        "sequence_number": seq,
                        "action": t_step.action or t_step.tool_name,
                        "description": f"First state divergence at sequence {seq} ({t_step.action})"
                    }
                else:
                    downstream_effects.append(diff_entry)
        else:
            changed_steps.append({
                "sequence_number": seq,
                "base_present": b_step is not None,
                "target_present": t_step is not None
            })

    return {
        "base_run_id": base_run_id,
        "target_run_id": target_run_id,
        "unchanged_steps_count": len(unchanged_steps),
        "changed_steps_count": len(changed_steps),
        "first_meaningful_divergence": first_divergence,
        "unchanged_steps": unchanged_steps,
        "changed_steps": changed_steps,
        "downstream_effects": downstream_effects,
        "final_outcome_difference": {
            "base_outcome": base_run.status,
            "target_outcome": target_run.status,
            "improved": (base_run.status == "failed" and target_run.status == "success")
        }
    }
