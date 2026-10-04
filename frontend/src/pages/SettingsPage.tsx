import React, { useEffect, useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Database, 
  Cpu, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Server, 
  Layers,
  Terminal,
  ShieldCheck,
  Cloud,
  Key,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { api } from '../services/api';
import { SystemStatus } from '../types';

export const SettingsPage: React.FC = () => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [supabaseStatus, setSupabaseStatus] = useState<{
    project_id: string;
    supabase_url: string;
    database_host: string;
    jwks_url?: string;
    has_publishable_key?: boolean;
    has_secret_key?: boolean;
    has_anon_key: boolean;
    has_service_role_key: boolean;
    has_db_password: boolean;
    client_connected: boolean;
    api_reachable?: boolean;
    is_database_connected: boolean;
    provider: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [retraining, setRetraining] = useState(false);
  const [retrainSuccess, setRetrainSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchStatus = () => {
    setLoading(true);
    Promise.all([
      api.getTrainingStatus().then(setStatus).catch(() => null),
      api.getSupabaseStatus().then(setSupabaseStatus).catch(() => null)
    ])
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRetrain = async () => {
    setRetraining(true);
    setRetrainSuccess(null);
    setError(null);
    try {
      const res = await api.trainModel({
        holdout_categories: ['wrong_currency'],
        test_ratio: 0.2,
        val_ratio: 0.1
      });
      setRetrainSuccess(`Model retrained successfully in ${res.training_duration_seconds}s. Top-3 accuracy: ${(res.test_metrics.top_3_accuracy * 100).toFixed(1)}%.`);
      fetchStatus();
    } catch (err: any) {
      setError(err.message || 'Retraining failed');
    } finally {
      setRetraining(false);
    }
  };

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const projectId = supabaseStatus?.project_id || 'lmowqbpuupkrxvtorknk';
  const supabaseUrl = supabaseStatus?.supabase_url || `https://${projectId}.supabase.co`;
  const dbHost = supabaseStatus?.database_host || `db.${projectId}.supabase.co`;

  return (
    <div className="space-y-8 pb-16 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-burgundy-700" />
          System Settings & Platform Configuration
        </h2>
        <p className="text-xs text-stone-500 mt-1">
          Backend connectivity, Supabase Cloud integration, ML retraining triggers, and deployment environment
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {retrainSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{retrainSuccess}</span>
        </div>
      )}

      {/* Supabase Cloud Integration Card */}
      <div className="rounded-xl border border-burgundy-200 bg-white p-6 space-y-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-burgundy-50 border border-burgundy-200 flex items-center justify-center text-burgundy-700">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900 uppercase font-mono tracking-wider flex items-center gap-2">
                Supabase Integration
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-burgundy-100 text-burgundy-800 font-sans font-semibold">
                  Project: {projectId}
                </span>
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Managed PostgreSQL database, trace storage, and client API synchronization
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchStatus}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 font-mono text-xs transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Refresh Status
            </button>
            <a
              href={`https://supabase.com/dashboard/project/${projectId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-burgundy-700 hover:bg-burgundy-800 text-white font-mono text-xs font-semibold transition-colors shadow-sm"
            >
              Dashboard
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
          <div className="bg-stone-50 p-3.5 rounded-lg border border-stone-200">
            <div className="flex items-center justify-between">
              <span className="text-stone-400 text-[10px] font-medium">PROJECT ID</span>
              <button 
                onClick={() => handleCopy(projectId, 'pid')} 
                className="text-stone-400 hover:text-burgundy-700 transition-colors"
              >
                {copiedKey === 'pid' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="text-burgundy-800 font-bold mt-1 truncate">{projectId}</div>
          </div>

          <div className="bg-stone-50 p-3.5 rounded-lg border border-stone-200">
            <div className="flex items-center justify-between">
              <span className="text-stone-400 text-[10px] font-medium">DATABASE HOST</span>
              <button 
                onClick={() => handleCopy(dbHost, 'host')} 
                className="text-stone-400 hover:text-burgundy-700 transition-colors"
              >
                {copiedKey === 'host' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="text-stone-800 font-bold mt-1 truncate">{dbHost}</div>
          </div>

          <div className="bg-stone-50 p-3.5 rounded-lg border border-stone-200">
            <span className="text-stone-400 text-[10px] font-medium">ACTIVE PERSISTENCE</span>
            <div className="mt-1 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${supabaseStatus?.is_database_connected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="font-bold text-stone-900">
                {supabaseStatus?.provider || 'SQLite (Local Fallback)'}
              </span>
            </div>
          </div>
        </div>

        {/* Credentials Status Badges */}
        <div className="bg-burgundy-50/50 p-4 rounded-lg border border-burgundy-100 space-y-3">
          <div className="text-xs font-semibold text-burgundy-950 flex items-center gap-2">
            <Key className="w-3.5 h-3.5 text-burgundy-700" />
            <span>Connection Credentials Status</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded bg-white border border-burgundy-100 flex items-center justify-between">
              <span className="text-stone-600 text-[11px]">Publishable Key:</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                supabaseStatus?.has_publishable_key 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : 'bg-stone-100 text-stone-600'
              }`}>
                {supabaseStatus?.has_publishable_key ? 'CONFIGURED' : 'UNSET'}
              </span>
            </div>

            <div className="p-2.5 rounded bg-white border border-burgundy-100 flex items-center justify-between">
              <span className="text-stone-600 text-[11px]">Secret Key:</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                supabaseStatus?.has_secret_key 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : 'bg-stone-100 text-stone-600'
              }`}>
                {supabaseStatus?.has_secret_key ? 'CONFIGURED' : 'UNSET'}
              </span>
            </div>

            <div className="p-2.5 rounded bg-white border border-burgundy-100 flex items-center justify-between">
              <span className="text-stone-600 text-[11px]">Client & API:</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                supabaseStatus?.api_reachable 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : supabaseStatus?.client_connected 
                    ? 'bg-amber-100 text-amber-800' 
                    : 'bg-stone-100 text-stone-600'
              }`}>
                {supabaseStatus?.api_reachable ? 'AUTHENTICATED' : supabaseStatus?.client_connected ? 'CONNECTED' : 'STANDBY'}
              </span>
            </div>

            <div className="p-2.5 rounded bg-white border border-burgundy-100 flex items-center justify-between">
              <span className="text-stone-600 text-[11px]">PostgreSQL:</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                supabaseStatus?.is_database_connected 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : 'bg-stone-100 text-stone-600'
              }`}>
                {supabaseStatus?.is_database_connected ? 'CONNECTED' : 'LOCAL FALLBACK'}
              </span>
            </div>
          </div>

          <div className="text-[11px] text-stone-600 leading-relaxed font-sans pt-1">
            <span className="font-semibold text-burgundy-800">Quick Connect: </span>
            To connect PostgreSQL directly to your project, add <code className="px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200 font-mono text-[10px] text-burgundy-900">SUPABASE_DB_PASSWORD=your_password</code> or <code className="px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200 font-mono text-[10px] text-burgundy-900">DATABASE_URL=postgresql://postgres:your_password@db.{projectId}.supabase.co:5432/postgres</code> to your <code className="font-mono text-stone-800">.env</code> file. To test and migrate data run <code className="font-mono text-burgundy-800">python scripts/supabase_sync.py</code>.
          </div>
        </div>
      </div>

      {/* Connectivity Card */}
      <div className="rounded-xl border border-burgundy-100 bg-white p-6 space-y-4 shadow-sm">
        <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2 uppercase font-mono tracking-wider">
          <Server className="w-4 h-4 text-burgundy-700" />
          FastAPI Engine Connection
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="bg-stone-50 p-3 rounded-lg border border-stone-200 shadow-sm">
            <span className="text-stone-400 text-[10px] font-medium">API TARGET URL</span>
            <div className="text-burgundy-800 font-bold mt-1 truncate">{apiUrl}</div>
          </div>
          <div className="bg-stone-50 p-3 rounded-lg border border-stone-200 shadow-sm">
            <span className="text-stone-400 text-[10px] font-medium">DATABASE ADAPTER</span>
            <div className="text-emerald-700 font-bold mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              SQLAlchemy 2.0 with Auto-Pooling & Pre-Ping
            </div>
          </div>
        </div>
      </div>

      {/* Retrain ML Models Card */}
      <div className="rounded-xl border border-burgundy-100 bg-white p-6 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2 uppercase font-mono tracking-wider">
              <Cpu className="w-4 h-4 text-burgundy-700" />
              Zero-Leakage Retraining Pipeline
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Partitions dataset into Train/Val/Test/Held-out splits, fits Feature Extractor, IsolationForest, and RandomForest.
            </p>
          </div>

          <button
            onClick={handleRetrain}
            disabled={retraining}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-burgundy-700 hover:bg-burgundy-800 text-white font-semibold text-xs font-mono transition-colors shadow-md shadow-burgundy-700/20 disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${retraining ? 'animate-spin' : ''}`} />
            {retraining ? 'Retraining Pipeline...' : 'Retrain ML Models'}
          </button>
        </div>

        {status && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono pt-2">
            <div className="bg-stone-50 p-3 rounded-lg border border-stone-200 shadow-sm">
              <span className="text-stone-400 text-[10px] font-medium">TOTAL RUNS</span>
              <div className="text-stone-900 font-bold text-sm mt-0.5">{status.dataset_statistics?.total_runs}</div>
            </div>
            <div className="bg-stone-50 p-3 rounded-lg border border-stone-200 shadow-sm">
              <span className="text-stone-400 text-[10px] font-medium">CHECKPOINTS</span>
              <div className="text-stone-900 font-bold text-sm mt-0.5">{status.dataset_statistics?.total_checkpoints}</div>
            </div>
            <div className="bg-stone-50 p-3 rounded-lg border border-stone-200 shadow-sm">
              <span className="text-stone-400 text-[10px] font-medium">MODEL VERSION</span>
              <div className="text-stone-900 font-bold text-sm mt-0.5">{status.model_version || 'v1.0.0-rc'}</div>
            </div>
            <div className="bg-stone-50 p-3 rounded-lg border border-stone-200 shadow-sm">
              <span className="text-stone-400 text-[10px] font-medium">LAST TRAINED</span>
              <div className="text-stone-700 font-bold text-sm mt-0.5 truncate">{status.last_trained_at || 'Just now'}</div>
            </div>
          </div>
        )}
      </div>

      {/* Deployment & Production Guide Card */}
      <div className="rounded-xl border border-burgundy-100 bg-white p-6 space-y-3 shadow-sm">
        <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2 uppercase font-mono tracking-wider">
          <Terminal className="w-4 h-4 text-emerald-600" />
          Production Deployment Targets
        </h3>

        <div className="space-y-2 text-xs font-mono text-stone-700">
          <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 flex items-center justify-between shadow-sm">
            <span className="font-medium">Frontend Hosting (Vercel)</span>
            <span className="text-burgundy-800 font-bold">VITE_API_URL=https://your-api.railway.app</span>
          </div>
          <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 flex items-center justify-between shadow-sm">
            <span className="font-medium">Backend Hosting (Render / Railway)</span>
            <span className="text-emerald-700 font-bold">uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT</span>
          </div>
          <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 flex items-center justify-between shadow-sm">
            <span className="font-medium">Database (Supabase PostgreSQL)</span>
            <span className="text-burgundy-800 font-bold">DATABASE_URL=postgresql://postgres:***@db.{projectId}.supabase.co:5432/postgres</span>
          </div>
        </div>
      </div>
    </div>
  );
};
