import { 
  Run, 
  Diagnosis, 
  Checkpoint, 
  ReplayResponse, 
  CompareResponse, 
  EvaluationResponse, 
  SystemStatus 
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function fetchJSON<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {})
      }
    });

    if (!res.ok) {
      let errorMsg = `HTTP Error ${res.status}: ${res.statusText}`;
      try {
        const errorData = await res.json();
        if (errorData.detail) {
          errorMsg = typeof errorData.detail === 'string' 
            ? errorData.detail 
            : JSON.stringify(errorData.detail);
        }
      } catch (e) {
        // Fallback to text
      }
      throw new Error(errorMsg);
    }

    return await res.json();
  } catch (err: any) {
    console.error(`API Request failed for ${url}:`, err);
    throw err;
  }
}

export const api = {
  getHealth: () => fetchJSON<{ status: string; database: string; service: string }>('/health'),

  getRuns: (params?: { skip?: number; limit?: number; status?: string; task_type?: string }) => {
    const q = new URLSearchParams();
    if (params?.skip !== undefined) q.append('skip', String(params.skip));
    if (params?.limit !== undefined) q.append('limit', String(params.limit));
    if (params?.status) q.append('status', params.status);
    if (params?.task_type) q.append('task_type', params.task_type);
    const queryString = q.toString() ? `?${q.toString()}` : '';
    return fetchJSON<Run[]>(`/runs${queryString}`);
  },

  getRun: (runId: string) => fetchJSON<Run>(`/runs/${runId}`),

  getRunCheckpoints: (runId: string) => fetchJSON<Checkpoint[]>(`/runs/${runId}/checkpoints`),

  diagnoseRun: (runId: string) => fetchJSON<Diagnosis>(`/runs/${runId}/diagnose`, { method: 'POST' }),

  getDiagnosis: (runId: string) => fetchJSON<Diagnosis>(`/runs/${runId}/diagnosis`),

  replayRun: (runId: string, payload: {
    checkpoint_step_id?: string;
    checkpoint_sequence_number?: number;
    alternative_action: Record<string, any>;
  }) => fetchJSON<ReplayResponse>(`/runs/${runId}/replay`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),

  compareRuns: (baseRunId: string, targetRunId: string) => fetchJSON<CompareResponse>(`/runs/${baseRunId}/compare`, {
    method: 'POST',
    body: JSON.stringify({ target_run_id: targetRunId })
  }),

  trainModel: (payload?: { holdout_categories?: string[]; test_ratio?: number; val_ratio?: number }) => 
    fetchJSON<any>('/model/train', {
      method: 'POST',
      body: JSON.stringify(payload || {})
    }),

  runEvaluation: (dataDir: string = 'data') => fetchJSON<EvaluationResponse>('/evaluation/run', {
    method: 'POST',
    body: JSON.stringify({ data_dir: dataDir })
  }),

  getTrainingStatus: () => fetchJSON<SystemStatus>('/training/status'),

  getSupabaseStatus: () => fetchJSON<{
    project_id: string;
    supabase_url: string;
    database_host: string;
    jwks_url?: string;
    has_publishable_key: boolean;
    has_secret_key: boolean;
    has_anon_key: boolean;
    has_service_role_key: boolean;
    has_db_password: boolean;
    client_connected: boolean;
    api_reachable: boolean;
    is_database_connected: boolean;
    provider: string;
  }>('/supabase/status'),
};
