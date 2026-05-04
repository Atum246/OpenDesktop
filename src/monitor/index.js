'use strict';
const os = require('os');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { EventEmitter } = require('events');

// ═══════════════════════════════════════════════════════════════
//  PERFORMANCE MONITOR — Real-time System & App Metrics 📊⚡
//  CPU, memory, disk, network, process monitoring with alerts
// ═══════════════════════════════════════════════════════════════

class PerformanceMonitor extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.running = false;
    this.metrics = {
      cpu: [],
      memory: [],
      disk: [],
      network: [],
      processes: []
    };
    this.maxHistory = 60; // Keep last 60 readings
    this.alerts = [];
    this.alertThresholds = {
      cpu: 90,
      memory: 90,
      disk: 90,
      networkLatency: 500
    };
    this.dataDir = path.join(os.homedir(), '.opendesktop', 'monitor');
    if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
    this._interval = null;
  }

  // ─── START MONITORING ───
  start(intervalMs = 5000) {
    if (this.running) return;
    this.running = true;
    this._interval = setInterval(() => this._collectMetrics(), intervalMs);
    this._collectMetrics(); // Collect immediately
    this.emit('started');
    return { started: true, interval: intervalMs };
  }

  stop() {
    this.running = false;
    if (this._interval) clearInterval(this._interval);
    this.emit('stopped');
    return { stopped: true };
  }

  // ─── COLLECT METRICS ───
  async _collectMetrics() {
    const timestamp = Date.now();

    try {
      // CPU
      const cpuUsage = await this._getCpuUsage();
      this.metrics.cpu.push({ value: cpuUsage, timestamp });
      if (this.metrics.cpu.length > this.maxHistory) this.metrics.cpu.shift();

      // Memory
      const mem = this._getMemoryUsage();
      this.metrics.memory.push({ ...mem, timestamp });
      if (this.metrics.memory.length > this.maxHistory) this.metrics.memory.shift();

      // Disk
      const disk = await this._getDiskUsage();
      this.metrics.disk.push({ ...disk, timestamp });
      if (this.metrics.disk.length > this.maxHistory) this.metrics.disk.shift();

      // Network
      const net = await this._getNetworkStats();
      this.metrics.network.push({ ...net, timestamp });
      if (this.metrics.network.length > this.maxHistory) this.metrics.network.shift();

      // Check alerts
      this._checkAlerts(cpuUsage, mem, disk);

      this.emit('metrics', { cpu: cpuUsage, memory: mem, disk, network: net, timestamp });
    } catch {}
  }

  // ─── CPU USAGE ───
  async _getCpuUsage() {
    return new Promise((resolve) => {
      const startMeasure = os.cpus().map(c => ({ idle: c.times.idle, total: Object.values(c.times).reduce((a, b) => a + b) }));

      setTimeout(() => {
        const endMeasure = os.cpus().map(c => ({ idle: c.times.idle, total: Object.values(c.times).reduce((a, b) => a + b) }));

        let totalIdle = 0, totalTick = 0;
        for (let i = 0; i < startMeasure.length; i++) {
          totalIdle += endMeasure[i].idle - startMeasure[i].idle;
          totalTick += endMeasure[i].total - startMeasure[i].total;
        }

        resolve(Math.round((1 - totalIdle / totalTick) * 100));
      }, 100);
    });
  }

  // ─── MEMORY USAGE ───
  _getMemoryUsage() {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    return {
      total,
      free,
      used,
      percent: Math.round((used / total) * 100),
      totalHuman: this._formatBytes(total),
      usedHuman: this._formatBytes(used),
      freeHuman: this._formatBytes(free)
    };
  }

  // ─── DISK USAGE ───
  async _getDiskUsage() {
    return new Promise((resolve) => {
      const cmd = os.platform() === 'win32'
        ? 'wmic logicaldisk get size,freespace,caption'
        : 'df -h / | tail -1';

      exec(cmd, { timeout: 5000 }, (err, stdout) => {
        if (err) return resolve({ percent: 0, error: err.message });

        if (os.platform() === 'win32') {
          resolve({ percent: 0, note: 'Windows disk parsing not implemented' });
        } else {
          const parts = stdout.trim().split(/\s+/);
          resolve({
            filesystem: parts[0],
            size: parts[1],
            used: parts[2],
            available: parts[3],
            percent: parseInt(parts[4]) || 0,
            mount: parts[5]
          });
        }
      });
    });
  }

  // ─── NETWORK STATS ───
  async _getNetworkStats() {
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
    let latency = -1;
    try {
      const start = Date.now();
      await new Promise((resolve, reject) => {
        const req = require('https').get('https://1.1.1.1', { timeout: 3000 }, resolve);
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
      });
      latency = Date.now() - start;
      online = true;
    } catch {}

    return { interfaces: active, online, latency };
  }

  // ─── CHECK ALERTS ───
  _checkAlerts(cpu, mem, disk) {
    const now = Date.now();

    if (cpu > this.alertThresholds.cpu) {
      this._addAlert('cpu-high', `CPU usage at ${cpu}%`, 'high');
    }

    if (mem.percent > this.alertThresholds.memory) {
      this._addAlert('memory-high', `Memory at ${mem.percent}% (${mem.usedHuman}/${mem.totalHuman})`, 'high');
    }

    if (disk.percent > this.alertThresholds.disk) {
      this._addAlert('disk-low', `Disk at ${disk.percent}% full`, 'high');
    }
  }

  _addAlert(key, message, severity) {
    // Don't duplicate alerts within 5 minutes
    const recent = this.alerts.find(a => a.key === key && Date.now() - a.timestamp < 300000);
    if (recent) return;

    const alert = { key, message, severity, timestamp: Date.now(), dismissed: false };
    this.alerts.push(alert);
    if (this.alerts.length > 100) this.alerts = this.alerts.slice(-50);

    this.emit('alert', alert);
  }

  // ─── GET CURRENT STATUS ───
  getCurrent() {
    const latest = (arr) => arr.length ? arr[arr.length - 1] : null;

    return {
      cpu: latest(this.metrics.cpu)?.value || 0,
      memory: latest(this.metrics.memory) || this._getMemoryUsage(),
      disk: latest(this.metrics.disk) || {},
      network: latest(this.metrics.network) || {},
      uptime: os.uptime(),
      loadAvg: os.loadavg(),
      platform: os.platform(),
      hostname: os.hostname(),
      arch: os.arch(),
      cpuCount: os.cpus().length,
      cpuModel: os.cpus()[0]?.model || 'Unknown'
    };
  }

  // ─── GET HISTORY ───
  getHistory(metric = 'cpu', limit = 30) {
    return (this.metrics[metric] || []).slice(-limit);
  }

  // ─── GET ALERTS ───
  getActiveAlerts() {
    return this.alerts.filter(a => !a.dismissed);
  }

  dismissAlert(key) {
    const alert = this.alerts.find(a => a.key === key);
    if (alert) alert.dismissed = true;
  }

  // ─── SET THRESHOLDS ───
  setThreshold(metric, value) {
    if (this.alertThresholds.hasOwnProperty(metric)) {
      this.alertThresholds[metric] = value;
      return { set: true, metric, value };
    }
    return { error: `Unknown metric: ${metric}` };
  }

  // ─── GENERATE REPORT ───
  generateReport() {
    const current = this.getCurrent();
    const cpuAvg = this.metrics.cpu.length
      ? Math.round(this.metrics.cpu.reduce((s, m) => s + m.value, 0) / this.metrics.cpu.length)
      : 0;
    const memAvg = this.metrics.memory.length
      ? Math.round(this.metrics.memory.reduce((s, m) => s + m.percent, 0) / this.metrics.memory.length)
      : 0;

    return {
      summary: {
        cpu: { current: current.cpu, average: cpuAvg, max: Math.max(...this.metrics.cpu.map(m => m.value), 0) },
        memory: { current: current.memory.percent, average: memAvg, total: current.memory.totalHuman },
        disk: { percent: current.disk.percent, available: current.disk.available },
        network: { online: current.network.online, latency: current.network.latency },
        uptime: this._formatUptime(current.uptime),
        alerts: this.alerts.length
      },
      thresholds: this.alertThresholds,
      dataPoints: {
        cpu: this.metrics.cpu.length,
        memory: this.metrics.memory.length,
        disk: this.metrics.disk.length,
        network: this.metrics.network.length
      }
    };
  }

  // ─── EXPORT METRICS ───
  exportMetrics(filepath) {
    const data = {
      exported: new Date().toISOString(),
      hostname: os.hostname(),
      metrics: this.metrics,
      alerts: this.alerts,
      report: this.generateReport()
    };

    const outPath = filepath || path.join(this.dataDir, `metrics-${Date.now()}.json`);
    fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
    return { exported: true, path: outPath };
  }

  // ─── HELPERS ───
  _formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  _formatUptime(seconds) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  }

  // ─── STATUS ───
  getStatus() {
    return {
      running: this.running,
      dataPoints: Object.fromEntries(Object.entries(this.metrics).map(([k, v]) => [k, v.length])),
      activeAlerts: this.alerts.filter(a => !a.dismissed).length,
      thresholds: this.alertThresholds
    };
  }
}

module.exports = PerformanceMonitor;
