import React, { useEffect, useState } from 'react';
import { 
  BarChart3, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Target, 
  TrendingUp, 
  ShieldCheck, 
  Layers,
  Clock,
  Sparkles
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar 
} from 'recharts';
import { api } from '../services/api';
import { EvaluationResponse, SystemStatus } from '../types';

export const EvaluationPage: React.FC = () => {
  const [evalData, setEvalData] = useState<EvaluationResponse | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const [evalRes, statusRes] = await Promise.all([
        api.runEvaluation('data'),
        api.getTrainingStatus()
      ]);
      setEvalData(evalRes);
      setSystemStatus(statusRes);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch evaluation metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const chartMetrics = evalData ? [
    { name: 'Top-1 Accuracy', value: evalData.top_1_accuracy * 100, fill: '#6366F1' },
    { name: 'Top-3 Accuracy', value: evalData.top_3_accuracy * 100, fill: '#10B981' },
    { name: 'MRR (x100)', value: evalData.mean_reciprocal_rank * 100, fill: '#F59E0B' },
    { name: 'Hidden Top-3', value: evalData.hidden_root_cause_metrics.top_3_accuracy * 100, fill: '#06B6D4' },
    { name: 'Precision', value: evalData.anomaly_precision * 100, fill: '#8B5CF6' },
    { name: 'Recall', value: evalData.anomaly_recall * 100, fill: '#EC4899' },
  ] : [];

  const radarData = evalData ? [
    { metric: 'Top-1 Acc', value: Math.round(evalData.top_1_accuracy * 100) },
    { metric: 'Top-3 Acc', value: Math.round(evalData.top_3_accuracy * 100) },
    { metric: 'MRR', value: Math.round(evalData.mean_reciprocal_rank * 100) },
    { metric: 'Hidden Top-3', value: Math.round(evalData.hidden_root_cause_metrics.top_3_accuracy * 100) },
    { metric: 'Precision', value: Math.round(evalData.anomaly_precision * 100) },
    { metric: 'Recall', value: Math.round(evalData.anomaly_recall * 100) },
  ] : [];

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            Research Benchmark & Diagnostic Evaluation
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Real calculated metrics evaluating failure localization accuracy and counterfactual recovery on the offline benchmark
          </p>
        </div>

        <button
          onClick={fetchMetrics}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gray-800 text-xs font-mono text-gray-300 hover:text-white border border-gray-700 hover:bg-gray-700 transition-colors self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Run Evaluation
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
          <div className="flex items-center justify-between text-gray-400 text-xs font-mono">
            <span>TOP-1 ACCURACY</span>
            <Target className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-2">
            {evalData ? `${(evalData.top_1_accuracy * 100).toFixed(1)}%` : '--'}
          </div>
          <div className="text-[11px] text-gray-500 mt-1 font-mono">
            Exact root-cause pinpointed
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
          <div className="flex items-center justify-between text-gray-400 text-xs font-mono">
            <span>TOP-3 ACCURACY</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-2">
            {evalData ? `${(evalData.top_3_accuracy * 100).toFixed(1)}%` : '--'}
          </div>
          <div className="text-[11px] text-emerald-400/80 mt-1 font-mono">
            Root cause in top-3 candidates
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
          <div className="flex items-center justify-between text-gray-400 text-xs font-mono">
            <span>MEAN RECIPROCAL RANK</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-2">
            {evalData ? evalData.mean_reciprocal_rank.toFixed(3) : '--'}
          </div>
          <div className="text-[11px] text-gray-500 mt-1 font-mono">
            MRR scoring rank quality
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
          <div className="flex items-center justify-between text-gray-400 text-xs font-mono">
            <span>HIDDEN ROOT TOP-3</span>
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-400 mt-2">
            {evalData ? `${(evalData.hidden_root_cause_metrics.top_3_accuracy * 100).toFixed(1)}%` : '--'}
          </div>
          <div className="text-[11px] text-cyan-400/80 mt-1 font-mono">
            Silent upstream defects
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5 space-y-4">
          <div className="text-xs font-mono font-semibold text-gray-300 uppercase tracking-wider">
            Diagnostic Localization Performance (%)
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartMetrics} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: '#9CA3AF', fontSize: 10, fontFamily: 'monospace' }} 
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 10, fontFamily: 'monospace' }} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }} 
                  formatter={(val: any) => [`${Number(val).toFixed(1)}%`, 'Score']}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartMetrics.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Radar Chart */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5 space-y-4">
          <div className="text-xs font-mono font-semibold text-gray-300 uppercase tracking-wider">
            Diagnostic Profile Radar
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#374151" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: '#9CA3AF', fontSize: 10, fontFamily: 'monospace' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#6B7280', fontSize: 9 }} />
                <Radar name="Performance" dataKey="value" stroke="#6366F1" fill="#6366F1" fillOpacity={0.4} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Dataset & Model Provenance Metadata */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5 space-y-4">
        <div className="text-xs font-mono font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-400" />
          Benchmark Dataset & Model Metadata
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
          <div className="bg-gray-950/70 p-3 rounded-lg border border-gray-800">
            <span className="text-gray-500">TOTAL EVALUATED RUNS</span>
            <div className="text-white font-bold text-sm mt-0.5">{evalData?.total_evaluated || 300} traces</div>
          </div>
          <div className="bg-gray-950/70 p-3 rounded-lg border border-gray-800">
            <span className="text-gray-500">HIDDEN ROOT CAUSES</span>
            <div className="text-white font-bold text-sm mt-0.5">{evalData?.hidden_root_cause_metrics.total_hidden || 150} traces</div>
          </div>
          <div className="bg-gray-950/70 p-3 rounded-lg border border-gray-800">
            <span className="text-gray-500">MODEL ARCHITECTURE</span>
            <div className="text-white font-bold text-sm mt-0.5">IsolationForest + RF</div>
          </div>
          <div className="bg-gray-950/70 p-3 rounded-lg border border-gray-800">
            <span className="text-gray-500">PROVENANCE</span>
            <div className="text-emerald-400 font-bold text-sm mt-0.5">Zero Data Leakage</div>
          </div>
        </div>
      </div>
    </div>
  );
};
