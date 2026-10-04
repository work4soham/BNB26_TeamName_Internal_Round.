import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Key, 
  Hash, 
  Code, 
  Database, 
  RotateCcw,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';
import { Step } from '../types';

interface StepTimelineProps {
  steps: Step[];
  highlightStepSeq?: number | null;
  onSelectCheckpoint?: (seq: number) => void;
}

export const StepTimeline: React.FC<StepTimelineProps> = ({ 
  steps, 
  highlightStepSeq, 
  onSelectCheckpoint 
}) => {
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);

  const getStepBadgeColor = (stepType: string) => {
    switch (stepType) {
      case 'tool_call': return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
      case 'model_call': return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'retrieval': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'decision': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'validation': return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'transformation': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="space-y-3">
      {steps.map((step) => {
        const isExpanded = expandedStepId === step.step_id;
        const isHighlighted = highlightStepSeq === step.sequence_number;
        const isFailed = step.status === 'failed';

        return (
          <div
            key={step.step_id}
            className={`rounded-lg border transition-all ${
              isHighlighted
                ? 'bg-amber-950/20 border-amber-500/60 shadow-lg shadow-amber-500/10'
                : isFailed
                ? 'bg-rose-950/20 border-rose-500/40'
                : 'bg-gray-900/60 border-gray-800 hover:border-gray-700'
            }`}
          >
            {/* Header summary line */}
            <div 
              onClick={() => setExpandedStepId(isExpanded ? null : step.step_id)}
              className="p-3.5 flex items-center justify-between cursor-pointer select-none"
            >
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-7 h-7 rounded-md bg-gray-800 text-xs font-mono font-bold text-gray-300">
                  {step.sequence_number}
                </div>
                {isFailed ? (
                  <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-200">
                      {step.action || step.tool_name || `Step ${step.sequence_number}`}
                    </span>
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${getStepBadgeColor(step.step_type)}`}>
                      {step.step_type}
                    </span>
                    {isHighlighted && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse font-semibold">
                        SUSPECTED ROOT CAUSE
                      </span>
                    )}
                  </div>
                  {step.decision && (
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1 italic">
                      "{step.decision}"
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-4">
                {step.latency_ms && (
                  <div className="text-xs font-mono text-gray-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-gray-500" />
                    <span>{Math.round(step.latency_ms)}ms</span>
                  </div>
                )}
                {step.token_count && (
                  <div className="text-xs font-mono text-gray-400 flex items-center gap-1">
                    <Key className="w-3.5 h-3.5 text-gray-500" />
                    <span>{step.token_count} toks</span>
                  </div>
                )}
                {step.state_hash && (
                  <div className="text-[11px] font-mono text-gray-400 bg-gray-950 px-2 py-1 rounded border border-gray-800 hidden sm:flex items-center gap-1">
                    <Hash className="w-3 h-3 text-indigo-400" />
                    <span>{step.state_hash.substring(0, 8)}...</span>
                  </div>
                )}
                {onSelectCheckpoint && step.output_state && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectCheckpoint(step.sequence_number);
                    }}
                    className="text-xs font-medium bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 px-2.5 py-1 rounded flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Replay here
                  </button>
                )}
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </div>
            </div>

            {/* Error banner if failed */}
            {isFailed && step.error && (
              <div className="mx-3.5 mb-3 p-2.5 rounded bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Step Error: </span>
                  {step.error}
                </div>
              </div>
            )}

            {/* Expanded JSON Inspector */}
            {isExpanded && (
              <div className="border-t border-gray-800/80 bg-gray-950/60 p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Input State */}
                  <div>
                    <div className="text-xs font-mono font-semibold text-gray-400 mb-1.5 flex items-center gap-1.5">
                      <Code className="w-3.5 h-3.5 text-sky-400" />
                      INPUT STATE
                    </div>
                    <pre className="text-[11px] font-mono bg-[#070A0F] p-3 rounded border border-gray-800 text-gray-300 overflow-x-auto max-h-56">
                      {JSON.stringify(step.input_state || {}, null, 2)}
                    </pre>
                  </div>

                  {/* Output State */}
                  <div>
                    <div className="text-xs font-mono font-semibold text-gray-400 mb-1.5 flex items-center gap-1.5">
                      <Code className="w-3.5 h-3.5 text-emerald-400" />
                      OUTPUT STATE (CHECKPOINT SNAPSHOT)
                    </div>
                    <pre className="text-[11px] font-mono bg-[#070A0F] p-3 rounded border border-gray-800 text-gray-300 overflow-x-auto max-h-56">
                      {JSON.stringify(step.output_state || {}, null, 2)}
                    </pre>
                  </div>
                </div>

                {/* Retrieved Context if present */}
                {step.retrieved_context && (
                  <div>
                    <div className="text-xs font-mono font-semibold text-gray-400 mb-1.5 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-amber-400" />
                      RETRIEVED CONTEXT
                    </div>
                    <pre className="text-[11px] font-mono bg-[#070A0F] p-3 rounded border border-gray-800 text-gray-300 overflow-x-auto max-h-40">
                      {JSON.stringify(step.retrieved_context, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
