from ml.dataset import FlightRecorderDataset
from ml.evaluator import BenchmarkEvaluator

def test_ml_dataset_and_evaluator():
    dataset = FlightRecorderDataset("data")
    traces = dataset.load_inference_traces()
    assert len(traces) == 1300

    # Ensure traces do NOT have ground truth keys
    for t in traces[:10]:
        assert "ground_truth" not in t
        assert "is_hidden_root_cause" not in t["run"]

    # Ground truth loader
    gt = dataset.load_ground_truth()
    assert len(gt) == 300

    # Test benchmark evaluator
    evaluator = BenchmarkEvaluator("data")
    # Simulate a naive baseline predicting the failure manifestation step as root cause
    naive_predictions = []
    for t in traces:
        if t["run"]["status"] == "failed":
            # The naive baseline assumes the last step (manifestation) is the root cause
            last_step = t["steps"][-1]
            naive_predictions.append({
                "run_id": t["run"]["run_id"],
                "predicted_root_cause_step": last_step["sequence_number"],
                "predicted_category": "unknown"
            })

    metrics = evaluator.evaluate_diagnoses(naive_predictions)
    # Naive baseline should get 100% on direct failures (150/300 = 50% overall)
    # and 0% on hidden root causes
    assert metrics["total_evaluated"] == 300
    assert metrics["hidden_root_cause_accuracy"] == 0.0
    assert metrics["root_cause_step_accuracy"] == 0.5
