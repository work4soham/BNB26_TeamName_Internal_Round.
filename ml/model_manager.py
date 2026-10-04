import os
import json
import time
import random
from typing import Dict, Any, List, Optional, Tuple
import numpy as np

from ml.feature_engineering import FeatureExtractor
from ml.anomaly_detector import AnomalyDetector
from ml.failure_classifier import FailureClassifier
from ml.diagnosis_engine import DiagnosisEngine
from ml.evaluator import BenchmarkEvaluator
from ml.dataset import FlightRecorderDataset

MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "checkpoints")

class ModelManager:
    """
    Orchestrates ML pipeline lifecycle: data splitting, leakage-safe training,
    unseen-failure holdout, model persistence, and diagnosis engine instantiation.
    """
    _instance: Optional["ModelManager"] = None
    _engine: Optional[DiagnosisEngine] = None

    def __init__(self, model_dir: str = MODEL_DIR):
        self.model_dir = model_dir
        os.makedirs(self.model_dir, exist_ok=True)
        self.feature_extractor = FeatureExtractor()
        self.anomaly_detector = AnomalyDetector()
        self.failure_classifier = FailureClassifier()
        self.last_training_metadata: Dict[str, Any] = {}

    @classmethod
    def get_instance(cls) -> "ModelManager":
        if cls._instance is None:
            cls._instance = ModelManager()
        return cls._instance

    def get_diagnosis_engine(self) -> DiagnosisEngine:
        """
        Returns cached diagnosis engine, or attempts to load from disk, or auto-trains.
        """
        if self._engine is not None:
            return self._engine

        fe_path = os.path.join(self.model_dir, "feature_extractor.json")
        ad_path = os.path.join(self.model_dir, "anomaly_detector.joblib")
        fc_path = os.path.join(self.model_dir, "failure_classifier.joblib")

        if os.path.exists(fe_path) and os.path.exists(ad_path) and os.path.exists(fc_path):
            with open(fe_path, "r") as f:
                self.feature_extractor.from_dict(json.load(f))
            self.anomaly_detector.load(ad_path)
            self.failure_classifier.load(fc_path)
            self._engine = DiagnosisEngine(
                self.feature_extractor,
                self.anomaly_detector,
                self.failure_classifier
            )
            return self._engine

        # If not saved on disk, train pipeline on available data
        self.train_pipeline()
        return self._engine

    def train_pipeline(
        self,
        data_dir: str = "data",
        holdout_categories: Optional[List[str]] = None,
        test_ratio: float = 0.2,
        val_ratio: float = 0.1,
        random_seed: int = 42
    ) -> Dict[str, Any]:
        """
        Trains models strictly on the training partition with zero leakage.
        Optionally holds out failure categories for unseen-failure evaluation.
        """
        start_time = time.time()
        random.seed(random_seed)
        np.random.seed(random_seed)

        dataset = FlightRecorderDataset(data_dir)
        traces = dataset.load_inference_traces()
        ground_truth = dataset.load_ground_truth()

        holdout_categories = holdout_categories or ["wrong_currency"]

        train_traces: List[Dict[str, Any]] = []
        val_traces: List[Dict[str, Any]] = []
        test_traces: List[Dict[str, Any]] = []
        unseen_traces: List[Dict[str, Any]] = []

        # Split runs
        for trace in traces:
            run_id = trace["run"]["run_id"]
            gt = ground_truth.get(run_id)

            if gt and gt.get("root_cause_category") in holdout_categories:
                # Isolate held-out category completely from training
                unseen_traces.append(trace)
                continue

            # Random partition for the rest
            r = random.random()
            if r < test_ratio:
                test_traces.append(trace)
            elif r < (test_ratio + val_ratio):
                val_traces.append(trace)
            else:
                train_traces.append(trace)

        # 1. Fit Feature Extractor strictly on training traces
        self.feature_extractor.fit(train_traces)

        # 2. Extract step features and targets for training
        X_train_list = []
        y_train_list = []

        for trace in train_traces:
            run_id = trace["run"]["run_id"]
            gt = ground_truth.get(run_id)
            rc_seq = gt.get("root_cause_step_sequence") if gt else -1

            trace_matrix = self.feature_extractor.extract_trace_matrix(trace)
            for i, step in enumerate(trace.get("steps", [])):
                X_train_list.append(trace_matrix[i])
                is_rc = 1 if (step["sequence_number"] == rc_seq) else 0
                y_train_list.append(is_rc)

        X_train = np.array(X_train_list, dtype=float)
        y_train = np.array(y_train_list, dtype=int)

        # 3. Train Isolation Forest (Unsupervised)
        self.anomaly_detector.fit(X_train)

        # 4. Train Random Forest Classifier (Supervised)
        self.failure_classifier.fit(X_train, y_train)

        # Instantiate engine
        self._engine = DiagnosisEngine(
            self.feature_extractor,
            self.anomaly_detector,
            self.failure_classifier
        )

        # Save artifacts
        fe_path = os.path.join(self.model_dir, "feature_extractor.json")
        ad_path = os.path.join(self.model_dir, "anomaly_detector.joblib")
        fc_path = os.path.join(self.model_dir, "failure_classifier.joblib")

        with open(fe_path, "w") as f:
            json.dump(self.feature_extractor.to_dict(), f, indent=2)
        self.anomaly_detector.save(ad_path)
        self.failure_classifier.save(fc_path)

        # 5. Evaluate on Test Split
        evaluator = BenchmarkEvaluator(ground_truth)
        test_diagnoses = [self._engine.diagnose_trace(t) for t in test_traces if t["run"]["status"] == "failed"]
        test_metrics = evaluator.evaluate_diagnoses(test_diagnoses)

        # 6. Evaluate on Unseen Holdout Categories (Zero-Shot / Generalization)
        unseen_diagnoses = [self._engine.diagnose_trace(t) for t in unseen_traces if t["run"]["status"] == "failed"]
        unseen_metrics = evaluator.evaluate_diagnoses(unseen_diagnoses)

        duration = time.time() - start_time
        metadata = {
            "training_duration_seconds": round(duration, 3),
            "total_runs": len(traces),
            "splits": {
                "train_runs": len(train_traces),
                "val_runs": len(val_traces),
                "test_runs": len(test_traces),
                "unseen_holdout_runs": len(unseen_traces)
            },
            "holdout_categories": holdout_categories,
            "test_metrics": test_metrics,
            "unseen_category_metrics": unseen_metrics,
            "trained_at": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
        }
        self.last_training_metadata = metadata

        meta_path = os.path.join(self.model_dir, "training_metadata.json")
        with open(meta_path, "w") as f:
            json.dump(metadata, f, indent=2)

        return metadata
