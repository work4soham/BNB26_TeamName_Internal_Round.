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

def test_endpoints_train_and_evaluation():
    # 1. Trigger model training
    train_res = client.post("/model/train", json={"holdout_categories": ["wrong_currency"]})
    assert train_res.status_code == 200
    train_data = train_res.json()
    assert "test_metrics" in train_data
    assert "unseen_category_metrics" in train_data
    assert train_data["total_runs"] >= 1300

    # 2. Run evaluation
    eval_res = client.post("/evaluation/run", json={"data_dir": "data"})
    assert eval_res.status_code == 200
    eval_data = eval_res.json()
    assert eval_data["total_evaluated"] >= 300
    assert eval_data["top_1_accuracy"] > 0.0
    assert eval_data["top_3_accuracy"] > 0.0
    assert eval_data["mean_reciprocal_rank"] > 0.0

def test_endpoints_diagnose_and_checkpoints():
    # Diagnose demo run
    diag_res = client.post(f"/runs/{DEMO_RUN_ID}/diagnose")
    assert diag_res.status_code == 200
    diag_data = diag_res.json()
    assert diag_data["run_id"] == DEMO_RUN_ID
    assert diag_data["is_hidden_root_cause"] is True
    assert len(diag_data["ranked_steps"]) == 11

    # GET cached diagnosis
    get_diag = client.get(f"/runs/{DEMO_RUN_ID}/diagnosis")
    assert get_diag.status_code == 200
    assert get_diag.json()["run_id"] == DEMO_RUN_ID

    # GET checkpoints
    chk_res = client.get(f"/runs/{DEMO_RUN_ID}/checkpoints")
    assert chk_res.status_code == 200
    assert len(chk_res.json()) >= 10

def test_endpoints_replay_and_compare():
    # Replay demo run from step 5
    replay_res = client.post(f"/runs/{DEMO_RUN_ID}/replay", json={
        "checkpoint_sequence_number": 5,
        "alternative_action": {"currency": "USD"}
    })
    assert replay_res.status_code == 200
    replay_data = replay_res.json()
    assert replay_data["status"] == "success"
    assert replay_data["reused_steps"]["count"] == 4

    replay_run_id = replay_data["replay_run_id"]

    # Compare traces
    comp_res = client.post(f"/runs/{DEMO_RUN_ID}/compare", json={
        "target_run_id": replay_run_id
    })
    assert comp_res.status_code == 200
    comp_data = comp_res.json()
    assert comp_data["unchanged_steps_count"] == 4
    assert comp_data["final_outcome_difference"]["improved"] is True
