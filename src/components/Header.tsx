import React from 'react';
import { Shield, ShieldAlert, Volume2, VolumeX, Keyboard, Terminal, Bell } from 'lucide-react';
import { soundEffects } from '../utils/audioFeedback';

interface HeaderProps {
  isKilled: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  activeTab: 'master' | 'adapters' | 'logs' | 'deploy' | 'diagnostics';
  onSelectTab: (tab: 'master' | 'adapters' | 'logs' | 'deploy' | 'diagnostics') => void;
  logCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  isKilled,
  soundEnabled,
  onToggleSound,
  activeTab,
  onSelectTab,
  logCount,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Identity */}
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors shadow-sm ${
                isKilled
                  ? 'bg-red-950 text-red-400 border border-red-800 animate-pulse'
                  : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
              }`}
            >
              {isKilled ? <ShieldAlert className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs tracking-wider uppercase text-slate-400">Windows PC Suite</span>
                <span className="text-slate-600">·</span>
                <span className="font-mono text-xs text-slate-400">v2.4 Pro</span>
              </div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                NET-KILLSWITCH
                <span
                  className={`text-xs px-2 py-0.5 font-mono font-semibold rounded ${
                    isKilled
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {isKilled ? 'SEVERED / BLOCKED' : 'ONLINE / ARMED'}
                </span>
              </h1>
            </div>
          </div>

          {/* Quick Actions & Sound */}
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-xs font-mono text-slate-400">
              <Keyboard className="w-3.5 h-3.5 text-slate-500" />
              <span>Hotkey:</span>
              <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-200 rounded border border-slate-700 font-semibold text-[11px]">
                Ctrl+Alt+K
              </kbd>
            </div>

            <button
              onClick={onToggleSound}
              title={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
              className="p-2 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1 border-t border-slate-900 py-2 overflow-x-auto">
          <button
            onClick={() => onSelectTab('master')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'master'
                ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Master Switch & Tray</span>
          </button>

          <button
            onClick={() => onSelectTab('deploy')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'deploy'
                ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>Windows Scripts & Tray App</span>
            <span className="bg-cyan-950 text-cyan-400 text-[10px] px-1.5 py-0.2 rounded border border-cyan-800/50">
              .ps1 / .bat
            </span>
          </button>

          <button
            onClick={() => onSelectTab('adapters')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'adapters'
                ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <span>Network Adapters</span>
          </button>

          <button
            onClick={() => onSelectTab('diagnostics')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'diagnostics'
                ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <span>Diagnostics & Ping</span>
          </button>

          <button
            onClick={() => onSelectTab('logs')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'logs'
                ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <span>Activity Logs</span>
            {logCount > 0 && (
              <span className="bg-slate-900 text-slate-300 text-[10px] px-1.5 py-0.2 rounded border border-slate-700 font-mono">
                {logCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
