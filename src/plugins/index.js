'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');

// ═══════════════════════════════════════════════════════════════
//  PLUGIN SYSTEM — Extensible Skill/Plugin Architecture
// ═══════════════════════════════════════════════════════════════

const PLUGINS_DIR = path.join(os.homedir(), '.opendesktop', 'plugins');

class PluginManager {
  constructor(config, engine) {
    this.config = config;
    this.engine = engine;
    this.plugins = new Map();
    this.dir = PLUGINS_DIR;
    if (!fs.existsSync(this.dir)) fs.mkdirSync(this.dir, { recursive: true });
  }

  async loadAll() {
    const entries = fs.readdirSync(this.dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const manifestPath = path.join(this.dir, entry.name, 'plugin.json');
        if (fs.existsSync(manifestPath)) {
          try {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            const mainPath = path.join(this.dir, entry.name, manifest.main || 'index.js');
            if (fs.existsSync(mainPath)) {
              const plugin = require(mainPath);
              this.plugins.set(manifest.name, { manifest, instance: plugin, enabled: true });
            }
          } catch (err) { console.log(`[Plugin] Failed to load ${entry.name}: ${err.message}`); }
        }
      }
    }
    return { loaded: this.plugins.size, names: [...this.plugins.keys()] };
  }

  async execute(pluginName, action, params) {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) return { error: `Plugin ${pluginName} not found` };
    if (!plugin.enabled) return { error: `Plugin ${pluginName} is disabled` };
    try {
      if (typeof plugin.instance[action] === 'function') return await plugin.instance[action](params, this.engine);
      return { error: `Action ${action} not found in plugin ${pluginName}` };
    } catch (err) { return { error: `Plugin error: ${err.message}` }; }
  }

  list() { return [...this.plugins.entries()].map(([name, p]) => ({ name, version: p.manifest.version, description: p.manifest.description, enabled: p.enabled })); }
  enable(name) { const p = this.plugins.get(name); if (p) p.enabled = true; }
  disable(name) { const p = this.plugins.get(name); if (p) p.enabled = false; }

  // Built-in skills
  getBuiltInSkills() {
    return [
      { name: 'web-search', description: 'Search the web for information', command: '/search' },
      { name: 'code-exec', description: 'Execute code in various languages', command: '/code' },
      { name: 'file-manager', description: 'Advanced file operations', command: '/files' },
      { name: 'git-control', description: 'Git repository management', command: '/git' },
      { name: 'docker-control', description: 'Docker container management', command: '/docker' },
      { name: 'ssh-remote', description: 'SSH remote server control', command: '/ssh' },
      { name: 'api-client', description: 'Make HTTP API requests', command: '/api' },
      { name: 'pdf-reader', description: 'Read and extract PDF content', command: '/pdf' },
      { name: 'image-gen', description: 'Generate images via AI', command: '/imagine' },
      { name: 'translate', description: 'Translate between languages', command: '/translate' },
      { name: 'weather', description: 'Get weather information', command: '/weather' },
      { name: 'email-manager', description: 'Read and send emails', command: '/email' },
      { name: 'calendar', description: 'Calendar management', command: '/calendar' },
      { name: 'crypto', description: 'Cryptocurrency prices and info', command: '/crypto' },
      { name: 'stock-market', description: 'Stock market data', command: '/stocks' }
    ];
  }
}

module.exports = PluginManager;
