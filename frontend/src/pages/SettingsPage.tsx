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
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-indigo-400" />
          System Settings & Platform Configuration
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          Backend connectivity, database status, ML retraining triggers, and deployment environment
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {retrainSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{retrainSuccess}</span>
        </div>
      )}

      {/* Connectivity Card */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase font-mono tracking-wider">
          <Server className="w-4 h-4 text-indigo-400" />
          FastAPI Engine Connection
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="bg-gray-950/70 p-3 rounded-lg border border-gray-800">
            <span className="text-gray-500 text-[10px]">API TARGET URL</span>
            <div className="text-indigo-300 font-bold mt-1 truncate">{apiUrl}</div>
          </div>
          <div className="bg-gray-950/70 p-3 rounded-lg border border-gray-800">
            <span className="text-gray-500 text-[10px]">DATABASE ENGINE</span>
            <div className="text-emerald-400 font-bold mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              SQLite (Dev) / PostgreSQL Compatible
            </div>
          </div>
        </div>
      </div>

      {/* Retrain ML Models Card */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase font-mono tracking-wider">
              <Cpu className="w-4 h-4 text-indigo-400" />
              Zero-Leakage Retraining Pipeline
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Partitions dataset into Train/Val/Test/Held-out splits, fits Feature Extractor, IsolationForest, and RandomForest.
            </p>
          </div>

          <button
            onClick={handleRetrain}
            disabled={retraining}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs font-mono transition-colors shadow-md shadow-indigo-600/20 disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${retraining ? 'animate-spin' : ''}`} />
            {retraining ? 'Retraining Pipeline...' : 'Retrain ML Models'}
          </button>
        </div>

        {status && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono pt-2">
            <div className="bg-gray-950/70 p-3 rounded-lg border border-gray-800">
              <span className="text-gray-500 text-[10px]">TOTAL RUNS</span>
              <div className="text-white font-bold text-sm mt-0.5">{status.dataset_statistics?.total_runs}</div>
            </div>
            <div className="bg-gray-950/70 p-3 rounded-lg border border-gray-800">
              <span className="text-gray-500 text-[10px]">CHECKPOINTS</span>
              <div className="text-white font-bold text-sm mt-0.5">{status.dataset_statistics?.total_checkpoints}</div>
            </div>
            <div className="bg-gray-950/70 p-3 rounded-lg border border-gray-800">
              <span className="text-gray-500 text-[10px]">MODEL VERSION</span>
              <div className="text-white font-bold text-sm mt-0.5">{status.model_version || 'v1.0.0-rc'}</div>
            </div>
            <div className="bg-gray-950/70 p-3 rounded-lg border border-gray-800">
              <span className="text-gray-500 text-[10px]">LAST TRAINED</span>
              <div className="text-gray-300 font-bold text-sm mt-0.5 truncate">{status.last_trained_at || 'Just now'}</div>
            </div>
          </div>
        )}
      </div>

      {/* Deployment & Production Guide Card */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase font-mono tracking-wider">
          <Terminal className="w-4 h-4 text-emerald-400" />
          Production Deployment Targets
        </h3>

        <div className="space-y-2 text-xs font-mono text-gray-300">
          <div className="p-3 rounded-lg bg-gray-950/80 border border-gray-800 flex items-center justify-between">
            <span>Frontend Hosting (Vercel)</span>
            <span className="text-indigo-400 font-bold">VITE_API_URL=https://your-api.railway.app</span>
          </div>
          <div className="p-3 rounded-lg bg-gray-950/80 border border-gray-800 flex items-center justify-between">
            <span>Backend Hosting (Render / Railway)</span>
            <span className="text-emerald-400 font-bold">uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT</span>
          </div>
          <div className="p-3 rounded-lg bg-gray-950/80 border border-gray-800 flex items-center justify-between">
            <span>Database (PostgreSQL)</span>
            <span className="text-amber-400 font-bold">DATABASE_URL=postgresql://user:pass@host:5432/db</span>
          </div>
        </div>
      </div>
    </div>
  );
};
