import hashlib
import json
from typing import Any

def canonical_json_dump(obj: Any) -> str:
    """
    Serializes a Python object to canonical JSON string with sorted keys,
    strict separators, and standard formatting for deterministic hashing.
    """
    def default_serializer(o):
        if hasattr(o, "isoformat"):
            return o.isoformat()
        if hasattr(o, "__dict__"):
            return o.__dict__
        return str(o)

    return json.dumps(
        obj,
        sort_keys=True,
        ensure_ascii=True,
        separators=(',', ':'),
        default=default_serializer
    )

def compute_state_hash(state: Any) -> str:
    """
    Computes a deterministic SHA-256 hash of any arbitrary state structure.
    Returns empty string if state is None.
    """
    if state is None:
        return ""
    canonical_repr = canonical_json_dump(state)
    return hashlib.sha256(canonical_repr.encode('utf-8')).hexdigest()
