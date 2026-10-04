import math
from typing import Dict, Any, List, Optional, Tuple
import numpy as np

class FeatureExtractor:
    """
    Trace Feature Extractor for AI Agent Flight Recorder.
    Extracts 14 normalized, leakage-safe features from execution steps.
    """
    def __init__(self):
        self.step_stats: Dict[str, Dict[str, float]] = {}
        self.tool_failure_rates: Dict[str, float] = {}
        self.historical_failure_corr: Dict[str, float] = {}
        self.is_fitted: bool = False

    def fit(self, training_traces: List[Dict[str, Any]]):
        """
        Fits baseline statistics strictly on the training subset to prevent data leakage.
        """
        step_latencies: Dict[str, List[float]] = {}
        step_tokens: Dict[str, List[float]] = {}
        tool_counts: Dict[str, int] = {}
        tool_failures: Dict[str, int] = {}
        step_run_failures: Dict[str, int] = {}
        step_run_totals: Dict[str, int] = {}

        for trace in training_traces:
            run = trace["run"]
            is_run_failed = (run.get("status") == "failed")
            seen_steps_in_run = set()

            for step in trace.get("steps", []):
                action = step.get("action") or step.get("tool_name") or "unknown"
                latency = float(step.get("latency_ms") or 0.0)
                tokens = float(step.get("token_count") or 0.0)

                step_latencies.setdefault(action, []).append(latency)
                step_tokens.setdefault(action, []).append(tokens)

                tool_counts[action] = tool_counts.get(action, 0) + 1
                if step.get("status") == "failed":
                    tool_failures[action] = tool_failures.get(action, 0) + 1

                if action not in seen_steps_in_run:
                    seen_steps_in_run.add(action)
                    step_run_totals[action] = step_run_totals.get(action, 0) + 1
                    if is_run_failed:
                        step_run_failures[action] = step_run_failures.get(action, 0) + 1

        # Calculate statistics
        for action, latencies in step_latencies.items():
            mean_lat = float(np.mean(latencies))
            std_lat = float(np.std(latencies)) or 1.0
            tokens = step_tokens.get(action, [0.0])
            mean_tok = float(np.mean(tokens))
            std_tok = float(np.std(tokens)) or 1.0

            self.step_stats[action] = {
                "mean_latency": mean_lat,
                "std_latency": std_lat,
                "mean_tokens": mean_tok,
                "std_tokens": std_tok
            }

            self.tool_failure_rates[action] = tool_failures.get(action, 0) / max(tool_counts.get(action, 1), 1)
            self.historical_failure_corr[action] = step_run_failures.get(action, 0) / max(step_run_totals.get(action, 1), 1)

        self.is_fitted = True

    def _state_transition_delta(self, in_state: Optional[Dict], out_state: Optional[Dict]) -> Tuple[float, float]:
        """
        Computes state mutation delta and input/output key similarity.
        """
        if not in_state and not out_state:
            return 0.0, 1.0
        if not in_state:
            return float(len(out_state or {})), 0.0
        if not out_state:
            return float(len(in_state or {})), 0.0

        in_keys = set(in_state.keys())
        out_keys = set(out_state.keys())

        # Keys added/removed
        sym_diff = in_keys.symmetric_difference(out_keys)
        # Shared keys with mutated values
        shared_keys = in_keys.intersection(out_keys)
        mutated = sum(1 for k in shared_keys if str(in_state[k]) != str(out_state[k]))

        total_delta = float(len(sym_diff) + mutated)
        jaccard_similarity = float(len(shared_keys)) / float(max(len(in_keys.union(out_keys)), 1))

        return total_delta, jaccard_similarity

    def _decision_anomaly_score(self, decision: Optional[str]) -> float:
        """
        Evaluates heuristic decision risk keywords and length divergence.
        """
        if not decision:
            return 0.5  # Neutral uncertainty if empty
        text = decision.lower()
        score = 0.0
        risk_words = ["error", "invalid", "mismatch", "failed", "unsupported", "unexpected", "corrupt", "fallback", "expired"]
        for rw in risk_words:
            if rw in text:
                score += 0.25
        if len(text) < 10 or len(text) > 300:
            score += 0.2
        return min(score, 1.0)

    def extract_step_features(self, step: Dict[str, Any], trace: Dict[str, Any], action_counts: Dict[str, int]) -> List[float]:
        """
        Extracts a 14-dimensional feature vector for a single step.
        """
        action = step.get("action") or step.get("tool_name") or "unknown"
        seq_num = float(step.get("sequence_number") or 1)
        total_steps = float(max(len(trace.get("steps", [])), 1))
        norm_position = seq_num / total_steps

        latency = float(step.get("latency_ms") or 0.0)
        tokens = float(step.get("token_count") or 0.0)

        stats = self.step_stats.get(action, {
            "mean_latency": latency,
            "std_latency": 100.0,
            "mean_tokens": tokens,
            "std_tokens": 50.0
        })

        lat_z = (latency - stats["mean_latency"]) / max(stats["std_latency"], 1.0)
        lat_deviation = float(np.clip(abs(lat_z), 0.0, 5.0))

        tok_z = (tokens - stats["mean_tokens"]) / max(stats["std_tokens"], 1.0)
        tok_deviation = float(np.clip(abs(tok_z), 0.0, 5.0))

        tool_fail_freq = self.tool_failure_rates.get(action, 0.0)
        hist_fail_corr = self.historical_failure_corr.get(action, 0.0)

        in_state = step.get("input_state")
        out_state = step.get("output_state")
        state_delta, io_similarity = self._state_transition_delta(in_state, out_state)

        # Downstream failure proximity indicator
        run_status = trace.get("run", {}).get("status")
        downstream_impact = 1.0 if (run_status == "failed" and norm_position < 1.0) else 0.0

        repeated_count = float(action_counts.get(action, 1))

        # Retrieval anomaly: 1.0 if context is missing where expected or marked empty
        has_retrieval = step.get("retrieved_context") is not None
        retrieval_anomaly = 0.0
        if step.get("step_type") == "retrieval" and not has_retrieval:
            retrieval_anomaly = 1.0

        decision_anomaly = self._decision_anomaly_score(step.get("decision"))

        # Explicit error on this step
        error_indicator = 1.0 if (step.get("status") == "failed" or step.get("error")) else 0.0

        features = [
            lat_deviation,               # 0
            tok_deviation,               # 1
            seq_num,                     # 2
            norm_position,               # 3
            math.log1p(stats.get("mean_latency", 100.0)), # 4
            tool_fail_freq,              # 5
            hist_fail_corr,              # 6
            state_delta,                 # 7
            io_similarity,               # 8
            downstream_impact,           # 9
            repeated_count,              # 10
            retrieval_anomaly,           # 11
            decision_anomaly,            # 12
            error_indicator              # 13
        ]
        return features

    def extract_trace_matrix(self, trace: Dict[str, Any]) -> np.ndarray:
        """
        Extracts feature matrix (N_steps, 14) for all steps in a single trace.
        """
        steps = trace.get("steps", [])
        if not steps:
            return np.empty((0, 14), dtype=float)

        action_counts: Dict[str, int] = {}
        for s in steps:
            act = s.get("action") or s.get("tool_name") or "unknown"
            action_counts[act] = action_counts.get(act, 0) + 1

        feature_rows = [self.extract_step_features(s, trace, action_counts) for s in steps]
        return np.array(feature_rows, dtype=float)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "step_stats": self.step_stats,
            "tool_failure_rates": self.tool_failure_rates,
            "historical_failure_corr": self.historical_failure_corr,
            "is_fitted": self.is_fitted
        }

    def from_dict(self, data: Dict[str, Any]):
        self.step_stats = data.get("step_stats", {})
        self.tool_failure_rates = data.get("tool_failure_rates", {})
        self.historical_failure_corr = data.get("historical_failure_corr", {})
        self.is_fitted = data.get("is_fitted", False)
