import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { OverviewPage } from './pages/OverviewPage';
import { RunsPage } from './pages/RunsPage';
import { RunDetailPage } from './pages/RunDetailPage';
import { DiagnosisPage } from './pages/DiagnosisPage';
import { ReplayLabPage } from './pages/ReplayLabPage';
import { TraceComparePage } from './pages/TraceComparePage';
import { EvaluationPage } from './pages/EvaluationPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedRunId, setSelectedRunId] = useState<string>('demo-run-currency-mismatch');
  const [replaySeq, setReplaySeq] = useState<number>(5);
  const [compareBaseId, setCompareBaseId] = useState<string>('demo-run-currency-mismatch');
  const [compareTargetId, setCompareTargetId] = useState<string>('');

  const handleLaunchDemo = () => {
    setSelectedRunId('demo-run-currency-mismatch');
    setActiveTab('diagnosis');
  };

  const handleSelectRun = (runId: string) => {
    setSelectedRunId(runId);
    setActiveTab('run-detail');
  };

  const handleNavigateToDiagnosis = (runId: string) => {
    setSelectedRunId(runId);
    setActiveTab('diagnosis');
  };

  const handleNavigateToReplay = (runId: string, seq?: number) => {
    setSelectedRunId(runId);
    if (seq !== undefined) setReplaySeq(seq);
    setActiveTab('replay');
  };

  const handleNavigateToCompare = (baseRunId: string, targetRunId: string) => {
    setCompareBaseId(baseRunId);
    setCompareTargetId(targetRunId);
    setActiveTab('compare');
  };

  return (
    <div className="min-h-screen bg-[#FAF8F9] text-gray-900 flex flex-col font-sans selection:bg-burgundy-200 selection:text-burgundy-900">
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLaunchDemo={handleLaunchDemo}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {activeTab === 'overview' && (
          <OverviewPage
            onSelectRun={handleSelectRun}
            onNavigateToDiagnosis={handleNavigateToDiagnosis}
            onLaunchDemo={handleLaunchDemo}
          />
        )}

        {activeTab === 'runs' && (
          <RunsPage
            onSelectRun={handleSelectRun}
            onNavigateToDiagnosis={handleNavigateToDiagnosis}
          />
        )}

        {activeTab === 'run-detail' && (
          <RunDetailPage
            runId={selectedRunId}
            onBack={() => setActiveTab('runs')}
            onNavigateToDiagnosis={handleNavigateToDiagnosis}
            onNavigateToReplay={handleNavigateToReplay}
            onNavigateToCompare={handleNavigateToCompare}
          />
        )}

        {activeTab === 'diagnosis' && (
          <DiagnosisPage
            runId={selectedRunId}
            onBack={() => setActiveTab('runs')}
            onNavigateToReplay={handleNavigateToReplay}
            onNavigateToRunDetail={handleSelectRun}
          />
        )}

        {activeTab === 'replay' && (
          <ReplayLabPage
            initialRunId={selectedRunId}
            initialSeq={replaySeq}
            onBack={() => setActiveTab('diagnosis')}
            onNavigateToCompare={handleNavigateToCompare}
          />
        )}

        {activeTab === 'compare' && (
          <TraceComparePage
            baseRunId={compareBaseId}
            targetRunId={compareTargetId || selectedRunId}
            onBack={() => setActiveTab('replay')}
            onNavigateToRunDetail={handleSelectRun}
          />
        )}

        {activeTab === 'evaluation' && (
          <EvaluationPage />
        )}

        {activeTab === 'settings' && (
          <SettingsPage />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-burgundy-100 bg-white/90 backdrop-blur-sm py-6 px-6 text-center text-xs font-mono text-gray-600 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-semibold text-burgundy-900 tracking-wide">BLACK BOX — An AI Flight Recorder for AI Agents</span>
          <span className="text-gray-500">Research Benchmark & Root-Cause Counterfactual Replay</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
