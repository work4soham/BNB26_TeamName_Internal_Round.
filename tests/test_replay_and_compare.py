import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.models.base import Base
from backend.app.services.demo_service import ensure_curated_demo_run, DEMO_RUN_ID
from backend.app.services.replay_service import execute_replay, compare_traces, validate_structured_action

@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()

def test_safety_validation():
    # Safe action
    validate_structured_action({"currency": "USD", "destination": "SFO"})

    # Unsafe actions must raise ValueError
    with pytest.raises(ValueError):
        validate_structured_action({"exec": "import os; os.system('rm -rf /')"})

    with pytest.raises(ValueError):
        validate_structured_action({"__builtins__": "evil"})

def test_checkpointed_replay_and_prefix_reuse(db_session):
    # Setup curated demo run
    run = ensure_curated_demo_run(db_session)
    assert run.run_id == DEMO_RUN_ID
    assert run.status == "failed"

    # Step 5 is retrieve_fares where currency was EUR. Replay with alternative action currency="USD"
    replay_res = execute_replay(
        db=db_session,
        original_run_id=DEMO_RUN_ID,
        checkpoint_sequence_number=5,
        alternative_action={"currency": "USD"}
    )

    assert replay_res["status"] == "success"
    assert replay_res["alternative_outcome"] == "success"
    assert replay_res["original_outcome"] == "failed"

    # Verify prefix was reused: Steps 1..4 reused, steps 5..11 recomputed
    assert replay_res["reused_steps"]["count"] == 4
    assert replay_res["reused_steps"]["sequence_numbers"] == [1, 2, 3, 4]
    assert replay_res["recomputed_steps"]["count"] >= 7
    assert 5 in replay_res["recomputed_steps"]["sequence_numbers"]

    # Test trace comparison
    comparison = compare_traces(
        db=db_session,
        base_run_id=DEMO_RUN_ID,
        target_run_id=replay_res["replay_run_id"]
    )

    assert comparison["unchanged_steps_count"] == 4
    assert comparison["first_meaningful_divergence"]["sequence_number"] == 5
    assert comparison["final_outcome_difference"]["improved"] is True
