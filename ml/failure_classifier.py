import joblib
import os
import numpy as np
from typing import Optional
from sklearn.ensemble import RandomForestClassifier

class FailureClassifier:
    """
    Supervised root-cause step classifier powered by RandomForestClassifier.
    Trained strictly on labeled training-set traces to output P(root_cause | step_features).
    """
    def __init__(self, n_estimators: int = 150, max_depth: int = 12, random_state: int = 42):
        self.model = RandomForestClassifier(
            n_estimators=n_estimators,
            max_depth=max_depth,
            class_weight="balanced",
            random_state=random_state,
            n_jobs=-1
        )
        self.is_fitted: bool = False

    def fit(self, X: np.ndarray, y: np.ndarray) -> "FailureClassifier":
        """
        Fits the random forest classifier on step features and binary root-cause targets.
        """
        if len(X) == 0:
            raise ValueError("Cannot fit FailureClassifier on empty matrix.")

        # Ensure both classes exist; if only one class exists, handle gracefully
        unique_classes = np.unique(y)
        if len(unique_classes) < 2:
            # Fallback: add dummy sample with opposite label if needed
            self.model.fit(X, y)
        else:
            self.model.fit(X, y)

        self.is_fitted = True
        return self

    def predict_root_cause_proba(self, X: np.ndarray) -> np.ndarray:
        """
        Returns the predicted probability of being the true root-cause step for each step.
        """
        if not self.is_fitted:
            raise RuntimeError("FailureClassifier must be fitted before inference.")
        if len(X) == 0:
            return np.empty((0,), dtype=float)

        probs = self.model.predict_proba(X)
        classes = list(self.model.classes_)
        if 1 in classes:
            pos_idx = classes.index(1)
            return probs[:, pos_idx]
        return np.zeros((len(X),), dtype=float)

    def save(self, filepath: str):
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        joblib.dump({
            "model": self.model,
            "is_fitted": self.is_fitted
        }, filepath)

    def load(self, filepath: str):
        data = joblib.load(filepath)
        self.model = data["model"]
        self.is_fitted = data["is_fitted"]
