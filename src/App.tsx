import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { KillSwitchMaster } from './components/KillSwitchMaster';
import { SystemTraySimulator } from './components/SystemTraySimulator';
import { NetworkAdaptersView } from './components/NetworkAdaptersView';
import { LoggingConsole } from './components/LoggingConsole';
import { WindowsDeploySuite } from './components/WindowsDeploySuite';
import { DiagnosticMonitor } from './components/DiagnosticMonitor';
import {
  KillMode,
  NetworkAdapter,
  LogEntry,
  WindowsConfig
} from './types/killswitch';
import { soundEffects } from './utils/audioFeedback';

const INITIAL_ADAPTERS: NetworkAdapter[] = [
  {
    id: 'wifi-1',
    name: 'Wi-Fi (Intel Wi-Fi 6E AX210 160MHz)',
    interfaceName: 'Wi-Fi',
    type: 'Wi-Fi',
    ipAddress: '192.168.1.142',
    macAddress: 'E4:A7:C5:8B:12:F0',
    status: 'connected',
    whitelisted: false,
    rxSpeedKbps: 840,
    txSpeedKbps: 210,
    gateway: '192.168.1.1',
  },
  {
    id: 'eth-1',
    name: 'Realtek PCIe GbE Family Controller',
    interfaceName: 'Ethernet',
    type: 'Ethernet',
    ipAddress: '192.168.1.145',
    macAddress: '00:D8:61:94:A2:33',
    status: 'connected',
    whitelisted: false,
    rxSpeedKbps: 1250,
    txSpeedKbps: 450,
    gateway: '192.168.1.1',
  },
  {
    id: 'vpn-1',
    name: 'WireGuard Tunnel Adapter (US-West Secure)',
    interfaceName: 'wg0-client',
    type: 'VPN',
    ipAddress: '10.200.0.8',
    macAddress: '02:00:5E:00:53:01',
    status: 'connected',
    whitelisted: false,
    rxSpeedKbps: 920,
    txSpeedKbps: 340,
    gateway: '10.200.0.1',
  },
  {
    id: 'virt-1',
    name: 'Hyper-V Virtual Ethernet Adapter',
    interfaceName: 'vEthernet (Default Switch)',
    type: 'Virtual',
    ipAddress: '172.24.80.1',
    macAddress: '00:15:5D:1A:4C:E8',
    status: 'connected',
    whitelisted: true,
    rxSpeedKbps: 15,
    txSpeedKbps: 8,
    gateway: 'None (Internal)',
  },
  {
    id: 'bt-1',
    name: 'Bluetooth Device (Personal Area Network)',
    interfaceName: 'Bluetooth Network Connection',
    type: 'Cellular',
    ipAddress: '192.168.44.2',
    macAddress: '9C:B6:D0:11:88:2E',
    status: 'connected',
    whitelisted: false,
    rxSpeedKbps: 0,
    txSpeedKbps: 0,
    gateway: '192.168.44.1',
  },
];

function formatTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const padMs = (n: number) => n.toString().padStart(3, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${padMs(d.getMilliseconds())}`;
}

export default function App() {
  const [isKilled, setIsKilled] = useState<boolean>(false);
  const [killMode, setKillMode] = useState<KillMode>('nuclear_isolation');
  const [autoRestoreSeconds, setAutoRestoreSeconds] = useState<number>(0);
  const [autoRestoreRemaining, setAutoRestoreRemaining] = useState<number | null>(null);
  const [lastExecutionMs, setLastExecutionMs] = useState<number | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'master' | 'adapters' | 'logs' | 'deploy' | 'diagnostics'>('master');
  const [adapters, setAdapters] = useState<NetworkAdapter[]>(INITIAL_ADAPTERS);

  const [windowsConfig, setWindowsConfig] = useState<WindowsConfig>({
    killMode: 'nuclear_isolation',
    globalHotkey: 'Ctrl+Alt+K',
    autoRestoreSeconds: 0,
    logDirectory: 'NetKillSwitch',
    logFileName: 'killswitch.log',
    showTrayNotifications: true,
    startWithWindows: false,
    whitelistedAdapters: ['vEthernet (Default Switch)'],
    stealthTrayIcon: false,
  });

  const [toastNotification, setToastNotification] = useState<{
    title: string;
    message: string;
    type: 'critical' | 'restore' | 'info';
    timestamp: number;
  } | null>(null);

  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'init-1',
      timestamp: formatTimestamp(),
      epoch: Date.now() - 3600000,
      level: 'INFO',
      source: 'SYSTEM_TRAY',
      message: 'Windows NetKillSwitch Agent initialized and monitoring notification area.',
      details: 'Win32 System Tray icon registered (NotifyIcon). PID: 4892. Host: Windows 11 64-bit.',
    },
    {
      id: 'init-2',
      timestamp: formatTimestamp(),
      epoch: Date.now() - 3590000,
      level: 'INFO',
      source: 'HOTKEY',
      message: 'Registered global Windows hotkey: Ctrl+Alt+K',
      details: 'Hook established via user32.dll RegisterHotKey. Immediate response enabled.',
    },
  ]);

  const addLog = useCallback((
    level: LogEntry['level'],
    source: LogEntry['source'],
    message: string,
    details?: string
  ) => {
    const entry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: formatTimestamp(),
      epoch: Date.now(),
      level,
      source,
      message,
      details,
    };
    setLogs(prev => [...prev, entry]);
  }, []);

  // Show Toast with auto-dismiss
  const showToast = useCallback((title: string, message: string, type: 'critical' | 'restore' | 'info') => {
    setToastNotification({
      title,
      message,
      type,
      timestamp: Date.now(),
    });
  }, []);

  useEffect(() => {
    if (toastNotification) {
      const timer = setTimeout(() => {
        setToastNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toastNotification]);

  // Sync sound effects mute toggle
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundEffects.enabled = next;
    if (next) soundEffects.playClickSound();
  };

  // Trigger Kill Switch
  const triggerKill = useCallback((source: 'MASTER_BUTTON' | 'SYSTEM_TRAY' | 'HOTKEY') => {
    const startTime = performance.now();

    // 1. Update adapters
    setAdapters(prev =>
      prev.map(adapter => {
        if (adapter.whitelisted) return adapter;
        return {
          ...adapter,
          status: 'disabled',
          rxSpeedKbps: 0,
          txSpeedKbps: 0,
        };
      })
    );

    const elapsed = performance.now() - startTime + (10 + Math.random() * 5); // Realistic system execution latency (10-15ms)
    setLastExecutionMs(elapsed);
    setIsKilled(true);

    // 2. Logging
    addLog(
      'CRITICAL',
      source,
      `EMERGENCY INTERNET KILL SWITCH ACTIVATED in ${elapsed.toFixed(1)}ms!`,
      `Policy: ${killMode}. Network adapters disabled, firewall blackhole applied, DNS & ARP cache purged.`
    );

    // 3. Show native toast notification
    showToast(
      'Internet Severed!',
      `All connections blocked in ${elapsed.toFixed(1)}ms. Outbound & Inbound blackhole active.`,
      'critical'
    );

    // 4. Handle auto-restore timer if armed
    if (autoRestoreSeconds > 0) {
      setAutoRestoreRemaining(autoRestoreSeconds);
      addLog('INFO', 'AUTO_RESTORE', `Auto-restore armed for ${autoRestoreSeconds} seconds.`);
    }
  }, [killMode, autoRestoreSeconds, addLog, showToast]);

  // Trigger Restore
  const restoreConnection = useCallback((source: 'MASTER_BUTTON' | 'SYSTEM_TRAY' | 'HOTKEY' | 'AUTO_RESTORE') => {
    setAdapters(prev =>
      prev.map(adapter => ({
        ...adapter,
        status: 'connected',
        rxSpeedKbps: Math.floor(200 + Math.random() * 800),
        txSpeedKbps: Math.floor(50 + Math.random() * 300),
      }))
    );

    setIsKilled(false);
    setAutoRestoreRemaining(null);

    addLog(
      'RESTORE',
      source === 'AUTO_RESTORE' ? 'AUTO_RESTORE' : source,
      'Network connection fully restored to operational status.',
      'Firewall blackhole rules removed, network interfaces re-enabled, DHCP leases renewed.'
    );

    showToast(
      'Connection Restored',
      'All network interfaces and firewall rules have returned to normal.',
      'restore'
    );
  }, [addLog, showToast]);

  // Countdown timer for auto-restore
  useEffect(() => {
    if (isKilled && autoRestoreRemaining !== null && autoRestoreRemaining > 0) {
      const interval = setInterval(() => {
        setAutoRestoreRemaining(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            restoreConnection('AUTO_RESTORE');
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isKilled, autoRestoreRemaining, restoreConnection]);

  // Global Keyboard Shortcuts (Ctrl+Alt+K or Space on Master view)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Alt+K global hotkey
      if (e.ctrlKey && e.altKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (isKilled) {
          soundEffects.playRestoreSound();
          restoreConnection('HOTKEY');
        } else {
          soundEffects.playKillSound();
          triggerKill('HOTKEY');
        }
      }

      // Spacebar toggles if not in input/textarea
      if (
        e.code === 'Space' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        document.activeElement?.tagName !== 'SELECT'
      ) {
        e.preventDefault();
        if (isKilled) {
          soundEffects.playRestoreSound();
          restoreConnection('MASTER_BUTTON');
        } else {
          soundEffects.playKillSound();
          triggerKill('MASTER_BUTTON');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isKilled, triggerKill, restoreConnection]);

  // Simulate network throughput fluctuating when online
  useEffect(() => {
    if (isKilled) return;
    const interval = setInterval(() => {
      setAdapters(prev =>
        prev.map(a => {
          if (a.status !== 'connected') return a;
          const rxDelta = (Math.random() - 0.5) * 60;
          const txDelta = (Math.random() - 0.5) * 30;
          return {
            ...a,
            rxSpeedKbps: Math.max(10, Math.floor(a.rxSpeedKbps + rxDelta)),
            txSpeedKbps: Math.max(5, Math.floor(a.txSpeedKbps + txDelta)),
          };
        })
      );
    }, 2000);
    return () => clearInterval(interval);
  }, [isKilled]);

  // Toggle individual adapter
  const handleToggleAdapter = (id: string) => {
    setAdapters(prev =>
      prev.map(a => {
        if (a.id !== id) return a;
        const newStatus = a.status === 'connected' ? 'disabled' : 'connected';
        addLog(
          newStatus === 'connected' ? 'RESTORE' : 'WARN',
          'ADAPTER_MGR',
          `Adapter ${a.name} ${newStatus === 'connected' ? 'enabled' : 'disabled'} manually.`
        );
        return {
          ...a,
          status: newStatus,
          rxSpeedKbps: newStatus === 'connected' ? 250 : 0,
          txSpeedKbps: newStatus === 'connected' ? 80 : 0,
        };
      })
    );
  };

  // Toggle whitelist on adapter
  const handleToggleWhitelist = (id: string) => {
    setAdapters(prev =>
      prev.map(a => {
        if (a.id !== id) return a;
        const nextWhitelisted = !a.whitelisted;
        addLog(
          'INFO',
          'CONFIG',
          `Adapter ${a.name} whitelist set to: ${nextWhitelisted ? 'PROTECTED' : 'STANDARD'}`
        );
        return { ...a, whitelisted: nextWhitelisted };
      })
    );
  };

  // Flush DNS
  const handleFlushDns = () => {
    addLog(
      'INFO',
      'ADAPTER_MGR',
      'Executed: ipconfig /flushdns',
      'Successfully flushed the Windows DNS Resolver Cache.'
    );
    showToast('DNS Cache Flushed', 'Windows DNS resolver cache has been cleared.', 'info');
  };

  // Simulate Probe Event
  const handleSimulateProbe = () => {
    soundEffects.playClickSound();
    if (isKilled) {
      addLog(
        'CRITICAL',
        'FIREWALL',
        'BLOCKED OUTBOUND PACKET: msedge.exe -> 142.250.190.46:443 (TCP SYN dropped by KILLSWITCH_BLOCK_OUT)'
      );
      showToast('Outbound Traffic Dropped', 'Firewall blackhole blocked TCP SYN to 142.250.190.46', 'critical');
    } else {
      addLog(
        'INFO',
        'SYSTEM_TRAY',
        'Routine heartbeat probe: Gateway 192.168.1.1 responded with RTT 1.2ms.'
      );
      showToast('Network Probe Healthy', 'Default gateway responded in 1.2ms.', 'info');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-red-500/30 selection:text-red-200">
      {/* Header with Navigation and Master Status */}
      <Header
        isKilled={isKilled}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        logCount={logs.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Tab 1: Master Kill Switch & System Tray Simulator */}
        {activeTab === 'master' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <KillSwitchMaster
              isKilled={isKilled}
              onTriggerKill={triggerKill}
              onRestore={restoreConnection}
              killMode={killMode}
              onChangeKillMode={setKillMode}
              autoRestoreSeconds={autoRestoreSeconds}
              onChangeAutoRestoreSeconds={setAutoRestoreSeconds}
              autoRestoreRemaining={autoRestoreRemaining}
              lastExecutionMs={lastExecutionMs}
              adapters={adapters}
            />

            <SystemTraySimulator
              isKilled={isKilled}
              onTriggerKill={triggerKill}
              onRestore={restoreConnection}
              onOpenLogsTab={() => setActiveTab('logs')}
              onOpenDeployTab={() => setActiveTab('deploy')}
              lastExecutionMs={lastExecutionMs}
              toastNotification={toastNotification}
              onDismissToast={() => setToastNotification(null)}
            />
          </div>
        )}

        {/* Tab 2: Windows Deployment Suite */}
        {activeTab === 'deploy' && (
          <div className="animate-in fade-in duration-200">
            <WindowsDeploySuite
              config={{
                ...windowsConfig,
                killMode,
                autoRestoreSeconds,
              }}
              onChangeConfig={newCfg => {
                setWindowsConfig(newCfg);
                setKillMode(newCfg.killMode);
                setAutoRestoreSeconds(newCfg.autoRestoreSeconds);
              }}
            />
          </div>
        )}

        {/* Tab 3: Network Adapters Manager */}
        {activeTab === 'adapters' && (
          <div className="animate-in fade-in duration-200">
            <NetworkAdaptersView
              adapters={adapters}
              onToggleAdapter={handleToggleAdapter}
              onToggleWhitelist={handleToggleWhitelist}
              onFlushDns={handleFlushDns}
              isKilled={isKilled}
            />
          </div>
        )}

        {/* Tab 4: Diagnostics & Heartbeat */}
        {activeTab === 'diagnostics' && (
          <div className="animate-in fade-in duration-200">
            <DiagnosticMonitor
              isKilled={isKilled}
              onRefreshProbe={handleSimulateProbe}
            />
          </div>
        )}

        {/* Tab 5: Event Logging Console */}
        {activeTab === 'logs' && (
          <div className="animate-in fade-in duration-200">
            <LoggingConsole
              logs={logs}
              onClearLogs={() => setLogs([])}
              onSimulateEvent={handleSimulateProbe}
              logFilePath={`%APPDATA%\\${windowsConfig.logDirectory}\\${windowsConfig.logFileName}`}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs font-mono text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span>NetKillSwitch PC Suite</span>
            <span className="text-slate-700">·</span>
            <span>Windows 10/11 Compatible</span>
            <span className="text-slate-700">·</span>
            <span>Zero-packet leak guarantee</span>
          </div>
          <div>
            System Tray Agent Active · Global Hotkey: <span className="text-slate-400 font-semibold">{windowsConfig.globalHotkey}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
