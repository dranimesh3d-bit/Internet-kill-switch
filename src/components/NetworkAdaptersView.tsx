import React from 'react';
import {
  Wifi,
  EthernetPort,
  Shield,
  Radio,
  Share2,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  ArrowDown,
  ArrowUp,
  RefreshCw,
  Trash2,
  Lock
} from 'lucide-react';
import { NetworkAdapter } from '../types/killswitch';
import { soundEffects } from '../utils/audioFeedback';

interface NetworkAdaptersViewProps {
  adapters: NetworkAdapter[];
  onToggleAdapter: (id: string) => void;
  onToggleWhitelist: (id: string) => void;
  onFlushDns: () => void;
  isKilled: boolean;
}

export const NetworkAdaptersView: React.FC<NetworkAdaptersViewProps> = ({
  adapters,
  onToggleAdapter,
  onToggleWhitelist,
  onFlushDns,
  isKilled,
}) => {
  const getIcon = (type: NetworkAdapter['type']) => {
    switch (type) {
      case 'Wi-Fi':
        return <Wifi className="w-4 h-4 text-cyan-400" />;
      case 'Ethernet':
        return <EthernetPort className="w-4 h-4 text-emerald-400" />;
      case 'VPN':
        return <Shield className="w-4 h-4 text-indigo-400" />;
      case 'Virtual':
        return <Share2 className="w-4 h-4 text-amber-400" />;
      default:
        return <Radio className="w-4 h-4 text-purple-400" />;
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header & Actions */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <span>Windows Network Adapters & Interfaces</span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              Get-NetAdapter Hook
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Individual hardware control, status monitor, and whitelist bypass rules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              soundEffects.playClickSound();
              onFlushDns();
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Flush DNS Cache (ipconfig /flushdns)</span>
          </button>
        </div>
      </div>

      {/* Adapters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {adapters.map(adapter => {
          const isConnected = adapter.status === 'connected';

          return (
            <div
              key={adapter.id}
              className={`p-4 rounded-xl border transition-all ${
                isConnected
                  ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  : 'bg-red-950/20 border-red-900/60'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700 shrink-0 mt-0.5">
                    {getIcon(adapter.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white truncate max-w-[200px]" title={adapter.name}>
                        {adapter.name}
                      </h4>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        {adapter.type}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                      Interface: <span className="text-slate-400">{adapter.interfaceName}</span>
                    </div>
                  </div>
                </div>

                {/* State Badge & Toggle */}
                <div className="flex flex-col items-end gap-1.5">
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                      isConnected
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-red-500/10 text-red-400 border border-red-500/30'
                    }`}
                  >
                    {isConnected ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    <span>{isConnected ? 'UP / ACTIVE' : 'DISABLED'}</span>
                  </span>

                  <button
                    onClick={() => {
                      soundEffects.playClickSound();
                      onToggleAdapter(adapter.id);
                    }}
                    title={isConnected ? 'Disable adapter' : 'Enable adapter'}
                    className="cursor-pointer text-slate-400 hover:text-white transition-colors"
                  >
                    {isConnected ? (
                      <ToggleRight className="w-6 h-6 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-slate-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* IP / MAC / Gateway Details */}
              <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-800/80 text-[11px] font-mono">
                <div>
                  <span className="text-slate-500">IPv4 Address:</span>
                  <div className={isConnected ? 'text-slate-300 font-semibold' : 'text-slate-600'}>
                    {isConnected ? adapter.ipAddress : '0.0.0.0 (Unbound)'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Default Gateway:</span>
                  <div className={isConnected ? 'text-slate-300 font-semibold' : 'text-slate-600'}>
                    {isConnected ? adapter.gateway : 'None'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">MAC Address:</span>
                  <div className="text-slate-400">{adapter.macAddress}</div>
                </div>
                <div>
                  <span className="text-slate-500">Throughput:</span>
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="flex items-center gap-0.5">
                      <ArrowDown className="w-3 h-3 text-cyan-400" />
                      {isConnected ? `${adapter.rxSpeedKbps} KB/s` : '0 KB/s'}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <ArrowUp className="w-3 h-3 text-purple-400" />
                      {isConnected ? `${adapter.txSpeedKbps} KB/s` : '0 KB/s'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Whitelist Toggle */}
              <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={adapter.whitelisted}
                    onChange={() => onToggleWhitelist(adapter.id)}
                    className="rounded border-slate-700 text-cyan-600 focus:ring-cyan-500 focus:ring-offset-slate-900"
                  />
                  <span className="text-xs text-slate-300 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" />
                    <span>Whitelist (Do not disable in Kill Switch)</span>
                  </span>
                </label>
                {adapter.whitelisted && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                    PROTECTED
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
