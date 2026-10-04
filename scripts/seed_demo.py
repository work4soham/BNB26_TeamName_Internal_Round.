import json
import os
import sys
from datetime import datetime

# Add project root to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.database.session import SessionLocal, engine
from backend.app.models.base import Base
from backend.app.models.run import Run
from backend.app.models.step import Step
from backend.app.models.checkpoint import Checkpoint
from backend.app.services.hashing import compute_state_hash

def parse_iso(ts_str):
    if not ts_str:
        return None
    return datetime.fromisoformat(ts_str)

def seed_database():
    print("Initializing database tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    if not os.path.exists("data/runs.json") or not os.path.exists("data/steps.json"):
        print("Data files not found. Running dataset generator first...")
        from scripts.generate_demo_data import generate_dataset
        generate_dataset()

    db = SessionLocal()

    with open("data/runs.json", "r") as f:
        runs_data = json.load(f)

    print(f"Seeding {len(runs_data)} runs...")
    run_records = [
        Run(
            run_id=r["run_id"],
            agent_id=r["agent_id"],
            task_type=r["task_type"],
            created_at=parse_iso(r["created_at"]),
            completed_at=parse_iso(r["completed_at"]),
            status=r["status"],
            final_output=r["final_output"],
            failure_reason=r["failure_reason"],
            run_metadata=r.get("metadata")
        )
        for r in runs_data
    ]

    # Bulk insert runs
    db.bulk_save_objects(run_records)
    db.commit()

    with open("data/steps.json", "r") as f:
        steps_data = json.load(f)

    print(f"Seeding {len(steps_data)} trace steps and checkpoints...")
    step_records = []
    checkpoint_records = []

    for s in steps_data:
        state_hash = None
        if s.get("output_state") is not None:
            state_hash = compute_state_hash(s["output_state"])
            checkpoint_records.append(
                Checkpoint(
                    state_hash=state_hash,
                    run_id=s["run_id"],
                    step_id=s["step_id"],
                    state_data=s["output_state"],
                    created_at=parse_iso(s["timestamp"])
                )
            )

        step_records.append(
            Step(
                step_id=s["step_id"],
                run_id=s["run_id"],
                parent_step_id=s.get("parent_step_id"),
                sequence_number=s["sequence_number"],
                step_type=s["step_type"],
                action=s.get("action"),
                tool_name=s.get("tool_name"),
                input_state=s.get("input_state"),
                output_state=s.get("output_state"),
                retrieved_context=s.get("retrieved_context"),
                decision=s.get("decision"),
                latency_ms=s.get("latency_ms"),
                token_count=s.get("token_count"),
                status=s["status"],
                error=s.get("error"),
                state_hash=state_hash,
                timestamp=parse_iso(s["timestamp"])
            )
        )

    # Batch insert steps and checkpoints
    batch_size = 2000
    for i in range(0, len(step_records), batch_size):
        db.bulk_save_objects(step_records[i:i + batch_size])
        db.commit()

    for i in range(0, len(checkpoint_records), batch_size):
        db.bulk_save_objects(checkpoint_records[i:i + batch_size])
        db.commit()

    db.close()
    print(f"Database seeded successfully:")
    print(f"  - Runs: {len(run_records)}")
    print(f"  - Steps: {len(step_records)}")
    print(f"  - Checkpoints: {len(checkpoint_records)}")

if __name__ == "__main__":
    seed_database()
