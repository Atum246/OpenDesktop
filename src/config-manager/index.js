'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

// ═══════════════════════════════════════════════════════════════
//  CONFIG MANAGER — Export, Import & Share Configurations ⚙️📤
//  Profile management, config templates, environment switching
// ═══════════════════════════════════════════════════════════════

class ConfigManager {
  constructor(config) {
    this.config = config;
    this.dataDir = path.join(os.homedir(), '.opendesktop', 'profiles');
    if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
    this.templates = this._loadTemplates();
  }

  // ─── EXPORT CONFIG ───
  exportConfig(options = {}) {
    const data = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      hostname: os.hostname(),
      platform: os.platform(),
      config: { ...this.config.data }
    };

    // Remove sensitive data unless explicitly included
    if (!options.includeSecrets) {
      if (data.config.provider?.apiKey) data.config.provider.apiKey = '***REDACTED***';
      if (data.config.messaging?.telegram?.token) data.config.messaging.telegram.token = '***REDACTED***';
      if (data.config.messaging?.discord?.token) data.config.messaging.discord.token = '***REDACTED***';
      // Redact all nested tokens/keys
      this._redactSecrets(data.config);
    }

    const outputPath = options.outputPath || path.join(os.homedir(), '.opendesktop', 'config-export.json');
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

    return { exported: true, path: outputPath, redacted: !options.includeSecrets };
  }

  // ─── IMPORT CONFIG ───
  importConfig(inputPath, options = {}) {
    if (!fs.existsSync(inputPath)) return { error: `File not found: ${inputPath}` };

    try {
      const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

      if (!data.config) return { error: 'Invalid config file — no config data found' };

      // Backup current config
      if (!options.noBackup) {
        const backupPath = path.join(os.homedir(), '.opendesktop', 'config-backup-pre-import.json');
        fs.writeFileSync(backupPath, JSON.stringify(this.config.data, null, 2));
      }

      // Merge configs
      if (options.merge) {
        this.config.data = this._deepMerge(this.config.data, data.config);
      } else {
        this.config.data = { ...this.config.data, ...data.config };
      }

      this.config.save();

      return {
        imported: true,
        source: data.hostname || 'unknown',
        exportedAt: data.exportedAt,
        merged: options.merge || false
      };
    } catch (err) {
      return { error: `Import failed: ${err.message}` };
    }
  }

  // ─── SAVE PROFILE ───
  saveProfile(name, options = {}) {
    const profilePath = path.join(this.dataDir, `${name}.json`);

    const profile = {
      name,
      description: options.description || '',
      created: new Date().toISOString(),
      config: { ...this.config.data }
    };

    // Remove secrets if requested
    if (!options.includeSecrets) {
      this._redactSecrets(profile.config);
    }

    fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2));
    return { saved: true, name, path: profilePath };
  }

  // ─── LOAD PROFILE ───
  loadProfile(name) {
    const profilePath = path.join(this.dataDir, `${name}.json`);
    if (!fs.existsSync(profilePath)) return { error: `Profile ${name} not found` };

    try {
      const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));

      // Backup current
      const backupPath = path.join(this.dataDir, `_${Date.now()}_backup.json`);
      fs.writeFileSync(backupPath, JSON.stringify(this.config.data, null, 2));

      this.config.data = { ...this.config.data, ...profile.config };
      this.config.save();

      return { loaded: true, name, profileCreated: profile.created };
    } catch (err) {
      return { error: `Load failed: ${err.message}` };
    }
  }

  // ─── LIST PROFILES ───
  listProfiles() {
    try {
      return fs.readdirSync(this.dataDir)
        .filter(f => f.endsWith('.json') && !f.startsWith('_'))
        .map(f => {
          try {
            const data = JSON.parse(fs.readFileSync(path.join(this.dataDir, f), 'utf8'));
            return {
              name: data.name || f.replace('.json', ''),
              description: data.description || '',
              created: data.created
            };
          } catch {
            return { name: f.replace('.json', ''), incomplete: true };
          }
        });
    } catch {
      return [];
    }
  }

  // ─── DELETE PROFILE ───
  deleteProfile(name) {
    const profilePath = path.join(this.dataDir, `${name}.json`);
    if (!fs.existsSync(profilePath)) return { error: `Profile ${name} not found` };

    fs.unlinkSync(profilePath);
    return { deleted: true, name };
  }

  // ─── APPLY TEMPLATE ───
  applyTemplate(templateName) {
    const template = this.templates[templateName];
    if (!template) return { error: `Template ${templateName} not found. Available: ${Object.keys(this.templates).join(', ')}` };

    // Backup current
    const backupPath = path.join(this.dataDir, `_${Date.now()}_pre-template.json`);
    fs.writeFileSync(backupPath, JSON.stringify(this.config.data, null, 2));

    // Apply template values
    for (const [key, value] of Object.entries(template.values)) {
      this.config.set(key, value);
    }

    return { applied: true, template: templateName, description: template.description };
  }

  // ─── COMPARE CONFIGS ───
  compareProfiles(name1, name2) {
    const p1Path = path.join(this.dataDir, `${name1}.json`);
    const p2Path = path.join(this.dataDir, `${name2}.json`);

    if (!fs.existsSync(p1Path)) return { error: `Profile ${name1} not found` };
    if (!fs.existsSync(p2Path)) return { error: `Profile ${name2} not found` };

    const p1 = JSON.parse(fs.readFileSync(p1Path, 'utf8'));
    const p2 = JSON.parse(fs.readFileSync(p2Path, 'utf8'));

    const diffs = this._diffObjects(p1.config, p2.config);

    return {
      profile1: name1,
      profile2: name2,
      differences: diffs,
      totalDiffs: diffs.length
    };
  }

  // ─── VALIDATE CONFIG ───
  validateConfig() {
    const issues = [];
    const cfg = this.config.data;

    // Check provider
    if (!cfg.provider?.name) issues.push({ severity: 'error', message: 'No AI provider configured' });
    if (!cfg.provider?.apiKey && !['ollama', 'lmstudio', 'vllm'].includes(cfg.provider?.name)) {
      issues.push({ severity: 'warning', message: 'No API key set for cloud provider' });
    }

    // Check model
    if (!cfg.provider?.model) issues.push({ severity: 'warning', message: 'No default model set' });

    // Check features
    if (cfg.features?.vision && !cfg.provider?.model?.includes('gpt-4') && !cfg.provider?.model?.includes('claude-3') && !cfg.provider?.model?.includes('gemini')) {
      issues.push({ severity: 'info', message: 'Vision enabled but model may not support it' });
    }

    // Check hotkey conflicts
    if (cfg.hotkey?.enabled && cfg.hotkey?.key === 'alt+space') {
      issues.push({ severity: 'warning', message: 'Alt+Space may conflict with system shortcuts' });
    }

    return {
      valid: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      totalIssues: issues.length
    };
  }

  // ─── GENERATE SHAREABLE CONFIG ───
  generateShareable(options = {}) {
    const cfg = { ...this.config.data };
    this._redactSecrets(cfg);

    // Add shareable metadata
    const shareable = {
      opendesktop_config: true,
      version: '1.0.0',
      shared_at: new Date().toISOString(),
      shared_by: options.author || 'Anonymous',
      description: options.description || 'OpenDesktop configuration',
      config: cfg,
      checksum: crypto.createHash('sha256').update(JSON.stringify(cfg)).digest('hex').slice(0, 16)
    };

    const outputPath = options.outputPath || path.join(os.homedir(), '.opendesktop', 'shareable-config.json');
    fs.writeFileSync(outputPath, JSON.stringify(shareable, null, 2));

    return { generated: true, path: outputPath, checksum: shareable.checksum };
  }

  // ─── RESET TO DEFAULTS ───
  resetToDefaults() {
    // Backup
    const backupPath = path.join(this.dataDir, `_${Date.now()}_pre-reset.json`);
    fs.writeFileSync(backupPath, JSON.stringify(this.config.data, null, 2));

    this.config.reset();
    return { reset: true, backup: backupPath };
  }

  // ─── HELPERS ───
  _redactSecrets(obj) {
    const secretKeys = ['apiKey', 'token', 'secret', 'password', 'key', 'authToken', 'accessToken', 'appToken', 'oauth', 'channelAccessToken'];
    for (const [key, value] of Object.entries(obj)) {
      if (secretKeys.includes(key) && typeof value === 'string') {
        obj[key] = '***REDACTED***';
      } else if (typeof value === 'object' && value !== null) {
        this._redactSecrets(value);
      }
    }
  }

  _deepMerge(target, source) {
    const result = { ...target };
    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this._deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }

  _diffObjects(obj1, obj2, prefix = '') {
    const diffs = [];
    const allKeys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})]);

    for (const key of allKeys) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const v1 = obj1?.[key];
      const v2 = obj2?.[key];

      if (typeof v1 === 'object' && typeof v2 === 'object' && v1 && v2) {
        diffs.push(...this._diffObjects(v1, v2, fullKey));
      } else if (JSON.stringify(v1) !== JSON.stringify(v2)) {
        diffs.push({ key: fullKey, profile1: v1, profile2: v2 });
      }
    }

    return diffs;
  }

  _loadTemplates() {
    return {
      'developer': {
        description: 'Optimized for software development',
        values: {
          'theme': 'hacker-red',
          'persona.active': 'hacker',
          'features.voice': false,
          'features.vision': true,
          'features.automation': true,
          'features.selfImprove': true,
          'permissions.systemCommands': true
        }
      },
      'creative': {
        description: 'For creative work and content creation',
        values: {
          'theme': 'vaporwave',
          'persona.active': 'creative',
          'features.voice': true,
          'features.vision': true,
          'features.socialMedia': true,
          'features.selfImprove': false
        }
      },
      'business': {
        description: 'Professional business environment',
        values: {
          'theme': 'minimal',
          'persona.active': 'professional',
          'features.voice': false,
          'features.vision': false,
          'features.automation': true,
          'features.security': true
        }
      },
      'privacy': {
        description: 'Maximum privacy — local models only',
        values: {
          'provider.name': 'ollama',
          'provider.endpoint': 'http://localhost:11434',
          'provider.model': 'llama3.1',
          'features.security': true,
          'hotkey.enabled': false,
          'messaging.enabled': false
        }
      },
      'power-user': {
        description: 'Everything enabled — full power',
        values: {
          'theme': 'cyberpunk',
          'persona.active': 'hacker',
          'features.voice': true,
          'features.vision': true,
          'features.memory': true,
          'features.automation': true,
          'features.browser': true,
          'features.webSearch': true,
          'features.iot': true,
          'features.security': true,
          'features.socialMedia': true,
          'features.selfImprove': true,
          'permissions.systemCommands': true,
          'permissions.screenControl': true,
          'permissions.fileSystem': true,
          'permissions.network': true
        }
      }
    };
  }

  // ─── STATUS ───
  getStatus() {
    return {
      profiles: this.listProfiles().length,
      templates: Object.keys(this.templates).length,
      currentProvider: this.config.get('provider.name'),
      currentModel: this.config.get('provider.model'),
      currentTheme: this.config.get('theme')
    };
  }
}

module.exports = ConfigManager;
