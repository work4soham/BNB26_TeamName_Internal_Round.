import datetime
from sqlalchemy.orm import Session
from backend.app.models.run import Run
from backend.app.models.step import Step
from backend.app.models.checkpoint import Checkpoint
from backend.app.services.hashing import compute_state_hash

DEMO_RUN_ID = "demo-run-currency-mismatch"

def ensure_curated_demo_run(db: Session) -> Run:
    """
    Guarantees the existence of the curated demo run with an early hidden root cause:
    Step 5 (retrieve_fares) sets currency to EUR while payment gateway at Step 11 requires USD.
    """
    existing = db.query(Run).filter(Run.run_id == DEMO_RUN_ID).first()
    if existing:
        return existing

    now = datetime.datetime.now(datetime.timezone.utc)
    demo_run = Run(
        run_id=DEMO_RUN_ID,
        agent_id="agent-flight-booker-curated",
        task_type="flight_booking",
        status="failed",
        final_output=None,
        failure_reason="Execution failed at payment: wrong_currency (Payment gateway rejected: currency EUR does not match USD billing account)",
        run_metadata={
            "description": "Curated benchmark run demonstrating early hidden root-cause fault",
            "environment": "flight_booking_sandbox",
            "customer_profile": "VIP"
        },
        created_at=now,
        completed_at=now
    )
    db.add(demo_run)
    db.flush()

    steps_data = [
        ("parse_request", "transformation", {"query": "Fly JFK to SFO for Alice"}, {"passenger_name": "Alice Smith", "travel_class": "Economy", "currency": "USD"}, None, "success", None),
        ("identify_origin", "model_call", {"query": "Fly JFK to SFO for Alice"}, {"origin": "JFK", "currency": "USD"}, None, "success", None),
        ("identify_destination", "model_call", {"origin": "JFK"}, {"destination": "SFO", "origin": "JFK", "currency": "USD"}, None, "success", None),
        ("search_flights", "tool_call", {"origin": "JFK", "destination": "SFO"}, {"available_flights": [{"flight_no": "SKY-101", "price": 420}], "currency": "USD"}, {"cache": "hit"}, "success", None),
        # Step 5: Root cause injection (currency changed to EUR)
        ("retrieve_fares", "retrieval", {"available_flights": [{"flight_no": "SKY-101", "price": 420}]}, {"quoted_fare": 420, "currency": "EUR", "fare_rules": "NON-REFUNDABLE"}, {"fare_quote_raw": "420 EUR"}, "success", None),
        ("filter_flights", "transformation", {"currency": "EUR", "quoted_fare": 420}, {"filtered_candidates": [{"flight_no": "SKY-101"}], "currency": "EUR"}, None, "success", None),
        ("select_flight", "decision", {"filtered_candidates": [{"flight_no": "SKY-101"}]}, {"selected_flight": {"flight_no": "SKY-101"}, "currency": "EUR"}, None, "success", None),
        ("validate_fare", "validation", {"selected_flight": {"flight_no": "SKY-101"}, "currency": "EUR"}, {"fare_validated": True, "currency": "EUR"}, None, "success", None),
        ("validate_passenger", "validation", {"passenger_name": "Alice Smith"}, {"passenger_validated": True, "currency": "EUR"}, None, "success", None),
        ("reserve_seat", "external_action", {"fare_validated": True}, {"seat_assigned": "14B", "pnr": "PNR-DEMO-01", "currency": "EUR"}, None, "success", None),
        # Step 11: Visible manifestation failure
        ("payment", "external_action", {"pnr": "PNR-DEMO-01", "currency": "EUR"}, None, None, "failed", "Payment gateway authorization failed: currency mismatch (card requires USD, transaction presented EUR)")
    ]

    parent_id = None
    for seq, (act_name, step_type, in_s, out_s, ret_ctx, status, err) in enumerate(steps_data, start=1):
        step_id = f"demo-step-{seq:02d}"
        state_hash = compute_state_hash(out_s) if out_s else None

        step = Step(
            step_id=step_id,
            run_id=DEMO_RUN_ID,
            parent_step_id=parent_id,
            sequence_number=seq,
            step_type=step_type,
            action=f"execute_{act_name}",
            tool_name=act_name,
            input_state=in_s,
            output_state=out_s,
            retrieved_context=ret_ctx,
            decision=f"Decided to proceed with {act_name} verification.",
            latency_ms=110.0,
            token_count=210,
            status=status,
            error=err,
            state_hash=state_hash,
            timestamp=now
        )
        db.add(step)

        if state_hash:
            chk = Checkpoint(
                checkpoint_id=f"demo-chk-{seq:02d}",
                state_hash=state_hash,
                run_id=DEMO_RUN_ID,
                step_id=step_id,
                state_data=out_s,
                created_at=now
            )
            db.add(chk)

        parent_id = step_id

    db.commit()
    db.refresh(demo_run)
    return demo_run
