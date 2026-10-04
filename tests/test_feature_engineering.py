import numpy as np
from ml.feature_engineering import FeatureExtractor

def test_feature_extractor_fit_and_dimensions():
    extractor = FeatureExtractor()
    mock_trace = {
        "run": {"run_id": "r1", "status": "failed"},
        "steps": [
            {
                "sequence_number": 1,
                "action": "parse_request",
                "step_type": "transformation",
                "latency_ms": 100.0,
                "token_count": 150,
                "input_state": {"q": "book flight"},
                "output_state": {"q": "book flight", "parsed": True},
                "status": "success",
                "decision": "Parsed correctly"
            },
            {
                "sequence_number": 2,
                "action": "payment",
                "step_type": "external_action",
                "latency_ms": 500.0,
                "token_count": 200,
                "input_state": {"parsed": True, "currency": "EUR"},
                "output_state": None,
                "status": "failed",
                "error": "Payment rejected",
                "decision": "Payment failed"
            }
        ]
    }

    extractor.fit([mock_trace])
    assert extractor.is_fitted is True
    assert "parse_request" in extractor.step_stats
    assert "payment" in extractor.step_stats

    mat = extractor.extract_trace_matrix(mock_trace)
    assert mat.shape == (2, 14)

    # Check non-negative normalized position
    assert 0.0 <= mat[0, 3] <= 1.0
    assert 0.0 <= mat[1, 3] <= 1.0

def test_state_transition_delta():
    extractor = FeatureExtractor()
    in_s = {"a": 1, "b": "usd"}
    out_s = {"a": 1, "b": "eur", "c": 3}
    delta, sim = extractor._state_transition_delta(in_s, out_s)
    # b mutated (+1), c added (+1) -> delta = 2.0
    assert delta == 2.0
    assert 0.0 < sim < 1.0
