from backend.app.services.hashing import compute_state_hash

def test_deterministic_hashing_key_order():
    dict1 = {"b": 2, "a": 1, "c": {"y": 20, "x": 10}}
    dict2 = {"a": 1, "c": {"x": 10, "y": 20}, "b": 2}
    assert compute_state_hash(dict1) == compute_state_hash(dict2)

def test_different_content_produces_different_hash():
    dict1 = {"user": "Alice", "currency": "USD"}
    dict2 = {"user": "Alice", "currency": "EUR"}
    assert compute_state_hash(dict1) != compute_state_hash(dict2)

def test_none_state_returns_empty():
    assert compute_state_hash(None) == ""
