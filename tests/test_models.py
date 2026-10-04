import numpy as np
import tempfile
import os
from ml.anomaly_detector import AnomalyDetector
from ml.failure_classifier import FailureClassifier

def test_anomaly_detector_training_and_scoring():
    np.random.seed(42)
    # Normal data cluster
    X_normal = np.random.normal(loc=0.0, scale=1.0, size=(100, 14))
    # Extreme outlier
    X_outlier = np.array([[10.0] * 14])

    ad = AnomalyDetector(contamination=0.05, random_state=42)
    ad.fit(X_normal)
    assert ad.is_fitted is True

    scores_normal = ad.predict_anomaly_scores(X_normal)
    score_outlier = ad.predict_anomaly_scores(X_outlier)

    assert len(scores_normal) == 100
    assert 0.0 <= np.mean(scores_normal) <= 1.0
    # Outlier should have a higher anomaly score than normal mean
    assert score_outlier[0] > np.mean(scores_normal)

    # Test persistence
    with tempfile.TemporaryDirectory() as tmpdir:
        path = os.path.join(tmpdir, "anomaly_model.joblib")
        ad.save(path)
        ad2 = AnomalyDetector()
        ad2.load(path)
        assert ad2.is_fitted is True
        np.testing.assert_allclose(ad2.predict_anomaly_scores(X_outlier), score_outlier)

def test_failure_classifier_training():
    np.random.seed(42)
    X = np.random.randn(50, 14)
    y = np.array([0] * 40 + [1] * 10)

    fc = FailureClassifier(n_estimators=20, random_state=42)
    fc.fit(X, y)
    assert fc.is_fitted is True

    probs = fc.predict_root_cause_proba(X)
    assert len(probs) == 50
    assert all(0.0 <= p <= 1.0 for p in probs)
