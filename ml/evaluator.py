from typing import Dict, Any, List, Optional
import numpy as np

class BenchmarkEvaluator:
    """
    Evaluates root-cause diagnosis models against ground-truth failure labels.
    Calculates Top-1, Top-3, MRR, anomaly precision/recall, and unseen failure generalization.
    """
    def __init__(self, ground_truth_or_dir: Any = "data"):
        if isinstance(ground_truth_or_dir, str):
            from ml.dataset import FlightRecorderDataset
            ds = FlightRecorderDataset(ground_truth_or_dir)
            self.ground_truth = ds.load_ground_truth()
        elif isinstance(ground_truth_or_dir, dict):
            self.ground_truth = ground_truth_or_dir
        else:
            self.ground_truth = {}

    def evaluate_diagnoses(self, diagnoses: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Evaluates a list of diagnosis dictionaries produced by DiagnosisEngine.
        """
        total = 0
        top1_hits = 0
        top3_hits = 0
        reciprocal_ranks = []

        hidden_total = 0
        hidden_top1_hits = 0
        hidden_top3_hits = 0

        # Anomaly detection precision / recall accumulators
        true_positives = 0
        false_positives = 0
        false_negatives = 0

        for diag in diagnoses:
            run_id = diag.get("run_id")
            gt = self.ground_truth.get(run_id)
            if not gt:
                continue

            total += 1
            true_rc_seq = gt.get("root_cause_step_sequence")
            is_hidden = gt.get("is_hidden_root_cause", False)
            if is_hidden:
                hidden_total += 1

            ranked_steps = diag.get("ranked_steps", [])
            if ranked_steps:
                ranked_seqs = [s["sequence_number"] for s in ranked_steps]
            elif "predicted_root_cause_step" in diag:
                ranked_seqs = [diag["predicted_root_cause_step"]]
            else:
                ranked_seqs = []

            # Top-1
            if ranked_seqs and ranked_seqs[0] == true_rc_seq:
                top1_hits += 1
                if is_hidden:
                    hidden_top1_hits += 1

            # Top-3
            if true_rc_seq in ranked_seqs[:3]:
                top3_hits += 1
                if is_hidden:
                    hidden_top3_hits += 1

            # MRR
            if true_rc_seq in ranked_seqs:
                rank = ranked_seqs.index(true_rc_seq) + 1
                reciprocal_ranks.append(1.0 / rank)
            else:
                reciprocal_ranks.append(0.0)

            # Anomaly precision / recall:
            pred_anomalous_seqs = set([s["sequence_number"] for s in ranked_steps if s.get("anomaly_score", 0) >= 0.5])
            if ranked_seqs:
                pred_anomalous_seqs.add(ranked_seqs[0])

            if true_rc_seq in pred_anomalous_seqs:
                true_positives += 1
                false_positives += max(len(pred_anomalous_seqs) - 1, 0)
            else:
                false_negatives += 1
                false_positives += len(pred_anomalous_seqs)

        precision = (true_positives / (true_positives + false_positives)) if (true_positives + false_positives) > 0 else 0.0
        recall = (true_positives / (true_positives + false_negatives)) if (true_positives + false_negatives) > 0 else 0.0
        top1_acc = round(top1_hits / max(total, 1), 4)
        hidden_acc = round(hidden_top1_hits / max(hidden_total, 1), 4)

        return {
            "total_evaluated": total,
            "top_1_accuracy": top1_acc,
            "root_cause_step_accuracy": top1_acc,
            "top_3_accuracy": round(top3_hits / max(total, 1), 4),
            "mean_reciprocal_rank": round(float(np.mean(reciprocal_ranks)) if reciprocal_ranks else 0.0, 4),
            "anomaly_precision": round(precision, 4),
            "anomaly_recall": round(recall, 4),
            "hidden_root_cause_accuracy": hidden_acc,
            "hidden_root_cause_metrics": {
                "total_hidden": hidden_total,
                "top_1_accuracy": hidden_acc,
                "top_3_accuracy": round(hidden_top3_hits / max(hidden_total, 1), 4)
            }
        }
