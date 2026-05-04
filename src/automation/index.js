'use strict';
const { exec, execSync, spawn } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════
//  AUTOMATION ENGINE — Desktop Control & System Operations
// ═══════════════════════════════════════════════════════════════

class AutomationEngine {
  constructor(config) {
    this.config = config;
    this.platform = os.platform();
    this.taskQueue = [];
    this.running = false;
    this.history = [];
  }

  // ─── SYSTEM COMMANDS ───
  async runCommand(cmd, options = {}) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const child = exec(cmd, { timeout: options.timeout || 30000, maxBuffer: 10 * 1024 * 1024, ...options }, (error, stdout, stderr) => {
        const duration = Date.now() - startTime;
        this.history.push({ type: 'command', cmd, duration, success: !error, timestamp: new Date().toISOString() });
        if (error) resolve({ success: false, error: error.message, stderr, stdout, duration });
        else resolve({ success: true, stdout, stderr, duration });
      });
      if (options.stdin) { child.stdin.write(options.stdin); child.stdin.end(); }
    });
  }

  // ─── MOUSE CONTROL ───
  async mouseClick(x, y, button) { return this._runPlatformCmd(`mouse click ${button || 'left'} at ${x},${y}`, { x, y, button: button || 'left' }); }
  async mouseMove(x, y) { return this._runPlatformCmd(`mouse move to ${x},${y}`, { x, y }); }
  async mouseDrag(x1, y1, x2, y2) { return this._runPlatformCmd(`mouse drag from ${x1},${y1} to ${x2},${y2}`, { x1, y1, x2, y2 }); }
  async mouseScroll(direction, amount) { return this._runPlatformCmd(`mouse scroll ${direction} ${amount || 3}`, { direction, amount: amount || 3 }); }

  // ─── KEYBOARD CONTROL ───
  async typeText(text) { return this._runPlatformCmd(`type "${text}"`, { text }); }
  async pressKey(key) { return this._runPlatformCmd(`press key ${key}`, { key }); }
  async hotkey(...keys) { return this._runPlatformCmd(`hotkey ${keys.join('+')}`, { keys }); }

  // ─── WINDOW MANAGEMENT ───
  async openApp(appName) {
    if (this.platform === 'darwin') return this.runCommand(`open -a "${appName}"`);
    if (this.platform === 'win32') return this.runCommand(`start "" "${appName}"`);
    return this.runCommand(`${appName} &`);
  }

  async closeApp(appName) {
    if (this.platform === 'darwin') return this.runCommand(`osascript -e 'quit app "${appName}"'`);
    if (this.platform === 'win32') return this.runCommand(`taskkill /IM "${appName}.exe" /F`);
    return this.runCommand(`pkill -f "${appName}"`);
  }

  async listWindows() {
    if (this.platform === 'darwin') return this.runCommand(`osascript -e 'tell application "System Events" to get name of every window of every process whose visible is true'`);
    if (this.platform === 'win32') return this.runCommand(`powershell "Get-Process | Where-Object {$_.MainWindowTitle -ne ''} | Select-Object ProcessName, MainWindowTitle"`);
    return this.runCommand(`wmctrl -l 2>/dev/null || echo "wmctrl not installed"`);
  }

  async focusWindow(title) {
    if (this.platform === 'darwin') return this.runCommand(`osascript -e 'tell application "${title}" to activate'`);
    if (this.platform === 'win32') return this.runCommand(`powershell "(Get-Process -Name '${title}').MainWindowHandle | ForEach-Object { SetForegroundWindow($_) }"`);
    return this.runCommand(`wmctrl -a "${title}"`);
  }

  // ─── FILE OPERATIONS ───
  async readFile(filePath) { try { return { success: true, content: fs.readFileSync(filePath, 'utf8'), path: filePath }; } catch (err) { return { success: false, error: err.message }; } }
  async writeFile(filePath, content) { try { fs.mkdirSync(path.dirname(filePath), { recursive: true }); fs.writeFileSync(filePath, content); return { success: true, path: filePath }; } catch (err) { return { success: false, error: err.message }; } }
  async listDir(dirPath, recursive) {
    try {
      const entries = fs.readdirSync(dirPath || '.', { withFileTypes: true });
      return { success: true, entries: entries.map(e => ({ name: e.name, type: e.isDirectory() ? 'dir' : 'file', path: path.join(dirPath || '.', e.name) })) };
    } catch (err) { return { success: false, error: err.message }; }
  }
  async searchFiles(dir, pattern) {
    try {
      const results = [];
      const walk = (d) => { fs.readdirSync(d, { withFileTypes: true }).forEach(e => { const fp = path.join(d, e.name); if (e.isDirectory()) walk(fp); else if (e.name.toLowerCase().includes(pattern.toLowerCase())) results.push(fp); }); };
      walk(dir || '.'); return { success: true, results, count: results.length };
    } catch (err) { return { success: false, error: err.message }; }
  }

  // ─── CLIPBOARD ───
  async getClipboard() {
    try {
      const clipboardy = require('clipboardy');
      return { success: true, content: clipboardy.readSync() };
    } catch {
      if (this.platform === 'darwin') return this.runCommand('pbpaste');
      if (this.platform === 'linux') return this.runCommand('xclip -selection clipboard -o 2>/dev/null || xsel --clipboard --output 2>/dev/null || echo "clipboard tool not found"');
      return this.runCommand('powershell Get-Clipboard');
    }
  }

  async setClipboard(text) {
    try {
      const clipboardy = require('clipboardy');
      clipboardy.writeSync(text);
      return { success: true };
    } catch {
      if (this.platform === 'darwin') return this.runCommand(`echo "${text}" | pbcopy`);
      if (this.platform === 'linux') return this.runCommand(`echo "${text}" | xclip -selection clipboard 2>/dev/null || echo "${text}" | xsel --clipboard --input 2>/dev/null`);
      return this.runCommand(`powershell Set-Clipboard -Value "${text}"`);
    }
  }

  // ─── NETWORK ───
  async getNetworkInfo() {
    const si = require('systeminformation');
    const net = await si.networkInterfaces();
    const wifi = await si.wifiNetworks().catch(() => []);
    return { interfaces: net, wifi, hostname: os.hostname() };
  }

  async ping(host) { return this.runCommand(`ping -c 4 ${host} 2>/dev/null || ping -n 4 ${host}`); }

  // ─── SYSTEM INFO ───
  async getSystemInfo() {
    const si = require('systeminformation');
    const [cpu, mem, disk, os_info, battery] = await Promise.all([
      si.cpu(), si.mem(), si.fsSize(), si.osInfo(), si.battery().catch(() => null)
    ]);
    return { cpu: { brand: cpu.brand, cores: cpu.cores, speed: cpu.speed }, memory: { total: mem.total, free: mem.free, used: mem.used }, disk: disk.map(d => ({ mount: d.mount, size: d.size, used: d.used })), os: { platform: os_info.platform, distro: os_info.distro, release: os_info.release }, battery };
  }

  async listProcesses() { return this.runCommand(this.platform === 'win32' ? 'tasklist' : 'ps aux'); }
  async killProcess(name) { return this.runCommand(this.platform === 'win32' ? `taskkill /IM "${name}" /F` : `pkill -f "${name}"`); }

  // ─── BROWSER ───
  async openBrowser(url) {
    if (this.platform === 'darwin') return this.runCommand(`open "${url}"`);
    if (this.platform === 'win32') return this.runCommand(`start "" "${url}"`);
    return this.runCommand(`xdg-open "${url}" 2>/dev/null || sensible-browser "${url}" 2>/dev/null || echo "No browser found"`);
  }

  // ─── NOTIFICATIONS ───
  async notify(title, message) {
    try {
      const notifier = require('node-notifier');
      notifier.notify({ title, message, sound: true });
      return { success: true };
    } catch (err) { return { success: false, error: err.message }; }
  }

  // ─── TASK QUEUE ───
  queueTask(task) { this.taskQueue.push({ id: Date.now().toString(36), ...task, status: 'queued', created: new Date().toISOString() }); return { queued: true, id: task.id }; }
  async runTaskQueue() { this.running = true; const results = []; for (const task of this.taskQueue.filter(t => t.status === 'queued')) { task.status = 'running'; try { const r = await this.executeTask(task); task.status = 'completed'; results.push({ id: task.id, result: r }); } catch (err) { task.status = 'failed'; results.push({ id: task.id, error: err.message }); } } this.running = false; return results; }
  async executeTask(task) { switch (task.type) { case 'command': return this.runCommand(task.cmd); case 'open': return this.openApp(task.app); case 'type': return this.typeText(task.text); default: return { error: 'Unknown task type' }; } }
  getTaskQueue() { return this.taskQueue; }
  clearTaskQueue() { this.taskQueue = []; }

  // ─── PLATFORM HELPERS ───
  async _runPlatformCmd(description, params) {
    this.history.push({ type: 'automation', description, params, timestamp: new Date().toISOString() });
    return { success: true, action: description, params, platform: this.platform, note: 'Action logged. For actual mouse/keyboard control, install robotjs or nutjs.' };
  }

  getHistory(limit) { return this.history.slice(-(limit || 50)); }
}

module.exports = AutomationEngine;
