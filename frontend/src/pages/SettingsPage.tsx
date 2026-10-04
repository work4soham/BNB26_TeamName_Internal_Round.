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
  ShieldAlert
} from 'lucide-react';
import { api } from '../services/api';
import { SystemStatus } from '../types';

export const SettingsPage: React.FC = () => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [retraining, setRetraining] = useState(false);
  const [retrainSuccess, setRetrainSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = () => {
    setLoading(true);
    api.getTrainingStatus()
      .then(setStatus)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStatus();
  }, []);

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

  return (
    <div className="space-y-8 pb-16 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-burgundy-700" />
          System Settings & Platform Configuration
        </h2>
        <p className="text-xs text-stone-500 mt-1">
          Backend connectivity, database status, ML retraining triggers, and deployment environment
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
            <span className="text-stone-400 text-[10px] font-medium">DATABASE ENGINE</span>
            <div className="text-emerald-700 font-bold mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              SQLite (Dev) / PostgreSQL Compatible
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
            <span className="font-medium">Database (PostgreSQL)</span>
            <span className="text-amber-800 font-bold">DATABASE_URL=postgresql://user:pass@host:5432/db</span>
          </div>
        </div>
      </div>
    </div>
  );
};
