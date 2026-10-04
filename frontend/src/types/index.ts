export type StepType = 
  | 'model_call'
  | 'tool_call'
  | 'retrieval'
  | 'decision'
  | 'validation'
  | 'transformation'
  | 'external_action';

export interface Step {
  step_id: string;
  run_id: string;
  sequence_number: number;
  parent_step_id?: string | null;
  step_type: StepType;
  action?: string | null;
  tool_name?: string | null;
  input_state?: Record<string, any> | null;
  output_state?: Record<string, any> | null;
  retrieved_context?: Record<string, any> | null;
  decision?: string | null;
  latency_ms?: number | null;
  token_count?: number | null;
  status: 'success' | 'failed' | string;
  error?: string | null;
  state_hash?: string | null;
  timestamp: string;
}

export interface Checkpoint {
  checkpoint_id: string;
  state_hash: string;
  run_id: string;
  step_id: string;
  state_data: Record<string, any>;
  created_at: string;
}

export interface Run {
  run_id: string;
  agent_id: string;
  task_type: string;
  status: 'success' | 'failed' | 'running' | string;
  final_output?: string | null;
  failure_reason?: string | null;
  metadata?: Record<string, any> | null;
  created_at: string;
  completed_at?: string | null;
  steps?: Step[];
  checkpoints?: Checkpoint[];
}

export interface RankedStep {
  step_id?: string;
  sequence_number: number;
  step_name: string;
  step_type?: string;
  suspicion_score: number;
  anomaly_score: number;
  classifier_probability: number;
  reason_codes: string[];
  evidence: Record<string, any>;
}

export interface Diagnosis {
  run_id: string;
  status: string;
  confidence: number;
  probable_root_cause_step?: {
    step_id: string;
    sequence_number: number;
    step_name: string;
    suspicion_score: number;
    reason_codes: string[];
    evidence: Record<string, any>;
  } | null;
  visible_failure_step?: {
    step_id: string;
    sequence_number: number;
    step_name: string;
    error?: string;
  } | null;
  is_hidden_root_cause: boolean;
  ranked_steps: RankedStep[];
}

export interface ReplayResponse {
  replay_run_id: string;
  original_run_id: string;
  checkpoint_step_id: string;
  checkpoint_sequence_number: number;
  reused_steps: {
    count: number;
    sequence_numbers: number[];
  };
  recomputed_steps: {
    count: number;
    sequence_numbers: number[];
  };
  execution_time_ms: number;
  original_outcome: string;
  alternative_outcome: string;
  status: string;
  final_output?: string | null;
}

export interface CompareResponse {
  base_run_id: string;
  target_run_id: string;
  unchanged_steps_count: number;
  changed_steps_count: number;
  first_meaningful_divergence?: {
    sequence_number: number;
    action: string;
    description: string;
  } | null;
  unchanged_steps: Array<{
    sequence_number: number;
    action: string;
    state_hash: string;
  }>;
  changed_steps: Array<{
    sequence_number: number;
    action?: string;
    base_status?: string;
    target_status?: string;
    base_hash?: string | null;
    target_hash?: string | null;
    base_output?: any;
    target_output?: any;
    base_present?: boolean;
    target_present?: boolean;
  }>;
  downstream_effects: any[];
  final_outcome_difference: {
    base_outcome: string;
    target_outcome: string;
    improved: boolean;
  };
}

export interface EvaluationResponse {
  total_evaluated: number;
  top_1_accuracy: number;
  top_3_accuracy: number;
  mean_reciprocal_rank: number;
  anomaly_precision: number;
  anomaly_recall: number;
  hidden_root_cause_metrics: {
    total_hidden: number;
    top_1_accuracy: number;
    top_3_accuracy: number;
  };
  unseen_category_metrics?: {
    total_evaluated: number;
    top_1_accuracy: number;
    top_3_accuracy: number;
    mean_reciprocal_rank: number;
  } | null;
}

export interface SystemStatus {
  status: string;
  database: string;
  service: string;
  dataset_statistics?: {
    total_runs: number;
    successful_runs: number;
    failed_runs: number;
    total_checkpoints: number;
  };
  last_trained_at?: string | null;
  model_version?: string;
}
