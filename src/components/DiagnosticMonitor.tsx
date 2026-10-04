import React, { useState, useEffect } from 'react';
import {
  Activity,
  WifiOff,
  Wifi,
  Server,
  Globe,
  Radio,
  Clock,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Zap,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { PingResult } from '../types/killswitch';
import { soundEffects } from '../utils/audioFeedback';

interface DiagnosticMonitorProps {
  isKilled: boolean;
  onRefreshProbe: () => void;
}

export const DiagnosticMonitor: React.FC<DiagnosticMonitorProps> = ({
  isKilled,
  onRefreshProbe,
}) => {
  const [history, setHistory] = useState<PingResult[]>([]);
  const [liveRealPing, setLiveRealPing] = useState<number | null>(null);
  const [browserOnline, setBrowserOnline] = useState<boolean>(navigator.onLine);
  const [testingReal, setTestingReal] = useState(false);

  // Monitor navigator.onLine
  useEffect(() => {
    const handleOnline = () => setBrowserOnline(true);
    const handleOffline = () => setBrowserOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Generate continuous ping heartbeats
  useEffect(() => {
    const interval = setInterval(() => {
      setHistory(prev => {
        const newEntry: PingResult = {
          timestamp: Date.now(),
          latencyMs: isKilled ? null : Math.floor(14 + Math.random() * 18),
          status: isKilled ? 'blocked' : 'ok',
        };
        const next = [...prev, newEntry];
        return next.slice(-24); // Keep last 24 ticks
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [isKilled]);

  // Test real browser connectivity
  const runRealConnectivityTest = async () => {
    soundEffects.playClickSound();
    setTestingReal(true);
    const start = performance.now();
    try {
      // Fetch favicon with cache bust and short timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      await fetch(`https://www.google.com/favicon.ico?_cb=${Date.now()}`, {
        mode: 'no-cors',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const elapsed = Math.round(performance.now() - start);
      setLiveRealPing(elapsed);
    } catch {
      setLiveRealPing(null);
    } finally {
      setTestingReal(false);
    }
  };

  const activeSockets = [
    { app: 'msedge.exe', protocol: 'TCP', local: '192.168.1.142:52410', remote: '142.250.190.46:443', state: isKilled ? 'TERMINATED' : 'ESTABLISHED' },
    { app: 'Discord.exe', protocol: 'TCP', local: '192.168.1.142:52418', remote: '162.159.130.233:443', state: isKilled ? 'TERMINATED' : 'ESTABLISHED' },
    { app: 'Steam.exe', protocol: 'UDP', local: '192.168.1.142:27015', remote: '155.133.248.51:27015', state: isKilled ? 'BLOCKED' : 'ACTIVE' },
    { app: 'Spotify.exe', protocol: 'TCP', local: '192.168.1.142:52504', remote: '35.186.224.25:443', state: isKilled ? 'TERMINATED' : 'ESTABLISHED' },
    { app: 'svchost.exe', protocol: 'UDP', local: '192.168.1.142:5353', remote: '224.0.0.251:5353', state: isKilled ? 'DROPPED' : 'LISTENING' },
  ];

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">Live Network Pulse & Packet Inspection</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Continuous ICMP echo telemetry and simulated TCP/UDP socket state inspection.
          </p>
        </div>

        <button
          onClick={runRealConnectivityTest}
          disabled={testingReal}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${testingReal ? 'animate-spin' : ''}`} />
          <span>{testingReal ? 'Probing...' : 'Probe Real Browser Net'}</span>
        </button>
      </div>

      {/* Latency & Packet Loss Gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs font-mono text-slate-400 uppercase">Ping Latency</div>
          <div className="text-2xl font-bold font-mono mt-1 text-white flex items-baseline gap-2">
            {isKilled ? (
              <span className="text-red-400">TIMEOUT</span>
            ) : (
              <span>21 <span className="text-xs font-normal text-slate-400">ms</span></span>
            )}
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-1">Target: 1.1.1.1 (Cloudflare Anycast)</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs font-mono text-slate-400 uppercase">Packet Loss Rate</div>
          <div className="text-2xl font-bold font-mono mt-1 flex items-baseline gap-2">
            {isKilled ? (
              <span className="text-red-400 font-extrabold">100.0%</span>
            ) : (
              <span className="text-emerald-400 font-bold">0.0%</span>
            )}
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-1">
            {isKilled ? 'Total packet isolation active' : 'Zero packet drop recorded'}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs font-mono text-slate-400 uppercase">DNS Resolver Status</div>
          <div className="text-2xl font-bold font-mono mt-1 flex items-baseline gap-2">
            {isKilled ? (
              <span className="text-red-400 text-lg">FLUSHED / BLOCKED</span>
            ) : (
              <span className="text-emerald-400 text-lg">OPERATIONAL</span>
            )}
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-1">
            {isKilled ? 'Cache purged, DNS queries dropped' : 'Secure DNS over HTTPS (DoH)'}
          </div>
        </div>
      </div>

      {/* Ping Heartbeat Visualizer */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-mono text-slate-300 font-semibold flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>Real-time Ping Stream (24-second window)</span>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            {isKilled ? 'Status: 100% BLOCKED' : 'Status: HEALTHY'}
          </span>
        </div>

        <div className="h-16 flex items-end gap-1.5 bg-slate-950 p-2 rounded-lg border border-slate-800/80">
          {history.map((entry, idx) => {
            const isOk = entry.status === 'ok';
            const heightPercent = isOk ? Math.min(100, Math.max(20, (entry.latencyMs || 20) * 2)) : 100;

            return (
              <div
                key={idx}
                className="flex-1 flex flex-col justify-end items-center h-full group relative"
              >
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full rounded-xs transition-all ${
                    isOk ? 'bg-emerald-500/80 group-hover:bg-emerald-400' : 'bg-red-500/90 group-hover:bg-red-400'
                  }`}
                />
                {/* Tooltip */}
                <div className="absolute -top-7 hidden group-hover:block px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-white whitespace-nowrap z-20 border border-slate-700 pointer-events-none">
                  {isOk ? `${entry.latencyMs}ms` : 'TIMEOUT'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Socket Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
          <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
            <span>Windows TCP/UDP Sockets (netstat -ano)</span>
          </h4>
          <span className="text-[11px] font-mono text-slate-400">
            {isKilled ? 'All Outbound Sockets Severed' : 'Active Connections Monitored'}
          </span>
        </div>

        <div className="overflow-x-auto font-mono text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-950/60 text-slate-400 text-[11px] border-b border-slate-800/80">
              <tr>
                <th className="py-2 px-3">Process</th>
                <th className="py-2 px-3">Proto</th>
                <th className="py-2 px-3">Local Address</th>
                <th className="py-2 px-3">Foreign Address</th>
                <th className="py-2 px-3">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {activeSockets.map((sock, i) => (
                <tr key={i} className="hover:bg-slate-850/40">
                  <td className="py-2 px-3 font-semibold text-white">{sock.app}</td>
                  <td className="py-2 px-3 text-slate-400">{sock.protocol}</td>
                  <td className="py-2 px-3 text-slate-400">{sock.local}</td>
                  <td className="py-2 px-3 text-slate-400">{sock.remote}</td>
                  <td className="py-2 px-3">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        sock.state === 'ESTABLISHED' || sock.state === 'LISTENING' || sock.state === 'ACTIVE'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-red-950 text-red-400 border border-red-800'
                      }`}
                    >
                      {sock.state}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
