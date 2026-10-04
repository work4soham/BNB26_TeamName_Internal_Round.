#!/usr/bin/env python3
"""
Black Box — Complete Research Pipeline Reproduction Script.
Executes:
1. Synthetic dataset generation (1000 success, 300 failed traces)
2. Database initialization and bulk seeding
3. Zero-leakage ML pipeline training (IsolationForest + RandomForest)
4. Offline benchmark evaluation (Top-1, Top-3, MRR, Precision, Recall)
5. Curated hidden root-cause demo verification
"""

import sys
import os
import time

# Ensure project root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts.generate_demo_data import generate_dataset
from scripts.seed_demo import seed_database
from ml.model_manager import ModelManager
from ml.evaluator import BenchmarkEvaluator
from ml.dataset import FlightRecorderDataset
from backend.app.database.session import SessionLocal
from backend.app.services.demo_service import ensure_curated_demo_run, DEMO_RUN_ID
from backend.app.services.replay_service import execute_replay, compare_traces

def main():
    print("=" * 70)
    print(" BLACK BOX: REPRODUCING COMPLETE RESEARCH PIPELINE")
    print("=" * 70)
    start_total = time.time()

    # Step 1: Generate Dataset
    print("\n[Stage 1/5] Generating deterministic benchmark dataset...")
    generate_dataset()

    # Step 2: Seed Database
    print("\n[Stage 2/5] Initializing database and inserting traces...")
    seed_database()

    # Step 3: Train Models
    print("\n[Stage 3/5] Training ML diagnosis models (Zero-Leakage Partitioning)...")
    manager = ModelManager.get_instance()
    train_meta = manager.train_pipeline(
        holdout_categories=["wrong_currency"],
        test_ratio=0.2,
        val_ratio=0.1
    )
    print(f"  Training finished in {train_meta['training_duration_seconds']}s")
    print(f"  Test Top-3 Accuracy: {train_meta['test_metrics']['top_3_accuracy'] * 100:.1f}%")
    print(f"  Test MRR: {train_meta['test_metrics']['mean_reciprocal_rank']:.4f}")

    # Step 4: Run Offline Benchmark Evaluation
    print("\n[Stage 4/5] Running benchmark evaluation on full test split...")
    dataset = FlightRecorderDataset("data")
    traces = dataset.load_inference_traces()
    ground_truth = dataset.load_ground_truth()
    evaluator = BenchmarkEvaluator(ground_truth)

    engine = manager.get_diagnosis_engine()
    failed_traces = [t for t in traces if t["run"]["status"] == "failed"]
    diagnoses = [engine.diagnose_trace(t) for t in failed_traces]
    metrics = evaluator.evaluate_diagnoses(diagnoses)

    print(f"  Total Evaluated: {metrics['total_evaluated']} failed runs")
    print(f"  Top-1 Localization Accuracy: {metrics['top_1_accuracy'] * 100:.2f}%")
    print(f"  Top-3 Localization Accuracy: {metrics['top_3_accuracy'] * 100:.2f}%")
    print(f"  Mean Reciprocal Rank (MRR): {metrics['mean_reciprocal_rank']:.4f}")
    print(f"  Hidden Root Cause Top-3: {metrics['hidden_root_cause_metrics']['top_3_accuracy'] * 100:.2f}%")

    # Step 5: Curated Demo Verification
    print("\n[Stage 5/5] Verifying Curated Hidden Root-Cause Demo...")
    db = SessionLocal()
    demo_run = ensure_curated_demo_run(db)
    print(f"  Seeded demo run: {demo_run.run_id}")

    # Diagnose demo run
    from backend.app.api.endpoints import _build_trace_dict
    demo_trace = _build_trace_dict(demo_run)
    demo_diag = engine.diagnose_trace(demo_trace)

    rc_seq = demo_diag['probable_root_cause_step']['sequence_number']
    rc_name = demo_diag['probable_root_cause_step']['step_name']
    manifest_seq = demo_diag['visible_failure_step']['sequence_number']
    print(f"  Visible Failure Step: {manifest_seq} ({demo_diag['visible_failure_step']['step_name']})")
    print(f"  Probable Root Cause Step: {rc_seq} ({rc_name})")
    print(f"  Suspicion Score: {demo_diag['probable_root_cause_step']['suspicion_score']}/100")
    print(f"  Reason Codes: {demo_diag['probable_root_cause_step']['reason_codes']}")
    assert rc_seq == 5, f"Expected step 5, got {rc_seq}"

    # Replay demo run with USD fix
    print("  Executing counterfactual replay from checkpoint Step 5 (currency=USD)...")
    replay_res = execute_replay(
        db=db,
        original_run_id=DEMO_RUN_ID,
        checkpoint_sequence_number=5,
        alternative_action={"currency": "USD"}
    )
    print(f"  Replay Result: {replay_res['status'].upper()} (PNR confirmed)")
    print(f"  Reused Prefix Steps: {replay_res['reused_steps']['count']} steps")
    print(f"  Replay Execution Time: {replay_res['execution_time_ms']} ms")
    assert replay_res['status'] == 'success'

    # Compare traces
    comp_res = compare_traces(db=db, base_run_id=DEMO_RUN_ID, target_run_id=replay_res['replay_run_id'])
    print(f"  Trace Divergence at Step: {comp_res['first_meaningful_divergence']['sequence_number']}")
    print(f"  Outcome Recovery: {comp_res['final_outcome_difference']['improved']}")
    assert comp_res['final_outcome_difference']['improved'] is True

    db.close()
    elapsed = round(time.time() - start_total, 2)
    print("\n" + "=" * 70)
    print(f" ALL 5 PIPELINE STAGES VERIFIED IN {elapsed}s WITH ZERO ERRORS.")
    print("=" * 70)

if __name__ == "__main__":
    main()
