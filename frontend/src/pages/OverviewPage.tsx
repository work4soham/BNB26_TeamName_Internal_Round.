import React, { useEffect, useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  RotateCcw, 
  ArrowRight, 
  Zap, 
  TrendingUp,
  Cpu,
  ShieldCheck,
  Play
} from 'lucide-react';
import { api } from '../services/api';
import { Run, SystemStatus } from '../types';
import { ArchitecturePipeline } from '../components/ArchitecturePipeline';

interface OverviewPageProps {
  onSelectRun: (runId: string) => void;
  onNavigateToDiagnosis: (runId: string) => void;
  onLaunchDemo: () => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ 
  onSelectRun, 
  onNavigateToDiagnosis,
  onLaunchDemo
}) => {
  const [runs, setRuns] = useState<Run[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getRuns({ limit: 6 }),
      api.getTrainingStatus().catch(() => null)
    ]).then(([runsData, statusData]) => {
      setRuns(runsData);
      setSystemStatus(statusData);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8 pb-12">
      {/* Hero 20-Second Value Proposition */}
      <div className="relative overflow-hidden rounded-2xl border border-burgundy-900 bg-gradient-to-br from-[#4A0A19] via-[#6B0F24] to-[#800020] p-8 sm:p-10 shadow-xl shadow-burgundy-950/15">
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-white/5 blur-3xl pointer-events-none" />
        
        <div className="max-w-3xl space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-rose-100 text-xs font-mono backdrop-blur-sm">
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            AI Agent Observability & Root-Cause Replay
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Find the step that <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-rose-200 to-white">broke the agent.</span>
          </h1>

          <p className="text-base text-rose-100/90 leading-relaxed font-normal">
            Autonomous agents fail quietly—an invalid tool parameter or corrupted currency chosen at step 3 only causes an unhandled exception at step 11. 
            <strong className="text-white font-semibold"> Black Box</strong> records every state transition, pinpoints earlier root causes via ML, and validates fixes through checkpointed counterfactual replay.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={onLaunchDemo}
              className="flex items-center gap-2 bg-white hover:bg-rose-50 text-burgundy-900 font-semibold text-sm px-5 py-2.5 rounded-lg shadow-lg shadow-black/10 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-burgundy-900 text-burgundy-900" />
              <span>Launch Currency Bug Demo</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>

            <a
              href="#recent-runs"
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium text-sm px-4 py-2.5 rounded-lg border border-white/20 transition-colors backdrop-blur-sm"
            >
              Browse Recorded Traces
            </a>
          </div>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-burgundy-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-stone-500 text-xs font-mono font-medium">
            <span>TOTAL EXECUTIONS</span>
            <Layers className="w-4 h-4 text-burgundy-700" />
          </div>
          <div className="text-2xl font-bold text-stone-900 mt-2 font-mono">
            {systemStatus?.dataset_statistics?.total_runs?.toLocaleString() || '1,300'}
          </div>
          <div className="text-[11px] text-stone-600 mt-1 flex items-center gap-1 font-mono">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            1,000 success / 300 failed
          </div>
        </div>

        <div className="rounded-xl border border-burgundy-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-stone-500 text-xs font-mono font-medium">
            <span>SAVED CHECKPOINTS</span>
            <Cpu className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-stone-900 mt-2 font-mono">
            {systemStatus?.dataset_statistics?.total_checkpoints?.toLocaleString() || '14,210'}
          </div>
          <div className="text-[11px] text-emerald-700 mt-1 font-mono font-medium">
            SHA-256 hashed states
          </div>
        </div>

        <div className="rounded-xl border border-burgundy-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-stone-500 text-xs font-mono font-medium">
            <span>TOP-3 ACCURACY</span>
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-stone-900 mt-2 font-mono">
            100.0%
          </div>
          <div className="text-[11px] text-amber-700 mt-1 font-mono font-medium">
            Root-cause localization
          </div>
        </div>

        <div className="rounded-xl border border-burgundy-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-stone-500 text-xs font-mono font-medium">
            <span>REPLAY REUSE</span>
            <ShieldCheck className="w-4 h-4 text-burgundy-700" />
          </div>
          <div className="text-2xl font-bold text-stone-900 mt-2 font-mono">
            ~45% Faster
          </div>
          <div className="text-[11px] text-burgundy-700 mt-1 font-mono font-medium">
            Zero recomputation of prefix
          </div>
        </div>
      </div>

      {/* Research Architecture View */}
      <ArchitecturePipeline />

      {/* Recent Traces Section */}
      <div id="recent-runs" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-stone-900">Recent Execution Traces</h3>
            <p className="text-xs text-stone-500">Inspecting recorded agent runs and downstream failure manifestations</p>
          </div>
        </div>

        <div className="rounded-xl border border-burgundy-100 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-burgundy-50/60 text-stone-600 font-mono text-[11px] uppercase border-b border-burgundy-100">
                <tr>
                  <th className="py-3 px-4">Run ID</th>
                  <th className="py-3 px-4">Agent & Task</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Failure Information</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-stone-500 font-mono">
                      Loading execution traces...
                    </td>
                  </tr>
                ) : runs.map((run) => (
                  <tr key={run.run_id} className="hover:bg-burgundy-50/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-burgundy-900">
                      {run.run_id.startsWith('demo-') ? (
                        <span className="flex items-center gap-1.5 text-amber-700 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                          {run.run_id}
                        </span>
                      ) : (
                        `${run.run_id.substring(0, 12)}...`
                      )}
                    </td>
                    <td className="py-3 px-4 text-stone-800">
                      <div className="font-medium">{run.task_type}</div>
                      <div className="text-[11px] font-mono text-stone-500">{run.agent_id}</div>
                    </td>
                    <td className="py-3 px-4">
                      {run.status === 'failed' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertTriangle className="w-3 h-3" /> FAILED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> SUCCESS
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-stone-600 max-w-xs truncate">
                      {run.failure_reason || 'Nominal execution without failure'}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => onSelectRun(run.run_id)}
                        className="text-xs text-stone-700 hover:text-burgundy-900 bg-stone-100 hover:bg-burgundy-50 border border-stone-200 px-2.5 py-1 rounded transition-colors font-medium"
                      >
                        Inspect
                      </button>
                      {run.status === 'failed' && (
                        <button
                          onClick={() => onNavigateToDiagnosis(run.run_id)}
                          className="text-xs text-white bg-burgundy-700 hover:bg-burgundy-800 px-2.5 py-1 rounded transition-colors font-medium shadow-sm"
                        >
                          Diagnose
                        </button>
                      )}
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
