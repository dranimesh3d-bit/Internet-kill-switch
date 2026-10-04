import React, { useState } from 'react';
import JSZip from 'jszip';
import {
  Download,
  Copy,
  Check,
  Terminal,
  FileCode,
  Shield,
  Layers,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Archive,
  AlertTriangle
} from 'lucide-react';
import { WindowsConfig } from '../types/killswitch';
import {
  generatePowerShellScript,
  generateBatchScript,
  generateRestoreBatchScript,
  generatePythonTrayScript,
  generateStartupBatchScript,
  generateReadme
} from '../utils/windowsScriptGenerator';
import { soundEffects } from '../utils/audioFeedback';

interface WindowsDeploySuiteProps {
  config: WindowsConfig;
  onChangeConfig: (newConfig: WindowsConfig) => void;
}

export const WindowsDeploySuite: React.FC<WindowsDeploySuiteProps> = ({
  config,
  onChangeConfig,
}) => {
  const [selectedFile, setSelectedFile] = useState<
    'ps1' | 'bat' | 'restore_bat' | 'pyw' | 'startup_bat' | 'readme'
  >('ps1');
  const [copied, setCopied] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);

  const ps1Code = generatePowerShellScript(config);
  const batCode = generateBatchScript(config);
  const restoreBatCode = generateRestoreBatchScript();
  const pywCode = generatePythonTrayScript(config);
  const startupBatCode = generateStartupBatchScript();
  const readmeText = generateReadme(config);

  const getActiveCode = () => {
    switch (selectedFile) {
      case 'ps1':
        return { filename: 'NetKillSwitch.ps1', code: ps1Code, lang: 'powershell' };
      case 'bat':
        return { filename: 'KillSwitch_OneClick.bat', code: batCode, lang: 'batch' };
      case 'restore_bat':
        return { filename: 'Restore_Internet.bat', code: restoreBatCode, lang: 'batch' };
      case 'pyw':
        return { filename: 'KillSwitch_Tray.pyw', code: pywCode, lang: 'python' };
      case 'startup_bat':
        return { filename: 'Install-Startup-Shortcut.bat', code: startupBatCode, lang: 'batch' };
      case 'readme':
        return { filename: 'README.txt', code: readmeText, lang: 'text' };
    }
  };

  const active = getActiveCode();

  const handleCopyCode = () => {
    soundEffects.playClickSound();
    navigator.clipboard.writeText(active.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSingleFile = () => {
    soundEffects.playClickSound();
    const blob = new Blob([active.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = active.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAllZip = async () => {
    soundEffects.playClickSound();
    setDownloadingZip(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder('Windows-NetKillSwitch-Suite');
      if (folder) {
        folder.file('NetKillSwitch.ps1', ps1Code);
        folder.file('KillSwitch_OneClick.bat', batCode);
        folder.file('Restore_Internet.bat', restoreBatCode);
        folder.file('KillSwitch_Tray.pyw', pywCode);
        folder.file('Install-Startup-Shortcut.bat', startupBatCode);
        folder.file('README.txt', readmeText);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Windows-NetKillSwitch-Suite.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to generate zip', e);
    } finally {
      setDownloadingZip(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Hero: Ready to Run on Windows Banner */}
      <div className="bg-gradient-to-r from-cyan-950/60 via-slate-900 to-indigo-950/60 border border-cyan-800/50 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-wider text-cyan-400 font-semibold">
                Windows 10 / 11 Native Software
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-xs text-slate-300">Ready to Deploy</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Export Windows System Tray App & One-Click Kill Switch
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              These self-contained scripts run natively in Windows. They hook into the Windows System Tray clock
              area, register global keyboard hotkeys, and write millisecond-accurate audit logs to your disk.
            </p>
          </div>

          <button
            onClick={handleDownloadAllZip}
            disabled={downloadingZip}
            className="px-5 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-cyan-900/30 transition-all cursor-pointer shrink-0"
          >
            <Archive className="w-4 h-4" />
            <span>{downloadingZip ? 'Creating ZIP...' : 'Download Full Suite (.ZIP)'}</span>
          </button>
        </div>
      </div>

      {/* Script Configuration Options */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <span>Deployment Configuration</span>
          <span className="text-xs text-slate-400 font-normal">(Adjust before exporting)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
          <div>
            <label className="text-slate-400 block mb-1.5">Global Hotkey:</label>
            <input
              type="text"
              value={config.globalHotkey}
              onChange={e => onChangeConfig({ ...config, globalHotkey: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
              placeholder="Ctrl+Alt+K"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1.5">Auto-Restore Delay:</label>
            <select
              value={config.autoRestoreSeconds}
              onChange={e => onChangeConfig({ ...config, autoRestoreSeconds: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value={0}>Disabled (Manual restore only)</option>
              <option value={30}>30 Seconds</option>
              <option value={60}>60 Seconds</option>
              <option value={300}>5 Minutes</option>
            </select>
          </div>

          <div>
            <label className="text-slate-400 block mb-1.5">App Data Subfolder:</label>
            <input
              type="text"
              value={config.logDirectory}
              onChange={e => onChangeConfig({ ...config, logDirectory: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1.5">Log File Name:</label>
            <input
              type="text"
              value={config.logFileName}
              onChange={e => onChangeConfig({ ...config, logFileName: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* Script File Selector Tabs & Code Viewer */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
        {/* File Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 py-2 overflow-x-auto">
          <div className="flex items-center gap-1">
            {[
              { id: 'ps1', label: 'NetKillSwitch.ps1', tag: 'System Tray App' },
              { id: 'bat', label: 'KillSwitch_OneClick.bat', tag: 'Fast Launcher' },
              { id: 'restore_bat', label: 'Restore_Internet.bat', tag: 'Restore Script' },
              { id: 'pyw', label: 'KillSwitch_Tray.pyw', tag: 'Python Tray' },
              { id: 'startup_bat', label: 'Install-Startup.bat', tag: 'Auto-Start' },
              { id: 'readme', label: 'README.txt', tag: 'Manual' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  soundEffects.playClickSound();
                  setSelectedFile(tab.id as typeof selectedFile);
                }}
                className={`px-3 py-1.5 rounded text-xs font-mono transition-colors flex items-center gap-2 whitespace-nowrap ${
                  selectedFile === tab.id
                    ? 'bg-slate-800 text-cyan-400 font-semibold border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] text-slate-500 hidden md:inline">({tab.tag})</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 pl-4">
            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-mono border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>

            <button
              onClick={handleDownloadSingleFile}
              className="px-3 py-1.5 rounded bg-cyan-700 hover:bg-cyan-600 text-xs text-white font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File</span>
            </button>
          </div>
        </div>

        {/* Code Content Box */}
        <div className="p-4 bg-slate-950 font-mono text-xs overflow-x-auto max-h-[460px] overflow-y-auto text-slate-300 leading-relaxed select-text">
          <pre>{active.code}</pre>
        </div>
      </div>

      {/* Windows Quick Run Instructions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs font-mono">
            <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-800 flex items-center justify-center text-[11px]">
              1
            </span>
            <span>Download & Extract</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Click <strong>Download Full Suite (.ZIP)</strong> above and extract the files to a folder like{' '}
            <code className="text-slate-300">C:\Tools\KillSwitch</code> or your Desktop.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs font-mono">
            <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-800 flex items-center justify-center text-[11px]">
              2
            </span>
            <span>Run NetKillSwitch.ps1</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Right-click <strong>NetKillSwitch.ps1</strong> and select <em>"Run with PowerShell"</em>. Accept the
            UAC administrator prompt to allow network interface control.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs font-mono">
            <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-800 flex items-center justify-center text-[11px]">
              3
            </span>
            <span>Instant Access via System Tray</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            A Green Shield appears by your Windows clock. Click it or press{' '}
            <code className="text-slate-300">{config.globalHotkey}</code> anywhere in Windows to kill internet instantly.
          </p>
        </div>
      </div>
    </div>
  );
};
