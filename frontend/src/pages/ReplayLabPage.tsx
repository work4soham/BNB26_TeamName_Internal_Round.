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
          className="text-xs text-stone-500 hover:text-burgundy-900 flex items-center gap-1 font-mono transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>

        <div className="flex items-center gap-2 text-xs font-mono text-stone-700 bg-white px-3 py-1.5 rounded-lg border border-burgundy-100 shadow-sm">
          <Bookmark className="w-3.5 h-3.5 text-burgundy-700" />
          <span>Active Run: <strong>{runId}</strong></span>
        </div>
      </div>

      {/* Hero Header */}
      <div>
        <h2 className="text-xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
          <RotateCcw className="w-5 h-5 text-burgundy-700" />
          Checkpointed Counterfactual Replay Lab
        </h2>
        <p className="text-xs text-stone-500 mt-1">
          Resume execution from a historical checkpoint, inject structured alternative inputs, and evaluate downstream recovery without recomputing unaffected steps.
        </p>
      </div>

      {/* Main Grid: Checkpoint Picker + Action Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Step Selector (4 cols) */}
        <div className="lg:col-span-4 rounded-xl border border-burgundy-100 bg-white p-5 space-y-4 shadow-sm">
          <div className="text-xs font-mono font-semibold text-stone-800 uppercase tracking-wider flex items-center justify-between">
            <span>Select Checkpoint Step</span>
            <span className="text-[10px] text-burgundy-700 font-bold bg-burgundy-50 px-2 py-0.5 rounded border border-burgundy-200">{run?.steps?.length || 0} Steps</span>
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
                      ? 'bg-burgundy-50 border-burgundy-600 text-burgundy-950 font-bold shadow-sm'
                      : 'bg-stone-50 border-stone-200 text-stone-600 hover:text-burgundy-950 hover:bg-burgundy-50/40'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-5 text-center text-stone-400 font-bold">{step.sequence_number}</span>
                    <span className="truncate">{step.action || step.tool_name}</span>
                  </div>
                  <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded font-medium ${
                    step.status === 'failed' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    {step.status}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="text-[11px] text-stone-600 bg-stone-50 p-3 rounded-lg border border-stone-200 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-burgundy-700 shrink-0 mt-0.5" />
            <span>Steps 1 to {Math.max(selectedSeq - 1, 0)} will be reused verbatim with zero recomputation.</span>
          </div>
        </div>

        {/* Right: Alternative Action Configuration (8 cols) */}
        <div className="lg:col-span-8 rounded-xl border border-burgundy-100 bg-white p-6 space-y-6 shadow-sm">
          <div>
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-600" />
              Configure Alternative Action at Step {selectedSeq} ({currentStep?.action || 'Selected Step'})
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Specify structured key-value parameters to replace the suspected root-cause state.
            </p>
          </div>

          {/* Current State Snapshot */}
          <div className="bg-stone-50 rounded-lg border border-stone-200 p-3.5">
            <div className="text-[11px] font-mono text-stone-500 uppercase tracking-widest mb-1 font-medium">
              CURRENT STEP OUTPUT STATE (BEFORE REPLAY)
            </div>
            <pre className="text-xs font-mono text-stone-800 overflow-x-auto max-h-32">
              {JSON.stringify(currentStep?.output_state || {}, null, 2)}
            </pre>
          </div>

          {/* Form: Alternative Action */}
          <div className="space-y-4 bg-burgundy-50/30 p-4 rounded-xl border border-burgundy-100">
            <div className="text-xs font-mono font-semibold text-stone-800 uppercase">
              Counterfactual Mutation Fields
            </div>

            {/* Currency override field */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-stone-600 flex items-center justify-between">
                <span>Currency Parameter (e.g. fix EUR to USD)</span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-semibold">Recommended Fix</span>
              </label>
              <div className="flex gap-2">
                {['USD', 'EUR', 'GBP'].map((curr) => (
                  <button
                    key={curr}
                    type="button"
                    onClick={() => setCurrency(curr)}
                    className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all border ${
                      currency === curr
                        ? 'bg-burgundy-700 text-white border-burgundy-700 shadow-md shadow-burgundy-700/20'
                        : 'bg-white text-stone-700 border-stone-300 hover:border-burgundy-300 hover:text-burgundy-900'
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
                <label className="text-xs font-mono text-stone-600">Additional Field Key</label>
                <input
                  type="text"
                  placeholder="e.g. travel_class"
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  className="w-full mt-1 bg-white text-xs font-mono text-stone-800 px-3 py-2 rounded-lg border border-stone-200 focus:outline-none focus:border-burgundy-600"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-stone-600">Field Value</label>
                <input
                  type="text"
                  placeholder="e.g. Premium"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  className="w-full mt-1 bg-white text-xs font-mono text-stone-800 px-3 py-2 rounded-lg border border-stone-200 focus:outline-none focus:border-burgundy-600"
                />
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              <button
                onClick={handleReplay}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-burgundy-700 hover:bg-burgundy-800 text-white font-semibold text-xs py-3 rounded-lg shadow-md shadow-burgundy-700/20 transition-all cursor-pointer disabled:opacity-50"
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
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Replay Result Banner */}
      {replayResult && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50/60 p-6 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-200/80 pb-4">
            <div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold">
                COUNTERFACTUAL EXECUTION COMPLETED
              </span>
              <h3 className="text-xl font-bold font-mono text-stone-900 mt-1">
                Replay Run: {replayResult.replay_run_id}
              </h3>
            </div>

            <button
              onClick={() => onNavigateToCompare(replayResult.original_run_id, replayResult.replay_run_id)}
              className="flex items-center gap-2 bg-burgundy-700 hover:bg-burgundy-800 text-white font-semibold text-xs px-4 py-2 rounded-lg shadow-md shadow-burgundy-700/20 transition-colors"
            >
              <GitCompare className="w-4 h-4" />
              <span>Compare Traces Side by Side</span>
            </button>
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
            <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-sm">
              <span className="text-stone-400 font-medium">ORIGINAL OUTCOME</span>
              <div className="text-rose-600 font-bold text-base mt-1 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                {replayResult.original_outcome.toUpperCase()}
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-sm">
              <span className="text-stone-400 font-medium">REPLAY OUTCOME</span>
              <div className="text-emerald-700 font-bold text-base mt-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                {replayResult.alternative_outcome.toUpperCase()}
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-sm">
              <span className="text-stone-400 font-medium">PREFIX REUSED</span>
              <div className="text-stone-900 font-bold text-base mt-1">
                {replayResult.reused_steps.count} steps (0ms recompute)
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-sm">
              <span className="text-stone-400 font-medium">REPLAY LATENCY</span>
              <div className="text-burgundy-800 font-bold text-base mt-1">
                {replayResult.execution_time_ms} ms
              </div>
            </div>
          </div>

          {replayResult.final_output && (
            <div className="p-3.5 rounded-lg bg-white border border-emerald-200 text-emerald-900 text-xs font-mono shadow-sm">
              <strong>Execution Output: </strong>
              {replayResult.final_output}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
