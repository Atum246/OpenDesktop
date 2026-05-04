'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.opendesktop');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const MEMORY_DIR = path.join(CONFIG_DIR, 'memory');
const LOGS_DIR = path.join(CONFIG_DIR, 'logs');

const DEFAULT_CONFIG = {
  version: '1.0.0',
  provider: { name: 'openrouter', apiKey: null, endpoint: null, model: 'anthropic/claude-3.5-sonnet' },
  features: { voice: true, vision: true, memory: true, automation: true, browser: true },
  theme: 'hacker-red',
  messaging: { enabled: false, platforms: [] },
  hotkey: { enabled: true, key: 'ctrl+shift+space' },
  permissions: { screenControl: true, fileSystem: true, network: true, clipboard: true, notifications: true, systemCommands: true },
  gui: { width: 900, height: 700, opacity: 0.95 },
  automation: { confirmDestructive: true, maxRetries: 3, timeout: 30000 },
  memory: { maxEntries: 100000, autoCleanup: true, retentionDays: 365 }
};

class Config {
  constructor() { this._ensureDirs(); this._load(); }
  _ensureDirs() { [CONFIG_DIR, MEMORY_DIR, LOGS_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }); }
  _load() {
    try {
      if (fs.existsSync(CONFIG_FILE)) { this.data = { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) }; }
      else { this.data = { ...DEFAULT_CONFIG }; this.save(); }
    } catch { this.data = { ...DEFAULT_CONFIG }; }
  }
  get(key, def) { return key.split('.').reduce((o, k) => o?.[k], this.data) ?? def; }
  set(key, value) {
    const keys = key.split('.');
    let obj = this.data;
    for (let i = 0; i < keys.length - 1; i++) { if (!obj[keys[i]]) obj[keys[i]] = {}; obj = obj[keys[i]]; }
    obj[keys[keys.length - 1]] = value;
    this.save();
  }
  save() {
    try {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.data, null, 2));
    } catch (err) {
      // Ensure directory exists (race condition fix)
      this._ensureDirs();
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.data, null, 2));
    }
  }
  get paths() { return { configDir: CONFIG_DIR, configFile: CONFIG_FILE, memoryDir: MEMORY_DIR, logsDir: LOGS_DIR }; }
  reset() { this.data = { ...DEFAULT_CONFIG }; this.save(); }
}

module.exports = Config;
