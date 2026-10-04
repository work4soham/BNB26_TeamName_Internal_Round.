# Black Box: System Architecture & Technical Specification

## 1. Abstract System Specification

**Black Box** is an execution trace recorder, failure localization framework, and checkpointed counterfactual replay engine for multi-step AI agents. It addresses the fundamental problem of **silent defect propagation** in autonomous agent workflows, where an incorrect decision or corrupted tool output early in execution only manifests as a visible crash or exception several steps later.

```
                    ┌────────────────────────┐
                    │ Multi-Step Agent Trace │
                    └───────────┬────────────┘
                                │
                    ┌───────────▼────────────┐
                    │ 14-D Feature Extraction│ (Strict Zero-Leakage)
                    └───────────┬────────────┘
                                │
          ┌─────────────────────┴─────────────────────┐
          │                                           │
┌─────────▼──────────┐                     ┌──────────▼──────────┐
│  Isolation Forest  │ (Unsupervised)      │    Random Forest    │ (Supervised Root-Cause)
│  Anomaly Detector  │                     │      Classifier     │
└─────────┬──────────┘                     └──────────┬──────────┘
          │                                           │
          └─────────────────────┬─────────────────────┘
                                │
                    ┌───────────▼────────────┐
                    │ Causal State Inversion │ (Defect Origin Analysis)
                    └───────────┬────────────┘
                                │
                    ┌───────────▼────────────┐
                    │ Hybrid Suspicion Score │ [0, 100]
                    └───────────┬────────────┘
                                │
        ┌───────────────────────┴───────────────────────┐
        │                                               │
┌───────▼───────────────┐                   ┌───────────▼───────────┐
│ Visible Failure Step  │                   │ Probable Root Cause   │
│ (Downstream Symptom)  │                   │ (Upstream Origin)     │
└───────────────────────┘                   └───────────┬───────────┘
                                                        │
                                            ┌───────────▼───────────┐
                                            │ Checkpointed Replay   │
                                            │ (Prefix Reused 100%)  │
                                            └───────────┬───────────┘
                                                        │
                                            ┌───────────▼───────────┐
                                            │ Trace Comparison Diff │
                                            └───────────────────────┘
```

---

## 2. Core Subsystems

### 2.1 Trace Ingestion & Checkpoint Storage
Every agent execution $R$ consists of an ordered sequence of steps $S = [s_1, s_2, \dots, s_n]$:
- $s_i = \langle \text{step\_id}, \text{seq}, \text{type}, \text{action}, \text{tool}, I_i, O_i, C_i, D_i, L_i, T_i, \text{status}, E_i, h_i \rangle$
- Deterministic State Hash $h_i = \text{SHA256}(\text{CanonicalJSON}(O_i))$
- Each checkpoint is indexed in constant time $O(1)$ by $h_i$.

### 2.2 Feature Engineering Pipeline (`ml/feature_engineering.py`)
Extracts 14 normalized, leakage-safe features per execution step:
1. **$\Delta \text{Latency}$**: Standard deviation z-score against historical step baseline.
2. **$\Delta \text{Tokens}$**: Token usage divergence against action baseline.
3. **Step Sequence**: Normalized execution position $i / |S|$.
4. **Tool Frequency**: Historical invocation probability $P(\text{action})$.
5. **Tool Failure Frequency**: Historical failure rate $P(\text{fail} \mid \text{action})$.
6. **Historical Failure Correlation**: Probability of overall run failure when action appears.
7. **State Transition Delta**: Symmetric difference and value mutations between $I_i$ and $O_i$.
8. **Input/Output Similarity**: Jaccard similarity index on state keys.
9. **Downstream Failure Proximity**: Distance metric $1 / (1 + \lambda (M - i))$ to terminal step $M$.
10. **Repeated Action Count**: Recurrence of action within current run.
11. **Retrieval Anomaly**: Missing or empty context flag for retrieval step types.
12. **Decision Risk Heuristic**: Lexical risk tokens in decision rationale.
13. **Error Indicator**: Immediate execution error flag.
14. **Log Mean Latency**: Absolute action complexity prior.

### 2.3 Hybrid Failure Localization Engine
The suspicion score $Z(s_i) \in [0, 100]$ combines four independent signals:
$$Z(s_i) = 100 \cdot \left( w_a \cdot A(s_i) + w_c \cdot C(s_i) + w_h \cdot H(s_i) + w_d \cdot D(s_i) + \delta_i \right)$$
where:
- $A(s_i) \in [0, 1]$ is the normalized isolation depth from `IsolationForest`.
- $C(s_i) \in [0, 1]$ is the posterior probability $P(\text{root\_cause} \mid s_i)$ from `RandomForestClassifier`.
- $H(s_i) \in [0, 1]$ is historical failure correlation.
- $D(s_i)$ is downstream impact proximity.
- $\delta_i$ is causal state mutation bonus when a defect origin is confirmed.

### 2.4 Checkpointed Counterfactual Replay
Given checkpoint sequence $K$ and structured alternative action $\alpha$:
1. **Prefix Reuse**: Steps $1 \dots K-1$ are preserved verbatim without re-execution ($\sim 45\%$ latency reduction).
2. **Mutation Injection**: State at step $K$ is updated with validated parameters $\alpha$.
3. **Suffix Execution**: Steps $K \dots N$ are re-simulated using deterministic environment constraints.
4. **Safety Guarantee**: Only structured key-value maps are accepted; arbitrary Python code execution or shell commands are rejected by schema validation.

---

## 3. Database & Deployment Architecture
- **Local Development**: SQLite with write-ahead logging (WAL) and static connection pool.
- **Production Deployment**: PostgreSQL via SQLAlchemy 2.0 with connection pooling.
- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite, Recharts.
- **Backend**: FastAPI, Uvicorn, Pydantic V2, scikit-learn.
