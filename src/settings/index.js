'use strict';
const chalk = require('chalk');
const boxen = require('boxen');
const Table = require('cli-table3');
const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════
//  SETTINGS — Detailed Configuration Interface ⚙️🎛️
// ═══════════════════════════════════════════════════════════════

class SettingsPage {
  constructor(config, engine) {
    this.config = config;
    this.engine = engine;
  }

  async show() {
    console.clear();
    console.log(this._header('⚙️  OPENDESKTOP SETTINGS'));

    const { section } = await inquirer.prompt([{
      type: 'list',
      name: 'section',
      message: chalk.hex('#FFD700')('Select section:'),
      choices: [
        { name: '🤖 AI Model Configuration', value: 'models' },
        { name: '🔌 Provider Settings', value: 'providers' },
        { name: '💬 Messaging Platforms', value: 'messaging' },
        { name: '🎤 Voice Settings', value: 'voice' },
        { name: '👁️ Vision Settings', value: 'vision' },
        { name: '🧠 Memory Settings', value: 'memory' },
        { name: '🎨 Theme & Appearance', value: 'theme' },
        { name: '⌨️ Hotkey Settings', value: 'hotkey' },
        { name: '🔒 Permissions', value: 'permissions' },
        { name: '🎭 Persona Settings', value: 'persona' },
        { name: '🧩 Skills & Plugins', value: 'skills' },
        { name: '📋 Workflows', value: 'workflows' },
        { name: '📊 System Status', value: 'status' },
        { name: '🔧 Advanced', value: 'advanced' },
        { name: '⬅️ Back', value: 'back' }
      ]
    }]);

    switch (section) {
      case 'models': return this._modelsSettings();
      case 'providers': return this._providersSettings();
      case 'messaging': return this._messagingSettings();
      case 'voice': return this._voiceSettings();
      case 'vision': return this._visionSettings();
      case 'memory': return this._memorySettings();
      case 'theme': return this._themeSettings();
      case 'hotkey': return this._hotkeySettings();
      case 'permissions': return this._permissionsSettings();
      case 'persona': return this._personaSettings();
      case 'skills': return this._skillsSettings();
      case 'workflows': return this._workflowsSettings();
      case 'status': return this._statusPage();
      case 'advanced': return this._advancedSettings();
      case 'back': return;
    }
  }

  async _modelsSettings() {
    const provider = this.engine.getProvider();
    const currentModel = provider.model;
    const models = provider.listModels();

    console.log(this._header('🤖 AI Model Configuration'));

    const table = new Table({ head: [chalk.hex('#FF0000')('#'), chalk.hex('#FF0000')('Model'), chalk.hex('#FF0000')('Status')], style: { border: ['red'] } });
    models.forEach((m, i) => table.push([i + 1, m, m === currentModel ? chalk.hex('#00FF40')('✅ Active') : '']));

    console.log(table.toString());

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: chalk.hex('#FFD700')('Action:'),
      choices: [
        { name: 'Switch model', value: 'switch' },
        { name: 'Add custom model', value: 'custom' },
        { name: 'Model router settings', value: 'router' },
        { name: '⬅️ Back', value: 'back' }
      ]
    }]);

    if (action === 'switch') {
      const { model } = await inquirer.prompt([{ type: 'list', name: 'model', message: 'Select model:', choices: models }]);
      provider.switchModel(model);
      console.log(chalk.hex('#00FF40')(`✅ Switched to ${model}`));
    } else if (action === 'custom') {
      const { customModel } = await inquirer.prompt([{ type: 'input', name: 'customModel', message: 'Custom model name:' }]);
      provider.switchModel(customModel);
      console.log(chalk.hex('#00FF40')(`✅ Set custom model: ${customModel}`));
    }
  }

  async _providersSettings() {
    console.log(this._header('🔌 Provider Settings'));
    const providers = this.engine.getProvider().listProviders();
    const current = this.config.get('provider.name');

    const table = new Table({ head: [chalk.hex('#FF0000')('Provider'), chalk.hex('#FF0000')('Models'), chalk.hex('#FF0000')('Status')], style: { border: ['red'] } });
    providers.forEach(p => table.push([p.name, p.models.length, p.id === current ? chalk.hex('#00FF40')('✅ Active') : '']));
    console.log(table.toString());

    const { action } = await inquirer.prompt([{
      type: 'list', name: 'action', message: 'Action:',
      choices: [
        { name: 'Switch provider', value: 'switch' },
        { name: 'Update API key', value: 'key' },
        { name: 'Set custom endpoint', value: 'endpoint' },
        { name: '⬅️ Back', value: 'back' }
      ]
    }]);

    if (action === 'switch') {
      const { provider } = await inquirer.prompt([{ type: 'list', name: 'provider', message: 'Select provider:', choices: providers.map(p => ({ name: `${p.name} (${p.models.length} models)`, value: p.id })) }]);
      const { apiKey } = await inquirer.prompt([{ type: 'password', name: 'apiKey', message: 'API Key:' }]);
      this.engine.getProvider().switchProvider(provider, apiKey);
      console.log(chalk.hex('#00FF40')(`✅ Switched to ${provider}`));
    } else if (action === 'key') {
      const { apiKey } = await inquirer.prompt([{ type: 'password', name: 'apiKey', message: 'New API Key:' }]);
      this.config.set('provider.apiKey', apiKey);
      console.log(chalk.hex('#00FF40')('✅ API key updated'));
    } else if (action === 'endpoint') {
      const { endpoint } = await inquirer.prompt([{ type: 'input', name: 'endpoint', message: 'Custom endpoint URL:' }]);
      this.config.set('provider.endpoint', endpoint);
      console.log(chalk.hex('#00FF40')(`✅ Endpoint set: ${endpoint}`));
    }
  }

  async _messagingSettings() {
    console.log(this._header('💬 Messaging Platforms'));
    const current = this.config.get('messaging', {});

    const platforms = ['telegram', 'discord', 'whatsapp', 'slack', 'imessage', 'signal'];
    const table = new Table({ head: [chalk.hex('#FF0000')('Platform'), chalk.hex('#FF0000')('Status'), chalk.hex('#FF0000')('Config')], style: { border: ['red'] } });
    platforms.forEach(p => {
      const enabled = current.platforms?.includes(p);
      table.push([p, enabled ? chalk.hex('#00FF40')('✅ Enabled') : chalk.hex('#888888')('❌ Disabled'), enabled ? 'Configured' : 'Not set']);
    });
    console.log(table.toString());

    const { action } = await inquirer.prompt([{
      type: 'list', name: 'action', message: 'Action:',
      choices: [
        { name: 'Enable/disable platforms', value: 'toggle' },
        { name: 'Configure platform tokens', value: 'tokens' },
        { name: '⬅️ Back', value: 'back' }
      ]
    }]);

    if (action === 'toggle') {
      const { platforms: selected } = await inquirer.prompt([{
        type: 'checkbox', name: 'platforms', message: 'Select platforms to enable:',
        choices: platforms.map(p => ({ name: p, checked: current.platforms?.includes(p) }))
      }]);
      this.config.set('messaging.platforms', selected);
      this.config.set('messaging.enabled', selected.length > 0);
      console.log(chalk.hex('#00FF40')(`✅ Platforms updated: ${selected.join(', ') || 'none'}`));
    } else if (action === 'tokens') {
      const { platform } = await inquirer.prompt([{ type: 'list', name: 'platform', message: 'Platform:', choices: platforms }]);
      const { token } = await inquirer.prompt([{ type: 'password', name: 'token', message: `${platform} token/key:` }]);
      this.config.set(`messaging.${platform}.token`, token);
      console.log(chalk.hex('#00FF40')(`✅ ${platform} token saved`));
    }
  }

  async _voiceSettings() {
    console.log(this._header('🎤 Voice Settings'));
    const voice = this.config.get('voice', {});

    console.log(boxen([
      chalk.hex('#00FFFF')('Wake Word: ') + (voice.wakeWord || 'hey desktop'),
      chalk.hex('#00FFFF')('Language: ') + (voice.language || 'en-US'),
      chalk.hex('#00FFFF')('Voice: ') + (voice.voice || 'default'),
      chalk.hex('#00FFFF')('TTS: ') + (voice.tts !== false ? 'ON' : 'OFF'),
      chalk.hex('#00FFFF')('STT: ') + (voice.stt !== false ? 'ON' : 'OFF')
    ].join('\n'), { padding: 1, borderStyle: 'round', borderColor: 'red' }));

    const { action } = await inquirer.prompt([{
      type: 'list', name: 'action', message: 'Action:',
      choices: [
        { name: 'Change wake word', value: 'wake' },
        { name: 'Change language', value: 'lang' },
        { name: 'Toggle TTS', value: 'tts' },
        { name: 'Toggle STT', value: 'stt' },
        { name: '⬅️ Back', value: 'back' }
      ]
    }]);

    if (action === 'wake') {
      const { wakeWord } = await inquirer.prompt([{ type: 'input', name: 'wakeWord', message: 'New wake word:', default: 'hey desktop' }]);
      this.config.set('voice.wakeWord', wakeWord);
      console.log(chalk.hex('#00FF40')(`✅ Wake word: "${wakeWord}"`));
    } else if (action === 'lang') {
      const { language } = await inquirer.prompt([{ type: 'list', name: 'language', message: 'Language:', choices: ['en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'pt-BR', 'zh-CN', 'ja-JP', 'ko-KR', 'ru-RU', 'ar-SA'] }]);
      this.config.set('voice.language', language);
      console.log(chalk.hex('#00FF40')(`✅ Language: ${language}`));
    }
  }

  async _visionSettings() {
    console.log(this._header('👁️ Vision Settings'));
    console.log(boxen([
      chalk.hex('#00FFFF')('Auto-screenshot: ') + (this.config.get('vision.autoScreenshot') ? 'ON' : 'OFF'),
      chalk.hex('#00FFFF')('OCR: ') + (this.config.get('vision.ocr', true) ? 'ON' : 'OFF'),
      chalk.hex('#00FFFF')('Screen watch interval: ') + (this.config.get('vision.watchInterval', 5000) + 'ms'),
      chalk.hex('#00FFFF')('Multi-monitor: ') + (this.config.get('vision.multiMonitor') ? 'ON' : 'OFF')
    ].join('\n'), { padding: 1, borderStyle: 'round', borderColor: 'red' }));

    const { action } = await inquirer.prompt([{
      type: 'list', name: 'action', message: 'Action:',
      choices: [
        { name: 'Toggle auto-screenshot', value: 'auto' },
        { name: 'Set watch interval', value: 'interval' },
        { name: '⬅️ Back', value: 'back' }
      ]
    }]);

    if (action === 'auto') {
      const current = this.config.get('vision.autoScreenshot', false);
      this.config.set('vision.autoScreenshot', !current);
      console.log(chalk.hex('#00FF40')(`✅ Auto-screenshot: ${!current ? 'ON' : 'OFF'}`));
    } else if (action === 'interval') {
      const { interval } = await inquirer.prompt([{ type: 'number', name: 'interval', message: 'Watch interval (ms):', default: 5000 }]);
      this.config.set('vision.watchInterval', interval);
      console.log(chalk.hex('#00FF40')(`✅ Watch interval: ${interval}ms`));
    }
  }

  async _memorySettings() {
    console.log(this._header('🧠 Memory Settings'));
    const stats = this.engine.getMemory().getStats();

    console.log(boxen([
      chalk.hex('#00FFFF')('Episodic events: ') + stats.episodicCount,
      chalk.hex('#00FFFF')('Semantic entries: ') + stats.semanticCount,
      chalk.hex('#00FFFF')('Tasks: ') + stats.taskCount,
      chalk.hex('#00FFFF')('Conversations: ') + stats.conversationCount,
      chalk.hex('#00FFFF')('Facts: ') + stats.factsCount,
      '',
      chalk.hex('#00FFFF')('Auto-cleanup: ') + (this.config.get('memory.autoCleanup', true) ? 'ON' : 'OFF'),
      chalk.hex('#00FFFF')('Retention: ') + (this.config.get('memory.retentionDays', 365) + ' days')
    ].join('\n'), { padding: 1, borderStyle: 'round', borderColor: 'red' }));

    const { action } = await inquirer.prompt([{
      type: 'list', name: 'action', message: 'Action:',
      choices: [
        { name: 'Export memory', value: 'export' },
        { name: 'Import memory', value: 'import' },
        { name: 'Search memory', value: 'search' },
        { name: 'Clear old data', value: 'cleanup' },
        { name: '⬅️ Back', value: 'back' }
      ]
    }]);

    if (action === 'export') {
      const data = this.engine.getMemory().exportAll();
      const exportPath = path.join(require('os').homedir(), '.opendesktop', 'memory-export.json');
      fs.writeFileSync(exportPath, JSON.stringify(data, null, 2));
      console.log(chalk.hex('#00FF40')(`✅ Exported to ${exportPath}`));
    }
  }

  async _themeSettings() {
    console.log(this._header('🎨 Theme & Appearance'));
    const themes = [
      { name: '🔴 Hacker Red', value: 'hacker-red' },
      { name: '🟢 Matrix Green', value: 'matrix' },
      { name: '🔵 Cyberpunk Blue', value: 'cyberpunk' },
      { name: '⚪ Minimal Light', value: 'minimal' },
      { name: '🟣 Vaporwave', value: 'vaporwave' }
    ];
    const current = this.config.get('theme');
    themes.forEach(t => { if (t.value === current) t.name += ' ✅'; });

    const { theme } = await inquirer.prompt([{ type: 'list', name: 'theme', message: 'Select theme:', choices: themes }]);
    this.config.set('theme', theme);
    console.log(chalk.hex('#00FF40')(`✅ Theme: ${theme}`));
  }

  async _hotkeySettings() {
    console.log(this._header('⌨️ Hotkey Settings'));
    const hotkey = this.config.get('hotkey', {});

    console.log(boxen([
      chalk.hex('#00FFFF')('Enabled: ') + (hotkey.enabled ? 'YES ✅' : 'NO ❌'),
      chalk.hex('#00FFFF')('Hotkey: ') + (hotkey.key || 'ctrl+shift+space')
    ].join('\n'), { padding: 1, borderStyle: 'round', borderColor: 'red' }));

    const { action } = await inquirer.prompt([{
      type: 'list', name: 'action', message: 'Action:',
      choices: [
        { name: 'Toggle hotkey', value: 'toggle' },
        { name: 'Change hotkey', value: 'change' },
        { name: '⬅️ Back', value: 'back' }
      ]
    }]);

    if (action === 'toggle') {
      this.config.set('hotkey.enabled', !hotkey.enabled);
      console.log(chalk.hex('#00FF40')(`✅ Hotkey: ${!hotkey.enabled ? 'ON' : 'OFF'}`));
    } else if (action === 'change') {
      const { key } = await inquirer.prompt([{ type: 'list', name: 'key', message: 'Select hotkey:', choices: ['ctrl+shift+space', 'ctrl+alt+o', 'alt+space', 'ctrl+shift+o'] }]);
      this.config.set('hotkey.key', key);
      console.log(chalk.hex('#00FF40')(`✅ Hotkey: ${key}`));
    }
  }

  async _permissionsSettings() {
    console.log(this._header('🔒 Permissions'));
    const perms = this.config.get('permissions', {});
    const table = new Table({ head: [chalk.hex('#FF0000')('Permission'), chalk.hex('#FF0000')('Status')], style: { border: ['red'] } });
    Object.entries(perms).forEach(([k, v]) => table.push([k, v ? chalk.hex('#00FF40')('✅ Granted') : chalk.hex('#FF0000')('❌ Denied')]));
    console.log(table.toString());

    const { action } = await inquirer.prompt([{
      type: 'list', name: 'action', message: 'Action:',
      choices: [
        { name: 'Toggle permission', value: 'toggle' },
        { name: '⬅️ Back', value: 'back' }
      ]
    }]);

    if (action === 'toggle') {
      const { perm } = await inquirer.prompt([{ type: 'list', name: 'perm', message: 'Permission:', choices: Object.keys(perms) }]);
      this.config.set(`permissions.${perm}`, !perms[perm]);
      console.log(chalk.hex('#00FF40')(`✅ ${perm}: ${!perms[perm] ? 'ON' : 'OFF'}`));
    }
  }

  async _personaSettings() {
    console.log(this._header('🎭 Persona Settings'));
    const persona = this.engine.persona;
    if (!persona) { console.log(chalk.hex('#888888')('Persona system not available')); return; }

    const personas = persona.listPersonas();
    const presets = persona.getPresets();
    const active = persona.getActivePersona();

    console.log(boxen([
      chalk.hex('#00FFFF')('Active persona: ') + (active?.displayName || 'Default (no persona)'),
      chalk.hex('#00FFFF')('Custom personas: ') + personas.length,
      chalk.hex('#00FFFF')('Available presets: ') + presets.length
    ].join('\n'), { padding: 1, borderStyle: 'round', borderColor: 'red' }));

    const { action } = await inquirer.prompt([{
      type: 'list', name: 'action', message: 'Action:',
      choices: [
        { name: 'Activate preset persona', value: 'preset' },
        { name: 'Create custom persona', value: 'create' },
        { name: 'Deactivate persona', value: 'deactivate' },
        { name: '⬅️ Back', value: 'back' }
      ]
    }]);

    if (action === 'preset') {
      const { preset } = await inquirer.prompt([{ type: 'list', name: 'preset', message: 'Select preset:', choices: presets.map(p => ({ name: `${p.displayName} — ${p.description}`, value: p.name })) }]);
      await persona.createPersona(preset, presets.find(p => p.name === preset));
      persona.activatePersona(preset);
      console.log(chalk.hex('#00FF40')(`✅ Activated: ${preset}`));
    } else if (action === 'deactivate') {
      persona.deactivatePersona();
      console.log(chalk.hex('#00FF40')('✅ Persona deactivated'));
    }
  }

  async _skillsSettings() {
    console.log(this._header('🧩 Skills & Plugins'));
    try {
      const skills = this.engine.plugins?.list() || [];
      const builtins = this.engine.plugins?.getBuiltInSkills() || [];

      console.log(chalk.hex('#FF0000')('\n  Built-in Skills:'));
      builtins.forEach(s => console.log(chalk.hex('#00FFFF')(`    ${s.command}`) + chalk.hex('#888888')(` — ${s.description}`)));

      if (skills.length) {
        console.log(chalk.hex('#FF0000')('\n  Custom Skills:'));
        skills.forEach(s => console.log(chalk.hex('#00FFFF')(`    ${s.name}`) + chalk.hex('#888888')(` — ${s.description || 'No description'}`)));
      }
    } catch (err) {
      console.log(chalk.hex('#FF0000')(`  Error loading skills: ${err.message}`));
    }
  }

  async _workflowsSettings() {
    console.log(this._header('📋 Workflows'));
    const workflows = this.engine.workflows?.listWorkflows() || [];
    if (!workflows.length) { console.log(chalk.hex('#888888')('  No workflows created yet.')); return; }
    const table = new Table({ head: [chalk.hex('#FF0000')('Name'), chalk.hex('#FF0000')('Steps'), chalk.hex('#FF0000')('Runs'), chalk.hex('#FF0000')('Last Run')], style: { border: ['red'] } });
    workflows.forEach(w => table.push([w.name, w.steps, w.runs, w.lastRun || 'Never']));
    console.log(table.toString());
  }

  async _statusPage() {
    console.log(this._header('📊 System Status'));
    const mem = this.engine.getMemory().getStats();
    const sys = await this.engine.automation.getSystemInfo();

    console.log(boxen([
      chalk.hex('#FF0000')('═══ System ═══'),
      chalk.hex('#00FFFF')('OS: ') + `${sys.os.distro} ${sys.os.release}`,
      chalk.hex('#00FFFF')('CPU: ') + `${sys.cpu.brand} (${sys.cpu.cores} cores)`,
      chalk.hex('#00FFFF')('RAM: ') + `${Math.round(sys.memory.used / 1073741824)}GB / ${Math.round(sys.memory.total / 1073741824)}GB`,
      '',
      chalk.hex('#FF0000')('═══ Memory ═══'),
      chalk.hex('#00FFFF')('Episodic: ') + mem.episodicCount,
      chalk.hex('#00FFFF')('Semantic: ') + mem.semanticCount,
      chalk.hex('#00FFFF')('Tasks: ') + mem.taskCount,
      chalk.hex('#00FFFF')('Conversations: ') + mem.conversationCount,
      '',
      chalk.hex('#FF0000')('═══ Provider ═══'),
      chalk.hex('#00FFFF')('Provider: ') + this.config.get('provider.name'),
      chalk.hex('#00FFFF')('Model: ') + this.config.get('provider.model'),
      chalk.hex('#00FFFF')('Theme: ') + this.config.get('theme')
    ].join('\n'), { padding: 1, borderStyle: 'double', borderColor: 'red', title: '📊 Status', titleAlignment: 'center' }));
  }

  async _advancedSettings() {
    console.log(this._header('🔧 Advanced Settings'));
    const { action } = await inquirer.prompt([{
      type: 'list', name: 'action', message: 'Action:',
      choices: [
        { name: 'Reset all settings', value: 'reset' },
        { name: 'Clear all memory', value: 'clear-memory' },
        { name: 'View config file', value: 'view-config' },
        { name: 'Edit config JSON', value: 'edit-config' },
        { name: 'View logs', value: 'logs' },
        { name: '⬅️ Back', value: 'back' }
      ]
    }]);

    if (action === 'reset') {
      const { confirm } = await inquirer.prompt([{ type: 'confirm', name: 'confirm', message: 'Reset ALL settings to defaults?' }]);
      if (confirm) { this.config.reset(); console.log(chalk.hex('#00FF40')('✅ Settings reset')); }
    } else if (action === 'view-config') {
      console.log(JSON.stringify(this.config.data, null, 2));
    }
  }

  _header(title) {
    const line = chalk.hex('#FF0000')('═'.repeat(process.stdout.columns || 80));
    return `\n${line}\n  ${chalk.hex('#FF0000').bold(title)}\n${line}\n`;
  }
}

module.exports = SettingsPage;
