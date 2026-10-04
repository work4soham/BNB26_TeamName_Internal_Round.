# Black Box: API Reference Documentation

All endpoints are hosted at `http://localhost:8000` (or `https://your-domain.railway.app`) and mounted under both root `/` and `/api/v1/`.

---

## 1. System & Health

### `GET /health`
Returns service and database probe status.
```json
{
  "status": "ok",
  "database": "healthy",
  "service": "Black Box AI Flight Recorder"
}
```

---

## 2. Runs & Traces

### `GET /runs`
Query parameters:
- `skip` (int, default: 0)
- `limit` (int, default: 100)
- `status` (string, optional: `success`, `failed`, `running`)
- `task_type` (string, optional)
- `agent_id` (string, optional)

### `GET /runs/{run_id}`
Returns full execution trace, sequence of steps, and checkpoint metadata.

### `POST /runs`
Create a new execution run entry.
```json
{
  "agent_id": "flight-booker-01",
  "task_type": "flight_booking",
  "status": "running",
  "metadata": {"env": "prod"}
}
```

### `POST /runs/{run_id}/steps`
Ingest an individual execution step with deterministic state hashing and automatic checkpointing.
```json
{
  "sequence_number": 1,
  "step_type": "transformation",
  "action": "parse_request",
  "input_state": {"query": "Fly JFK to SFO"},
  "output_state": {"origin": "JFK", "destination": "SFO"},
  "status": "success",
  "latency_ms": 120.5,
  "token_count": 180
}
```

### `POST /traces/ingest`
Batch ingestion of a complete run metadata and full list of steps in a single atomic transaction.

---

## 3. Checkpoints

### `GET /checkpoints/{state_hash}`
Retrieve historical state payload and provenance directly by its 64-character SHA-256 state hash.

### `GET /runs/{run_id}/checkpoints`
List all state checkpoints recorded for a specific execution run.

---

## 4. Diagnostic & Machine Learning

### `POST /runs/{run_id}/diagnose`
Executes hybrid root-cause localization combining `IsolationForest`, `RandomForest`, and causal state transition analysis.
Response:
```json
{
  "run_id": "demo-run-currency-mismatch",
  "status": "failed",
  "confidence": 0.85,
  "probable_root_cause_step": {
    "step_id": "demo-step-05",
    "sequence_number": 5,
    "step_name": "execute_retrieve_fares",
    "suspicion_score": 85.0,
    "reason_codes": [
      "CURRENCY_INCONSISTENCY",
      "ROOT_CAUSE_DEFECT_ORIGIN",
      "ISOLATION_FOREST_OUTLIER",
      "DOWNSTREAM_FAILURE_PRECURSOR"
    ],
    "evidence": {
      "anomaly_score": 0.7097,
      "classifier_probability": 0.1462,
      "latency_ms": 110.0,
      "token_count": 210,
      "steps_before_manifestation": 6,
      "currency_mutation": "USD -> EUR"
    }
  },
  "visible_failure_step": {
    "step_id": "demo-step-11",
    "sequence_number": 11,
    "step_name": "execute_payment",
    "error": "Payment gateway authorization failed: currency mismatch"
  },
  "is_hidden_root_cause": true,
  "ranked_steps": [ ... ]
}
```

### `GET /runs/{run_id}/diagnosis`
Returns cached diagnosis or computes a fresh diagnosis.

### `POST /model/train`
Triggers zero-leakage training across train/val/test/unseen-holdout partitions.
Request body:
```json
{
  "holdout_categories": ["wrong_currency"],
  "test_ratio": 0.2,
  "val_ratio": 0.1
}
```

### `POST /evaluation/run`
Computes real benchmark evaluation metrics on test traces.
Response:
```json
{
  "total_evaluated": 300,
  "top_1_accuracy": 1.0,
  "top_3_accuracy": 1.0,
  "mean_reciprocal_rank": 1.0,
  "anomaly_precision": 0.42,
  "anomaly_recall": 0.88,
  "hidden_root_cause_metrics": {
    "total_hidden": 150,
    "top_1_accuracy": 1.0,
    "top_3_accuracy": 1.0
  }
}
```

---

## 5. Counterfactual Replay & Comparison

### `POST /runs/{run_id}/replay`
Resumes execution from a checkpoint step with structured alternative action data.
```json
{
  "checkpoint_sequence_number": 5,
  "alternative_action": {
    "currency": "USD"
  }
}
```
Response:
```json
{
  "replay_run_id": "replay-demo-run-b1c532",
  "original_run_id": "demo-run-currency-mismatch",
  "checkpoint_sequence_number": 5,
  "reused_steps": {
    "count": 4,
    "sequence_numbers": [1, 2, 3, 4]
  },
  "recomputed_steps": {
    "count": 8,
    "sequence_numbers": [5, 6, 7, 8, 9, 10, 11, 12]
  },
  "execution_time_ms": 26.23,
  "original_outcome": "failed",
  "alternative_outcome": "success",
  "status": "success",
  "final_output": "Replay completed successfully with PNR PNR-RPL-12345"
}
```

### `POST /runs/{run_id}/compare`
Compares two traces and isolates unchanged prefix, divergence point, and recovered outcome.
```json
{
  "target_run_id": "replay-demo-run-b1c532"
}
```
