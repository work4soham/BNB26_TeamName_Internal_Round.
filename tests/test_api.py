import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.main import app
from backend.app.database.session import get_db
from backend.app.models.base import Base

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["database"] == "healthy"

def test_create_and_get_run():
    payload = {
        "agent_id": "test_agent_1",
        "task_type": "flight_booking",
        "status": "running",
        "metadata": {"env": "test"}
    }
    res = client.post("/runs", json=payload)
    assert res.status_code == 201, res.text
    data = res.json()
    run_id = data["run_id"]
    assert data["agent_id"] == "test_agent_1"
    assert data["metadata"] == {"env": "test"}

    # Fetch run
    get_res = client.get(f"/runs/{run_id}")
    assert get_res.status_code == 200
    get_data = get_res.json()
    assert get_data["run_id"] == run_id
    assert len(get_data["steps"]) == 0

def test_add_step_and_retrieve_checkpoint():
    # Create run first
    run_res = client.post("/runs", json={
        "agent_id": "agent_alpha",
        "task_type": "flight_booking",
        "status": "running"
    })
    assert run_res.status_code == 201, run_res.text
    run_id = run_res.json()["run_id"]

    # Ingest step
    step_payload = {
        "sequence_number": 1,
        "step_type": "tool_call",
        "action": "execute_search_flights",
        "tool_name": "search_flights",
        "input_state": {"query": "JFK to SFO"},
        "output_state": {"flights_found": 3, "price": 350},
        "retrieved_context": {"cache": "hit"},
        "decision": "Selecting cheapest candidate",
        "latency_ms": 120.5,
        "token_count": 210,
        "status": "success"
    }
    step_res = client.post(f"/runs/{run_id}/steps", json=step_payload)
    assert step_res.status_code == 201, step_res.text
    step_data = step_res.json()
    assert step_data["sequence_number"] == 1
    state_hash = step_data["state_hash"]
    assert state_hash is not None and len(state_hash) == 64

    # Verify Checkpoint endpoint
    chk_res = client.get(f"/checkpoints/{state_hash}")
    assert chk_res.status_code == 200, chk_res.text
    chk_data = chk_res.json()
    assert chk_data["state_hash"] == state_hash
    assert chk_data["state_data"]["flights_found"] == 3

def test_batch_trace_ingest():
    trace_payload = {
        "run": {
            "run_id": "trace-batch-001",
            "agent_id": "agent_batch",
            "task_type": "flight_booking",
            "status": "success",
            "final_output": "PNR12345"
        },
        "steps": [
            {
                "sequence_number": 1,
                "step_type": "model_call",
                "action": "identify_origin",
                "status": "success",
                "output_state": {"origin": "JFK"}
            },
            {
                "sequence_number": 2,
                "step_type": "model_call",
                "action": "identify_destination",
                "status": "success",
                "output_state": {"destination": "LHR"}
            }
        ]
    }
    res = client.post("/traces/ingest", json=trace_payload)
    assert res.status_code == 201, res.text
    res_data = res.json()
    assert res_data["ingested_steps"] == 2
    assert res_data["checkpoints_created"] == 2

    # Check run detail
    run_detail = client.get("/runs/trace-batch-001").json()
    assert len(run_detail["steps"]) == 2

def test_training_status_endpoint():
    res = client.get("/training/status")
    assert res.status_code == 200, res.text
    assert res.json()["status"] == "ready"
    assert "dataset_statistics" in res.json()
