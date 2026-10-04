import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, 
  Terminal, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Bookmark, 
  Calendar, 
  Cpu, 
  GitCompare,
  Code
} from 'lucide-react';
import { api } from '../services/api';
import { Run } from '../types';
import { StepTimeline } from '../components/StepTimeline';

interface RunDetailPageProps {
  runId: string;
  onBack: () => void;
  onNavigateToDiagnosis: (runId: string) => void;
  onNavigateToReplay: (runId: string, seq?: number) => void;
  onNavigateToCompare?: (baseRunId: string, targetRunId: string) => void;
}

export const RunDetailPage: React.FC<RunDetailPageProps> = ({
  runId,
  onBack,
  onNavigateToDiagnosis,
  onNavigateToReplay,
  onNavigateToCompare
}) => {
  const [run, setRun] = useState<Run | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.getRun(runId)
      .then(setRun)
      .catch((err) => setError(err.message || 'Failed to load run details'))
      .finally(() => setLoading(false));
  }, [runId]);

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3 font-mono text-gray-400">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <div>Retrieving flight recorder trace for {runId}...</div>
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="text-xs text-gray-400 hover:text-white flex items-center gap-1 font-mono">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to runs
        </button>
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs">
          {error || 'Run not found.'}
        </div>
      </div>
    );
  }

  const steps = run.steps || [];
  const isFailed = run.status === 'failed';
  const isReplay = run.metadata?.is_replay;

  return (
    <div className="space-y-6 pb-16">
      {/* Top action row */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-xs text-gray-400 hover:text-white flex items-center gap-1 font-mono transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to runs
        </button>

        <div className="flex items-center gap-3">
          {isFailed && (
            <button
              onClick={() => onNavigateToDiagnosis(run.run_id)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shadow-md shadow-indigo-600/20"
            >
              <Terminal className="w-3.5 h-3.5" />
              Diagnose Root Cause
            </button>
          )}

          <button
            onClick={() => onNavigateToReplay(run.run_id)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-mono border border-gray-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Open in Replay Lab
          </button>

          {isReplay && onNavigateToCompare && run.metadata?.original_run_id && (
            <button
              onClick={() => onNavigateToCompare(run.metadata!.original_run_id, run.run_id)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 text-xs font-mono border border-amber-500/40 transition-colors"
            >
              <GitCompare className="w-3.5 h-3.5" />
              Compare with Original
            </button>
          )}
        </div>
      </div>

      {/* Run Metadata Header Card */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-4">
          <div>
            <div className="text-xs font-mono text-gray-400 uppercase tracking-widest">Execution Trace Identifier</div>
            <h2 className="text-xl font-bold font-mono text-white mt-1 flex items-center gap-2">
              {run.run_id}
              {isReplay && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                  COUNTERFACTUAL REPLAY
                </span>
              )}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {isFailed ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/40">
                <AlertTriangle className="w-4 h-4" /> STATUS: FAILED
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                <CheckCircle2 className="w-4 h-4" /> STATUS: SUCCESS
              </span>
            )}
          </div>
        </div>

        {/* Quick detail grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
          <div>
            <span className="text-gray-500">AGENT ID</span>
            <div className="text-gray-200 mt-0.5">{run.agent_id}</div>
          </div>
          <div>
            <span className="text-gray-500">WORKFLOW</span>
            <div className="text-gray-200 mt-0.5">{run.task_type}</div>
          </div>
          <div>
            <span className="text-gray-500">STEPS CAPTURED</span>
            <div className="text-gray-200 mt-0.5">{steps.length} steps</div>
          </div>
          <div>
            <span className="text-gray-500">CREATED AT</span>
            <div className="text-gray-200 mt-0.5">{new Date(run.created_at).toLocaleString()}</div>
          </div>
        </div>

        {/* Failure reason or final output */}
        {isFailed && run.failure_reason && (
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs">
            <span className="font-semibold font-mono">Reported Failure: </span>
            {run.failure_reason}
          </div>
        )}

        {!isFailed && run.final_output && (
          <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs">
            <span className="font-semibold font-mono">Outcome Confirmation: </span>
            {run.final_output}
          </div>
        )}
      </div>

      {/* Execution Timeline */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            Execution Timeline & Checkpoint Snapshots
          </h3>
          <span className="text-xs text-gray-500 font-mono">Click step row to inspect state mutations</span>
        </div>

        <StepTimeline
          steps={steps}
          onSelectCheckpoint={(seq) => onNavigateToReplay(run.run_id, seq)}
        />
      </div>
    </div>
  );
};
