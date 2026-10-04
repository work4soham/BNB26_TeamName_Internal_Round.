from scripts.generate_demo_data import (
    generate_flight_booking_trace,
    WORKFLOW_STEPS,
    FAILURE_CATEGORIES
)

def test_workflow_steps_order_and_types():
    expected_order = [
        "parse_request", "identify_origin", "identify_destination",
        "search_flights", "retrieve_fares", "filter_flights", "select_flight",
        "validate_fare", "validate_passenger", "reserve_seat", "payment",
        "booking_confirmation"
    ]
    actual_order = [s[0] for s in WORKFLOW_STEPS]
    assert actual_order == expected_order

def test_successful_run_generation():
    run, steps, gt = generate_flight_booking_trace(run_idx=10, is_failure=False)
    assert run["status"] == "success"
    assert len(steps) == len(WORKFLOW_STEPS)
    assert gt is None
    assert all(s["status"] == "success" for s in steps)
    # Check parents
    for i in range(1, len(steps)):
        assert steps[i]["parent_step_id"] == steps[i - 1]["step_id"]

def test_hidden_root_cause_run_generation():
    run, steps, gt = generate_flight_booking_trace(run_idx=1000, is_failure=True, hidden_root_cause=True)
    assert run["status"] == "failed"
    assert gt is not None
    assert gt["is_hidden_root_cause"] is True
    assert gt["step_distance"] > 0
    # Injected step should appear before manifest step
    assert gt["root_cause_step_sequence"] < gt["manifestation_step_sequence"]
    
    # Manifestation step must be failed
    manifest_seq = gt["manifestation_step_sequence"]
    failed_steps = [s for s in steps if s["status"] == "failed"]
    assert len(failed_steps) == 1
    assert failed_steps[0]["sequence_number"] == manifest_seq
