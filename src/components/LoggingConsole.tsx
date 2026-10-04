import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  FileText,
  Search,
  Download,
  Copy,
  Trash2,
  Check,
  AlertOctagon,
  AlertTriangle,
  Info,
  RotateCcw,
  Terminal,
  Filter,
  ArrowDown
} from 'lucide-react';
import { LogEntry, LogLevel } from '../types/killswitch';
import { soundEffects } from '../utils/audioFeedback';

interface LoggingConsoleProps {
  logs: LogEntry[];
  onClearLogs: () => void;
  onSimulateEvent: () => void;
  logFilePath: string;
}

export const LoggingConsole: React.FC<LoggingConsoleProps> = ({
  logs,
  onClearLogs,
  onSimulateEvent,
  logFilePath,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<'ALL' | LogLevel>('ALL');
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const logEndRef = useRef<HTMLDivElement>(null);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesLevel = levelFilter === 'ALL' || log.level === levelFilter;
      const matchesSearch =
        searchQuery === '' ||
        log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.timestamp.includes(searchQuery);
      return matchesLevel && matchesSearch;
    });
  }, [logs, levelFilter, searchQuery]);

  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs, autoScroll]);

  const handleCopyLogs = () => {
    soundEffects.playClickSound();
    const text = filteredLogs
      .map(l => `[${l.timestamp}] [${l.level}] [${l.source}] ${l.message} ${l.details || ''}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadLogFile = (format: 'txt' | 'json' | 'csv') => {
    soundEffects.playClickSound();
    let content = '';
    let mime = 'text/plain';
    let filename = `killswitch_${Date.now()}.${format}`;

    if (format === 'txt') {
      content = filteredLogs
        .map(l => `[${l.timestamp}] [${l.level}] [${l.source}] ${l.message} ${l.details || ''}`)
        .join('\r\n');
    } else if (format === 'json') {
      content = JSON.stringify(filteredLogs, null, 2);
      mime = 'application/json';
    } else if (format === 'csv') {
      mime = 'text/csv';
      const header = 'Timestamp,Level,Source,Message,Details\n';
      const rows = filteredLogs
        .map(l => `"${l.timestamp}","${l.level}","${l.source}","${l.message.replace(/"/g, '""')}","${(l.details || '').replace(/"/g, '""')}"`)
        .join('\n');
      content = header + rows;
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getLevelBadge = (level: LogLevel) => {
    switch (level) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-950 text-red-400 border border-red-800">
            <AlertOctagon className="w-3 h-3" />
            CRITICAL
          </span>
        );
      case 'RESTORE':
        return (
          <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
            <RotateCcw className="w-3 h-3" />
            RESTORE
          </span>
        );
      case 'WARN':
        return (
          <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
            <AlertTriangle className="w-3 h-3" />
            WARN
          </span>
        );
      case 'INFO':
      default:
        return (
          <span className="inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            <Info className="w-3 h-3 text-cyan-400" />
            INFO
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Bar with Windows Log File Path and Actions */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">Event Audit & Incident Logging Engine</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            Target Windows Log File: <span className="text-cyan-400 select-all">{logFilePath}</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <button
            onClick={onSimulateEvent}
            className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-mono border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Simulate network probe event"
          >
            <Terminal className="w-3.5 h-3.5 text-amber-400" />
            <span>Simulate Probe</span>
          </button>

          <button
            onClick={handleCopyLogs}
            className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-mono border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>

          <div className="flex items-center rounded border border-slate-700 bg-slate-800 overflow-hidden">
            <button
              onClick={() => handleDownloadLogFile('txt')}
              className="px-2.5 py-1.5 text-xs text-slate-200 font-mono hover:bg-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
              title="Download as .log/.txt"
            >
              <Download className="w-3 h-3 text-cyan-400" />
              <span>.LOG</span>
            </button>
            <button
              onClick={() => handleDownloadLogFile('json')}
              className="px-2 py-1.5 text-xs text-slate-300 font-mono border-l border-slate-700 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              JSON
            </button>
            <button
              onClick={() => handleDownloadLogFile('csv')}
              className="px-2 py-1.5 text-xs text-slate-300 font-mono border-l border-slate-700 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              CSV
            </button>
          </div>

          <button
            onClick={() => {
              soundEffects.playClickSound();
              onClearLogs();
            }}
            className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-red-950/40 text-xs text-slate-400 hover:text-red-400 font-mono border border-slate-700 hover:border-red-800 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950/60 border border-slate-800 rounded-lg p-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search logs by keyword, adapter, IP, or source..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded px-9 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        {/* Level Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto p-0.5 bg-slate-900 rounded border border-slate-800">
          {(['ALL', 'CRITICAL', 'RESTORE', 'WARN', 'INFO'] as const).map(lvl => (
            <button
              key={lvl}
              onClick={() => {
                soundEffects.playClickSound();
                setLevelFilter(lvl);
              }}
              className={`px-2.5 py-1 text-[11px] font-mono rounded transition-colors whitespace-nowrap ${
                levelFilter === lvl
                  ? 'bg-slate-800 text-white font-bold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-1.5 text-xs font-mono text-slate-400 cursor-pointer select-none px-1">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={e => setAutoScroll(e.target.checked)}
            className="rounded border-slate-700 text-cyan-600 focus:ring-cyan-500 focus:ring-offset-slate-900"
          />
          <span>Auto-scroll</span>
        </label>
      </div>

      {/* Real-time Terminal Log Stream */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-900 pb-2 mb-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="ml-2 text-slate-400 font-mono">C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe</span>
          </div>
          <div>{filteredLogs.length} events logged</div>
        </div>

        <div className="max-h-[380px] overflow-y-auto space-y-1.5 pr-2 select-text">
          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-mono text-xs">
              No log entries match the current filter.
            </div>
          ) : (
            filteredLogs.map(log => (
              <div
                key={log.id}
                className="py-1 px-2 rounded hover:bg-slate-900/60 flex flex-col sm:flex-row items-start gap-2 border-l-2 transition-colors border-transparent hover:border-slate-700"
              >
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-slate-500 text-[11px] font-mono">{log.timestamp}</span>
                  {getLevelBadge(log.level)}
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800">
                    {log.source}
                  </span>
                </div>
                <div className="text-slate-300 break-all leading-relaxed flex-1">
                  <span>{log.message}</span>
                  {log.details && (
                    <span className="block text-[11px] text-slate-500 mt-0.5">{log.details}</span>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
};
