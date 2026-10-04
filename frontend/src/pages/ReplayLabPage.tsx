import React, { useEffect, useState } from 'react';
import { 
  RotateCcw, 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle, 
  Bookmark, 
  Cpu, 
  Clock, 
  GitCompare, 
  Send,
  Zap,
  Info
} from 'lucide-react';
import { api } from '../services/api';
import { Run, Checkpoint, ReplayResponse } from '../types';

interface ReplayLabPageProps {
  initialRunId?: string;
  initialSeq?: number;
  onBack: () => void;
  onNavigateToCompare: (baseRunId: string, targetRunId: string) => void;
}

export const ReplayLabPage: React.FC<ReplayLabPageProps> = ({
  initialRunId = 'demo-run-currency-mismatch',
  initialSeq = 5,
  onBack,
  onNavigateToCompare
}) => {
  const [runId, setRunId] = useState<string>(initialRunId);
  const [selectedSeq, setSelectedSeq] = useState<number>(initialSeq);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [run, setRun] = useState<Run | null>(null);

  // Structured alternative action form state
  const [currency, setCurrency] = useState<string>('USD');
  const [customKey, setCustomKey] = useState<string>('');
  const [customValue, setCustomValue] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [replayResult, setReplayResult] = useState<ReplayResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (runId) {
      api.getRun(runId)
        .then(setRun)
        .catch(() => null);

      api.getRunCheckpoints(runId)
        .then(setCheckpoints)
        .catch(() => setCheckpoints([]));
    }
  }, [runId]);

  const handleReplay = async () => {
    setLoading(true);
    setError(null);
    try {
      const altAction: Record<string, any> = {
        currency: currency
      };
      if (customKey.trim() && customValue.trim()) {
        altAction[customKey.trim()] = customValue.trim();
      }

      const res = await api.replayRun(runId, {
        checkpoint_sequence_number: selectedSeq,
        alternative_action: altAction
      });
      setReplayResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to execute counterfactual replay');
    } finally {
      setLoading(false);
    }
  };

  const currentStep = run?.steps?.find(s => s.sequence_number === selectedSeq);

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

        <div className="flex items-center gap-2 text-xs font-mono text-gray-400 bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-800">
          <Bookmark className="w-3.5 h-3.5 text-indigo-400" />
          <span>Active Run: <strong>{runId}</strong></span>
        </div>
      </div>

      {/* Hero Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <RotateCcw className="w-5 h-5 text-indigo-400" />
          Checkpointed Counterfactual Replay Lab
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          Resume execution from a historical checkpoint, inject structured alternative inputs, and evaluate downstream recovery without recomputing unaffected steps.
        </p>
      </div>

      {/* Main Grid: Checkpoint Picker + Action Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Step Selector (4 cols) */}
        <div className="lg:col-span-4 rounded-xl border border-gray-800 bg-gray-900/60 p-5 space-y-4">
          <div className="text-xs font-mono font-semibold text-gray-300 uppercase tracking-wider flex items-center justify-between">
            <span>Select Checkpoint Step</span>
            <span className="text-[10px] text-indigo-400 font-bold">{run?.steps?.length || 0} Steps</span>
          </div>

          <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
            {run?.steps?.map((step) => {
              const isSelected = selectedSeq === step.sequence_number;
              return (
                <div
                  key={step.step_id}
                  onClick={() => setSelectedSeq(step.sequence_number)}
                  className={`cursor-pointer rounded-lg p-2.5 text-xs font-mono transition-all border flex items-center justify-between ${
                    isSelected
                      ? 'bg-indigo-600/20 border-indigo-500 text-white font-semibold'
                      : 'bg-gray-950/60 border-gray-800/80 text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-5 text-center text-gray-500 font-bold">{step.sequence_number}</span>
                    <span className="truncate">{step.action || step.tool_name}</span>
                  </div>
                  <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${
                    step.status === 'failed' ? 'bg-rose-500/20 text-rose-400' : 'bg-gray-800 text-gray-400'
                  }`}>
                    {step.status}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="text-[11px] text-gray-500 bg-gray-950/80 p-3 rounded border border-gray-800 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
            <span>Steps 1 to {Math.max(selectedSeq - 1, 0)} will be reused verbatim with zero recomputation.</span>
          </div>
        </div>

        {/* Right: Alternative Action Configuration (8 cols) */}
        <div className="lg:col-span-8 rounded-xl border border-gray-800 bg-gray-900/60 p-6 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Configure Alternative Action at Step {selectedSeq} ({currentStep?.action || 'Selected Step'})
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Specify structured key-value parameters to replace the suspected root-cause state.
            </p>
          </div>

          {/* Current State Snapshot */}
          <div className="bg-[#070A0F] rounded-lg border border-gray-800 p-3.5">
            <div className="text-[11px] font-mono text-gray-500 uppercase tracking-widest mb-1">
              CURRENT STEP OUTPUT STATE (BEFORE REPLAY)
            </div>
            <pre className="text-xs font-mono text-gray-300 overflow-x-auto max-h-32">
              {JSON.stringify(currentStep?.output_state || {}, null, 2)}
            </pre>
          </div>

          {/* Form: Alternative Action */}
          <div className="space-y-4 bg-gray-950/60 p-4 rounded-xl border border-gray-800/80">
            <div className="text-xs font-mono font-semibold text-gray-300 uppercase">
              Counterfactual Mutation Fields
            </div>

            {/* Currency override field */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-gray-400 flex items-center justify-between">
                <span>Currency Parameter (e.g. fix EUR to USD)</span>
                <span className="text-[10px] text-emerald-400 font-semibold">Recommended Fix</span>
              </label>
              <div className="flex gap-2">
                {['USD', 'EUR', 'GBP'].map((curr) => (
                  <button
                    key={curr}
                    type="button"
                    onClick={() => setCurrency(curr)}
                    className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all border ${
                      currency === curr
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                        : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-white'
                    }`}
                  >
                    {curr}
                  </button>
                ))}
              </div>
            </div>

            {/* Additional structured key-value override */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-xs font-mono text-gray-400">Additional Field Key</label>
                <input
                  type="text"
                  placeholder="e.g. travel_class"
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  className="w-full mt-1 bg-[#070A0F] text-xs font-mono text-gray-200 px-3 py-2 rounded border border-gray-800 focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-gray-400">Field Value</label>
                <input
                  type="text"
                  placeholder="e.g. Premium"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  className="w-full mt-1 bg-[#070A0F] text-xs font-mono text-gray-200 px-3 py-2 rounded border border-gray-800 focus:outline-none focus:border-indigo-500/50"
                />
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              <button
                onClick={handleReplay}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-xs py-3 rounded-lg shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Execute Replay from Step {selectedSeq}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-lg bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Replay Result Banner */}
      {replayResult && (
        <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/30 via-gray-900 to-[#0B0F17] p-6 space-y-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-4">
            <div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold">
                COUNTERFACTUAL EXECUTION COMPLETED
              </span>
              <h3 className="text-xl font-bold font-mono text-white mt-1">
                Replay Run: {replayResult.replay_run_id}
              </h3>
            </div>

            <button
              onClick={() => onNavigateToCompare(replayResult.original_run_id, replayResult.replay_run_id)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2 rounded-lg shadow-md shadow-indigo-600/20 transition-colors"
            >
              <GitCompare className="w-4 h-4" />
              <span>Compare Traces Side by Side</span>
            </button>
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
            <div className="bg-gray-950/70 p-3.5 rounded-xl border border-gray-800">
              <span className="text-gray-500">ORIGINAL OUTCOME</span>
              <div className="text-rose-400 font-bold text-base mt-1 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                {replayResult.original_outcome.toUpperCase()}
              </div>
            </div>

            <div className="bg-gray-950/70 p-3.5 rounded-xl border border-gray-800">
              <span className="text-gray-500">REPLAY OUTCOME</span>
              <div className="text-emerald-400 font-bold text-base mt-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                {replayResult.alternative_outcome.toUpperCase()}
              </div>
            </div>

            <div className="bg-gray-950/70 p-3.5 rounded-xl border border-gray-800">
              <span className="text-gray-500">PREFIX REUSED</span>
              <div className="text-white font-bold text-base mt-1">
                {replayResult.reused_steps.count} steps (0ms recompute)
              </div>
            </div>

            <div className="bg-gray-950/70 p-3.5 rounded-xl border border-gray-800">
              <span className="text-gray-500">REPLAY LATENCY</span>
              <div className="text-indigo-300 font-bold text-base mt-1">
                {replayResult.execution_time_ms} ms
              </div>
            </div>
          </div>

          {replayResult.final_output && (
            <div className="p-3.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-mono">
              <strong>Execution Output: </strong>
              {replayResult.final_output}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
