from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.main import app
from backend.app.database.session import get_db
from backend.app.models.base import Base
from backend.app.services.demo_service import DEMO_RUN_ID

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
Base.metadata.create_all(bind=engine)
client = TestClient(app)

def test_curated_demo_diagnosis_and_replay_flow():
    # 1. Fetch demo run
    run_res = client.get(f"/runs/{DEMO_RUN_ID}")
    assert run_res.status_code == 200
    run_data = run_res.json()
    assert run_data["status"] == "failed"

    # 2. Get checkpoints
    chk_res = client.get(f"/runs/{DEMO_RUN_ID}/checkpoints")
    assert chk_res.status_code == 200
    checkpoints = chk_res.json()
    assert len(checkpoints) >= 10

    # 3. Diagnose the run using ML pipeline
    diag_res = client.post(f"/runs/{DEMO_RUN_ID}/diagnose")
    assert diag_res.status_code == 200
    diag_data = diag_res.json()

    assert diag_data["is_hidden_root_cause"] is True
    assert diag_data["visible_failure_step"]["sequence_number"] == 11
    assert diag_data["visible_failure_step"]["step_name"] == "execute_payment"

    # Probable root cause should be an earlier step (e.g. sequence 5: retrieve_fares)
    rc_step = diag_data["probable_root_cause_step"]
    assert rc_step is not None
    assert rc_step["sequence_number"] < 11
    assert "CURRENCY_INCONSISTENCY" in rc_step["reason_codes"] or "ISOLATION_FOREST_OUTLIER" in rc_step["reason_codes"] or "DOWNSTREAM_FAILURE_PRECURSOR" in rc_step["reason_codes"]

    # 4. Perform Counterfactual Replay from checkpoint step 5 (changing currency to USD)
    replay_payload = {
        "checkpoint_sequence_number": 5,
        "alternative_action": {
            "currency": "USD"
        }
    }
    replay_res = client.post(f"/runs/{DEMO_RUN_ID}/replay", json=replay_payload)
    assert replay_res.status_code == 200
    replay_data = replay_res.json()

    assert replay_data["status"] == "success"
    assert replay_data["original_outcome"] == "failed"
    assert replay_data["alternative_outcome"] == "success"
    assert replay_data["reused_steps"]["count"] == 4
    assert replay_data["reused_steps"]["sequence_numbers"] == [1, 2, 3, 4]

    replay_run_id = replay_data["replay_run_id"]

    # 5. Compare original and replay traces
    compare_res = client.post(f"/runs/{DEMO_RUN_ID}/compare", json={"target_run_id": replay_run_id})
    assert compare_res.status_code == 200
    comp_data = compare_res.json()

    assert comp_data["unchanged_steps_count"] == 4
    assert comp_data["first_meaningful_divergence"]["sequence_number"] == 5
    assert comp_data["final_outcome_difference"]["improved"] is True
