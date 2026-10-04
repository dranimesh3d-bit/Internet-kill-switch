export type KillMode = 'all_adapters' | 'firewall_blackhole' | 'nuclear_isolation' | 'route_drop';

export interface NetworkAdapter {
  id: string;
  name: string;
  interfaceName: string;
  type: 'Wi-Fi' | 'Ethernet' | 'VPN' | 'Virtual' | 'Cellular';
  ipAddress: string;
  macAddress: string;
  status: 'connected' | 'disabled' | 'disconnecting' | 'blocked';
  whitelisted: boolean;
  rxSpeedKbps: number;
  txSpeedKbps: number;
  gateway: string;
}

export type LogLevel = 'CRITICAL' | 'WARN' | 'INFO' | 'RESTORE';

export interface LogEntry {
  id: string;
  timestamp: string;
  epoch: number;
  level: LogLevel;
  source: 'SYSTEM_TRAY' | 'HOTKEY' | 'MASTER_BUTTON' | 'AUTO_RESTORE' | 'ADAPTER_MGR' | 'CONFIG' | 'FIREWALL';
  message: string;
  details?: string;
}

export interface WindowsConfig {
  killMode: KillMode;
  globalHotkey: string; // e.g. "Ctrl+Alt+K"
  autoRestoreSeconds: number; // 0 for disabled
  logDirectory: string;
  logFileName: string;
  showTrayNotifications: boolean;
  startWithWindows: boolean;
  whitelistedAdapters: string[];
  stealthTrayIcon: boolean;
}

export interface PingResult {
  timestamp: number;
  latencyMs: number | null;
  status: 'ok' | 'timeout' | 'blocked';
}
