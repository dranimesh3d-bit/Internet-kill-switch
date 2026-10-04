import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  ShieldAlert,
  Wifi,
  WifiOff,
  Volume2,
  Battery,
  ChevronUp,
  RotateCcw,
  FileText,
  FolderOpen,
  X,
  ExternalLink,
  Power,
  Settings,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { soundEffects } from '../utils/audioFeedback';

interface SystemTraySimulatorProps {
  isKilled: boolean;
  onTriggerKill: (source: 'SYSTEM_TRAY') => void;
  onRestore: (source: 'SYSTEM_TRAY') => void;
  onOpenLogsTab: () => void;
  onOpenDeployTab: () => void;
  lastExecutionMs: number | null;
  toastNotification: {
    title: string;
    message: string;
    type: 'critical' | 'restore' | 'info';
    timestamp: number;
  } | null;
  onDismissToast: () => void;
}

export const SystemTraySimulator: React.FC<SystemTraySimulatorProps> = ({
  isKilled,
  onTriggerKill,
  onRestore,
  onOpenLogsTab,
  onOpenDeployTab,
  lastExecutionMs,
  toastNotification,
  onDismissToast,
}) => {
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const trayIconRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setCurrentDate(now.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close context menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (trayIconRef.current && !trayIconRef.current.contains(e.target as Node)) {
        setContextMenuOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleTrayLeftClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundEffects.playClickSound();
    if (isKilled) {
      soundEffects.playRestoreSound();
      onRestore('SYSTEM_TRAY');
    } else {
      soundEffects.playKillSound();
      onTriggerKill('SYSTEM_TRAY');
    }
  };

  const handleTrayRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    soundEffects.playClickSound();
    setContextMenuOpen(!contextMenuOpen);
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 mb-4 border-b border-slate-800 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-cyan-400">Interactive Simulation</span>
            <span className="text-slate-600">·</span>
            <h3 className="text-sm font-semibold text-white">Windows 11 System Tray & Taskbar Integration</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Test the native Windows notification tray workflow: 1-click left toggle, right-click context menu, and desktop notifications.
          </p>
        </div>

        <button
          onClick={onOpenDeployTab}
          className="text-xs text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1.5 transition-colors"
        >
          <span>Get Native .ps1 / .bat for your PC</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Simulated Windows Desktop Area with Floating Toast */}
      <div className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-slate-800/80 rounded-xl min-h-[220px] flex flex-col justify-between overflow-hidden shadow-inner p-4">
        {/* Desktop Wallpaper watermarks */}
        <div className="flex items-center justify-between opacity-30 select-none pointer-events-none">
          <div className="font-mono text-[11px] text-slate-400">
            Windows 11 Pro · NetKillSwitch Active Tray Agent
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            PID: 4892 · Hook: WH_KEYBOARD_LL
          </div>
        </div>

        {/* Center Hint */}
        <div className="self-center text-center my-4 select-none">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-850/80 border border-slate-700/60 text-xs text-slate-300 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>Try clicking or right-clicking the tray icon below</span>
          </div>
        </div>

        {/* Windows Toast Notification (Slides in from bottom right) */}
        {toastNotification && (
          <div
            className={`absolute bottom-16 right-4 max-w-sm w-full p-3.5 rounded-lg border shadow-2xl backdrop-blur-md transition-all duration-300 z-30 animate-in slide-in-from-bottom-4 ${
              toastNotification.type === 'critical'
                ? 'bg-red-950/90 border-red-700/80 text-white'
                : toastNotification.type === 'restore'
                ? 'bg-emerald-950/90 border-emerald-700/80 text-white'
                : 'bg-slate-900/90 border-slate-700 text-white'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                {toastNotification.type === 'critical' ? (
                  <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                ) : (
                  <Shield className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-300">NetKillSwitch</span>
                    <span className="text-slate-500">·</span>
                    <span className="text-[10px] font-mono text-slate-400">Just now</span>
                  </div>
                  <h4 className="text-xs font-bold mt-0.5">{toastNotification.title}</h4>
                  <p className="text-[11px] text-slate-200 mt-1 leading-relaxed">{toastNotification.message}</p>
                </div>
              </div>
              <button
                onClick={onDismissToast}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Simulated Windows Taskbar */}
        <div className="w-full bg-slate-950/95 border-t border-slate-800 rounded-lg px-3 py-1.5 flex items-center justify-between text-slate-300 select-none shadow-lg z-20">
          {/* Windows Start & Pinned Apps */}
          <div className="flex items-center gap-3">
            {/* Windows 11 Start Logo */}
            <div className="w-6 h-6 grid grid-cols-2 gap-0.5 p-0.5 rounded hover:bg-slate-800 cursor-pointer transition-colors">
              <div className="bg-cyan-500 rounded-xs" />
              <div className="bg-cyan-500 rounded-xs" />
              <div className="bg-cyan-500 rounded-xs" />
              <div className="bg-cyan-500 rounded-xs" />
            </div>

            <div className="h-4 w-[1px] bg-slate-800 hidden sm:block" />

            {/* Quick App Icons */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-6 h-6 rounded flex items-center justify-center bg-slate-900 border border-slate-800 hover:bg-slate-800 cursor-pointer">
                <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="w-6 h-6 rounded flex items-center justify-center bg-slate-900 border border-slate-800 hover:bg-slate-800 cursor-pointer">
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
              </div>
            </div>
          </div>

          {/* System Notification Area / System Tray */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button className="p-1 hover:bg-slate-800 rounded text-slate-400 transition-colors">
              <ChevronUp className="w-3.5 h-3.5" />
            </button>

            {/* THE NETKILLSWITCH TRAY ICON (FOCAL POINT) */}
            <div className="relative" ref={trayIconRef}>
              <div
                onClick={handleTrayLeftClick}
                onContextMenu={handleTrayRightClick}
                onMouseEnter={() => setTooltipVisible(true)}
                onMouseLeave={() => setTooltipVisible(false)}
                className={`relative px-2 py-1 rounded flex items-center gap-1.5 cursor-pointer transition-all border ${
                  isKilled
                    ? 'bg-red-950/80 border-red-600 text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.5)] animate-pulse'
                    : 'bg-emerald-950/60 border-emerald-600/80 text-emerald-300 hover:bg-emerald-900/60 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                }`}
              >
                {isKilled ? (
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                ) : (
                  <Shield className="w-4 h-4 text-emerald-400" />
                )}
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider hidden xs:inline">
                  {isKilled ? 'CUT' : 'SAFE'}
                </span>

                {/* Status Dot */}
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isKilled ? 'bg-red-400 animate-ping' : 'bg-emerald-400'
                  }`}
                />
              </div>

              {/* Native Windows Tooltip */}
              {tooltipVisible && !contextMenuOpen && (
                <div className="absolute bottom-10 right-0 px-2.5 py-1 bg-slate-900 text-slate-100 text-[11px] font-mono rounded shadow-lg border border-slate-700 whitespace-nowrap z-50 pointer-events-none">
                  {isKilled
                    ? 'NetKillSwitch: [SEVERED / BLOCKED] (Click to Restore)'
                    : 'NetKillSwitch: [ONLINE / ACTIVE] (Click to Cut)'}
                </div>
              )}

              {/* Windows Context Menu (Right Click) */}
              {contextMenuOpen && (
                <div
                  className="absolute bottom-11 right-0 w-64 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-1 z-50 text-xs font-sans text-slate-200 animate-in fade-in zoom-in-95"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="px-3 py-1.5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                      NetKillSwitch v2.4
                    </span>
                    <span
                      className={`text-[9px] font-mono px-1 rounded ${
                        isKilled ? 'bg-red-950 text-red-400' : 'bg-emerald-950 text-emerald-400'
                      }`}
                    >
                      {isKilled ? 'SEVERED' : 'ONLINE'}
                    </span>
                  </div>

                  {/* Instant Kill */}
                  <button
                    onClick={() => {
                      soundEffects.playKillSound();
                      onTriggerKill('SYSTEM_TRAY');
                      setContextMenuOpen(false);
                    }}
                    disabled={isKilled}
                    className={`w-full px-3 py-2 text-left flex items-center gap-2.5 font-bold transition-colors ${
                      isKilled
                        ? 'text-slate-500 cursor-not-allowed'
                        : 'text-red-400 hover:bg-red-950/50 cursor-pointer'
                    }`}
                  >
                    <Power className="w-4 h-4 text-red-500" />
                    <span>🚨 Instant Kill Switch (Cut)</span>
                  </button>

                  {/* Restore */}
                  <button
                    onClick={() => {
                      soundEffects.playRestoreSound();
                      onRestore('SYSTEM_TRAY');
                      setContextMenuOpen(false);
                    }}
                    disabled={!isKilled}
                    className={`w-full px-3 py-2 text-left flex items-center gap-2.5 font-semibold transition-colors ${
                      !isKilled
                        ? 'text-slate-500 cursor-not-allowed'
                        : 'text-emerald-400 hover:bg-emerald-950/50 cursor-pointer'
                    }`}
                  >
                    <RotateCcw className="w-4 h-4 text-emerald-500" />
                    <span>🔄 Restore All Connections</span>
                  </button>

                  <div className="h-[1px] bg-slate-800 my-1" />

                  {/* Auto-restore 60s */}
                  <button
                    onClick={() => {
                      soundEffects.playKillSound();
                      onTriggerKill('SYSTEM_TRAY');
                      setContextMenuOpen(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-slate-300 hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>⏱ Kill with 60s Auto-Restore</span>
                  </button>

                  {/* View Logs */}
                  <button
                    onClick={() => {
                      onOpenLogsTab();
                      setContextMenuOpen(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-slate-300 hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>📋 View Kill Switch Log</span>
                  </button>

                  {/* Windows Script Deployment */}
                  <button
                    onClick={() => {
                      onOpenDeployTab();
                      setContextMenuOpen(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-slate-300 hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
                    <span>📁 Export Windows Tray App</span>
                  </button>

                  <div className="h-[1px] bg-slate-800 my-1" />

                  {/* Exit */}
                  <button
                    onClick={() => {
                      if (isKilled) onRestore('SYSTEM_TRAY');
                      setContextMenuOpen(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-slate-400 hover:text-white hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5 text-slate-500" />
                    <span>❌ Restore & Exit NetKillSwitch</span>
                  </button>
                </div>
              )}
            </div>

            {/* Simulated standard Windows tray icons */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-850 cursor-pointer">
              {isKilled ? (
                <WifiOff className="w-3.5 h-3.5 text-red-400" />
              ) : (
                <Wifi className="w-3.5 h-3.5 text-slate-300" />
              )}
              <Volume2 className="w-3.5 h-3.5 text-slate-300" />
              <Battery className="w-3.5 h-3.5 text-slate-300" />
            </div>

            {/* Taskbar Clock */}
            <div className="text-right text-[11px] font-mono leading-tight px-1 hidden sm:block">
              <div>{currentTime || '12:00 PM'}</div>
              <div className="text-[10px] text-slate-500">{currentDate || '10/03/2026'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
