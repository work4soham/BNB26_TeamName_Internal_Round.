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
          <h2 className="text-xl font-bold text-stone-900 tracking-tight">Execution Traces</h2>
          <p className="text-xs text-stone-500">Captured AI flight recorder runs, execution states, and diagnostic signals</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchRuns}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 text-xs font-mono text-stone-700 hover:text-stone-900 border border-stone-200 hover:bg-stone-200 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-xl border border-burgundy-100 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Run ID, Agent ID, or failure reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-stone-50 text-xs font-mono text-stone-800 pl-9 pr-4 py-2 rounded-lg border border-stone-200 focus:outline-none focus:border-burgundy-600 focus:bg-white transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          {['all', 'failed', 'success'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono capitalize transition-all ${
                statusFilter === status
                  ? 'bg-burgundy-50 text-burgundy-800 border border-burgundy-300 font-semibold shadow-sm'
                  : 'text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 border border-transparent'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Runs Table */}
      <div className="rounded-xl border border-burgundy-100 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-burgundy-50/60 text-stone-600 font-mono text-[11px] uppercase border-b border-burgundy-100">
              <tr>
                <th className="py-3 px-4">Run Identifier</th>
                <th className="py-3 px-4">Agent & Workflow</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Failure Information</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-stone-500 font-mono">
                    Loading recorded traces...
                  </td>
                </tr>
              ) : filteredRuns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-stone-500 font-mono">
                    No runs found matching query.
                  </td>
                </tr>
              ) : filteredRuns.map((run) => (
                <tr key={run.run_id} className="hover:bg-burgundy-50/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-medium text-burgundy-900">
                    {run.run_id.startsWith('demo-') ? (
                      <span className="flex items-center gap-1.5 text-amber-700 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                        {run.run_id}
                      </span>
                    ) : (
                      `${run.run_id.substring(0, 14)}...`
                    )}
                  </td>
                  <td className="py-3 px-4 text-stone-800">
                    <div className="font-semibold text-stone-900">{run.task_type}</div>
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
                  <td className="py-3 px-4 text-stone-600 max-w-sm truncate">
                    {run.failure_reason || (
                      <span className="text-stone-400 font-mono italic">Completed without error</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-stone-500 font-mono text-[11px]">
                    {run.created_at ? new Date(run.created_at).toLocaleTimeString() : 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      onClick={() => onSelectRun(run.run_id)}
                      className="text-xs text-stone-700 hover:text-burgundy-900 bg-stone-100 hover:bg-burgundy-50 border border-stone-200 px-2.5 py-1 rounded transition-colors inline-flex items-center gap-1 font-medium"
                    >
                      <Eye className="w-3 h-3" />
                      Trace
                    </button>
                    {run.status === 'failed' && (
                      <button
                        onClick={() => onNavigateToDiagnosis(run.run_id)}
                        className="text-xs text-white bg-burgundy-700 hover:bg-burgundy-800 px-2.5 py-1 rounded transition-colors font-medium shadow-sm inline-flex items-center gap-1"
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
