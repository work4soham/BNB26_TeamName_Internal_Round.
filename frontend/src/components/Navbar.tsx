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
    <header className="sticky top-0 z-50 border-b border-burgundy-100 bg-white/95 backdrop-blur-md px-6 py-3.5 flex items-center justify-between shadow-sm">
      <div className="flex items-center space-x-8">
        <div 
          onClick={() => setActiveTab('overview')} 
          className="flex items-center space-x-3 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-lg bg-burgundy-700 flex items-center justify-center shadow-md shadow-burgundy-700/20 group-hover:bg-burgundy-800 transition-colors">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-burgundy-950 text-base tracking-wider flex items-center gap-1.5">
              BLACK BOX
              <span className="text-[10px] uppercase tracking-widest font-mono bg-burgundy-50 text-burgundy-800 px-1.5 py-0.5 rounded border border-burgundy-200 font-semibold">
                RECORDER
              </span>
            </div>
            <div className="text-[11px] text-stone-500 font-mono">Agent Root-Cause Observability</div>
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
                    ? 'bg-burgundy-50 text-burgundy-800 border border-burgundy-200 shadow-sm font-semibold'
                    : 'text-stone-600 hover:text-burgundy-900 hover:bg-stone-50 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-burgundy-700' : 'text-stone-400'}`} />
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
          className="flex items-center space-x-2 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 text-amber-900 border border-amber-300 px-3.5 py-1.5 rounded-md text-xs font-semibold shadow-sm transition-all"
        >
          <PlayCircle className="w-4 h-4 text-amber-600 animate-pulse" />
          <span>Inspect Currency Bug Demo</span>
        </button>

        {/* Backend health status pill */}
        <div className="flex items-center space-x-2 px-2.5 py-1 rounded-full bg-white border border-stone-200 text-[11px] font-mono text-stone-700 shadow-sm">
          <span className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-500 shadow-[0_0_8px_#10B981]' : 'bg-rose-500'}`} />
          <span>{isHealthy === null ? 'CONNECTING...' : isHealthy ? 'API ONLINE' : 'OFFLINE'}</span>
        </div>
      </div>
    </header>
  );
};
