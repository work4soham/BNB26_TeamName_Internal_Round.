import joblib
import os
import numpy as np
from typing import Optional, Union
from sklearn.ensemble import IsolationForest

class AnomalyDetector:
    """
    Unsupervised step-level anomaly detector powered by IsolationForest.
    Maps isolation depth scores into a calibrated [0, 1] anomaly score.
    """
    def __init__(self, random_state: int = 42, contamination: float = 0.08, n_estimators: int = 100):
        self.model = IsolationForest(
            n_estimators=n_estimators,
            contamination=contamination,
            random_state=random_state,
            n_jobs=-1
        )
        self.is_fitted: bool = False
        self.min_score: float = -0.5
        self.max_score: float = 0.5

    def fit(self, X: np.ndarray) -> "AnomalyDetector":
        """
        Fits Isolation Forest on step feature vectors from training runs.
        """
        if len(X) == 0:
            raise ValueError("Cannot fit AnomalyDetector on empty feature matrix.")

        self.model.fit(X)
        self.is_fitted = True

        raw_scores = self.model.decision_function(X)
        self.min_score = float(np.percentile(raw_scores, 1))
        self.max_score = float(np.percentile(raw_scores, 99))
        return self

    def predict_anomaly_scores(self, X: np.ndarray) -> np.ndarray:
        """
        Calculates normalized anomaly scores where 0.0 is completely normal
        and 1.0 is highly anomalous.
        """
        if not self.is_fitted:
            raise RuntimeError("AnomalyDetector must be fitted before scoring.")
        if len(X) == 0:
            return np.empty((0,), dtype=float)

        raw_scores = self.model.decision_function(X)
        # Invert: lower raw decision function => higher anomaly
        denom = max(self.max_score - self.min_score, 1e-6)
        normalized = (self.max_score - raw_scores) / denom
        return np.clip(normalized, 0.0, 1.0)

    def save(self, filepath: str):
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        joblib.dump({
            "model": self.model,
            "is_fitted": self.is_fitted,
            "min_score": self.min_score,
            "max_score": self.max_score
        }, filepath)

    def load(self, filepath: str):
        data = joblib.load(filepath)
        self.model = data["model"]
        self.is_fitted = data["is_fitted"]
        self.min_score = data["min_score"]
        self.max_score = data["max_score"]
