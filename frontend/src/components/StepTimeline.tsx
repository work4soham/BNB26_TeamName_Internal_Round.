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
      case 'tool_call': return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'model_call': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'retrieval': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'decision': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'validation': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'transformation': return 'bg-burgundy-50 text-burgundy-700 border-burgundy-200';
      default: return 'bg-stone-100 text-stone-600 border-stone-200';
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
            className={`rounded-xl border transition-all ${
              isHighlighted
                ? 'bg-amber-50/80 border-amber-400 shadow-md shadow-amber-900/5'
                : isFailed
                ? 'bg-rose-50/60 border-rose-300 shadow-sm'
                : 'bg-white border-stone-200/90 hover:border-burgundy-300 shadow-sm'
            }`}
          >
            {/* Header summary line */}
            <div 
              onClick={() => setExpandedStepId(isExpanded ? null : step.step_id)}
              className="p-3.5 flex items-center justify-between cursor-pointer select-none"
            >
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-7 h-7 rounded-md bg-stone-100 text-xs font-mono font-bold text-stone-700 border border-stone-200">
                  {step.sequence_number}
                </div>
                {isFailed ? (
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-stone-900">
                      {step.action || step.tool_name || `Step ${step.sequence_number}`}
                    </span>
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border font-medium ${getStepBadgeColor(step.step_type)}`}>
                      {step.step_type}
                    </span>
                    {isHighlighted && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 animate-pulse font-bold">
                        SUSPECTED ROOT CAUSE
                      </span>
                    )}
                  </div>
                  {step.decision && (
                    <p className="text-xs text-stone-500 mt-0.5 line-clamp-1 italic">
                      "{step.decision}"
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-4">
                {step.latency_ms && (
                  <div className="text-xs font-mono text-stone-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-stone-400" />
                    <span>{Math.round(step.latency_ms)}ms</span>
                  </div>
                )}
                {step.token_count && (
                  <div className="text-xs font-mono text-stone-500 flex items-center gap-1">
                    <Key className="w-3.5 h-3.5 text-stone-400" />
                    <span>{step.token_count} toks</span>
                  </div>
                )}
                {step.state_hash && (
                  <div className="text-[11px] font-mono text-stone-600 bg-stone-50 px-2 py-1 rounded border border-stone-200 hidden sm:flex items-center gap-1">
                    <Hash className="w-3 h-3 text-burgundy-700" />
                    <span>{step.state_hash.substring(0, 8)}...</span>
                  </div>
                )}
                {onSelectCheckpoint && step.output_state && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectCheckpoint(step.sequence_number);
                    }}
                    className="text-xs font-semibold bg-burgundy-50 hover:bg-burgundy-100 text-burgundy-800 border border-burgundy-200 px-2.5 py-1 rounded flex items-center gap-1 transition-colors shadow-sm"
                  >
                    <RotateCcw className="w-3 h-3 text-burgundy-700" />
                    Replay here
                  </button>
                )}
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-stone-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-stone-400" />
                )}
              </div>
            </div>

            {/* Error banner if failed */}
            {isFailed && step.error && (
              <div className="mx-3.5 mb-3 p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-rose-900">Step Error: </span>
                  {step.error}
                </div>
              </div>
            )}

            {/* Expanded JSON Inspector */}
            {isExpanded && (
              <div className="border-t border-stone-200 bg-stone-50/70 p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Input State */}
                  <div>
                    <div className="text-xs font-mono font-semibold text-stone-700 mb-1.5 flex items-center gap-1.5">
                      <Code className="w-3.5 h-3.5 text-sky-600" />
                      INPUT STATE
                    </div>
                    <pre className="text-[11px] font-mono bg-white p-3 rounded-lg border border-stone-200 text-stone-800 overflow-x-auto max-h-56 shadow-inner">
                      {JSON.stringify(step.input_state || {}, null, 2)}
                    </pre>
                  </div>

                  {/* Output State */}
                  <div>
                    <div className="text-xs font-mono font-semibold text-stone-700 mb-1.5 flex items-center gap-1.5">
                      <Code className="w-3.5 h-3.5 text-emerald-600" />
                      OUTPUT STATE (CHECKPOINT SNAPSHOT)
                    </div>
                    <pre className="text-[11px] font-mono bg-white p-3 rounded-lg border border-stone-200 text-stone-800 overflow-x-auto max-h-56 shadow-inner">
                      {JSON.stringify(step.output_state || {}, null, 2)}
                    </pre>
                  </div>
                </div>

                {/* Retrieved Context if present */}
                {step.retrieved_context && (
                  <div>
                    <div className="text-xs font-mono font-semibold text-stone-700 mb-1.5 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-amber-600" />
                      RETRIEVED CONTEXT
                    </div>
                    <pre className="text-[11px] font-mono bg-white p-3 rounded-lg border border-stone-200 text-stone-800 overflow-x-auto max-h-40 shadow-inner">
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
