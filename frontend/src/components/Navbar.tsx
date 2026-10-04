import React, { useEffect, useState } from 'react';
import { 
  Activity, 
  Layers, 
  Terminal, 
  RotateCcw, 
  GitCompare, 
  BarChart3, 
  Settings as SettingsIcon,
  PlayCircle,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { api } from '../services/api';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLaunchDemo: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, onLaunchDemo }) => {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    api.getHealth()
      .then(res => setIsHealthy(res.status === 'ok'))
      .catch(() => setIsHealthy(false));
  }, []);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'runs', label: 'Runs', icon: Layers },
    { id: 'diagnosis', label: 'Diagnosis', icon: Terminal },
    { id: 'replay', label: 'Replay Lab', icon: RotateCcw },
    { id: 'compare', label: 'Trace Compare', icon: GitCompare },
    { id: 'evaluation', label: 'Evaluation', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-gray-800 bg-[#0B0F17]/90 backdrop-blur-md px-6 py-3.5 flex items-center justify-between">
      <div className="flex items-center space-x-8">
        <div 
          onClick={() => setActiveTab('overview')} 
          className="flex items-center space-x-3 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:bg-indigo-500 transition-colors">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-white text-base tracking-wider flex items-center gap-1.5">
              BLACK BOX
              <span className="text-[10px] uppercase tracking-widest font-mono bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/30">
                RECORDER
              </span>
            </div>
            <div className="text-[11px] text-gray-400 font-mono">Agent Root-Cause Observability</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-400' : 'text-gray-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center space-x-4">
        {/* Curated Demo Action */}
        <button
          onClick={onLaunchDemo}
          className="flex items-center space-x-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/40 px-3.5 py-1.5 rounded-md text-xs font-semibold shadow-sm transition-all"
        >
          <PlayCircle className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>Inspect Currency Bug Demo</span>
        </button>

        {/* Backend health status pill */}
        <div className="flex items-center space-x-2 px-2.5 py-1 rounded-full bg-gray-900 border border-gray-800 text-[11px] font-mono text-gray-300">
          <span className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-rose-500'}`} />
          <span>{isHealthy === null ? 'CONNECTING...' : isHealthy ? 'API ONLINE' : 'OFFLINE'}</span>
        </div>
      </div>
    </header>
  );
};
