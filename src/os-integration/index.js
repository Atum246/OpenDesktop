'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec, spawn, execSync } = require('child_process');
const { EventEmitter } = require('events');

// ═══════════════════════════════════════════════════════════════
//  DEEP OS INTEGRATION — Becomes Part of Your System 🖥️🔗
//  File watchers, process monitor, clipboard intelligence, system events
// ═══════════════════════════════════════════════════════════════

class DeepOSIntegration extends EventEmitter {
  constructor(config, brain) {
    super();
    this.config = config;
    this.brain = brain;
    this.platform = os.platform();
    this.watchers = new Map();
    this.processCache = new Map();
    this.clipboardHistory = [];
    this.clipboardWatcher = null;
    this.systemEvents = [];
    this.filePatterns = new Map(); // pattern -> callback
    this.networkMonitors = new Map();
    this.batteryMonitor = null;
    this.lastClipboard = '';
    this.running = false;
  }

  // ─── START ALL MONITORS ───
  start() {
    if (this.running) return;
    this.running = true;
    this._startClipboardMonitor();
    this._startProcessMonitor();
    this._startSystemEventMonitor();
    this.emit('started');
    return { started: true };
  }

  stop() {
    this.running = false;
    for (const [, w] of this.watchers) {
      try { w.watcher?.close(); } catch {}
    }
    if (this.clipboardWatcher) clearInterval(this.clipboardWatcher);
    this.emit('stopped');
    return { stopped: true };
  }

  // ═══ FILE SYSTEM INTELLIGENCE ═══

  watchDirectory(dirPath, options = {}) {
    const id = `dirwatch_${Date.now().toString(36)}`;
    try {
      const watcher = fs.watch(dirPath, { recursive: options.recursive !== false }, (eventType, filename) => {
        if (!filename) return;
        const fullPath = path.join(dirPath, filename);

        // Check against ignore patterns
        if (options.ignore?.some(p => filename.match(p))) return;

        // Check against file patterns
        for (const [pattern, callback] of this.filePatterns) {
          if (filename.match(new RegExp(pattern))) {
            callback({ event: eventType, path: fullPath, filename, timestamp: Date.now() });
          }
        }

        this.emit('file-change', { event: eventType, path: fullPath, filename });
      });

      this.watchers.set(id, { id, path: dirPath, watcher, created: Date.now() });
      return { watching: true, id, path: dirPath };
    } catch (err) {
      return { error: err.message };
    }
  }

  addFilePattern(pattern, callback) {
    this.filePatterns.set(pattern, callback);
    return { pattern, added: true };
  }

  stopWatching(id) {
    const watcher = this.watchers.get(id);
    if (watcher) {
      watcher.watcher?.close();
      this.watchers.delete(id);
      return { stopped: true };
    }
    return { error: 'Watcher not found' };
  }

  // ═══ PROCESS INTELLIGENCE ═══

  _startProcessMonitor() {
    setInterval(async () => {
      if (!this.running) return;
      try {
        const procs = await this._getProcesses();
        const current = new Map(procs.map(p => [p.pid, p]));

        // Detect new processes
        for (const [pid, proc] of current) {
          if (!this.processCache.has(pid)) {
            this.emit('process-started', proc);
          }
        }

        // Detect stopped processes
        for (const [pid, proc] of this.processCache) {
          if (!current.has(pid)) {
            this.emit('process-stopped', proc);
          }
        }

        this.processCache = current;
      } catch {}
    }, 10000);
  }

  async _getProcesses() {
    return new Promise((resolve) => {
      const cmd = this.platform === 'win32'
        ? 'powershell "Get-Process | Select-Object Id, ProcessName, CPU, WorkingSet64 | ConvertTo-Json"'
        : 'ps aux --no-headers';
      exec(cmd, { timeout: 5000 }, (err, stdout) => {
        if (err) return resolve([]);
        if (this.platform === 'win32') {
          try { resolve(JSON.parse(stdout)); } catch { resolve([]); }
        } else {
          const procs = stdout.split('\n').filter(Boolean).map(line => {
            const parts = line.split(/\s+/);
            return {
              user: parts[0],
              pid: parseInt(parts[1]),
              cpu: parseFloat(parts[2]),
              mem: parseFloat(parts[3]),
              command: parts.slice(10).join(' ')
            };
          });
          resolve(procs);
        }
      });
    });
  }

  async getTopProcesses(limit = 10) {
    const procs = await this._getProcesses();
    return procs.sort((a, b) => (b.cpu || 0) - (a.cpu || 0)).slice(0, limit);
  }

  async findProcess(name) {
    const procs = await this._getProcesses();
    return procs.filter(p => (p.command || p.ProcessName || '').toLowerCase().includes(name.toLowerCase()));
  }

  // ═══ CLIPBOARD INTELLIGENCE ═══

  _startClipboardMonitor() {
    this.clipboardWatcher = setInterval(async () => {
      if (!this.running) return;
      try {
        const current = await this._readClipboard();
        if (current && current !== this.lastClipboard) {
          this.lastClipboard = current;
          this.clipboardHistory.push({
            content: current.slice(0, 1000),
            timestamp: Date.now(),
            type: this._detectContentType(current)
          });
          if (this.clipboardHistory.length > 100) this.clipboardHistory = this.clipboardHistory.slice(-50);
          this.emit('clipboard-change', { content: current, type: this._detectContentType(current) });

          // Learn from clipboard
          if (this.brain) {
            const type = this._detectContentType(current);
            if (type === 'url') this.brain.addNode('entity', current, { tags: ['url', 'clipboard'], weight: 0.4 });
            if (type === 'code') this.brain.addNode('fact', `Clipboard code: ${current.slice(0, 200)}`, { tags: ['code', 'clipboard'], weight: 0.3 });
          }
        }
      } catch {}
    }, 2000);
  }

  async _readClipboard() {
    try {
      const clipboardy = require('clipboardy');
      return clipboardy.readSync();
    } catch {
      if (this.platform === 'darwin') {
        return new Promise(resolve => exec('pbpaste', (err, out) => resolve(out || '')));
      }
      if (this.platform === 'linux') {
        return new Promise(resolve => exec('xclip -selection clipboard -o 2>/dev/null || xsel --clipboard --output 2>/dev/null', (err, out) => resolve(out || '')));
      }
      return '';
    }
  }

  _detectContentType(text) {
    if (/^https?:\/\//i.test(text)) return 'url';
    if (/[{};()=>]/.test(text) && (text.includes('function') || text.includes('const ') || text.includes('import ') || text.includes('def ') || text.includes('class '))) return 'code';
    if (/^[\w.-]+@[\w.-]+\.\w+$/.test(text)) return 'email';
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) return 'date';
    if (/^\d+(\.\d+)?$/.test(text.trim())) return 'number';
    if (text.length > 200) return 'long-text';
    return 'text';
  }

  getClipboardHistory(limit = 10) {
    return this.clipboardHistory.slice(-limit);
  }

  // ═══ SYSTEM EVENT MONITOR ═══

  _startSystemEventMonitor() {
    // Monitor system events via platform-specific methods
    if (this.platform === 'linux') {
      this._monitorLinuxEvents();
    }
  }

  _monitorLinuxEvents() {
    // Monitor battery
    try {
      const batteryPath = '/sys/class/power_supply/BAT0/capacity';
      if (fs.existsSync(batteryPath)) {
        setInterval(() => {
          try {
            const level = parseInt(fs.readFileSync(batteryPath, 'utf8'));
            if (level <= 15) {
              this.emit('system-event', { type: 'battery-low', level });
              this._addSystemEvent('battery-low', `Battery at ${level}%`);
            }
          } catch {}
        }, 60000);
      }
    } catch {}

    // Monitor disk usage
    setInterval(() => {
      try {
        const output = execSync("df -h / | tail -1 | awk '{print $5}'", { encoding: 'utf8', timeout: 5000 });
        const usage = parseInt(output);
        if (usage > 90) {
          this.emit('system-event', { type: 'disk-full', usage });
          this._addSystemEvent('disk-full', `Root disk at ${usage}%`);
        }
      } catch {}
    }, 300000);
  }

  _addSystemEvent(type, message) {
    this.systemEvents.push({ type, message, timestamp: Date.now() });
    if (this.systemEvents.length > 200) this.systemEvents = this.systemEvents.slice(-100);
  }

  getSystemEvents(limit = 20) {
    return this.systemEvents.slice(-limit);
  }

  // ═══ WINDOW MANAGEMENT ═══

  async getActiveWindow() {
    if (this.platform === 'linux') {
      return new Promise(resolve => {
        exec('xdotool getactivewindow getwindowname 2>/dev/null', { timeout: 3000 }, (err, out) => {
          resolve(err ? null : { title: out.trim() });
        });
      });
    }
    if (this.platform === 'darwin') {
      return new Promise(resolve => {
        exec('osascript -e \'tell application "System Events" to get name of first application process whose frontmost is true\'', { timeout: 3000 }, (err, out) => {
          resolve(err ? null : { title: out.trim() });
        });
      });
    }
    return null;
  }

  async getOpenWindows() {
    if (this.platform === 'linux') {
      return new Promise(resolve => {
        exec('wmctrl -l 2>/dev/null || echo "wmctrl not installed"', { timeout: 5000 }, (err, out) => {
          if (err || !out.includes('0x')) return resolve([]);
          const windows = out.trim().split('\n').map(line => {
            const parts = line.split(/\s+/);
            return { id: parts[0], desktop: parts[1], title: parts.slice(3).join(' ') };
          });
          resolve(windows);
        });
      });
    }
    return [];
  }

  // ═══ NETWORK INTELLIGENCE ═══

  async getNetworkStatus() {
    const interfaces = os.networkInterfaces();
    const active = [];
    for (const [name, addrs] of Object.entries(interfaces)) {
      for (const addr of addrs) {
        if (!addr.internal && addr.family === 'IPv4') {
          active.push({ interface: name, ip: addr.address, mac: addr.mac });
        }
      }
    }

    // Check internet connectivity
    let online = false;
    try {
      await new Promise((resolve, reject) => {
        const req = require('https').get('https://1.1.1.1', { timeout: 3000 }, resolve);
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
      });
      online = true;
    } catch {}

    return { interfaces: active, online, hostname: os.hostname() };
  }

  // ═══ QUICK ACTIONS ═══

  async openApp(appName) {
    if (this.platform === 'darwin') return this._exec(`open -a "${appName}"`);
    if (this.platform === 'win32') return this._exec(`start "" "${appName}"`);
    return this._exec(`${appName} &`);
  }

  async closeApp(appName) {
    if (this.platform === 'darwin') return this._exec(`osascript -e 'quit app "${appName}"'`);
    if (this.platform === 'win32') return this._exec(`taskkill /IM "${appName}.exe" /F`);
    return this._exec(`pkill -f "${appName}"`);
  }

  async focusWindow(title) {
    if (this.platform === 'linux') return this._exec(`wmctrl -a "${title}"`);
    if (this.platform === 'darwin') return this._exec(`osascript -e 'tell application "${title}" to activate'`);
    return { error: 'Not supported on this platform' };
  }

  async lockScreen() {
    if (this.platform === 'darwin') return this._exec('pmset displaysleepnow');
    if (this.platform === 'linux') return this._exec('xdg-screensaver lock 2>/dev/null || loginctl lock-session');
    return this._exec('rundll32.exe user32.dll,LockWorkStation');
  }

  async sleep() {
    if (this.platform === 'darwin') return this._exec('pmset sleepnow');
    if (this.platform === 'linux') return this._exec('systemctl suspend');
    return this._exec('rundll32.exe powrprof.dll,SetSuspendState 0,1,0');
  }

  async emptyTrash() {
    if (this.platform === 'darwin') return this._exec('osascript -e \'tell application "Finder" to empty the trash\'');
    if (this.platform === 'linux') return this._exec('rm -rf ~/.local/share/Trash/files/* ~/.local/share/Trash/info/*');
    return { error: 'Not supported' };
  }

  _exec(cmd) {
    return new Promise(resolve => {
      exec(cmd, { timeout: 10000 }, (err, stdout, stderr) => {
        resolve(err ? { error: err.message } : { success: true, output: stdout });
      });
    });
  }

  // ═══ STATUS ═══
  getStatus() {
    return {
      running: this.running,
      fileWatchers: this.watchers.size,
      filePatterns: this.filePatterns.size,
      clipboardEntries: this.clipboardHistory.length,
      systemEvents: this.systemEvents.length,
      processesCached: this.processCache.size,
      platform: this.platform
    };
  }
}

module.exports = DeepOSIntegration;
