'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const http = require('http');
const { exec, execSync } = require('child_process');
const { EventEmitter } = require('events');

// ═══════════════════════════════════════════════════════════════
//  PLUGIN MARKETPLACE — Discover, Install & Share Skills 🛒🧩
//  Browse, install, update, rate, and publish OpenDesktop plugins
// ═══════════════════════════════════════════════════════════════

class PluginMarketplace extends EventEmitter {
  constructor(config, pluginManager) {
    super();
    this.config = config;
    this.pluginManager = pluginManager;
    this.registryUrl = config.get('marketplace.registryUrl', 'https://registry.opendesktop.ai');
    this.cacheDir = path.join(os.homedir(), '.opendesktop', 'marketplace-cache');
    this.installedDir = path.join(os.homedir(), '.opendesktop', 'plugins');
    if (!fs.existsSync(this.cacheDir)) fs.mkdirSync(this.cacheDir, { recursive: true });
    this.cache = new Map();
    this.cacheTTL = 10 * 60 * 1000; // 10 minutes
    this.installHistory = [];
    this._loadHistory();
  }

  // ─── BROWSE MARKETPLACE ───
  async browse(options = {}) {
    const category = options.category || 'all';
    const sort = options.sort || 'popular'; // popular, newest, rating, name
    const limit = options.limit || 20;
    const search = options.search || '';

    try {
      // Try fetching from registry
      const plugins = await this._fetchRegistry(`/plugins?category=${category}&sort=${sort}&limit=${limit}&search=${encodeURIComponent(search)}`);

      if (plugins.length) {
        return { plugins, total: plugins.length, source: 'registry' };
      }
    } catch {}

    // Fallback: return built-in skill suggestions
    return {
      plugins: this._getBuiltinSuggestions(search),
      total: this._getBuiltinSuggestions(search).length,
      source: 'builtin',
      note: 'Registry unavailable. Showing built-in skill suggestions.'
    };
  }

  // ─── SEARCH PLUGINS ───
  async search(query) {
    return this.browse({ search: query, limit: 50 });
  }

  // ─── GET PLUGIN DETAILS ───
  async getPlugin(pluginName) {
    try {
      const details = await this._fetchRegistry(`/plugins/${pluginName}`);
      return details;
    } catch {}

    // Check local
    const localPath = path.join(this.installedDir, pluginName, 'plugin.json');
    if (fs.existsSync(localPath)) {
      return JSON.parse(fs.readFileSync(localPath, 'utf8'));
    }

    return { error: `Plugin ${pluginName} not found` };
  }

  // ─── INSTALL PLUGIN ───
  async install(pluginName, options = {}) {
    this.emit('install-start', { name: pluginName });

    try {
      // Check if already installed
      const localPath = path.join(this.installedDir, pluginName);
      if (fs.existsSync(localPath) && !options.force) {
        return { error: `Plugin ${pluginName} already installed. Use force option to reinstall.` };
      }

      // Try downloading from registry
      let pluginData;
      try {
        pluginData = await this._fetchRegistry(`/plugins/${pluginName}/download`);
      } catch {
        // Try npm
        return await this._installFromNpm(pluginName, options);
      }

      // Create plugin directory
      if (!fs.existsSync(localPath)) fs.mkdirSync(localPath, { recursive: true });

      // Write plugin files
      if (pluginData.manifest) {
        fs.writeFileSync(path.join(localPath, 'plugin.json'), JSON.stringify(pluginData.manifest, null, 2));
      }
      if (pluginData.files) {
        for (const [filename, content] of Object.entries(pluginData.files)) {
          const filePath = path.join(localPath, filename);
          const dir = path.dirname(filePath);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(filePath, content);
        }
      }

      // Install dependencies
      if (pluginData.manifest?.dependencies) {
        await this._installDependencies(localPath, pluginData.manifest.dependencies);
      }

      // Record installation
      const entry = {
        name: pluginName,
        version: pluginData.manifest?.version || '1.0.0',
        source: 'registry',
        installedAt: new Date().toISOString()
      };
      this.installHistory.push(entry);
      this._saveHistory();

      this.emit('install-complete', entry);

      return { success: true, ...entry, path: localPath };
    } catch (err) {
      this.emit('install-error', { name: pluginName, error: err.message });
      return { success: false, error: err.message };
    }
  }

  // ─── INSTALL FROM NPM ───
  async _installFromNpm(pluginName, options = {}) {
    const npmName = pluginName.startsWith('opendesktop-') ? pluginName : `opendesktop-${pluginName}`;

    try {
      execSync(`npm pack ${npmName} --pack-destination "${this.cacheDir}" 2>/dev/null`, { timeout: 30000 });

      // Extract the tarball
      const tarball = path.join(this.cacheDir, `${npmName}-*.tgz`);
      const files = fs.readdirSync(this.cacheDir).filter(f => f.startsWith(npmName.replace('opendesktop-', '')) && f.endsWith('.tgz'));

      if (files.length) {
        const localPath = path.join(this.installedDir, pluginName);
        if (!fs.existsSync(localPath)) fs.mkdirSync(localPath, { recursive: true });
        execSync(`tar -xzf "${path.join(this.cacheDir, files[0])}" -C "${localPath}" --strip-components=1`, { timeout: 10000 });

        // Cleanup
        try { fs.unlinkSync(path.join(this.cacheDir, files[0])); } catch {}

        const entry = {
          name: pluginName,
          version: 'latest',
          source: 'npm',
          installedAt: new Date().toISOString()
        };
        this.installHistory.push(entry);
        this._saveHistory();

        return { success: true, ...entry, path: localPath };
      }
    } catch {}

    return { error: `Could not find plugin ${pluginName} in registry or npm` };
  }

  // ─── UNINSTALL PLUGIN ───
  async uninstall(pluginName) {
    const localPath = path.join(this.installedDir, pluginName);
    if (!fs.existsSync(localPath)) return { error: `Plugin ${pluginName} not found` };

    try {
      // Remove plugin directory
      fs.rmSync(localPath, { recursive: true });

      // Update history
      const entry = this.installHistory.find(h => h.name === pluginName);
      if (entry) entry.uninstalledAt = new Date().toISOString();
      this._saveHistory();

      this.emit('uninstall', { name: pluginName });
      return { success: true, name: pluginName };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ─── UPDATE PLUGIN ───
  async update(pluginName) {
    const localPath = path.join(this.installedDir, pluginName);
    if (!fs.existsSync(localPath)) return { error: `Plugin ${pluginName} not installed` };

    try {
      // Get current version
      const manifestPath = path.join(localPath, 'plugin.json');
      const currentVersion = fs.existsSync(manifestPath)
        ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')).version
        : '0.0.0';

      // Check for updates
      let latestVersion;
      try {
        const details = await this._fetchRegistry(`/plugins/${pluginName}/latest`);
        latestVersion = details.version;
      } catch {
        return { error: 'Could not check for updates — registry unavailable' };
      }

      if (latestVersion === currentVersion) {
        return { upToDate: true, name: pluginName, version: currentVersion };
      }

      // Reinstall
      const result = await this.install(pluginName, { force: true });
      if (result.success) {
        return { updated: true, name: pluginName, from: currentVersion, to: latestVersion };
      }
      return result;
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ─── PUBLISH PLUGIN ───
  async publish(pluginName, options = {}) {
    const localPath = path.join(this.installedDir, pluginName);
    if (!fs.existsSync(localPath)) return { error: `Plugin ${pluginName} not found locally` };

    const manifestPath = path.join(localPath, 'plugin.json');
    if (!fs.existsSync(manifestPath)) return { error: 'No plugin.json found' };

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    try {
      // Collect plugin files
      const files = {};
      const walk = (dir, prefix = '') => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const fullPath = path.join(dir, entry.name);
          const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
          if (entry.isDirectory()) {
            walk(fullPath, relPath);
          } else if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
            files[relPath] = fs.readFileSync(fullPath, 'utf8');
          }
        }
      };
      walk(localPath);

      // Upload to registry
      try {
        await this._postRegistry(`/plugins`, {
          manifest,
          files,
          author: options.author || os.userInfo().username
        });
      } catch {
        return { error: 'Registry unavailable. Cannot publish.', suggestion: 'Set up your own registry or share the plugin directory.' };
      }

      return { published: true, name: pluginName, version: manifest.version };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ─── RATE PLUGIN ───
  async rate(pluginName, rating, review = '') {
    if (rating < 1 || rating > 5) return { error: 'Rating must be between 1 and 5' };

    try {
      await this._postRegistry(`/plugins/${pluginName}/rate`, { rating, review });
      return { rated: true, name: pluginName, rating };
    } catch {
      return { error: 'Registry unavailable. Cannot submit rating.' };
    }
  }

  // ─── LIST INSTALLED ───
  listInstalled() {
    const installed = [];
    try {
      const entries = fs.readdirSync(this.installedDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const manifestPath = path.join(this.installedDir, entry.name, 'plugin.json');
          if (fs.existsSync(manifestPath)) {
            try {
              const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
              installed.push({
                name: manifest.name || entry.name,
                version: manifest.version || '1.0.0',
                description: manifest.description || '',
                author: manifest.author || 'Unknown',
                enabled: true
              });
            } catch {
              installed.push({ name: entry.name, version: 'unknown', incomplete: true });
            }
          }
        }
      }
    } catch {}
    return installed;
  }

  // ─── CHECK FOR UPDATES ───
  async checkUpdates() {
    const installed = this.listInstalled();
    const updates = [];

    for (const plugin of installed) {
      try {
        const latest = await this._fetchRegistry(`/plugins/${plugin.name}/latest`);
        if (latest.version !== plugin.version) {
          updates.push({
            name: plugin.name,
            current: plugin.version,
            latest: latest.version,
            changelog: latest.changelog || ''
          });
        }
      } catch {}
    }

    return { updates, total: updates.length };
  }

  // ─── GET CATEGORIES ───
  async getCategories() {
    try {
      return await this._fetchRegistry('/categories');
    } catch {
      return ['automation', 'productivity', 'development', 'media', 'communication', 'security', 'iot', 'data', 'ai', 'utility'];
    }
  }

  // ─── FETCH FROM REGISTRY ───
  async _fetchRegistry(endpoint) {
    const cacheKey = `registry:${endpoint}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < this.cacheTTL) return cached.data;

    return new Promise((resolve, reject) => {
      const url = `${this.registryUrl}${endpoint}`;
      const parsed = new URL(url);
      const lib = parsed.protocol === 'https:' ? https : http;

      const req = lib.get(url, { timeout: 10000, headers: { 'User-Agent': 'OpenDesktop' } }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            this.cache.set(cacheKey, { data: json, ts: Date.now() });
            resolve(json);
          } catch {
            reject(new Error('Invalid JSON response'));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    });
  }

  async _postRegistry(endpoint, body) {
    return new Promise((resolve, reject) => {
      const url = `${this.registryUrl}${endpoint}`;
      const parsed = new URL(url);
      const lib = parsed.protocol === 'https:' ? https : http;
      const data = JSON.stringify(body);

      const req = lib.request({
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          'User-Agent': 'OpenDesktop'
        },
        timeout: 15000
      }, (res) => {
        let responseData = '';
        res.on('data', chunk => responseData += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(responseData)); } catch { resolve({ raw: responseData }); }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
      req.write(data);
      req.end();
    });
  }

  // ─── INSTALL DEPENDENCIES ───
  async _installDependencies(pluginDir, dependencies) {
    const pkgPath = path.join(pluginDir, 'package.json');
    if (!fs.existsSync(pkgPath)) {
      fs.writeFileSync(pkgPath, JSON.stringify({ dependencies }, null, 2));
    }
    try {
      execSync(`cd "${pluginDir}" && npm install --production 2>/dev/null`, { timeout: 60000 });
    } catch {}
  }

  // ─── BUILT-IN SUGGESTIONS ───
  _getBuiltinSuggestions(search) {
    const suggestions = [
      { name: 'web-automation', description: 'Advanced web scraping and form filling', category: 'automation', builtin: true },
      { name: 'email-reader', description: 'Read and process emails from IMAP', category: 'communication', builtin: true },
      { name: 'file-organizer', description: 'Auto-organize files by type/date/content', category: 'utility', builtin: true },
      { name: 'code-formatter', description: 'Format and lint code in multiple languages', category: 'development', builtin: true },
      { name: 'screenshot-ocr', description: 'Extract text from screenshots using OCR', category: 'productivity', builtin: true },
      { name: 'music-controller', description: 'Control music playback on your system', category: 'media', builtin: true },
      { name: 'password-manager', description: 'Secure password storage and generation', category: 'security', builtin: true },
      { name: 'weather-dashboard', description: 'Weather forecasts with visual display', category: 'utility', builtin: true },
      { name: 'task-tracker', description: 'Track and manage personal tasks', category: 'productivity', builtin: true },
      { name: 'api-monitor', description: 'Monitor API endpoints for uptime', category: 'development', builtin: true }
    ];

    if (search) {
      const q = search.toLowerCase();
      return suggestions.filter(s => s.name.includes(q) || s.description.toLowerCase().includes(q));
    }
    return suggestions;
  }

  // ─── HISTORY ───
  _loadHistory() {
    try {
      const file = path.join(this.cacheDir, 'install-history.json');
      if (fs.existsSync(file)) this.installHistory = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {}
  }

  _saveHistory() {
    try {
      fs.writeFileSync(path.join(this.cacheDir, 'install-history.json'), JSON.stringify(this.installHistory.slice(-200), null, 2));
    } catch {}
  }

  // ─── STATUS ───
  getStatus() {
    return {
      installedPlugins: this.listInstalled().length,
      totalInstalls: this.installHistory.length,
      registryUrl: this.registryUrl,
      cacheSize: this.cache.size
    };
  }
}

module.exports = PluginMarketplace;
