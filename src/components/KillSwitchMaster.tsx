import React, { useState, useEffect } from 'react';
import {
  Power,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Lock,
  Unlock,
  Zap,
  Timer,
  CheckCircle2,
  Radio,
  Sliders,
  Flame,
  ArrowRight
} from 'lucide-react';
import { KillMode, NetworkAdapter } from '../types/killswitch';
import { soundEffects } from '../utils/audioFeedback';

interface KillSwitchMasterProps {
  isKilled: boolean;
  onTriggerKill: (source: 'MASTER_BUTTON' | 'SYSTEM_TRAY' | 'HOTKEY') => void;
  onRestore: (source: 'MASTER_BUTTON' | 'SYSTEM_TRAY' | 'HOTKEY') => void;
  killMode: KillMode;
  onChangeKillMode: (mode: KillMode) => void;
  autoRestoreSeconds: number;
  onChangeAutoRestoreSeconds: (seconds: number) => void;
  autoRestoreRemaining: number | null;
  lastExecutionMs: number | null;
  adapters: NetworkAdapter[];
}

export const KillSwitchMaster: React.FC<KillSwitchMasterProps> = ({
  isKilled,
  onTriggerKill,
  onRestore,
  killMode,
  onChangeKillMode,
  autoRestoreSeconds,
  onChangeAutoRestoreSeconds,
  autoRestoreRemaining,
  lastExecutionMs,
  adapters,
}) => {
  const [safetyCoverOpen, setSafetyCoverOpen] = useState(true);
  const [pulseAnim, setPulseAnim] = useState(false);

  const activeAdaptersCount = adapters.filter(a => a.status === 'connected').length;
  const disabledAdaptersCount = adapters.filter(a => a.status === 'disabled' || a.status === 'blocked').length;

  const handleButtonClick = () => {
    if (!safetyCoverOpen) {
      soundEffects.playClickSound();
      setSafetyCoverOpen(true);
      return;
    }

    setPulseAnim(true);
    setTimeout(() => setPulseAnim(false), 500);

    if (isKilled) {
      soundEffects.playRestoreSound();
      onRestore('MASTER_BUTTON');
    } else {
      soundEffects.playKillSound();
      onTriggerKill('MASTER_BUTTON');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Status Overview */}
      <div
        className={`p-4 rounded-xl border transition-all duration-300 ${
          isKilled
            ? 'bg-red-950/40 border-red-800/80 shadow-[0_0_30px_rgba(239,68,68,0.15)]'
            : 'bg-slate-900/60 border-slate-800'
        }`}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-3.5 h-3.5 rounded-full ${
                isKilled
                  ? 'bg-red-500 animate-ping'
                  : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]'
              }`}
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white text-sm uppercase tracking-wider font-mono">
                  {isKilled ? 'SYSTEM ISOLATED — ALL TRAFFIC SEVERED' : 'NETWORK ACTIVE & PROTECTED'}
                </span>
                {lastExecutionMs !== null && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    Response: {lastExecutionMs.toFixed(1)} ms
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isKilled
                  ? 'Zero packets entering or leaving Windows host. Adapters disabled, firewall blackhole enforced.'
                  : `${activeAdaptersCount} network adapter(s) transmitting. Kill switch armed for single-click isolation.`}
              </p>
            </div>
          </div>

          {/* Quick restore banner if killed */}
          {isKilled && (
            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              {autoRestoreRemaining !== null && autoRestoreRemaining > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/60 border border-amber-800/60 text-amber-300 text-xs font-mono">
                  <Timer className="w-3.5 h-3.5 animate-spin" />
                  <span>Auto-restore in {autoRestoreRemaining}s</span>
                </div>
              )}
              <button
                onClick={() => {
                  soundEffects.playRestoreSound();
                  onRestore('MASTER_BUTTON');
                }}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore Connection</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Hero Kill Switch Centerpiece */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left Column: Industrial Button Panel */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 relative overflow-hidden flex flex-col items-center justify-center text-center">
          {/* Subtle background radial grid */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800/20 via-transparent to-transparent pointer-events-none" />

          {/* Safety Cover Switch */}
          <div className="w-full flex items-center justify-between mb-6 pb-4 border-b border-slate-800/80 z-10">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Safety Latch</span>
              <span className="text-slate-600">·</span>
              <span className={`text-xs font-mono ${safetyCoverOpen ? 'text-amber-400 font-medium' : 'text-slate-500'}`}>
                {safetyCoverOpen ? 'UNLOCKED / READY' : 'LOCKED (Protected)'}
              </span>
            </div>

            <button
              onClick={() => {
                soundEffects.playClickSound();
                setSafetyCoverOpen(!safetyCoverOpen);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-colors border ${
                safetyCoverOpen
                  ? 'bg-amber-950/40 text-amber-300 border-amber-800/50 hover:bg-amber-900/40'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {safetyCoverOpen ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              <span>{safetyCoverOpen ? 'Lock Safety Cover' : 'Unlock Safety Cover'}</span>
            </button>
          </div>

          {/* The Big Red / Emerald Button */}
          <div className="relative py-6 z-10">
            {/* Outer Ring & Pulse */}
            <div
              className={`w-52 h-52 sm:w-60 sm:h-60 rounded-full flex items-center justify-center transition-all duration-300 ${
                isKilled
                  ? 'bg-red-950/60 border-4 border-red-600/80 shadow-[0_0_50px_rgba(239,68,68,0.4)]'
                  : 'bg-slate-950 border-4 border-slate-700 shadow-2xl hover:border-red-500/50'
              } ${pulseAnim ? 'scale-95' : ''}`}
            >
              {/* Inner Bezel */}
              <div
                className={`w-44 h-44 sm:w-52 sm:h-52 rounded-full p-2 transition-all ${
                  isKilled ? 'bg-red-900/30' : 'bg-slate-900'
                }`}
              >
                {/* Physical-feeling Button */}
                <button
                  onClick={handleButtonClick}
                  disabled={!safetyCoverOpen}
                  className={`w-full h-full rounded-full flex flex-col items-center justify-center transition-all duration-150 transform active:scale-95 select-none ${
                    !safetyCoverOpen
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border-2 border-slate-700'
                      : isKilled
                      ? 'bg-gradient-to-b from-red-600 to-red-800 text-white shadow-[inset_0_4px_8px_rgba(255,255,255,0.3),_0_8px_20px_rgba(239,68,68,0.5)] cursor-pointer hover:brightness-110 active:brightness-90 border-2 border-red-400'
                      : 'bg-gradient-to-b from-red-500 via-red-600 to-red-700 text-white shadow-[inset_0_4px_8px_rgba(255,255,255,0.3),_0_8px_25px_rgba(220,38,38,0.6)] cursor-pointer hover:scale-[1.02] hover:from-red-400 active:scale-95 border-2 border-red-400/80'
                  }`}
                >
                  <Power
                    className={`w-12 h-12 sm:w-14 sm:h-14 mb-2 transition-transform duration-300 ${
                      isKilled ? 'rotate-180 text-white' : 'text-white'
                    }`}
                  />
                  <span className="font-extrabold text-base sm:text-lg tracking-wider font-mono uppercase">
                    {isKilled ? 'RESTORE NET' : 'KILL SWITCH'}
                  </span>
                  <span className="text-[11px] font-mono tracking-widest uppercase text-white/80 mt-0.5">
                    {isKilled ? 'CLICK TO RECONNECT' : 'INSTANT SHUTDOWN'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick trigger hotkey note */}
          <div className="mt-4 flex items-center justify-center gap-2 text-xs font-mono text-slate-400 z-10">
            <span>Single button press:</span>
            <kbd className="px-2 py-0.5 bg-slate-800 text-slate-200 rounded border border-slate-700 text-[11px] font-bold">
              Spacebar
            </kbd>
            <span>or</span>
            <kbd className="px-2 py-0.5 bg-slate-800 text-slate-200 rounded border border-slate-700 text-[11px] font-bold">
              Ctrl+Alt+K
            </kbd>
          </div>
        </div>

        {/* Right Column: Execution Configuration & Real-Time Parameters */}
        <div className="lg:col-span-5 space-y-4">
          {/* Kill Mode Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-red-400" />
                <h3 className="text-sm font-semibold text-white">Kill Mode Policy</h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">Windows 10/11</span>
            </div>

            <div className="space-y-2">
              {[
                {
                  id: 'nuclear_isolation',
                  title: 'Nuclear Isolation (Recommended)',
                  desc: 'All adapters disabled + Outbound/Inbound firewall blackhole + DNS/ARP flushed + Default gateway dropped.',
                  badge: 'MAX SECURITY',
                },
                {
                  id: 'all_adapters',
                  title: 'Adapter Disable Only',
                  desc: 'Instantly calls Disable-NetAdapter on all active network interfaces (Wi-Fi, Ethernet, VPN).',
                  badge: 'HARDWARE',
                },
                {
                  id: 'firewall_blackhole',
                  title: 'Windows Firewall Blackhole',
                  desc: 'Adds highest-priority Outbound & Inbound Block rules without resetting physical hardware NICs.',
                  badge: 'STEALTH',
                },
                {
                  id: 'route_drop',
                  title: 'Route Table Gateway Purge',
                  desc: 'Deletes 0.0.0.0 default route so packets cannot leave host machine.',
                  badge: 'LIGHTWEIGHT',
                },
              ].map(mode => (
                <label
                  key={mode.id}
                  onClick={() => onChangeKillMode(mode.id as KillMode)}
                  className={`block p-3 rounded-lg border cursor-pointer transition-all ${
                    killMode === mode.id
                      ? 'bg-slate-800/90 border-red-500/50 shadow-sm'
                      : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="kill_mode"
                        checked={killMode === mode.id}
                        onChange={() => onChangeKillMode(mode.id as KillMode)}
                        className="text-red-500 focus:ring-red-500 focus:ring-offset-slate-900"
                      />
                      <span className="text-xs font-semibold text-slate-200">{mode.title}</span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      {mode.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 pl-6 leading-relaxed">{mode.desc}</p>
                </label>
              ))}
            </div>
          </div>

          {/* Auto-Restore Fail-Safe */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-white">Auto-Restore Fail-Safe</h3>
              </div>
              <span className="text-[11px] font-mono text-cyan-400">
                {autoRestoreSeconds === 0 ? 'DISABLED (Manual only)' : `${autoRestoreSeconds}s Timer`}
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Automatically reconnects internet if you accidentally trigger the switch or forget it was armed.
            </p>

            <div className="grid grid-cols-4 gap-2">
              {[
                { val: 0, label: 'Off' },
                { val: 30, label: '30s' },
                { val: 60, label: '60s' },
                { val: 300, label: '5m' },
              ].map(opt => (
                <button
                  key={opt.val}
                  onClick={() => onChangeAutoRestoreSeconds(opt.val)}
                  className={`py-1.5 text-xs font-mono rounded border transition-colors ${
                    autoRestoreSeconds === opt.val
                      ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 font-bold'
                      : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
