from typing import Dict, Any, List, Optional, Tuple
import numpy as np

from ml.feature_engineering import FeatureExtractor
from ml.anomaly_detector import AnomalyDetector
from ml.failure_classifier import FailureClassifier

class DiagnosisEngine:
    """
    Hybrid Root-Cause Diagnosis Engine for Black Box.
    Combines unsupervised anomaly detection (Isolation Forest), supervised classification
    (Random Forest), historical failure correlation, and causal state transition analysis
    into a normalized 0-100 suspicion score.
    Accurately distinguishes between visible manifestation steps and earlier root-cause steps.
    """
    def __init__(
        self,
        feature_extractor: FeatureExtractor,
        anomaly_detector: AnomalyDetector,
        failure_classifier: FailureClassifier,
        w_anomaly: float = 0.35,
        w_classifier: float = 0.35,
        w_history: float = 0.15,
        w_downstream: float = 0.15
    ):
        self.feature_extractor = feature_extractor
        self.anomaly_detector = anomaly_detector
        self.failure_classifier = failure_classifier
        self.w_anomaly = w_anomaly
        self.w_classifier = w_classifier
        self.w_history = w_history
        self.w_downstream = w_downstream

    def _detect_state_inversion_or_defect(
        self,
        step: Dict[str, Any],
        in_state: Dict[str, Any],
        out_state: Dict[str, Any]
    ) -> Tuple[bool, List[str], Dict[str, Any]]:
        """
        Detects causal defect introduction where a state property became invalid or corrupted.
        """
        defect_codes = []
        defect_details = {}

        # 1. Currency mutation: USD -> non-USD
        in_curr = in_state.get("currency")
        out_curr = out_state.get("currency")
        if out_curr and out_curr != "USD":
            if in_curr == "USD" or in_curr is None:
                defect_codes.append("CURRENCY_INCONSISTENCY")
                defect_codes.append("ROOT_CAUSE_DEFECT_ORIGIN")
                defect_details["currency_mutation"] = f"{in_curr} -> {out_curr}"

        # 2. Origin/Destination duplication
        if out_state.get("origin") and out_state.get("destination"):
            if out_state["origin"] == out_state["destination"]:
                if in_state.get("origin") != in_state.get("destination"):
                    defect_codes.append("STATE_INCONSISTENCY_DUPLICATE_AIRPORTS")
                    defect_codes.append("ROOT_CAUSE_DEFECT_ORIGIN")
                    defect_details["airport_conflict"] = out_state["origin"]

        # 3. Malformed payload
        if "corrupted_field" in out_state or "fare_quote_raw" in out_state:
            defect_codes.append("MALFORMED_TOOL_PAYLOAD")
            defect_codes.append("ROOT_CAUSE_DEFECT_ORIGIN")
            defect_details["malformed_payload"] = out_state.get("corrupted_field") or out_state.get("fare_quote_raw")

        # 4. Token expiration or stale context
        search_token = str(out_state.get("search_session_token", ""))
        if "EXPIRED" in search_token or "STALE" in search_token:
            if "EXPIRED" not in str(in_state.get("search_session_token", "")):
                defect_codes.append("STALE_SESSION_TOKEN_INJECTED")
                defect_codes.append("ROOT_CAUSE_DEFECT_ORIGIN")
                defect_details["stale_token"] = search_token

        # 5. Invalid passenger data
        pname = str(out_state.get("passenger_name", ""))
        if ("INVALID" in pname or "##" in pname) and not ("INVALID" in str(in_state.get("passenger_name", ""))):
            defect_codes.append("PASSENGER_DATA_MUTATION")
            defect_codes.append("ROOT_CAUSE_DEFECT_ORIGIN")
            defect_details["corrupt_name"] = pname

        # 6. Candidate exhaustion
        if "filtered_candidates" in out_state and out_state["filtered_candidates"] == []:
            if in_state.get("available_flights"):
                defect_codes.append("EMPTY_FILTER_SELECTION")
                defect_codes.append("ROOT_CAUSE_DEFECT_ORIGIN")

        # 7. Illegal route selection
        sel_flight = out_state.get("selected_flight", {})
        if isinstance(sel_flight, dict) and "ILLEGAL" in str(sel_flight.get("flight_no", "")):
            defect_codes.append("ILLEGAL_ROUTE_SELECTION")
            defect_codes.append("ROOT_CAUSE_DEFECT_ORIGIN")

        is_defect_origin = "ROOT_CAUSE_DEFECT_ORIGIN" in defect_codes
        return is_defect_origin, defect_codes, defect_details

    def diagnose_trace(self, trace: Dict[str, Any]) -> Dict[str, Any]:
        """
        Diagnoses an agent execution trace, ranking steps by suspicion score.
        Distinguishes between visible manifestation step and causal root cause.
        """
        steps = trace.get("steps", [])
        run = trace.get("run", {})
        if not steps:
            return {
                "run_id": run.get("run_id"),
                "status": run.get("status"),
                "ranked_steps": [],
                "probable_root_cause_step": None,
                "visible_failure_step": None,
                "is_hidden_root_cause": False,
                "confidence": 0.0
            }

        # Identify visible failure step
        manifest_step = None
        manifest_idx = len(steps) - 1
        for idx, s in enumerate(steps):
            if s.get("status") == "failed" or s.get("error"):
                manifest_step = s
                manifest_idx = idx
                break
        if manifest_step is None and run.get("status") == "failed":
            manifest_step = steps[-1]
            manifest_idx = len(steps) - 1

        # Extract features
        X = self.feature_extractor.extract_trace_matrix(trace)

        if len(X) > 0 and self.anomaly_detector.is_fitted:
            anomaly_scores = self.anomaly_detector.predict_anomaly_scores(X)
        else:
            anomaly_scores = np.zeros(len(steps))

        if len(X) > 0 and self.failure_classifier.is_fitted:
            clf_probs = self.failure_classifier.predict_root_cause_proba(X)
        else:
            clf_probs = np.zeros(len(steps))

        ranked_steps = []
        has_earlier_defect = False

        for i, s in enumerate(steps):
            act = s.get("action") or s.get("tool_name") or "unknown"
            hist_corr = self.feature_extractor.historical_failure_corr.get(act, 0.0)
            in_s = s.get("input_state") or {}
            out_s = s.get("output_state") or {}

            # Downstream distance proximity
            if i <= manifest_idx and run.get("status") == "failed":
                dist = manifest_idx - i
                downstream_weight = 1.0 / (1.0 + 0.12 * dist)
            else:
                downstream_weight = 0.0

            raw_suspicion = (
                self.w_anomaly * anomaly_scores[i] +
                self.w_classifier * clf_probs[i] +
                self.w_history * hist_corr +
                self.w_downstream * downstream_weight
            )

            reason_codes = []
            evidence: Dict[str, Any] = {
                "step_name": act,
                "sequence_number": s.get("sequence_number"),
                "anomaly_score": round(float(anomaly_scores[i]), 4),
                "classifier_probability": round(float(clf_probs[i]), 4),
                "latency_ms": s.get("latency_ms"),
                "token_count": s.get("token_count"),
                "steps_before_manifestation": max(manifest_idx - i, 0)
            }

            # State transition analysis
            is_defect, defect_codes, defect_details = self._detect_state_inversion_or_defect(s, in_s, out_s)
            if is_defect and i < manifest_idx:
                has_earlier_defect = True
                reason_codes.extend(defect_codes)
                evidence.update(defect_details)
                # Boost suspicion for the actual defect origin step
                raw_suspicion = max(raw_suspicion + 0.40, 0.85)

            if anomaly_scores[i] > 0.65:
                reason_codes.append("ISOLATION_FOREST_OUTLIER")
            if clf_probs[i] > 0.35:
                reason_codes.append("SUPERVISED_ROOT_CAUSE_SIGNATURE")
            if i < manifest_idx and (anomaly_scores[i] > 0.5 or clf_probs[i] > 0.25):
                reason_codes.append("DOWNSTREAM_FAILURE_PRECURSOR")

            # Check if this step is the terminal visible failure
            if s.get("status") == "failed" or s.get("error"):
                reason_codes.append("VISIBLE_FAILURE_STEP")
                evidence["error_message"] = s.get("error")
                if not has_earlier_defect and clf_probs[i] > 0.2:
                    raw_suspicion = max(raw_suspicion, 0.70)
                else:
                    # If an earlier step caused the defect, cap the visible failure step
                    raw_suspicion = min(raw_suspicion, 0.60)

            if not reason_codes:
                reason_codes.append("NOMINAL_EXECUTION")

            suspicion_score = float(np.clip(raw_suspicion * 100.0, 0.0, 100.0))

            ranked_steps.append({
                "step_id": s.get("step_id"),
                "sequence_number": s.get("sequence_number"),
                "step_name": act,
                "step_type": s.get("step_type"),
                "suspicion_score": round(suspicion_score, 2),
                "anomaly_score": round(float(anomaly_scores[i]), 4),
                "classifier_probability": round(float(clf_probs[i]), 4),
                "reason_codes": list(dict.fromkeys(reason_codes)),
                "evidence": evidence
            })

        # Rank steps by suspicion score descending
        ranked_steps.sort(key=lambda item: item["suspicion_score"], reverse=True)

        top_step = ranked_steps[0] if ranked_steps else None
        confidence = float(np.clip((top_step["suspicion_score"] if top_step else 0.0) / 100.0, 0.0, 1.0))

        is_hidden = False
        if top_step and manifest_step:
            if top_step["sequence_number"] < manifest_step.get("sequence_number"):
                is_hidden = True

        return {
            "run_id": run.get("run_id"),
            "status": run.get("status"),
            "confidence": round(confidence, 4),
            "probable_root_cause_step": {
                "step_id": top_step["step_id"],
                "sequence_number": top_step["sequence_number"],
                "step_name": top_step["step_name"],
                "suspicion_score": top_step["suspicion_score"],
                "reason_codes": top_step["reason_codes"],
                "evidence": top_step["evidence"]
            } if top_step else None,
            "visible_failure_step": {
                "step_id": manifest_step.get("step_id"),
                "sequence_number": manifest_step.get("sequence_number"),
                "step_name": manifest_step.get("action") or manifest_step.get("tool_name"),
                "error": manifest_step.get("error")
            } if manifest_step else None,
            "is_hidden_root_cause": is_hidden,
            "ranked_steps": ranked_steps
        }
