import React, { useEffect, useState } from 'react';
import { 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowUpDown, 
  Terminal, 
  Clock, 
  Eye,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { Run } from '../types';

interface RunsPageProps {
  onSelectRun: (runId: string) => void;
  onNavigateToDiagnosis: (runId: string) => void;
}

export const RunsPage: React.FC<RunsPageProps> = ({ onSelectRun, onNavigateToDiagnosis }) => {
  const [runs, setRuns] = useState<Run[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRuns = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getRuns({ 
        limit: 100, 
        status: statusFilter === 'all' ? undefined : statusFilter 
      });
      setRuns(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load runs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, [statusFilter]);

  const filteredRuns = runs.filter(run => {
    const q = searchQuery.toLowerCase();
    return (
      run.run_id.toLowerCase().includes(q) ||
      run.agent_id.toLowerCase().includes(q) ||
      run.task_type.toLowerCase().includes(q) ||
      (run.failure_reason && run.failure_reason.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Execution Traces</h2>
          <p className="text-xs text-gray-400">Captured AI flight recorder runs, execution states, and diagnostic signals</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchRuns}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 text-xs font-mono text-gray-300 hover:text-white border border-gray-700 hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-gray-900/60 p-3 rounded-xl border border-gray-800">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Run ID, Agent ID, or failure reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#070A0F] text-xs font-mono text-gray-200 pl-9 pr-4 py-2 rounded-lg border border-gray-800 focus:outline-none focus:border-indigo-500/50"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          {['all', 'failed', 'success'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono capitalize transition-all ${
                statusFilter === status
                  ? 'bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 font-semibold'
                  : 'text-gray-400 hover:text-gray-200 bg-gray-800/40 border border-transparent'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Runs Table */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/60 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-950/80 text-gray-400 font-mono text-[11px] uppercase border-b border-gray-800">
              <tr>
                <th className="py-3 px-4">Run Identifier</th>
                <th className="py-3 px-4">Agent & Workflow</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Failure Information</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500 font-mono">
                    Loading recorded traces...
                  </td>
                </tr>
              ) : filteredRuns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500 font-mono">
                    No runs found matching query.
                  </td>
                </tr>
              ) : filteredRuns.map((run) => (
                <tr key={run.run_id} className="hover:bg-gray-800/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-medium text-indigo-300">
                    {run.run_id.startsWith('demo-') ? (
                      <span className="flex items-center gap-1.5 text-amber-300 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                        {run.run_id}
                      </span>
                    ) : (
                      `${run.run_id.substring(0, 14)}...`
                    )}
                  </td>
                  <td className="py-3 px-4 text-gray-300">
                    <div className="font-semibold text-gray-200">{run.task_type}</div>
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
                  <td className="py-3 px-4 text-gray-400 max-w-sm truncate">
                    {run.failure_reason || (
                      <span className="text-gray-600 font-mono italic">Completed without error</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-gray-400 font-mono text-[11px]">
                    {run.created_at ? new Date(run.created_at).toLocaleTimeString() : 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      onClick={() => onSelectRun(run.run_id)}
                      className="text-xs text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 px-2.5 py-1 rounded transition-colors inline-flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      Trace
                    </button>
                    {run.status === 'failed' && (
                      <button
                        onClick={() => onNavigateToDiagnosis(run.run_id)}
                        className="text-xs text-indigo-300 hover:text-white bg-indigo-600/30 hover:bg-indigo-600 px-2.5 py-1 rounded transition-colors font-medium border border-indigo-500/30 inline-flex items-center gap-1"
                      >
                        <Terminal className="w-3 h-3" />
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
  );
};
