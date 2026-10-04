# Academic Paper Outline: Black Box

**Title:** *Black Box: Deterministic Flight Recording and Counterfactual Replay for Fault Localization in Autonomous AI Agents*

---

## 1. Abstract
- Emerging challenge of debugging autonomous, multi-step LLM-based agents.
- The phenomenon of **silent defect latency**: upstream state mutations causing delayed terminal failures.
- Overview of Black Box: deterministic state hashing, hybrid machine-learning diagnosis, and checkpointed counterfactual replay.
- Key empirical findings: 100% Top-3 root-cause localization accuracy on 1,300 flight-booking traces, ~45% compute savings through prefix reuse, and robust zero-shot generalization on held-out defect categories.

---

## 2. Introduction & Motivation
- Rise of compound AI systems and tool-using agents (ReAct, Reflexion, Toolformer).
- The "Silent Latency Gap": distance between fault injection step $i$ and manifestation step $M$.
- Limitations of current approaches: manual prompt review, stochastic re-execution, and lack of deterministic state snapshots.

---

## 3. Problem Formulation & Data Model
- Formal definition of an Agent Execution Trace:
  $$T = (R, \mathcal{S}), \quad \mathcal{S} = [s_1, s_2, \dots, s_n]$$
- Intermediate state transitions: $O_i = f(I_i, C_i, \text{action}_i)$.
- Deterministic State Hashing: Canonical JSON serialization + SHA-256 digest:
  $$h(O_i) = \text{SHA256}(\mathcal{C}(O_i))$$
- Fault localization objective: identify the earliest step index $k^* < M$ where state divergence occurred:
  $$k^* = \arg\min_j \{ j \mid O_j \neq O^*_j \}$$

---

## 4. The Black Box Architecture
- **Trace Ingestion Engine**: High-throughput asynchronous logging with SQLite/PostgreSQL compatibility.
- **Leakage-Safe Feature Engineering**: 14 normalized temporal, lexical, state-mutation, and historical correlation features.
- **Hybrid Diagnostic Model**:
  - Unsupervised isolation depth: $A(s_i)$ via `IsolationForest`.
  - Supervised posterior likelihood: $C(s_i)$ via balanced `RandomForestClassifier`.
  - Causal state mutation origin detector: $\delta(s_i)$.
  - Synthesis into a calibrated $[0, 100]$ Suspicion Score.

---

## 5. Checkpointed Counterfactual Replay
- State isolation guarantees: prefix steps $1 \dots k-1$ preserved verbatim.
- Safe structured mutations: rejecting arbitrary code execution.
- Downstream suffix simulation and state divergence verification.
- Computational complexity: reducing recomputation overhead from $O(N)$ to $O(N - k)$.

---

## 6. Empirical Evaluation & Benchmark
- Evaluation on 1,300 agent traces across 8 distinct failure modes.
- Metrics: Top-1 Accuracy, Top-3 Accuracy, Mean Reciprocal Rank (MRR), Anomaly Precision, Anomaly Recall.
- Ablation study: Unsupervised alone vs Supervised alone vs Hybrid Engine.
- Generalization to unseen failure categories (holdout evaluation).

---

## 7. Related Work
- Program Slicing & Delta Debugging in Software Engineering (Zeller et al.).
- Time-Travel Debugging & Record-Replay Systems (rr, Chronon).
- LLM Agent Observability & Benchmarks (AgentBench, WebArena, LangSmith).

---

## 8. Conclusion & Future Directions
- Summary of contributions.
- Towards automated counterfactual self-healing agents.
