import json
import uuid
import random
import datetime
import os
import copy
from typing import Dict, Any, List, Tuple

# Set fixed seed for deterministic dataset generation
RANDOM_SEED = 42
random.seed(RANDOM_SEED)

AIRPORTS = ["JFK", "SFO", "LHR", "HND", "CDG", "DXB", "SIN", "FRA", "ORD", "LAX"]
AIRLINES = ["SkyWay", "AeroGlobal", "JetBlue", "Oceanic Air", "PacificFly"]
PASSENGERS = [
    {"name": "Alice Smith", "passport": "P12345678", "loyalty": "GOLD"},
    {"name": "Bob Johnson", "passport": "P87654321", "loyalty": "SILVER"},
    {"name": "Charlie Lee", "passport": "P45678901", "loyalty": "REGULAR"},
    {"name": "Diana Prince", "passport": "P98765432", "loyalty": "PLATINUM"},
    {"name": "Evan Wright", "passport": "P13579246", "loyalty": "REGULAR"}
]

WORKFLOW_STEPS = [
    ("parse_request", "transformation", "Natural language intent extraction"),
    ("identify_origin", "model_call", "Extract origin airport IATA code"),
    ("identify_destination", "model_call", "Extract destination airport IATA code"),
    ("search_flights", "tool_call", "Query global flight inventory API"),
    ("retrieve_fares", "retrieval", "Retrieve live fare pricing and rules"),
    ("filter_flights", "transformation", "Filter based on cabin class and stops"),
    ("select_flight", "decision", "Select optimal flight candidate"),
    ("validate_fare", "validation", "Verify price guarantee and currency"),
    ("validate_passenger", "validation", "Validate passenger credentials and visa"),
    ("reserve_seat", "external_action", "Hold inventory and seat assignment"),
    ("payment", "external_action", "Charge payment gateway"),
    ("booking_confirmation", "model_call", "Synthesize PNR confirmation record")
]

FAILURE_CATEGORIES = [
    "wrong_currency",
    "stale_context",
    "invalid_selection",
    "malformed_tool_response",
    "passenger_data_error",
    "timeout",
    "state_inconsistency",
    "incorrect_intermediate_decision"
]

def generate_flight_booking_trace(
    run_idx: int,
    is_failure: bool = False,
    hidden_root_cause: bool = False
) -> Tuple[Dict[str, Any], List[Dict[str, Any]], Dict[str, Any]]:
    run_id = f"run-{uuid.UUID(int=run_idx + 10000000000000000000000000000000)}"
    agent_id = f"agent-flight-booker-{1 + (run_idx % 4)}"
    base_time = datetime.datetime(2026, 1, 1, 8, 0, 0) + datetime.timedelta(minutes=run_idx * 5)
    
    passenger = PASSENGERS[run_idx % len(PASSENGERS)]
    origin = AIRPORTS[run_idx % len(AIRPORTS)]
    dest = AIRPORTS[(run_idx + 3) % len(AIRPORTS)]
    if origin == dest:
        dest = AIRPORTS[(run_idx + 4) % len(AIRPORTS)]

    current_state: Dict[str, Any] = {
        "raw_query": f"Book flight from {origin} to {dest} for {passenger['name']}",
        "passenger": passenger,
        "currency": "USD"
    }

    failure_cat = None
    injected_step_idx = -1
    manifest_step_idx = -1
    ground_truth = None

    if is_failure:
        failure_cat = FAILURE_CATEGORIES[run_idx % len(FAILURE_CATEGORIES)]
        if hidden_root_cause:
            # Inject root cause early, manifest several steps later
            if failure_cat == "wrong_currency":
                injected_step_idx = 4  # retrieve_fares: currency changed to EUR
                manifest_step_idx = 10 # payment: rejected due to currency discrepancy
            elif failure_cat == "stale_context":
                injected_step_idx = 3  # search_flights: session timestamp expired
                manifest_step_idx = 9  # reserve_seat: seat lock expired
            elif failure_cat == "invalid_selection":
                injected_step_idx = 5  # filter_flights: invalid index injected
                manifest_step_idx = 7  # validate_fare: invalid flight reference
            elif failure_cat == "malformed_tool_response":
                injected_step_idx = 4  # retrieve_fares: stringified payload
                manifest_step_idx = 7  # validate_fare: schema type error
            elif failure_cat == "state_inconsistency":
                injected_step_idx = 2  # identify_destination: duplicate origin
                manifest_step_idx = 6  # select_flight: no routes available
            elif failure_cat == "incorrect_intermediate_decision":
                injected_step_idx = 6  # select_flight: chosen flight exceeds max connection limit
                manifest_step_idx = 11 # booking_confirmation: itinerary validation failure
            else:
                injected_step_idx = 0  # parse_request: malformed passenger name
                manifest_step_idx = 8  # validate_passenger: name verification failed

            ground_truth = {
                "run_id": run_id,
                "is_hidden_root_cause": True,
                "root_cause_category": failure_cat,
                "root_cause_step_sequence": injected_step_idx + 1,
                "root_cause_step_name": WORKFLOW_STEPS[injected_step_idx][0],
                "manifestation_step_sequence": manifest_step_idx + 1,
                "manifestation_step_name": WORKFLOW_STEPS[manifest_step_idx][0],
                "step_distance": (manifest_step_idx - injected_step_idx),
                "description": f"Silent defect introduced during {WORKFLOW_STEPS[injected_step_idx][0]} "
                               f"manifested downstream at {WORKFLOW_STEPS[manifest_step_idx][0]}."
            }
        else:
            # Immediate visible failure
            manifest_step_idx = 3 + (run_idx % 8)
            injected_step_idx = manifest_step_idx
            ground_truth = {
                "run_id": run_id,
                "is_hidden_root_cause": False,
                "root_cause_category": failure_cat,
                "root_cause_step_sequence": manifest_step_idx + 1,
                "root_cause_step_name": WORKFLOW_STEPS[manifest_step_idx][0],
                "manifestation_step_sequence": manifest_step_idx + 1,
                "manifestation_step_name": WORKFLOW_STEPS[manifest_step_idx][0],
                "step_distance": 0,
                "description": f"Direct execution error at {WORKFLOW_STEPS[manifest_step_idx][0]}."
            }

    steps = []
    parent_id = None
    step_time = base_time

    for seq, (step_name, step_type, step_desc) in enumerate(WORKFLOW_STEPS):
        if is_failure and seq > manifest_step_idx:
            break

        step_id = f"step-{uuid.UUID(int=run_idx * 100 + seq + 1)}"
        latency = 80.0 + ((run_idx * 17 + seq * 23) % 450)
        tokens = 150 + ((run_idx * 31 + seq * 19) % 350)
        step_time += datetime.timedelta(milliseconds=latency)

        input_state = copy.deepcopy(current_state)
        step_status = "success"
        error_msg = None
        retrieved = None

        # Execute step state transition
        if step_name == "parse_request":
            if is_failure and seq == injected_step_idx and failure_cat == "passenger_data_error":
                current_state["passenger_name"] = "INVALID##%NAME"
            else:
                current_state["passenger_name"] = passenger["name"]
            current_state["travel_class"] = "Economy"

        elif step_name == "identify_origin":
            current_state["origin"] = origin

        elif step_name == "identify_destination":
            if is_failure and seq == injected_step_idx and failure_cat == "state_inconsistency":
                current_state["destination"] = origin  # Same as origin
            else:
                current_state["destination"] = dest

        elif step_name == "search_flights":
            if is_failure and seq == injected_step_idx and failure_cat == "stale_context":
                current_state["search_session_token"] = "EXPIRED-TOKEN-STALE"
            else:
                current_state["search_session_token"] = f"TOK-{run_idx}-ACTIVE"
            current_state["available_flights"] = [
                {"flight_no": f"FL-{run_idx}-1", "airline": AIRLINES[0], "price": 420},
                {"flight_no": f"FL-{run_idx}-2", "airline": AIRLINES[1], "price": 480}
            ]

        elif step_name == "retrieve_fares":
            retrieved = {"fare_rules": "NON-REFUNDABLE", "baggage_included": True}
            if is_failure and seq == injected_step_idx and failure_cat == "wrong_currency":
                current_state["quoted_fare"] = 420
                current_state["currency"] = "EUR"  # Discrepancy with USD
            elif is_failure and seq == injected_step_idx and failure_cat == "malformed_tool_response":
                current_state["fare_quote_raw"] = "{'price': 'CORRUPT_JSON"
            else:
                current_state["quoted_fare"] = 420
                current_state["currency"] = "USD"

        elif step_name == "filter_flights":
            if is_failure and seq == injected_step_idx and failure_cat == "invalid_selection":
                current_state["filtered_candidates"] = []
            else:
                current_state["filtered_candidates"] = current_state.get("available_flights", [])

        elif step_name == "select_flight":
            if is_failure and seq == injected_step_idx and failure_cat == "incorrect_intermediate_decision":
                current_state["selected_flight"] = {"flight_no": "ILLEGAL-CONNECTION-ROUTE"}
            else:
                candidates = current_state.get("filtered_candidates")
                if candidates:
                    current_state["selected_flight"] = candidates[0]
                else:
                    current_state["selected_flight"] = {"flight_no": "NULL_CANDIDATE"}

        elif step_name == "validate_fare":
            current_state["fare_validated"] = True

        elif step_name == "validate_passenger":
            current_state["passenger_validated"] = True

        elif step_name == "reserve_seat":
            current_state["seat_assigned"] = "14B"
            current_state["pnr"] = f"PNR{run_idx:05d}"

        elif step_name == "payment":
            current_state["payment_ref"] = f"PAY-{uuid.uuid4().hex[:8].upper()}"

        elif step_name == "booking_confirmation":
            current_state["confirmed"] = True

        # Check if failure occurs at current step
        if is_failure and seq == manifest_step_idx:
            step_status = "failed"
            error_msg = f"Runtime error in {step_name}: {failure_cat}"
            if hidden_root_cause:
                error_msg += f" (root cause traced to upstream step {WORKFLOW_STEPS[injected_step_idx][0]})"

        step_record = {
            "step_id": step_id,
            "run_id": run_id,
            "parent_step_id": parent_id,
            "sequence_number": seq + 1,
            "step_type": step_type,
            "action": f"execute_{step_name}",
            "tool_name": step_name if "call" in step_type or step_type == "retrieval" else None,
            "input_state": input_state,
            "output_state": copy.deepcopy(current_state) if step_status == "success" else None,
            "retrieved_context": retrieved,
            "decision": f"Proceeding with {step_name} step verification.",
            "latency_ms": latency,
            "token_count": tokens,
            "status": step_status,
            "error": error_msg,
            "timestamp": step_time.isoformat()
        }

        steps.append(step_record)
        parent_id = step_id

    run_record = {
        "run_id": run_id,
        "agent_id": agent_id,
        "task_type": "flight_booking",
        "created_at": base_time.isoformat(),
        "completed_at": step_time.isoformat(),
        "status": "failed" if is_failure else "success",
        "final_output": f"Booking successfully confirmed with PNR {current_state.get('pnr', '')}" if not is_failure else None,
        "failure_reason": f"Execution failed at {WORKFLOW_STEPS[manifest_step_idx][0]}: {failure_cat}" if is_failure else None,
        "metadata": {
            "passenger_loyalty": passenger["loyalty"],
            "route": f"{origin}->{dest}",
            "environment": "production_simulation"
        }
    }

    return run_record, steps, ground_truth

def generate_dataset():
    os.makedirs("data", exist_ok=True)
    runs: List[Dict[str, Any]] = []
    all_steps: List[Dict[str, Any]] = []
    ground_truth_records: List[Dict[str, Any]] = []

    print("Generating 1000 successful agent flight-booking traces...")
    for idx in range(1000):
        r, s, _ = generate_flight_booking_trace(run_idx=idx, is_failure=False)
        runs.append(r)
        all_steps.extend(s)

    print("Generating 300 failed agent flight-booking traces (including hidden root causes)...")
    for idx in range(1000, 1300):
        # 50% hidden root causes, 50% direct failures
        is_hidden = (idx % 2 == 0)
        r, s, gt = generate_flight_booking_trace(run_idx=idx, is_failure=True, hidden_root_cause=is_hidden)
        runs.append(r)
        all_steps.extend(s)
        if gt:
            ground_truth_records.append(gt)

    with open("data/runs.json", "w") as f:
        json.dump(runs, f, indent=2)

    with open("data/steps.json", "w") as f:
        json.dump(all_steps, f, indent=2)

    # Store ground truth separately (isolated from the runtime diagnosis API)
    with open("data/ground_truth_root_causes.json", "w") as f:
        json.dump(ground_truth_records, f, indent=2)

    hidden_count = sum(1 for g in ground_truth_records if g["is_hidden_root_cause"])
    direct_count = len(ground_truth_records) - hidden_count

    print(f"Dataset generated successfully:")
    print(f"  - Total Runs: {len(runs)} (1000 success, 300 failed)")
    print(f"  - Total Trace Steps: {len(all_steps)}")
    print(f"  - Ground Truth Labels: {len(ground_truth_records)} ({hidden_count} hidden root causes, {direct_count} direct failures)")
    print(f"  - Output files saved to data/runs.json, data/steps.json, data/ground_truth_root_causes.json")

if __name__ == "__main__":
    generate_dataset()
