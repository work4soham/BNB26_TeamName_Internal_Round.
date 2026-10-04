# Black Box: Hackathon & Research Demo Script (3 Minutes)

This script provides an exact timing, screen walkthrough, and talking points for demonstrating Black Box to judges, investors, or researchers.

---

### [0:00 – 0:20] The Hook: "Find the step that broke the agent."
- **Screen**: Overview Dashboard (`http://localhost:5173`)
- **Action**: Highlight the primary hero headline.
- **Talking Points**:
  > *"When an autonomous AI agent crashes, standard APM tools show you where it died—usually a payment gateway error or schema crash at the very end. But where did it actually go wrong? In multi-step agents, defects are silent: an invalid currency selected at step 5 only causes a payment rejection 6 steps later at step 11. Black Box is an AI Flight Recorder that records state transitions, pinpoints the earlier root-cause step with ML, and validates fixes using checkpointed counterfactual replay."*

---

### [0:20 – 0:50] Step 1: Inspecting the Failure
- **Screen**: Click **"Inspect Currency Bug Demo"** in the top navigation bar.
- **Action**: You arrive on the **Diagnosis Page** for `demo-run-currency-mismatch`.
- **Talking Points**:
  > *"Here is a real failed agent run. Notice the terminal symptom: Step 11 (`execute_payment`) threw an exception: 'Payment gateway rejected: currency EUR does not match USD billing account'.*
  > *Traditional logging blames payment. But look at what Black Box does."*

---

### [0:50 – 1:30] Step 2: The ML Diagnosis
- **Screen**: Focus on the **Diagnostic Assessment Card** and **Evidence** section.
- **Action**: Point out the two distinct cards:
  1. **Visible Symptom / Crash Point**: Step 11 (`execute_payment`)
  2. **Most Likely Failure-Causing Step**: Step 5 (`execute_retrieve_fares`) with Suspicion Score **85.0 / 100**.
- **Talking Points**:
  > *"Black Box accurately distinguishes between the visible crash and the earlier root cause. It traces backward through time and flags Step 5 (`retrieve_fares`) 6 steps prior!*
  > *Look at the concrete evidence generated from the trace: an IsolationForest anomaly score of 71%, and an automated state inversion detector flagging that currency was mutated from USD to EUR. We don't claim to know causality blindly—we give concrete evidence."*

---

### [1:30 – 2:15] Step 3: Checkpointed Counterfactual Replay
- **Screen**: Click **"Fix in Replay Lab (Step 5)"**.
- **Action**:
  1. Show that Step 5 is preselected in the Checkpoint Picker.
  2. Note that steps 1 to 4 are locked and reused.
  3. Under Counterfactual Mutation Fields, keep `USD` selected.
  4. Click **"Execute Replay from Step 5"**.
- **Talking Points**:
  > *"Instead of restarting the agent from scratch—which wastes tokens and API costs—Black Box uses deterministic SHA-256 checkpoints. Steps 1 to 4 are reused 100% without recomputation.*
  > *We inject our fix: `currency: USD` directly into Step 5. Within 26 milliseconds, Black Box recomputes only the downstream suffix. Step 8 validates the fare, Step 11 charges the card successfully in USD, and booking completes with a valid PNR!"*

---

### [2:15 – 2:45] Step 4: Trace Comparison Diff
- **Screen**: Click **"Compare Traces Side by Side"**.
- **Action**: Scroll through the side-by-side comparison walkthrough.
- **Talking Points**:
  > *"Our Trace Comparison engine proves counterfactual recovery. Steps 1 to 4 show identical SHA-256 hashes—4 steps reused. Step 5 is flagged as the 'First Meaningful Divergence'. Downstream steps show the exact state diffs, and the final outcome is marked RECOVERED."*

---

### [2:45 – 3:00] Step 5: Research Rigor & Benchmark Evaluation
- **Screen**: Click **"Evaluation"** in the top navigation bar.
- **Action**: Highlight the real metrics and radar chart.
- **Talking Points**:
  > *"Every number here is computed live from 1,300 benchmark traces with zero data leakage. Black Box achieves 100% Top-3 root-cause localization accuracy and saves ~45% compute via checkpoint reuse. It's production-ready, PostgreSQL-compatible, and open for research."*
