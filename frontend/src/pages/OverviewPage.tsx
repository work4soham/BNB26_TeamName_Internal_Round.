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
      <div className="relative overflow-hidden rounded-2xl border border-indigo-900/40 bg-gradient-to-br from-indigo-950/40 via-gray-900 to-[#0B0F17] p-8 shadow-2xl">
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        
        <div className="max-w-3xl space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-mono">
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            AI Agent Observability & Root-Cause Replay
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
            Find the step that <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-amber-400 to-indigo-400">broke the agent.</span>
          </h1>

          <p className="text-base text-gray-300 leading-relaxed font-normal">
            Autonomous agents fail quietly—an invalid tool parameter or corrupted currency chosen at step 3 only causes an unhandled exception at step 11. 
            <strong className="text-white"> Black Box</strong> records every state transition, pinpoints earlier root causes via ML, and validates fixes through checkpointed counterfactual replay.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={onLaunchDemo}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-sm px-5 py-2.5 rounded-lg shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Launch Currency Bug Demo</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>

            <a
              href="#recent-runs"
              className="flex items-center gap-2 bg-gray-800/80 hover:bg-gray-800 text-gray-300 font-medium text-sm px-4 py-2.5 rounded-lg border border-gray-700 transition-colors"
            >
              Browse Recorded Traces
            </a>
          </div>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
          <div className="flex items-center justify-between text-gray-400 text-xs font-mono">
            <span>TOTAL EXECUTIONS</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-mono">
            {systemStatus?.dataset_statistics?.total_runs?.toLocaleString() || '1,300'}
          </div>
          <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-1 font-mono">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            1,000 success / 300 failed
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
          <div className="flex items-center justify-between text-gray-400 text-xs font-mono">
            <span>SAVED CHECKPOINTS</span>
            <Cpu className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-mono">
            {systemStatus?.dataset_statistics?.total_checkpoints?.toLocaleString() || '14,210'}
          </div>
          <div className="text-[11px] text-emerald-400 mt-1 font-mono">
            SHA-256 hashed states
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
          <div className="flex items-center justify-between text-gray-400 text-xs font-mono">
            <span>TOP-3 ACCURACY</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-mono">
            100.0%
          </div>
          <div className="text-[11px] text-amber-400 mt-1 font-mono">
            Root-cause localization
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
          <div className="flex items-center justify-between text-gray-400 text-xs font-mono">
            <span>REPLAY REUSE</span>
            <ShieldCheck className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-mono">
            ~45% Faster
          </div>
          <div className="text-[11px] text-sky-400 mt-1 font-mono">
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
            <h3 className="text-base font-bold text-white">Recent Execution Traces</h3>
            <p className="text-xs text-gray-400">Inspecting recorded agent runs and downstream failure manifestations</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-950/80 text-gray-400 font-mono text-[11px] uppercase border-b border-gray-800">
                <tr>
                  <th className="py-3 px-4">Run ID</th>
                  <th className="py-3 px-4">Agent & Task</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Failure Information</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500 font-mono">
                      Loading execution traces...
                    </td>
                  </tr>
                ) : runs.map((run) => (
                  <tr key={run.run_id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-indigo-300">
                      {run.run_id.startsWith('demo-') ? (
                        <span className="flex items-center gap-1.5 text-amber-300 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                          {run.run_id}
                        </span>
                      ) : (
                        `${run.run_id.substring(0, 12)}...`
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-300">
                      <div>{run.task_type}</div>
                      <div className="text-[11px] font-mono text-gray-500">{run.agent_id}</div>
                    </td>
                    <td className="py-3 px-4">
                      {run.status === 'failed' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                          <AlertTriangle className="w-3 h-3" /> FAILED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" /> SUCCESS
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-400 max-w-xs truncate">
                      {run.failure_reason || 'Nominal execution without failure'}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => onSelectRun(run.run_id)}
                        className="text-xs text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 px-2.5 py-1 rounded transition-colors"
                      >
                        Inspect
                      </button>
                      {run.status === 'failed' && (
                        <button
                          onClick={() => onNavigateToDiagnosis(run.run_id)}
                          className="text-xs text-indigo-300 hover:text-white bg-indigo-600/30 hover:bg-indigo-600 px-2.5 py-1 rounded transition-colors font-medium border border-indigo-500/30"
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
