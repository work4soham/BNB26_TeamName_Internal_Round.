# Black Box — An AI Flight Recorder for AI Agents

**Black Box** is a research-grade execution trace recorder, root-cause localization platform, and checkpointed counterfactual replay engine for autonomous AI agents. It captures granular execution traces across multi-step agent workflows, provides deterministic state hashing and checkpoint storage, and isolates ground-truth root-cause labels for offline benchmark evaluation.

---

## System Architecture

```
Blackbox/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── endpoints.py         # REST endpoints (health, runs, steps, traces, checkpoints, diagnose, replay, compare, train, eval)
│   │   ├── database/
│   │   │   ├── base.py              # Declarative Base
│   │   │   └── session.py           # Engine & Session (SQLite dev / PostgreSQL prod ready)
│   │   ├── models/
│   │   │   ├── run.py               # Run model
│   │   │   ├── step.py              # Step model (7 step types, state hash, lineage)
│   │   │   └── checkpoint.py        # Checkpoint storage model
│   │   ├── schemas/
│   │   │   ├── run.py               # Run Pydantic schemas (populate_by_name, AliasChoices)
│   │   │   ├── step.py              # Step Pydantic schemas with type enforcement
│   │   │   ├── checkpoint.py        # Checkpoint response schemas
│   │   │   └── ml_schemas.py        # Diagnosis, Replay, Compare, Train & Eval schemas
│   │   ├── services/
│   │   │   ├── hashing.py           # Canonical JSON deterministic SHA-256 state hashing
│   │   │   ├── trace_service.py     # Ingestion, retrieval, and checkpointing logic
│   │   │   ├── replay_service.py    # Counterfactual replay & trace comparison engine
│   │   │   └── demo_service.py      # Curated hidden root-cause demo run seeder
│   │   └── main.py                  # FastAPI application entrypoint with lifespan
├── ml/
│   ├── feature_engineering.py       # 14 trace features extraction with zero leakage
│   ├── anomaly_detector.py          # IsolationForest unsupervised anomaly detector
│   ├── failure_classifier.py        # RandomForestClassifier supervised root-cause model
│   ├── diagnosis_engine.py          # Hybrid diagnosis engine (0-100 suspicion score)
│   ├── evaluator.py                 # Benchmark evaluation (Top-1, Top-3, MRR, Precision, Recall)
│   ├── model_manager.py             # Pipeline lifecycle, holdouts, and model persistence
│   └── dataset.py                   # Trace loader isolating ground-truth from inference
├── scripts/
│   ├── generate_demo_data.py        # Synthetic dataset generator (1000 success, 300 failed)
│   └── seed_demo.py                 # Database initialization and bulk seeder
├── data/                            # Generated dataset (runs.json, steps.json, ground_truth)
├── tests/                           # 22 Unit and integration tests (100% passing)
├── requirements.txt
├── .env.example
└── README.md
```

---

## Research Core Capabilities

### 1. Feature Engineering (`ml/feature_engineering.py`)
Extracts 14 normalized, leakage-safe features from execution steps strictly fitted on training splits:
1. `latency_deviation`: Z-score deviation from historical step mean.
2. `token_deviation`: Z-score deviation from historical step mean.
3. `step_position`: Sequence number within the run.
4. `normalized_position`: Ratio of step sequence to total trace steps.
5. `tool_frequency`: Historical invocation frequency of the action/tool.
6. `tool_failure_frequency`: Historical failure rate of the tool.
7. `historical_failure_correlation`: Historical correlation between step occurrence and run failure.
8. `state_transition_anomaly`: Metric measuring state delta (mutated, added, or removed keys).
9. `input_output_similarity`: Jaccard key similarity between input and output state.
10. `downstream_failure_correlation`: Correlation with downstream failure manifestation.
11. `repeated_action_count`: Invocation count of this action within the trace.
12. `retrieval_anomaly`: Indicator for empty/unexpected retrieved context.
13. `decision_anomaly`: Semantic risk heuristics on decision explanations.
14. `error_indicators`: Binary indicator for step errors.

### 2. Hybrid Diagnosis Engine (`ml/diagnosis_engine.py`)
- Combines unsupervised anomaly detection (`IsolationForest`), supervised failure classification (`RandomForestClassifier`), historical correlation, and causal defect origin tracking into a **normalized 0–100 suspicion score**.
- Ranks all execution steps in a failed run.
- **Distinguishes between the visible failure step and earlier root-cause steps** (identifying silent faults injected steps before the final crash).
- Outputs confidence, suspicion scores, reason codes (`CURRENCY_INCONSISTENCY`, `ROOT_CAUSE_DEFECT_ORIGIN`, `ISOLATION_FOREST_OUTLIER`, `DOWNSTREAM_FAILURE_PRECURSOR`), and concrete evidence extracted from trace data.

### 3. Checkpointed Counterfactual Replay (`backend/app/services/replay_service.py`)
- Resumes execution from an intermediate checkpoint without recomputing unaffected steps.
- **Strict safety**: Only structured key-value alternative action payloads are accepted; arbitrary shell/Python execution is strictly blocked.
- Reuses original prefix steps verbatim, applies the alternative action at the checkpoint, and re-executes the downstream suffix.
- Records `reused_steps`, `recomputed_steps`, `execution_time_ms`, `original_outcome`, and `alternative_outcome`.

### 4. Trace Comparison Engine
- Compares original and replay traces:
  - `unchanged_steps` (identical sequence and state hash)
  - `changed_steps` (mutated state or status)
  - `first_meaningful_divergence` (first sequence where state diverged)
  - `downstream_effects` (state diffs across subsequent steps)
  - `final_outcome_difference` (e.g., `failed` $\rightarrow$ `success`)

### 5. Curated Demo Run (`demo-run-currency-mismatch`)
- Simulates an AI flight-booking agent where step 5 (`retrieve_fares`) silently sets `currency="EUR"`.
- Steps 6–10 execute nominally.
- Step 11 (`payment`) fails visibly because the payment gateway requires USD.
- Black Box diagnoses step 5 as the root cause (suspicion score 85, reason codes: `CURRENCY_INCONSISTENCY`, `ROOT_CAUSE_DEFECT_ORIGIN`).
- Replaying from step 5 with `{"currency": "USD"}` reuses steps 1–4, recomputes steps 5–12, and successfully confirms the booking with a valid PNR.

---

## Quickstart & Verification

### 1. Setup Environment
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Generate Dataset & Seed Database
```bash
python scripts/generate_demo_data.py
python scripts/seed_demo.py
```

### 3. Run the Test Suite (22 Tests)
```bash
PYTHONPATH=. pytest -v
```

### 4. Start the Backend Server
```bash
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Service and database connectivity health probe |
| `POST` | `/runs` | Create a new agent execution run |
| `GET` | `/runs` | List runs with pagination and filtering |
| `GET` | `/runs/{run_id}` | Retrieve full run details, trace steps, and checkpoints |
| `PATCH` | `/runs/{run_id}` | Update run status, output, or metadata |
| `POST` | `/runs/{run_id}/steps` | Ingest trace step with state hashing and checkpointing |
| `POST` | `/traces/ingest` | Batch ingest full execution trace |
| `GET` | `/checkpoints/{state_hash}` | Retrieve checkpoint state snapshot by hash |
| `GET` | `/runs/{run_id}/checkpoints` | Retrieve all checkpoints for a run |
| `POST` | `/runs/{run_id}/diagnose` | Run ML failure localization and step ranking |
| `GET` | `/runs/{run_id}/diagnosis` | Retrieve cached or fresh run diagnosis |
| `POST` | `/runs/{run_id}/replay` | Checkpointed counterfactual replay |
| `POST` | `/runs/{run_id}/compare` | Trace comparison between base run and target/replay run |
| `POST` | `/model/train` | Trigger zero-leakage ML pipeline training |
| `POST` | `/evaluation/run` | Benchmark evaluation on test split and holdout categories |
| `GET` | `/training/status` | Model version and dataset statistics |
