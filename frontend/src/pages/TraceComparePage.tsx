import React, { useEffect, useState } from 'react';
import { 
  GitCompare, 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle, 
  Split, 
  Layers, 
  RotateCcw,
  Clock,
  Hash,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { CompareResponse } from '../types';

interface TraceComparePageProps {
  baseRunId: string;
  targetRunId: string;
  onBack: () => void;
  onNavigateToRunDetail: (runId: string) => void;
}

export const TraceComparePage: React.FC<TraceComparePageProps> = ({
  baseRunId,
  targetRunId,
  onBack,
  onNavigateToRunDetail
}) => {
  const [comparison, setComparison] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (baseRunId && targetRunId) {
      setLoading(true);
      setError(null);
      api.compareRuns(baseRunId, targetRunId)
        .then(setComparison)
        .catch((err) => setError(err.message || 'Failed to compare traces'))
        .finally(() => setLoading(false));
    }
  }, [baseRunId, targetRunId]);

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3 font-mono text-gray-400">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <div className="text-sm font-semibold text-gray-200">Computing Trace Divergence & State Hash Diffs...</div>
      </div>
    );
  }

  if (error || !comparison) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="text-xs text-gray-400 hover:text-white flex items-center gap-1 font-mono">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs">
          {error || 'Unable to compare traces.'}
        </div>
      </div>
    );
  }

  const { final_outcome_difference, first_meaningful_divergence } = comparison;

  return (
    <div className="space-y-8 pb-16">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-xs text-gray-400 hover:text-white flex items-center gap-1 font-mono transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateToRunDetail(baseRunId)}
            className="text-xs font-mono bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg border border-gray-700 transition-colors"
          >
            Base Run: {baseRunId.substring(0, 10)}...
          </button>
          <button
            onClick={() => onNavigateToRunDetail(targetRunId)}
            className="text-xs font-mono bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 px-3 py-1.5 rounded-lg border border-indigo-500/40 transition-colors"
          >
            Target Run: {targetRunId.substring(0, 10)}...
          </button>
        </div>
      </div>

      {/* Hero Compare Summary */}
      <div className="rounded-2xl border border-indigo-900/40 bg-gradient-to-br from-gray-900 via-[#0E1420] to-[#0B0F17] p-6 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-4">
          <div>
            <div className="text-[11px] font-mono text-indigo-400 uppercase tracking-widest font-semibold flex items-center gap-1.5">
              <GitCompare className="w-3.5 h-3.5" />
              Counterfactual Trace Divergence Analysis
            </div>
            <h2 className="text-xl font-bold font-mono text-white mt-1">
              Comparing {baseRunId} vs {targetRunId}
            </h2>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="px-2.5 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30">
              {final_outcome_difference.base_outcome.toUpperCase()}
            </span>
            <ArrowRight className="w-4 h-4 text-gray-500" />
            <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
              {final_outcome_difference.target_outcome.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
          <div className="bg-gray-950/70 p-4 rounded-xl border border-gray-800">
            <span className="text-gray-500">UNCHANGED PREFIX</span>
            <div className="text-emerald-400 font-bold text-lg mt-1">
              {comparison.unchanged_steps_count} steps
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5">Identical state hashes</div>
          </div>

          <div className="bg-gray-950/70 p-4 rounded-xl border border-gray-800">
            <span className="text-gray-500">FIRST DIVERGENCE</span>
            <div className="text-amber-400 font-bold text-lg mt-1">
              Step {first_meaningful_divergence?.sequence_number || 'N/A'}
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5">{first_meaningful_divergence?.action}</div>
          </div>

          <div className="bg-gray-950/70 p-4 rounded-xl border border-gray-800">
            <span className="text-gray-500">RECOMPUTED SUFFIX</span>
            <div className="text-indigo-300 font-bold text-lg mt-1">
              {comparison.changed_steps_count} steps
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5">Downstream effects</div>
          </div>

          <div className="bg-gray-950/70 p-4 rounded-xl border border-gray-800">
            <span className="text-gray-500">OUTCOME RECOVERY</span>
            <div className="text-emerald-400 font-bold text-lg mt-1 flex items-center gap-1.5">
              {final_outcome_difference.improved ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  RECOVERED
                </>
              ) : (
                'UNCHANGED'
              )}
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5">Counterfactual fix verified</div>
          </div>
        </div>
      </div>

      {/* Step Comparison List */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-bold text-white">Execution Divergence Walkthrough</h3>
          <p className="text-xs text-gray-400">Step-by-step state comparison showing reused prefix vs counterfactual suffix</p>
        </div>

        <div className="space-y-3">
          {/* Unchanged Prefix Section */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/10 p-4 space-y-2">
            <div className="text-xs font-mono font-semibold text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              IDENTICAL PREFIX (STEPS 1 TO {comparison.unchanged_steps_count}) — REUSED 100%
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {comparison.unchanged_steps.map((s) => (
                <div key={s.sequence_number} className="text-xs font-mono bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-800 text-gray-300 flex items-center gap-1.5">
                  <span className="text-gray-500 font-bold">{s.sequence_number}</span>
                  <span>{s.action}</span>
                  <span className="text-[10px] text-emerald-400 font-bold ml-1">✓ Reused</span>
                </div>
              ))}
            </div>
          </div>

          {/* Changed Downstream Steps */}
          {comparison.changed_steps.map((step) => {
            const isDivergence = step.sequence_number === first_meaningful_divergence?.sequence_number;
            return (
              <div
                key={step.sequence_number}
                className={`rounded-xl border p-4 transition-all ${
                  isDivergence
                    ? 'border-amber-500/60 bg-amber-950/20 shadow-md shadow-amber-500/10'
                    : 'border-gray-800 bg-gray-900/60'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-md bg-gray-800 text-xs font-mono font-bold text-gray-300 flex items-center justify-center">
                      {step.sequence_number}
                    </span>
                    <span className="text-sm font-semibold text-white">
                      {step.action}
                    </span>
                    {isDivergence && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                        FIRST MEANINGFUL DIVERGENCE (CHECKPOINT INJECTION)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className={`px-2 py-0.5 rounded ${step.base_status === 'failed' ? 'bg-rose-500/20 text-rose-400' : 'bg-gray-800 text-gray-400'}`}>
                      Original: {step.base_status || 'none'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-500" />
                    <span className={`px-2 py-0.5 rounded font-bold ${step.target_status === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                      Replay: {step.target_status}
                    </span>
                  </div>
                </div>

                {/* State Diffs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="bg-[#070A0F] p-3 rounded-lg border border-gray-800">
                    <span className="text-[10px] text-gray-500 uppercase block mb-1">ORIGINAL OUTPUT STATE</span>
                    <pre className="text-gray-400 overflow-x-auto max-h-36">
                      {JSON.stringify(step.base_output || {}, null, 2)}
                    </pre>
                  </div>

                  <div className="bg-[#070A0F] p-3 rounded-lg border border-indigo-900/40">
                    <span className="text-[10px] text-indigo-400 uppercase block mb-1">COUNTERFACTUAL REPLAY OUTPUT STATE</span>
                    <pre className="text-emerald-300 overflow-x-auto max-h-36">
                      {JSON.stringify(step.target_output || {}, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
