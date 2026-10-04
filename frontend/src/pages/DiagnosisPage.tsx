import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, 
  Terminal, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  HelpCircle, 
  FileText, 
  Activity, 
  ArrowRight,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { api } from '../services/api';
import { Diagnosis, RankedStep } from '../types';

interface DiagnosisPageProps {
  runId: string;
  onBack: () => void;
  onNavigateToReplay: (runId: string, seq?: number) => void;
  onNavigateToRunDetail: (runId: string) => void;
}

export const DiagnosisPage: React.FC<DiagnosisPageProps> = ({
  runId,
  onBack,
  onNavigateToReplay,
  onNavigateToRunDetail
}) => {
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.diagnoseRun(runId)
      .then(setDiagnosis)
      .catch((err) => setError(err.message || 'Failed to diagnose trace'))
      .finally(() => setLoading(false));
  }, [runId]);

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3 font-mono text-gray-400">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <div className="text-sm font-semibold text-gray-200">Executing Multi-Model Root-Cause Diagnosis...</div>
        <div className="text-xs text-gray-500">Evaluating IsolationForest outlier scores, RandomForest root-cause probabilities and causal state transitions</div>
      </div>
    );
  }

  if (error || !diagnosis) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="text-xs text-gray-400 hover:text-white flex items-center gap-1 font-mono">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs">
          {error || 'Diagnosis failed.'}
        </div>
      </div>
    );
  }

  const rc = diagnosis.probable_root_cause_step;
  const manifest = diagnosis.visible_failure_step;
  const isHidden = diagnosis.is_hidden_root_cause;

  return (
    <div className="space-y-8 pb-16">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-xs text-gray-400 hover:text-white flex items-center gap-1 font-mono transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to trace
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigateToRunDetail(runId)}
            className="text-xs text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg border border-gray-700 font-mono transition-colors"
          >
            View Execution Trace
          </button>
          {rc && (
            <button
              onClick={() => onNavigateToReplay(runId, rc.sequence_number)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Fix in Replay Lab (Step {rc.sequence_number})
            </button>
          )}
        </div>
      </div>

      {/* Primary Diagnosis Hero Card */}
      <div className="rounded-2xl border border-indigo-900/40 bg-gradient-to-br from-gray-900 via-[#0E1420] to-[#0B0F17] p-6 shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800/80 pb-4">
          <div>
            <div className="text-[11px] font-mono text-indigo-400 uppercase tracking-widest font-semibold flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" />
              AI Flight Recorder Diagnostic Assessment
            </div>
            <h2 className="text-xl font-bold text-white mt-1 font-mono">
              Trace: {runId}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] font-mono text-gray-400">DIAGNOSIS CONFIDENCE</div>
              <div className="text-lg font-bold font-mono text-emerald-400">
                {(diagnosis.confidence * 100).toFixed(1)}%
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
              <Activity className="w-6 h-6 text-indigo-400" />
            </div>
          </div>
        </div>

        {/* Visible Failure vs Probable Root-Cause Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Box 1: Suspected Root Cause */}
          <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-5 space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-amber-400" />
                MOST LIKELY FAILURE-CAUSING STEP
              </span>
              <span className="text-sm font-bold font-mono text-amber-400">
                SUSPICION: {rc?.suspicion_score.toFixed(1)} / 100
              </span>
            </div>

            <div>
              <div className="text-lg font-bold text-white flex items-center gap-2">
                <span>Step {rc?.sequence_number}:</span>
                <span className="text-amber-300 font-mono">{rc?.step_name}</span>
              </div>
              <p className="text-xs text-gray-300 mt-1">
                Identified as the origin of anomalous state mutation {isHidden ? 'several steps prior to downstream system failure' : 'directly at point of execution'}.
              </p>
            </div>

            {/* Reason code badges */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {rc?.reason_codes.map((code) => (
                <span key={code} className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-900 text-amber-300 border border-amber-500/30 font-medium">
                  {code}
                </span>
              ))}
            </div>
          </div>

          {/* Box 2: Visible Manifestation Failure */}
          <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-rose-400" />
                VISIBLE SYMPTOM / CRASH POINT
              </span>
              <span className="text-xs font-mono text-rose-400 font-semibold">
                TERMINAL STEP
              </span>
            </div>

            <div>
              <div className="text-lg font-bold text-white flex items-center gap-2">
                <span>Step {manifest?.sequence_number}:</span>
                <span className="text-rose-300 font-mono">{manifest?.step_name}</span>
              </div>
              <p className="text-xs text-rose-200 mt-1 font-mono break-all">
                {manifest?.error || 'Execution halted with runtime rejection.'}
              </p>
            </div>

            <div className="text-xs text-gray-400 bg-gray-900/60 p-2.5 rounded border border-gray-800 flex items-center justify-between">
              <span>Downstream Manifestation Gap:</span>
              <span className="font-mono text-indigo-300 font-bold">
                {rc && manifest ? Math.max(manifest.sequence_number - rc.sequence_number, 0) : 0} steps
              </span>
            </div>
          </div>
        </div>

        {/* Evidence & Decision Rationale Section */}
        {rc?.evidence && (
          <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono text-gray-400 uppercase tracking-wider font-semibold">
              <FileText className="w-4 h-4 text-indigo-400" />
              Evidence & Diagnostic Signals
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
              <div className="bg-gray-900/80 p-2.5 rounded border border-gray-800">
                <span className="text-gray-500 text-[10px]">ANOMALY INDEX</span>
                <div className="text-gray-200 font-bold text-sm mt-0.5">
                  {(rc.evidence.anomaly_score * 100).toFixed(1)}%
                </div>
              </div>
              <div className="bg-gray-900/80 p-2.5 rounded border border-gray-800">
                <span className="text-gray-500 text-[10px]">CLASSIFIER PROBABILITY</span>
                <div className="text-gray-200 font-bold text-sm mt-0.5">
                  {(rc.evidence.classifier_probability * 100).toFixed(1)}%
                </div>
              </div>
              <div className="bg-gray-900/80 p-2.5 rounded border border-gray-800">
                <span className="text-gray-500 text-[10px]">LATENCY</span>
                <div className="text-gray-200 font-bold text-sm mt-0.5">
                  {rc.evidence.latency_ms ? `${Math.round(rc.evidence.latency_ms)} ms` : 'N/A'}
                </div>
              </div>
              <div className="bg-gray-900/80 p-2.5 rounded border border-gray-800">
                <span className="text-gray-500 text-[10px]">MUTATED KEYS</span>
                <div className="text-amber-400 font-bold text-sm mt-0.5 truncate">
                  {rc.evidence.mutated_state_keys?.join(', ') || 'state delta'}
                </div>
              </div>
            </div>

            {/* Scientific Caveat Banner */}
            <div className="text-[11px] text-gray-400 italic bg-indigo-950/20 border border-indigo-500/20 p-3 rounded-lg flex items-start gap-2">
              <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <span>
                <strong>Methodological Note:</strong> A high suspicion score identifies the <em>most likely failure-causing step</em> based on learned anomaly patterns and historical defect distributions. To establish true counterfactual causality, execute an alternative action in the Replay Lab.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Ranked Candidate Steps Table */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-bold text-white">Full Step Suspicion Ranking</h3>
          <p className="text-xs text-gray-400">All execution trace steps ranked by hybrid anomaly and failure likelihood</p>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900/60 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-950/80 text-gray-400 font-mono text-[11px] uppercase border-b border-gray-800">
                <tr>
                  <th className="py-3 px-4">Rank & Seq</th>
                  <th className="py-3 px-4">Step Action</th>
                  <th className="py-3 px-4">Suspicion Score</th>
                  <th className="py-3 px-4">Anomaly</th>
                  <th className="py-3 px-4">Classifier Prob</th>
                  <th className="py-3 px-4">Reason Codes</th>
                  <th className="py-3 px-4 text-right">Replay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {diagnosis.ranked_steps.map((step, idx) => (
                  <tr 
                    key={step.sequence_number} 
                    className={`hover:bg-gray-800/40 transition-colors ${
                      idx === 0 ? 'bg-amber-500/5' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-mono">
                      <span className={`px-2 py-0.5 rounded font-bold ${
                        idx === 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-gray-800 text-gray-400'
                      }`}>
                        #{idx + 1} (Step {step.sequence_number})
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-200">
                      {step.step_name}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-800 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-full ${idx === 0 ? 'bg-amber-400' : 'bg-indigo-500'}`}
                            style={{ width: `${Math.min(step.suspicion_score, 100)}%` }}
                          />
                        </div>
                        <span>{step.suspicion_score.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-300">
                      {(step.anomaly_score * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-300">
                      {(step.classifier_probability * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {step.reason_codes.slice(0, 2).map((c) => (
                          <span key={c} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700">
                            {c}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onNavigateToReplay(runId, step.sequence_number)}
                        className="text-xs text-indigo-300 hover:text-white bg-indigo-600/20 hover:bg-indigo-600/40 px-2 py-1 rounded transition-colors font-mono"
                      >
                        Replay
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
