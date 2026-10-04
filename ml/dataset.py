import json
import os
from typing import List, Dict, Any, Optional

class FlightRecorderDataset:
    """
    Research dataset loader for Black Box traces.
    Strictly isolates execution traces from ground-truth root-cause labels
    to prevent data leakage during diagnosis inference.
    """
    def __init__(self, data_dir: str = "data"):
        self.data_dir = data_dir
        self.runs_file = os.path.join(data_dir, "runs.json")
        self.steps_file = os.path.join(data_dir, "steps.json")
        self.ground_truth_file = os.path.join(data_dir, "ground_truth_root_causes.json")

    def load_inference_traces(self) -> List[Dict[str, Any]]:
        """
        Loads agent execution traces for inference.
        CRITICAL: Never exposes ground truth root cause labels here.
        """
        if not os.path.exists(self.runs_file) or not os.path.exists(self.steps_file):
            raise FileNotFoundError("Trace data files not found. Run generator first.")

        with open(self.runs_file, "r") as f:
            runs = json.load(f)
        with open(self.steps_file, "r") as f:
            steps = json.load(f)

        steps_by_run: Dict[str, List[Dict[str, Any]]] = {}
        for s in steps:
            steps_by_run.setdefault(s["run_id"], []).append(s)

        traces = []
        for r in runs:
            trace_obj = {
                "run": r,
                "steps": sorted(steps_by_run.get(r["run_id"], []), key=lambda x: x["sequence_number"])
            }
            traces.append(trace_obj)

        return traces

    def load_ground_truth(self) -> Dict[str, Dict[str, Any]]:
        """
        Loads ground truth root cause labels for offline benchmark evaluation only.
        """
        if not os.path.exists(self.ground_truth_file):
            raise FileNotFoundError("Ground truth file not found.")

        with open(self.ground_truth_file, "r") as f:
            gt_list = json.load(f)

        return {item["run_id"]: item for item in gt_list}
