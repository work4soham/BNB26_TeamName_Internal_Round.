import React, { useState } from 'react';
import { 
  Database, 
  Cpu, 
  Search, 
  Target, 
  FileText, 
  Bookmark, 
  RotateCcw, 
  GitCompare,
  ChevronRight,
  Info
} from 'lucide-react';

export const ArchitecturePipeline: React.FC = () => {
  const [selectedStage, setSelectedStage] = useState<number>(3);

  const stages = [
    {
      id: 'trace',
      name: 'Trace Collection',
      icon: Database,
      badge: 'Capture',
      desc: 'Ingests granular agent execution step by step: actions, states, decisions, latencies, tokens and state hashes.'
    },
    {
      id: 'features',
      name: 'Feature Extraction',
      icon: Cpu,
      badge: '14 Features',
      desc: 'Extracts 14 normalized, leakage-safe features including latency deviation, token divergence, tool frequency and state delta.'
    },
    {
      id: 'anomaly',
      name: 'Anomaly Detection',
      icon: Search,
      badge: 'IsolationForest',
      desc: 'Unsupervised isolation depth scoring identifying unusual state shifts, sudden latency spikes and malformed outputs.'
    },
    {
      id: 'localization',
      name: 'Failure Localization',
      icon: Target,
      badge: 'RandomForest',
      desc: 'Supervised classification trained strictly on training traces to output calibrated root-cause probabilities.'
    },
    {
      id: 'evidence',
      name: 'Evidence Synthesis',
      icon: FileText,
      badge: '0-100 Score',
      desc: 'Synthesizes suspiciousness score (0-100), human-readable reason codes, and concrete state diff evidence.'
    },
    {
      id: 'checkpoint',
      name: 'Checkpoints',
      icon: Bookmark,
      badge: 'SHA-256',
      desc: 'Deterministic canonical state hashing and snapshot storage indexed by hash for instant recovery.'
    },
    {
      id: 'replay',
      name: 'Counterfactual Replay',
      icon: RotateCcw,
      badge: 'Safe Suffix',
      desc: 'Reuses prefix steps up to checkpoint, applies structured alternative action, and recomputes only the downstream suffix.'
    },
    {
      id: 'compare',
      name: 'Trace Comparison',
      icon: GitCompare,
      badge: 'Divergence Diff',
      desc: 'Detects unchanged steps, first meaningful state divergence, downstream effects, and outcome recovery.'
    }
  ];

  return (
    <div className="rounded-xl border border-burgundy-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-stone-900 tracking-wide uppercase font-mono flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-burgundy-700 animate-pulse" />
            Research Architecture Pipeline
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">End-to-end flight recorder, failure localization, and counterfactual replay workflow</p>
        </div>
        <div className="text-[11px] font-mono text-stone-600 flex items-center gap-1.5 bg-stone-50 px-2.5 py-1 rounded border border-stone-200">
          <Info className="w-3.5 h-3.5 text-burgundy-700" />
          Click a stage to inspect mechanism
        </div>
      </div>

      {/* Horizontal Pipeline Steps */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 mb-4">
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          const isSelected = selectedStage === idx;
          return (
            <div
              key={stage.id}
              onClick={() => setSelectedStage(idx)}
              className={`cursor-pointer rounded-lg p-3 transition-all relative border ${
                isSelected
                  ? 'bg-burgundy-50 border-burgundy-600 shadow-sm'
                  : 'bg-stone-50/70 border-stone-200 hover:border-burgundy-300 hover:bg-burgundy-50/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-semibold text-stone-400">
                  0{idx + 1}
                </span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                  isSelected ? 'bg-burgundy-700 text-white' : 'bg-stone-200 text-stone-600'
                }`}>
                  {stage.badge}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${isSelected ? 'text-burgundy-700' : 'text-stone-500'}`} />
                <h4 className={`text-xs font-semibold truncate ${isSelected ? 'text-burgundy-950 font-bold' : 'text-stone-700'}`}>{stage.name}</h4>
              </div>
              {idx < stages.length - 1 && (
                <div className="hidden lg:block absolute -right-2.5 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                  <ChevronRight className="w-4 h-4 text-stone-300" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Stage Detail Card */}
      <div className="bg-burgundy-50/40 border border-burgundy-100 rounded-lg p-3.5 flex items-start gap-3">
        <div className="w-8 h-8 rounded-md bg-burgundy-100 border border-burgundy-200 flex items-center justify-center shrink-0">
          {React.createElement(stages[selectedStage].icon, { className: 'w-4 h-4 text-burgundy-800' })}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-stone-900">{stages[selectedStage].name}</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-burgundy-100 text-burgundy-900 border border-burgundy-200 font-medium">
              Stage 0{selectedStage + 1} of 08
            </span>
          </div>
          <p className="text-xs text-stone-700 mt-1 leading-relaxed">
            {stages[selectedStage].desc}
          </p>
        </div>
      </div>
    </div>
  );
};
