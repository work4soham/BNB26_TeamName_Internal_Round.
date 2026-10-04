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
      <div className="py-24 text-center space-y-3 font-mono text-stone-600">
        <div className="w-8 h-8 border-2 border-burgundy-700 border-t-transparent rounded-full animate-spin mx-auto" />
        <div className="text-sm font-semibold text-stone-900">Executing Multi-Model Root-Cause Diagnosis...</div>
        <div className="text-xs text-stone-500">Evaluating IsolationForest outlier scores, RandomForest root-cause probabilities and causal state transitions</div>
      </div>
    );
  }

  if (error || !diagnosis) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="text-xs text-stone-500 hover:text-burgundy-900 flex items-center gap-1 font-mono">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
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
          className="text-xs text-stone-500 hover:text-burgundy-900 flex items-center gap-1 font-mono transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to trace
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigateToRunDetail(runId)}
            className="text-xs text-stone-700 hover:text-burgundy-900 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-lg border border-stone-200 font-mono transition-colors shadow-sm"
          >
            View Execution Trace
          </button>
          {rc && (
            <button
              onClick={() => onNavigateToReplay(runId, rc.sequence_number)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-burgundy-700 hover:bg-burgundy-800 text-white font-semibold text-xs shadow-md shadow-burgundy-700/20 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Fix in Replay Lab (Step {rc.sequence_number})
            </button>
          )}
        </div>
      </div>

      {/* Primary Diagnosis Hero Card */}
      <div className="rounded-2xl border border-burgundy-100 bg-white p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-burgundy-100 pb-4">
          <div>
            <div className="text-[11px] font-mono text-burgundy-800 uppercase tracking-widest font-semibold flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-burgundy-700" />
              AI Flight Recorder Diagnostic Assessment
            </div>
            <h2 className="text-xl font-bold text-stone-900 mt-1 font-mono">
              Trace: {runId}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] font-mono text-stone-400 font-medium">DIAGNOSIS CONFIDENCE</div>
              <div className="text-lg font-bold font-mono text-emerald-600">
                {(diagnosis.confidence * 100).toFixed(1)}%
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-burgundy-50 border border-burgundy-200 flex items-center justify-center">
              <Activity className="w-6 h-6 text-burgundy-700" />
            </div>
          </div>
        </div>

        {/* Visible Failure vs Probable Root-Cause Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Box 1: Suspected Root Cause */}
          <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-5 space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-semibold flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-amber-700" />
                MOST LIKELY FAILURE-CAUSING STEP
              </span>
              <span className="text-sm font-bold font-mono text-amber-800">
                SUSPICION: {rc?.suspicion_score.toFixed(1)} / 100
              </span>
            </div>

            <div>
              <div className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <span>Step {rc?.sequence_number}:</span>
                <span className="text-amber-800 font-mono font-semibold">{rc?.step_name}</span>
              </div>
              <p className="text-xs text-stone-700 mt-1 leading-relaxed">
                Identified as the origin of anomalous state mutation {isHidden ? 'several steps prior to downstream system failure' : 'directly at point of execution'}.
              </p>
            </div>

            {/* Reason code badges */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {rc?.reason_codes.map((code) => (
                <span key={code} className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-amber-900 border border-amber-300 font-medium shadow-sm">
                  {code}
                </span>
              ))}
            </div>
          </div>

          {/* Box 2: Visible Manifestation Failure */}
          <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-rose-600" />
                VISIBLE SYMPTOM / CRASH POINT
              </span>
              <span className="text-xs font-mono text-rose-700 font-semibold">
                TERMINAL STEP
              </span>
            </div>

            <div>
              <div className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <span>Step {manifest?.sequence_number}:</span>
                <span className="text-rose-700 font-mono font-semibold">{manifest?.step_name}</span>
              </div>
              <p className="text-xs text-rose-800 mt-1 font-mono break-all">
                {manifest?.error || 'Execution halted with runtime rejection.'}
              </p>
            </div>

            <div className="text-xs text-stone-600 bg-white p-2.5 rounded border border-rose-200 flex items-center justify-between shadow-sm">
              <span>Downstream Manifestation Gap:</span>
              <span className="font-mono text-burgundy-800 font-bold">
                {rc && manifest ? Math.max(manifest.sequence_number - rc.sequence_number, 0) : 0} steps
              </span>
            </div>
          </div>
        </div>

        {/* Evidence & Decision Rationale Section */}
        {rc?.evidence && (
          <div className="rounded-xl border border-burgundy-100 bg-stone-50/60 p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono text-stone-700 uppercase tracking-wider font-semibold">
              <FileText className="w-4 h-4 text-burgundy-700" />
              Evidence & Diagnostic Signals
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
              <div className="bg-white p-2.5 rounded border border-stone-200 shadow-sm">
                <span className="text-stone-400 text-[10px] font-medium">ANOMALY INDEX</span>
                <div className="text-stone-900 font-bold text-sm mt-0.5">
                  {(rc.evidence.anomaly_score * 100).toFixed(1)}%
                </div>
              </div>
              <div className="bg-white p-2.5 rounded border border-stone-200 shadow-sm">
                <span className="text-stone-400 text-[10px] font-medium">CLASSIFIER PROBABILITY</span>
                <div className="text-stone-900 font-bold text-sm mt-0.5">
                  {(rc.evidence.classifier_probability * 100).toFixed(1)}%
                </div>
              </div>
              <div className="bg-white p-2.5 rounded border border-stone-200 shadow-sm">
                <span className="text-stone-400 text-[10px] font-medium">LATENCY</span>
                <div className="text-stone-900 font-bold text-sm mt-0.5">
                  {rc.evidence.latency_ms ? `${Math.round(rc.evidence.latency_ms)} ms` : 'N/A'}
                </div>
              </div>
              <div className="bg-white p-2.5 rounded border border-stone-200 shadow-sm">
                <span className="text-stone-400 text-[10px] font-medium">MUTATED KEYS</span>
                <div className="text-amber-800 font-bold text-sm mt-0.5 truncate">
                  {rc.evidence.mutated_state_keys?.join(', ') || 'state delta'}
                </div>
              </div>
            </div>

            {/* Scientific Caveat Banner */}
            <div className="text-[11px] text-burgundy-900 italic bg-burgundy-50 border border-burgundy-200 p-3 rounded-lg flex items-start gap-2">
              <HelpCircle className="w-4 h-4 text-burgundy-700 shrink-0 mt-0.5" />
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
          <h3 className="text-base font-bold text-stone-900">Full Step Suspicion Ranking</h3>
          <p className="text-xs text-stone-500">All execution trace steps ranked by hybrid anomaly and failure likelihood</p>
        </div>

        <div className="rounded-xl border border-burgundy-100 bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-burgundy-50/60 text-stone-600 font-mono text-[11px] uppercase border-b border-burgundy-100">
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
              <tbody className="divide-y divide-stone-100">
                {diagnosis.ranked_steps.map((step, idx) => (
                  <tr 
                    key={step.sequence_number} 
                    className={`hover:bg-burgundy-50/40 transition-colors ${
                      idx === 0 ? 'bg-amber-50/50' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-mono">
                      <span className={`px-2 py-0.5 rounded font-bold ${
                        idx === 0 ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-stone-100 text-stone-600 border border-stone-200'
                      }`}>
                        #{idx + 1} (Step {step.sequence_number})
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-stone-900">
                      {step.step_name}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-stone-800">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-stone-200 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-full ${idx === 0 ? 'bg-amber-500' : 'bg-burgundy-700'}`}
                            style={{ width: `${Math.min(step.suspicion_score, 100)}%` }}
                          />
                        </div>
                        <span>{step.suspicion_score.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-stone-700">
                      {(step.anomaly_score * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 font-mono text-stone-700">
                      {(step.classifier_probability * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {step.reason_codes.slice(0, 2).map((c) => (
                          <span key={c} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200">
                            {c}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onNavigateToReplay(runId, step.sequence_number)}
                        className="text-xs text-burgundy-800 hover:text-white bg-burgundy-50 hover:bg-burgundy-700 border border-burgundy-200 px-2.5 py-1 rounded transition-colors font-mono font-medium shadow-sm"
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
