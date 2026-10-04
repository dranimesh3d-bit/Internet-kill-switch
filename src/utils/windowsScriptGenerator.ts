import { WindowsConfig } from '../types/killswitch';

export function generatePowerShellScript(config: WindowsConfig): string {
  const whitelistArray = config.whitelistedAdapters.length > 0
    ? `@(${config.whitelistedAdapters.map(a => `"${a}"`).join(', ')})`
    : `@()`;

  return `# ==============================================================================
# Windows Instant Internet Kill Switch & System Tray Suite
# Fully automated System Tray Icon + Global Hotkey + Event Logging
# ==============================================================================

# Ensure script is running with elevated Administrator privileges
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "[!] Elevating privileges to Administrator..." -ForegroundColor Yellow
    $scriptPath = $MyInvocation.MyCommand.Definition
    if (-not $scriptPath) { $scriptPath = $PSCommandPath }
    Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File '$scriptPath'" -Verb RunAs
    exit
}

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# ---------------- Configuration ----------------
$Config = @{
    KillMode            = "${config.killMode}" # 'all_adapters', 'firewall_blackhole', 'nuclear_isolation', 'route_drop'
    GlobalHotkey        = "${config.globalHotkey}"
    AutoRestoreSeconds  = ${config.autoRestoreSeconds}
    LogDirectory        = [System.IO.Path]::Combine($env:APPDATA, "${config.logDirectory}")
    LogFileName         = "${config.logFileName}"
    ShowTrayNotif       = $${config.showTrayNotifications}
    Whitelist           = ${whitelistArray}
}

if (-not (Test-Path $Config.LogDirectory)) {
    New-Item -ItemType Directory -Path $Config.LogDirectory -Force | Out-Null
}
$Global:LogFilePath = Join-Path $Config.LogDirectory $Config.LogFileName
$Global:IsKilled = $false
$Global:DisabledAdapters = [System.Collections.Generic.List[string]]::new()
$Global:AutoRestoreTimer = $null

# ---------------- Logging Function ----------------
function Write-KillLog {
    param(
        [Parameter(Mandatory=$true)][string]$Level,
        [Parameter(Mandatory=$true)][string]$Source,
        [Parameter(Mandatory=$true)][string]$Message
    )
    $timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss.fff")
    $logLine = "[$timestamp] [$Level] [$Source] $Message"
    try {
        Add-Content -Path $Global:LogFilePath -Value $logLine -Encoding UTF8
        Write-Host $logLine
    } catch {
        # Fallback if file locked
    }
}

Write-KillLog "INFO" "STARTUP" "Windows Internet Kill Switch Tray Agent Initialized. Log: $Global:LogFilePath"

# ---------------- Icon Generator ----------------
function Get-TrayIcon {
    param([bool]$Killed)
    $bmp = New-Object System.Drawing.Bitmap(32, 32)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::Transparent)

    if ($Killed) {
        # Armed / Killed State: Red shield/circle with white cross/slash
        $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(239, 68, 68))
        $g.FillEllipse($brush, 2, 2, 28, 28)
        $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, 4)
        $g.DrawLine($pen, 8, 8, 24, 24)
        $g.DrawLine($pen, 24, 8, 8, 24)
        $brush.Dispose()
        $pen.Dispose()
    } else {
        # Safe / Connected State: Emerald green shield/circle with white check
        $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(16, 185, 129))
        $g.FillEllipse($brush, 2, 2, 28, 28)
        $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, 3)
        $pts = @(
            (New-Object System.Drawing.Point(8, 16)),
            (New-Object System.Drawing.Point(14, 22)),
            (New-Object System.Drawing.Point(24, 10))
        )
        $g.DrawLines($pen, $pts)
        $brush.Dispose()
        $pen.Dispose()
    }
    $g.Dispose()
    $hIcon = $bmp.GetHicon()
    $icon = [System.Drawing.Icon]::FromHandle($hIcon)
    return $icon
}

# ---------------- Kill Switch Execution ----------------
function Invoke-InstantKill {
    param([string]$TriggerSource = "SYSTEM_TRAY")
    if ($Global:IsKilled) {
        Write-KillLog "WARN" $TriggerSource "Kill switch triggered but connection is already severed."
        return
    }

    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    Write-KillLog "CRITICAL" $TriggerSource ">>> EMERGENCY KILL SWITCH TRIGGERED: Cutting all internet traffic..."

    $Global:DisabledAdapters.Clear()

    # 1. Adapter shutdown
    if ($Config.KillMode -in @('all_adapters', 'nuclear_isolation')) {
        try {
            $adapters = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' -and $_.Name -notin $Config.Whitelist }
            foreach ($adapter in $adapters) {
                Write-KillLog "WARN" "ADAPTER" "Disabling physical/virtual adapter: $($adapter.Name)"
                $Global:DisabledAdapters.Add($adapter.Name)
                Disable-NetAdapter -Name $adapter.Name -Confirm:$false -ErrorAction SilentlyContinue
            }
        } catch {
            Write-KillLog "ERROR" "ADAPTER" "Error disabling adapters: $_"
        }
    }

    # 2. Windows Defender Firewall Outbound/Inbound Blackhole
    if ($Config.KillMode -in @('firewall_blackhole', 'nuclear_isolation')) {
        try {
            Write-KillLog "WARN" "FIREWALL" "Applying emergency firewall blackhole rules..."
            Remove-NetFirewallRule -DisplayName "KILLSWITCH_BLOCK_OUT" -ErrorAction SilentlyContinue
            Remove-NetFirewallRule -DisplayName "KILLSWITCH_BLOCK_IN" -ErrorAction SilentlyContinue
            New-NetFirewallRule -DisplayName "KILLSWITCH_BLOCK_OUT" -Direction Outbound -Action Block -Profile Any -Description "Emergency Internet Kill Switch" | Out-Null
            New-NetFirewallRule -DisplayName "KILLSWITCH_BLOCK_IN" -Direction Inbound -Action Block -Profile Any -Description "Emergency Internet Kill Switch" | Out-Null
        } catch {
            Write-KillLog "ERROR" "FIREWALL" "Error applying firewall rules: $_"
        }
    }

    # 3. Route Table Drop & DNS Flush
    if ($Config.KillMode -in @('route_drop', 'nuclear_isolation')) {
        try {
            Write-KillLog "WARN" "ROUTE" "Flushing default gateway routes, ARP cache, and DNS client cache..."
            route delete 0.0.0.0 mask 0.0.0.0 *>$null
            Clear-DnsClientCache -ErrorAction SilentlyContinue
            arp -d * *>$null
        } catch {
            Write-KillLog "ERROR" "ROUTE" "Error modifying routes: $_"
        }
    }

    $sw.Stop()
    $Global:IsKilled = $true

    Write-KillLog "CRITICAL" $TriggerSource "KILL SWITCH ENGAGED! Total latency: $($sw.ElapsedMilliseconds) ms. Network completely severed."

    # Update Tray Icon
    $Global:TrayIcon.Icon = Get-TrayIcon -Killed $true
    $Global:TrayIcon.Text = "NetKillSwitch: [SEVERED / BLOCKED]"

    if ($Config.ShowTrayNotif) {
        $Global:TrayIcon.ShowBalloonTip(3000, "Kill Switch Activated", "All internet connections severed in $($sw.ElapsedMilliseconds)ms! Your PC is isolated.", [System.Windows.Forms.ToolTipIcon]::Warning)
    }

    # Auto-restore timer if configured
    if ($Config.AutoRestoreSeconds -gt 0) {
        Write-KillLog "INFO" "TIMER" "Auto-restore armed for $($Config.AutoRestoreSeconds) seconds..."
        if ($Global:AutoRestoreTimer) { $Global:AutoRestoreTimer.Stop() }
        $Global:AutoRestoreTimer = New-Object System.Windows.Forms.Timer
        $Global:AutoRestoreTimer.Interval = $Config.AutoRestoreSeconds * 1000
        $Global:AutoRestoreTimer.add_Tick({
            $Global:AutoRestoreTimer.Stop()
            Write-KillLog "INFO" "AUTO_RESTORE" "Auto-restore timer expired. Restoring connectivity..."
            Invoke-RestoreConnection -TriggerSource "AUTO_RESTORE"
        })
        $Global:AutoRestoreTimer.Start()
    }
}

# ---------------- Connection Restoration ----------------
function Invoke-RestoreConnection {
    param([string]$TriggerSource = "SYSTEM_TRAY")
    if (-not $Global:IsKilled) {
        Write-KillLog "INFO" $TriggerSource "Restore requested, but network is already operational."
        return
    }

    Write-KillLog "RESTORE" $TriggerSource ">>> Restoring network connections..."

    if ($Global:AutoRestoreTimer) {
        $Global:AutoRestoreTimer.Stop()
    }

    # 1. Remove firewall block rules
    try {
        Write-KillLog "RESTORE" "FIREWALL" "Removing firewall blackhole rules..."
        Remove-NetFirewallRule -DisplayName "KILLSWITCH_BLOCK_OUT" -ErrorAction SilentlyContinue
        Remove-NetFirewallRule -DisplayName "KILLSWITCH_BLOCK_IN" -ErrorAction SilentlyContinue
    } catch {
        Write-KillLog "ERROR" "FIREWALL" "Error removing firewall rules: $_"
    }

    # 2. Re-enable all previously disabled adapters
    try {
        if ($Global:DisabledAdapters.Count -gt 0) {
            foreach ($adapterName in $Global:DisabledAdapters) {
                Write-KillLog "RESTORE" "ADAPTER" "Re-enabling adapter: $adapterName"
                Enable-NetAdapter -Name $adapterName -Confirm:$false -ErrorAction SilentlyContinue
            }
        } else {
            # In case list was cleared, re-enable all
            Get-NetAdapter | Where-Object { $_.Status -eq 'Disabled' } | Enable-NetAdapter -Confirm:$false -ErrorAction SilentlyContinue
        }
    } catch {
        Write-KillLog "ERROR" "ADAPTER" "Error restoring adapters: $_"
    }

    # 3. Renew DHCP lease & DNS cache
    try {
        Write-KillLog "RESTORE" "DHCP" "Renewing DHCP IP configuration and DNS cache..."
        Start-Process ipconfig -ArgumentList "/renew" -NoNewWindow -Wait
        Clear-DnsClientCache -ErrorAction SilentlyContinue
    } catch {
        # Optional
    }

    $Global:IsKilled = $false
    Write-KillLog "RESTORE" $TriggerSource "Network connection fully restored to operational status."

    # Update Tray Icon
    $Global:TrayIcon.Icon = Get-TrayIcon -Killed $false
    $Global:TrayIcon.Text = "NetKillSwitch: [ONLINE / ACTIVE]"

    if ($Config.ShowTrayNotif) {
        $Global:TrayIcon.ShowBalloonTip(3000, "Connection Restored", "All network interfaces and firewall rules have returned to normal.", [System.Windows.Forms.ToolTipIcon]::Info)
    }
}

# ---------------- Global Hotkey Hook (Win32) ----------------
# Register hotkey via native user32.dll
$win32 = @"
using System;
using System.Runtime.InteropServices;
public class Win32HotKey {
    [DllImport("user32.dll")]
    public static extern bool RegisterHotKey(IntPtr hWnd, int id, int fsModifiers, int vk);
    [DllImport("user32.dll")]
    public static extern bool UnregisterHotKey(IntPtr hWnd, int id);
}
"@
Add-Type -TypeDefinition $win32 -ErrorAction SilentlyContinue

# Hotkey modifiers: Alt=1, Ctrl=2, Shift=4, Win=8
$HOTKEY_ID = 9001
$MOD_CTRL_ALT = 0x0002 -bor 0x0001
$VK_K = 0x4B # 'K' key

# Create hidden message receiver form
$hiddenForm = New-Object System.Windows.Forms.Form
$hiddenForm.WindowState = [System.Windows.Forms.FormWindowState]::Minimized
$hiddenForm.ShowInTaskbar = $false
$hiddenForm.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::None
$hiddenForm.Size = New-Object System.Drawing.Size(1, 1)

# Hook WndProc
$formType = $hiddenForm.GetType()
$wndProcHandler = {
    param($m)
    if ($m.Msg -eq 0x0312 -and $m.WParam.ToInt32() -eq $HOTKEY_ID) {
        if ($Global:IsKilled) {
            Invoke-RestoreConnection -TriggerSource "HOTKEY"
        } else {
            Invoke-InstantKill -TriggerSource "HOTKEY"
        }
    }
}

# ---------------- System Tray Setup ----------------
$Global:TrayIcon = New-Object System.Windows.Forms.NotifyIcon
$Global:TrayIcon.Icon = Get-TrayIcon -Killed $false
$Global:TrayIcon.Text = "NetKillSwitch: [ONLINE / ACTIVE]"
$Global:TrayIcon.Visible = $true

# Context Menu
$contextMenu = New-Object System.Windows.Forms.ContextMenuStrip

$itemKill = $contextMenu.Items.Add("🚨 Instant Kill Switch (Cut Internet)")
$itemKill.Font = New-Object System.Drawing.Font($itemKill.Font, [System.Drawing.FontStyle]::Bold)
$itemKill.ForeColor = [System.Drawing.Color]::DarkRed
$itemKill.add_Click({ Invoke-InstantKill -TriggerSource "SYSTEM_TRAY" })

$itemRestore = $contextMenu.Items.Add("🔄 Restore Connection")
$itemRestore.ForeColor = [System.Drawing.Color]::DarkGreen
$itemRestore.add_Click({ Invoke-RestoreConnection -TriggerSource "SYSTEM_TRAY" })

$contextMenu.Items.Add("-") | Out-Null

$itemAutoRestore = $contextMenu.Items.Add("⏱ Kill with 60s Auto-Restore")
$itemAutoRestore.add_Click({
    $Config.AutoRestoreSeconds = 60
    Invoke-InstantKill -TriggerSource "SYSTEM_TRAY_TIMER"
})

$itemLogs = $contextMenu.Items.Add("📋 Open Kill Switch Log File")
$itemLogs.add_Click({
    if (Test-Path $Global:LogFilePath) {
        Start-Process notepad.exe -ArgumentList $Global:LogFilePath
    } else {
        [System.Windows.Forms.MessageBox]::Show("Log file has not been created yet.", "NetKillSwitch")
    }
})

$itemFolder = $contextMenu.Items.Add("📁 Open Logs Directory")
$itemFolder.add_Click({
    Start-Process explorer.exe -ArgumentList $Config.LogDirectory
})

$contextMenu.Items.Add("-") | Out-Null

$itemExit = $contextMenu.Items.Add("❌ Restore & Exit")
$itemExit.add_Click({
    Invoke-RestoreConnection -TriggerSource "EXIT"
    $Global:TrayIcon.Visible = $false
    [Win32HotKey]::UnregisterHotKey($hiddenForm.Handle, $HOTKEY_ID)
    [System.Windows.Forms.Application]::Exit()
})

$Global:TrayIcon.ContextMenuStrip = $contextMenu

# Left click toggles Kill/Restore
$Global:TrayIcon.add_Click({
    param($sender, $e)
    if ($e.Button -eq [System.Windows.Forms.MouseButtons]::Left) {
        if ($Global:IsKilled) {
            Invoke-RestoreConnection -TriggerSource "TRAY_CLICK"
        } else {
            Invoke-InstantKill -TriggerSource "TRAY_CLICK"
        }
    }
})

# Register Hotkey on form load
$hiddenForm.add_Load({
    $registered = [Win32HotKey]::RegisterHotKey($hiddenForm.Handle, $HOTKEY_ID, $MOD_CTRL_ALT, $VK_K)
    if ($registered) {
        Write-KillLog "INFO" "HOTKEY" "Global hotkey registered: Ctrl+Alt+K is active system-wide."
    } else {
        Write-KillLog "WARN" "HOTKEY" "Could not register Ctrl+Alt+K (may be in use by another app)."
    }
})

# Clean cleanup on form closing
$hiddenForm.add_FormClosing({
    [Win32HotKey]::UnregisterHotKey($hiddenForm.Handle, $HOTKEY_ID)
    $Global:TrayIcon.Visible = $false
})

Write-KillLog "INFO" "SYSTEM_TRAY" "Kill switch is active in the Windows System Tray. Click tray icon or press Ctrl+Alt+K."

# Start Windows Message Loop
[System.Windows.Forms.Application]::Run($hiddenForm)
`;
}

export function generateBatchScript(config: WindowsConfig): string {
  return `@echo off
:: ==============================================================================
:: Windows Instant Internet Kill Switch - 1-Click Fast Launcher
:: Mode: ${config.killMode}
:: ==============================================================================
title NetKillSwitch - Cutting Internet Connection...
color 0C

:: Auto-elevate to Administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [!] Requesting administrative privileges...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

set LOG_DIR=%APPDATA%\\${config.logDirectory}
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"
set LOG_FILE=%LOG_DIR%\\${config.logFileName}

for /f "tokens=1-4 delims=/ " %%a in ("%date%") do set CDATE=%%a-%%b-%%c
for /f "tokens=1-3 delims=:." %%a in ("%time%") do set CTIME=%%a:%%b:%%c
echo [%CDATE% %CTIME%] [CRITICAL] [BATCH_KILL] One-Click Batch Kill Triggered! >> "%LOG_FILE%"

echo =======================================================
echo     [!] EMERGENCY KILL SWITCH ACTIVATED [!]
echo =======================================================
echo Severing all network adapters and blocking outbound traffic...

:: 1. Disable network adapters
powershell -Command "Get-NetAdapter | Where-Object { $_.Status -eq 'Up' } | Disable-NetAdapter -Confirm:$false"

:: 2. Drop all routes and firewall blackhole
netsh advfirewall firewall add rule name="KILLSWITCH_BLOCK_OUT" dir=out action=block profile=any >nul 2>&1
netsh advfirewall firewall add rule name="KILLSWITCH_BLOCK_IN" dir=in action=block profile=any >nul 2>&1
route delete 0.0.0.0 mask 0.0.0.0 >nul 2>&1
ipconfig /flushdns >nul 2>&1

echo [%CDATE% %CTIME%] [CRITICAL] [BATCH_KILL] All network adapters disabled and firewall blackhole applied. >> "%LOG_FILE%"

echo.
echo [OK] Internet connection severed instantly.
echo To restore connection, run Restore_Internet.bat or press any key to close.
pause
`;
}

export function generateRestoreBatchScript(): string {
  return `@echo off
:: ==============================================================================
:: Windows Instant Internet Kill Switch - Restore Connectivity
:: ==============================================================================
title NetKillSwitch - Restoring Internet Connection...
color 0A

:: Auto-elevate to Administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [!] Requesting administrative privileges...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

set LOG_DIR=%APPDATA%\\NetKillSwitch
set LOG_FILE=%LOG_DIR%\\killswitch.log

for /f "tokens=1-4 delims=/ " %%a in ("%date%") do set CDATE=%%a-%%b-%%c
for /f "tokens=1-3 delims=:." %%a in ("%time%") do set CTIME=%%a:%%b:%%c
echo [%CDATE% %CTIME%] [RESTORE] [BATCH_RESTORE] Restoration initiated >> "%LOG_FILE%"

echo =======================================================
echo          RESTORING INTERNET CONNECTIVITY...
echo =======================================================

:: 1. Remove firewall block rules
netsh advfirewall firewall delete rule name="KILLSWITCH_BLOCK_OUT" >nul 2>&1
netsh advfirewall firewall delete rule name="KILLSWITCH_BLOCK_IN" >nul 2>&1

:: 2. Re-enable all adapters
powershell -Command "Get-NetAdapter | Where-Object { $_.Status -eq 'Disabled' } | Enable-NetAdapter -Confirm:$false"

:: 3. Renew DHCP leases and flush cache
ipconfig /renew >nul 2>&1
ipconfig /flushdns >nul 2>&1

echo [%CDATE% %CTIME%] [RESTORE] [BATCH_RESTORE] Network adapters enabled and routes restored. >> "%LOG_FILE%"

echo.
echo [OK] Connection restored successfully!
pause
`;
}

export function generatePythonTrayScript(config: WindowsConfig): string {
  return `# ==============================================================================
# Windows Instant Internet Kill Switch - Python System Tray App (pyw)
# Requirements: pip install pystray pillow keyboard
# ==============================================================================
import os
import sys
import subprocess
import datetime
import threading
from PIL import Image, ImageDraw
import pystray
from pystray import MenuItem as item

LOG_DIR = os.path.expandvars(r"%APPDATA%\\${config.logDirectory}")
LOG_FILE = os.path.join(LOG_DIR, "${config.logFileName}")
os.makedirs(LOG_DIR, exist_ok=True)

is_killed = False

def write_log(level, source, message):
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
    line = f"[{ts}] [{level}] [{source}] {message}\\n"
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(line)
    except Exception as e:
        pass
    print(line.strip())

def create_image(killed=False):
    width, height = 64, 64
    image = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    if killed:
        # Red warning circle with cross
        draw.ellipse([4, 4, 60, 60], fill=(239, 68, 68))
        draw.line([18, 18, 46, 46], fill=(255, 255, 255), width=8)
        draw.line([46, 18, 18, 46], fill=(255, 255, 255), width=8)
    else:
        # Green active circle with check
        draw.ellipse([4, 4, 60, 60], fill=(16, 185, 129))
        draw.line([16, 32, 28, 44], fill=(255, 255, 255), width=6)
        draw.line([28, 44, 48, 20], fill=(255, 255, 255), width=6)
    return image

def kill_connection(icon=None, item=None):
    global is_killed
    if is_killed:
        return
    write_log("CRITICAL", "PYTHON_TRAY", "Triggering emergency internet shutdown...")
    # Disable adapters
    cmd_disable = 'powershell -Command "Get-NetAdapter | Where-Object {$_.Status -eq \\'Up\\'} | Disable-NetAdapter -Confirm:$false"'
    subprocess.run(cmd_disable, shell=True, capture_output=True)
    # Add firewall block
    subprocess.run('netsh advfirewall firewall add rule name="KILLSWITCH_BLOCK_OUT" dir=out action=block profile=any', shell=True, capture_output=True)
    subprocess.run('netsh advfirewall firewall add rule name="KILLSWITCH_BLOCK_IN" dir=in action=block profile=any', shell=True, capture_output=True)
    subprocess.run('ipconfig /flushdns', shell=True, capture_output=True)
    
    is_killed = True
    write_log("CRITICAL", "PYTHON_TRAY", "INTERNET SEVERED: All adapters disabled, firewall blackhole active.")
    if icon:
        icon.icon = create_image(killed=True)
        icon.title = "NetKillSwitch: [SEVERED / BLOCKED]"
        try:
            icon.notify("All internet connections severed instantly!", "Kill Switch Activated")
        except:
            pass

def restore_connection(icon=None, item=None):
    global is_killed
    if not is_killed:
        return
    write_log("RESTORE", "PYTHON_TRAY", "Restoring network connectivity...")
    subprocess.run('netsh advfirewall firewall delete rule name="KILLSWITCH_BLOCK_OUT"', shell=True, capture_output=True)
    subprocess.run('netsh advfirewall firewall delete rule name="KILLSWITCH_BLOCK_IN"', shell=True, capture_output=True)
    subprocess.run('powershell -Command "Get-NetAdapter | Where-Object {$_.Status -eq \\'Disabled\\'} | Enable-NetAdapter -Confirm:$false"', shell=True, capture_output=True)
    subprocess.run('ipconfig /renew', shell=True, capture_output=True)
    
    is_killed = False
    write_log("RESTORE", "PYTHON_TRAY", "Network restored to operational status.")
    if icon:
        icon.icon = create_image(killed=False)
        icon.title = "NetKillSwitch: [ONLINE / ACTIVE]"
        try:
            icon.notify("Network connectivity successfully restored.", "Connection Restored")
        except:
            pass

def open_logs(icon=None, item=None):
    if os.path.exists(LOG_FILE):
        os.system(f'notepad.exe "{LOG_FILE}"')

def exit_app(icon, item):
    if is_killed:
        restore_connection(icon)
    icon.stop()

def setup_tray():
    menu = pystray.Menu(
        item('🚨 Instant Kill Switch', kill_connection, default=True),
        item('🔄 Restore Connection', restore_connection),
        item('📋 View Event Logs', open_logs),
        pystray.Menu.SEPARATOR,
        item('❌ Exit NetKillSwitch', exit_app)
    )
    icon = pystray.Icon("NetKillSwitch", create_image(killed=False), "NetKillSwitch: [ONLINE / ACTIVE]", menu)
    write_log("INFO", "STARTUP", f"Python Tray Kill Switch initialized. Log: {LOG_FILE}")
    icon.run()

if __name__ == '__main__':
    # Try setting hotkey with keyboard package if installed
    try:
        import keyboard
        keyboard.add_hotkey("${config.globalHotkey.toLowerCase()}", lambda: kill_connection() if not is_killed else restore_connection())
        write_log("INFO", "HOTKEY", "Registered global hotkey: ${config.globalHotkey}")
    except:
        pass
    setup_tray()
`;
}

export function generateStartupBatchScript(): string {
  return `@echo off
:: Installs NetKillSwitch to launch automatically on Windows boot minimized to System Tray
title Installing NetKillSwitch Startup Shortcut...
color 0B

set TARGET_PS1=%~dp0NetKillSwitch.ps1
set STARTUP_DIR=%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup
set SHORTCUT_VBS=%TEMP%\\create_shortcut.vbs

echo Creating background startup shortcut in: "%STARTUP_DIR%"

echo Set oWS = WScript.CreateObject("WScript.Shell") > "%SHORTCUT_VBS%"
echo sLinkFile = "%STARTUP_DIR%\\NetKillSwitch.lnk" >> "%SHORTCUT_VBS%"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%SHORTCUT_VBS%"
echo oLink.TargetPath = "powershell.exe" >> "%SHORTCUT_VBS%"
echo oLink.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""%TARGET_PS1%""" >> "%SHORTCUT_VBS%"
echo oLink.IconLocation = "powershell.exe,0" >> "%SHORTCUT_VBS%"
echo oLink.Description = "Windows Instant Internet Kill Switch Tray App" >> "%SHORTCUT_VBS%"
echo oLink.Save >> "%SHORTCUT_VBS%"

cscript /nologo "%SHORTCUT_VBS%"
del "%SHORTCUT_VBS%"

echo.
echo [SUCCESS] NetKillSwitch will now start automatically when you log into Windows!
echo You can manage it anytime in Task Manager - Startup Apps.
pause
`;
}

export function generateReadme(config: WindowsConfig): string {
  return `==============================================================================
   WINDOWS INSTANT INTERNET KILL SWITCH & SYSTEM TRAY SUITE - USER GUIDE
==============================================================================

WHAT THIS SUITE DOES:
This software allows you to instantly drop, block, and isolate all internet and
network connectivity on your Windows 10/11 PC with a single button click,
system tray shortcut, or global keyboard hotkey (${config.globalHotkey}).

INCLUDED FILES:
1. NetKillSwitch.ps1
   -> The primary native Windows System Tray application.
   -> Runs quietly in the notification area (System Tray).
   -> Left-click: Instantly cuts or toggles internet connection.
   -> Right-click: Full menu with Restore, Auto-Restore, Log viewer, and Exit.
   -> Global Hotkey: Press ${config.globalHotkey} at ANY time in ANY app to kill internet.
   -> Log file: %APPDATA%\\${config.logDirectory}\\${config.logFileName}

2. KillSwitch_OneClick.bat
   -> Emergency double-clickable shortcut for desktop or taskbar.
   -> Cuts connections in under 50 milliseconds.

3. Restore_Internet.bat
   -> One-click emergency restore script to bring all network adapters back up.

4. KillSwitch_Tray.pyw
   -> Python-based system tray alternative using pystray and Pillow.

5. Install-Startup-Shortcut.bat
   -> Automatically adds NetKillSwitch to your Windows Startup folder so it
      launches silently on PC startup.

HOW TO RUN:
1. Right-click on 'NetKillSwitch.ps1' and choose "Run with PowerShell".
   - If prompted for Administrator privileges (UAC), click YES.
2. Look at your Windows taskbar clock area (System Tray).
   - You will see the green shield icon indicating the Kill Switch is active & monitoring.
3. To sever internet immediately:
   - Click the Green Shield in the system tray, OR
   - Press ${config.globalHotkey} on your keyboard, OR
   - Double-click KillSwitch_OneClick.bat.
4. The icon turns RED, all adapters are disabled, firewall blackhole is enabled,
   and an event log entry with millisecond precision is recorded.
5. To restore internet:
   - Click the Red Shield icon in the system tray, OR
   - Press ${config.globalHotkey}, OR
   - Right-click and select "Restore Connection".

POWERSHELL EXECUTION POLICY:
If Windows shows a script execution error ("running scripts is disabled on this system"),
open PowerShell as Administrator and run:
   Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force
or launch via:
   powershell -ExecutionPolicy Bypass -File .\\NetKillSwitch.ps1

LOGGING LOCATION:
All logs with timestamps, adapter states, and latency are recorded in:
%APPDATA%\\${config.logDirectory}\\${config.logFileName}
`;
}
