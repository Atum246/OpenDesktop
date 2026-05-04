#!/usr/bin/env node
'use strict';

const chalk = require('chalk');
const boxen = require('boxen');
const gradient = require('gradient-string');
const Table = require('cli-table3');
const inquirer = require('inquirer');
const ora = require('ora');
const path = require('path');
const os = require('os');
const fs = require('fs');

const Config = require('../core/config.js');
const ProviderRegistry = require('../providers/index.js');
const MemorySystem = require('../memory/index.js');
const AutomationEngine = require('../automation/index.js');
const VisionSystem = require('../vision/index.js');
const PluginManager = require('../plugins/index.js');
const MessagingHub = require('../messaging/index.js');
const VoiceSystem = require('../voice/index.js');
const CodeExecutor = require('../code-executor/index.js');
const Deployer = require('../deployer/index.js');
const LearningSystem = require('../learning/index.js');
const SkillCreator = require('../skill-creator/index.js');
const WorkflowBuilder = require('../workflows/index.js');
const PersonaSystem = require('../persona/index.js');
const SettingsPage = require('../settings/index.js');

// ═══════════════════════════════════════════════════════════════
//  OPENDESKTOP GUI — Rich Hybrid Interface 🖥️✨
// ═══════════════════════════════════════════════════════════════

class OpenDesktopGUI {
  constructor() {
    this.config = new Config();
    this.provider = new ProviderRegistry(this.config);
    this.memory = new MemorySystem(this.config);
    this.automation = new AutomationEngine(this.config);
    this.vision = new VisionSystem(this.config, this.provider);
    this.plugins = new PluginManager(this.config, this);
    this.messaging = new MessagingHub(this.config, this);
    this.voice = new VoiceSystem(this.config, this);
    this.codeExecutor = new CodeExecutor(this.config);
    this.deployer = new Deployer(this.config);
    this.learning = new LearningSystem(this.config, this.memory);
    this.skillCreator = new SkillCreator(this.config);
    this.workflows = new WorkflowBuilder(this.config, this.automation, this.provider);
    this.persona = new PersonaSystem(this.config, this.memory);
    this.settings = new SettingsPage(this.config, this);
    this.chatHistory = [];
    this.currentView = 'chat';
    this.taskLog = [];
    this.isProcessing = false;
  }

  clearScreen() { process.stdout.write('\x1B[2J\x1B[0f'); }

  getThemeColors() {
    const theme = this.config.get('theme', 'hacker-red');
    const themes = {
      'hacker-red': { primary: '#FF0000', secondary: '#8B0000', accent: '#708090' },
      'matrix': { primary: '#00FF00', secondary: '#003300', accent: '#008F00' },
      'cyberpunk': { primary: '#00FFFF', secondary: '#FF00FF', accent: '#FFFF00' },
      'minimal': { primary: '#FFFFFF', secondary: '#CCCCCC', accent: '#888888' },
      'vaporwave': { primary: '#FF71CE', secondary: '#01CDFE', accent: '#B967FF' }
    };
    return themes[theme] || themes['hacker-red'];
  }

  renderLogo() {
    const t = this.getThemeColors();
    const ascii = `
  ╔═══════════════════════════════════════════════════════════════╗
  ║                                                               ║
  ║    ██████╗ ██████╗ ███████╗███╗   ██╗██████╗ ███████╗███████╗║
  ║   ██╔═══██╗██╔══██╗██╔════╝████╗  ██║██╔══██╗██╔════╝██╔════╝║
  ║   ██║   ██║██████╔╝█████╗  ██╔██╗ ██║██║  ██║█████╗  ███████╗║
  ║   ██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║██║  ██║██╔══╝  ╚════██║║
  ║   ╚██████╔╝██║     ███████╗██║ ╚████║██████╔╝███████╗███████║║
  ║    ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝╚═════╝ ╚══════╝╚══════╝║
  ║                                                               ║
  ╚═══════════════════════════════════════════════════════════════╝`;
    console.log(chalk.hex(t.primary)(ascii));
  }

  renderSidebar() {
    const t = this.getThemeColors();
    const items = [
      { icon: '💬', label: 'Chat', key: 'chat' },
      { icon: '📋', label: 'Tasks', key: 'tasks' },
      { icon: '🧠', label: 'Memory', key: 'memory' },
      { icon: '👁️', label: 'Vision', key: 'vision' },
      { icon: '🖥️', label: 'System', key: 'system' },
      { icon: '💻', label: 'Code', key: 'code' },
      { icon: '🚀', label: 'Deploy', key: 'deploy' },
      { icon: '🧩', label: 'Skills', key: 'skills' },
      { icon: '📋', label: 'Workflows', key: 'workflows' },
      { icon: '🎭', label: 'Persona', key: 'persona' },
      { icon: '🎤', label: 'Voice', key: 'voice' },
      { icon: '💬', label: 'Messaging', key: 'messaging' },
      { icon: '⚙️', label: 'Settings', key: 'settings' }
    ];

    return boxen(items.map(item => {
      const active = this.currentView === item.key;
      const prefix = active ? chalk.hex(t.primary)(' ▶ ') : chalk.hex(t.accent)('   ');
      const label = active ? chalk.white.bold(`${item.icon} ${item.label}`) : chalk.hex(t.accent)(`${item.icon} ${item.label}`);
      return prefix + label;
    }).join('\n'), {
      padding: { top: 0, bottom: 0, left: 1, right: 2 },
      borderStyle: 'single', borderColor: 'red', title: chalk.hex(t.primary)('⚡ NAV'), width: 22
    });
  }

  renderHeader() {
    const t = this.getThemeColors();
    const title = gradient([t.primary, t.secondary])('  ◈ OPENDESKTOP ◈');
    const info = chalk.hex(t.accent)(` │ ${os.hostname()} │ ${os.platform()} │ ${this.provider.providerName} │ ${this.provider.model}`);
    const line = chalk.hex(t.primary)('─'.repeat(process.stdout.columns || 80));
    console.log(line + '\n' + title + info + '\n' + line);
  }

  renderStatusBar() {
    const t = this.getThemeColors();
    const stats = this.memory.getStats();
    return chalk.hex(t.primary)('─'.repeat(process.stdout.columns || 80)) + '\n' +
      chalk.hex('#00FFFF')(`🧠 Memory: ${stats.episodicCount} events`) + chalk.hex(t.accent)(' │ ') +
      chalk.hex('#00FF40')(`✅ Tasks: ${stats.taskCount}`) + chalk.hex(t.accent)(' │ ') +
      chalk.hex('#FFD700')(`🔌 ${this.provider.providerName}`) + chalk.hex(t.accent)(' │ ') +
      chalk.hex(t.accent)('Type /help for commands');
  }

  async showDashboard(view) {
    this.currentView = view;
    this.clearScreen();
    this.renderHeader();

    switch (view) {
      case 'chat': console.log(chalk.hex('#00FFFF')('  💬 Chat Mode — Type naturally or use /commands')); break;
      case 'tasks': await this._showTasks(); break;
      case 'memory': await this._showMemory(); break;
      case 'vision': await this._showVision(); break;
      case 'system': await this._showSystem(); break;
      case 'code': await this._showCode(); break;
      case 'deploy': await this._showDeploy(); break;
      case 'skills': await this._showSkills(); break;
      case 'workflows': await this._showWorkflows(); break;
      case 'persona': await this._showPersona(); break;
      case 'voice': await this._showVoice(); break;
      case 'messaging': await this._showMessaging(); break;
      case 'settings': await this.settings.show(); break;
    }
  }

  async _showTasks() {
    const tasks = this.automation.getHistory(20);
    const table = new Table({ head: [chalk.hex('#FF0000')('Time'), chalk.hex('#FF0000')('Type'), chalk.hex('#FF0000')('Action')], style: { border: ['red'] } });
    tasks.forEach(t => table.push([t.timestamp?.slice(11, 19) || '-', t.type || '-', (t.description || t.cmd || '-').slice(0, 50)]));
    console.log(table.toString());
  }

  async _showMemory() {
    const stats = this.memory.getStats();
    const table = new Table({ head: [chalk.hex('#FF0000')('Type'), chalk.hex('#FF0000')('Count'), chalk.hex('#FF0000')('Description')], style: { border: ['red'] } });
    table.push(['📖 Episodic', stats.episodicCount, 'Events & interactions'], ['🧠 Semantic', stats.semanticCount, 'Facts & knowledge'], ['✅ Tasks', stats.taskCount, 'Completed actions'], ['💬 Conversations', stats.conversationCount, 'Chat sessions'], ['📝 Facts', stats.factsCount, 'User facts']);
    console.log(table.toString());
  }

  async _showVision() {
    console.log(chalk.hex('#00FFFF')('  👁️ Vision System'));
    console.log(chalk.hex('#888888')('  /screen — Take screenshot & analyze'));
    console.log(chalk.hex('#888888')('  /vision <question> — Ask about screen'));
    console.log(chalk.hex('#888888')('  /watch — Start screen monitoring'));
  }

  async _showSystem() {
    const sys = await this.automation.getSystemInfo();
    console.log(boxen([
      chalk.hex('#FF0000')('🖥️ System Info'),
      chalk.hex('#00FFFF')('OS: ') + `${sys.os.distro} ${sys.os.release}`,
      chalk.hex('#00FFFF')('CPU: ') + `${sys.cpu.brand} (${sys.cpu.cores} cores)`,
      chalk.hex('#00FFFF')('RAM: ') + `${Math.round(sys.memory.used / 1073741824)}GB / ${Math.round(sys.memory.total / 1073741824)}GB`
    ].join('\n'), { padding: 1, borderStyle: 'round', borderColor: 'red' }));
  }

  async _showCode() {
    const langs = this.codeExecutor.getSupportedLanguages();
    console.log(chalk.hex('#00FFFF')('  💻 Code Executor — /code <language> <code>'));
    console.log(chalk.hex('#888888')('  Supported: ' + langs.slice(0, 15).map(l => l.name).join(', ') + '...'));
    console.log(chalk.hex('#888888')('  /project <name> <template> — Create project'));
  }

  async _showDeploy() {
    console.log(chalk.hex('#00FFFF')('  🚀 Deployer — /deploy <target> <path>'));
    console.log(chalk.hex('#888888')('  Targets: ' + this.deployer.getSupportedTargets().join(', ')));
  }

  async _showSkills() {
    const builtins = this.plugins.getBuiltInSkills();
    console.log(chalk.hex('#00FFFF')('  🧩 Skills & Plugins'));
    builtins.forEach(s => console.log(chalk.hex('#888888')(`    ${s.command} — ${s.description}`)));
    console.log(chalk.hex('#888888')('\n  /create-skill <description> — Create new skill'));
  }

  async _showWorkflows() {
    const wfs = this.workflows.listWorkflows();
    console.log(chalk.hex('#00FFFF')('  📋 Workflows'));
    if (!wfs.length) console.log(chalk.hex('#888888')('  No workflows yet. Use /workflow <description>'));
    else wfs.forEach(w => console.log(chalk.hex('#888888')(`    ${w.name} — ${w.steps} steps, ${w.runs} runs`)));
  }

  async _showPersona() {
    const presets = this.persona.getPresets();
    const active = this.persona.getActivePersona();
    console.log(chalk.hex('#00FFFF')('  🎭 Persona System'));
    console.log(chalk.hex('#FFD700')('  Active: ') + (active?.displayName || 'Default'));
    presets.forEach(p => console.log(chalk.hex('#888888')(`    ${p.displayName} — ${p.description}`)));
    console.log(chalk.hex('#888888')('\n  /persona <name> — Activate persona'));
  }

  async _showVoice() {
    const status = this.voice.getStatus();
    console.log(boxen([
      chalk.hex('#FF0000')('🎤 Voice System'),
      chalk.hex('#00FFFF')('Wake Word: ') + status.wakeWord,
      chalk.hex('#00FFFF')('Language: ') + status.language,
      chalk.hex('#00FFFF')('TTS: ') + (status.tts ? 'ON' : 'OFF'),
      chalk.hex('#00FFFF')('STT: ') + (status.stt ? 'ON' : 'OFF')
    ].join('\n'), { padding: 1, borderStyle: 'round', borderColor: 'red' }));
  }

  async _showMessaging() {
    const status = this.messaging.getStatus();
    console.log(chalk.hex('#00FFFF')('  💬 Messaging Integration'));
    console.log(chalk.hex('#888888')('  Active: ' + (status.active ? 'Yes' : 'No')));
    status.platforms.forEach(p => console.log(chalk.hex('#888888')(`    ${p.name}: ${p.active ? '✅' : '❌'}`)));
  }

  async start() {
    this.clearScreen();
    this.renderLogo();

    const activePersona = this.persona.getActivePersona();
    console.log(boxen(
      chalk.hex('#00FF40')('✅ OpenDesktop GUI Ready!\n\n') +
      chalk.hex('#00FFFF')('Provider: ') + this.provider.providerName + '\n' +
      chalk.hex('#00FFFF')('Model: ') + this.provider.model + '\n' +
      chalk.hex('#00FFFF')('Theme: ') + this.config.get('theme') + '\n' +
      chalk.hex('#00FFFF')('Persona: ') + (activePersona?.displayName || 'Default') + '\n\n' +
      chalk.hex('#888888')('Type naturally to chat, /help for commands, /settings for config'),
      { padding: 1, borderStyle: 'round', borderColor: 'red', title: '🤖 OpenDesktop', titleAlignment: 'center', float: 'center' }
    ));

    await this.plugins.loadAll();
    if (this.config.get('persona.active')) this.persona.activatePersona(this.config.get('persona.active'));

    while (true) {
      const personaName = activePersona?.displayName || '🤖';
      const { input } = await inquirer.prompt([{
        type: 'input', name: 'input',
        message: chalk.hex('#FF0000')('❯'),
        prefix: chalk.hex('#00FFFF')(`  ${personaName}`)
      }]);

      if (!input.trim()) continue;
      this.chatHistory.push({ role: 'user', content: input, timestamp: new Date().toISOString() });
      this.learning.trackCommand(input);

      if (input.startsWith('/')) {
        if (input.startsWith('/settings')) { await this.settings.show(); continue; }
        // Delegate to engine commands
        const Engine = require('../core/engine.js');
        const tempEngine = new Engine(this.config);
        Object.assign(tempEngine, {
          provider: this.provider, memory: this.memory, automation: this.automation,
          vision: this.vision, plugins: this.plugins, messaging: this.messaging,
          voice: this.voice, codeExecutor: this.codeExecutor, deployer: this.deployer,
          learning: this.learning, skillCreator: this.skillCreator, workflows: this.workflows,
          persona: this.persona, settings: this.settings
        });
        await tempEngine.handleCommand(input);
        continue;
      }

      this.isProcessing = true;
      const spinner = ora({ text: '🧠 Thinking...', spinner: 'dots', color: 'red' }).start();

      try {
        const personaPrompt = this.persona.getSystemPrompt();
        const systemPrompt = personaPrompt || `You are OpenDesktop, an advanced AI desktop agent on ${os.platform()} (${os.hostname()}). Be helpful, concise, proactive. Use emojis. Current time: ${new Date().toISOString()}`;

        const response = await this.provider.chat(input, { systemPrompt });
        spinner.stop();
        this.chatHistory.push({ role: 'assistant', content: response, timestamp: new Date().toISOString() });
        this.memory.addEvent({ type: 'chat', userMessage: input, assistantResponse: response });
        console.log('\n' + boxen(chalk.hex('#FF0000')('🤖 OpenDesktop: ') + chalk.white(response), { padding: { left: 1, right: 1, top: 0, bottom: 0 }, borderStyle: 'round', borderColor: 'red', dimBorder: true }) + '\n');
      } catch (err) {
        spinner.stop();
        console.log(chalk.hex('#FF0000')(`\n  ❌ Error: ${err.message}\n`));
      }
      this.isProcessing = false;
    }
  }
}

if (require.main === module) {
  const gui = new OpenDesktopGUI();
  gui.start().catch(err => { console.error(chalk.hex('#FF0000')('❌ Fatal:'), err.message); process.exit(1); });
}

module.exports = OpenDesktopGUI;
