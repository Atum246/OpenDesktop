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
const SelfImprovementEngine = require('../self-improve/index.js');
const SubAgentSpawner = require('../sub-agents/index.js');
const SocialMediaAutomation = require('../social-media/index.js');
const DeepResearchSystem = require('../research/index.js');
const AdaptiveInterface = require('../adaptive/index.js');
const CodeRewriter = require('../code-rewriter/index.js');
const WebSearchEngine = require('../web-search/index.js');
const IoTController = require('../iot/index.js');
const SecurityModule = require('../security/index.js');
const ProgramInstaller = require('../program-installer/index.js');
const AgentOrchestrator = require('../orchestrator/index.js');
const ModelTrainer = require('../model-trainer/index.js');

// ═══════════════════════════════════════════════════════════════
//  OPENDESKTOP GUI — Hybrid Interface with Sliding Sidebar 🖥️✨
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
    this.selfImprove = new SelfImprovementEngine(this.config, this.memory, this.provider);
    this.subAgents = new SubAgentSpawner(this.config, this.provider, this.memory);
    this.socialMedia = new SocialMediaAutomation(this.config, this.provider, this.automation);
    this.research = new DeepResearchSystem(this.config, this.provider, this.memory);
    this.adaptive = new AdaptiveInterface(this.config, this.memory, this.learning);
    this.codeRewriter = new CodeRewriter(this.config, this.provider, this.memory);
    this.webSearch = new WebSearchEngine(this.config);
    this.iot = new IoTController(this.config);
    this.security = new SecurityModule(this.config);
    this.installer = new ProgramInstaller(this.config);
    this.orchestrator = new AgentOrchestrator(this.config, this.provider, this.memory);
    this.modelTrainer = new ModelTrainer(this.config, this.provider, this.memory);
    this.chatHistory = [];
    this.currentView = 'chat';
    this.isProcessing = false;
    this.notifications = [];
    this._engine = null;
  }

  clearScreen() { process.stdout.write('\x1B[2J\x1B[0f'); }

  getThemeColors() {
    const theme = this.config.get('theme', 'hacker-red');
    const themes = {
      'hacker-red': { primary: '#FF0000', secondary: '#8B0000', accent: '#708090', bg: '#0A0A0A', text: '#FFFFFF', highlight: '#FF4444' },
      'matrix': { primary: '#00FF00', secondary: '#003300', accent: '#008F00', bg: '#000000', text: '#00FF00', highlight: '#44FF44' },
      'cyberpunk': { primary: '#00FFFF', secondary: '#FF00FF', accent: '#FFFF00', bg: '#0A0014', text: '#FFFFFF', highlight: '#00FFFF' },
      'minimal': { primary: '#FFFFFF', secondary: '#CCCCCC', accent: '#888888', bg: '#FFFFFF', text: '#333333', highlight: '#000000' },
      'vaporwave': { primary: '#FF71CE', secondary: '#01CDFE', accent: '#B967FF', bg: '#1A0033', text: '#FF71CE', highlight: '#FF99DD' }
    };
    return themes[theme] || themes['hacker-red'];
  }

  // ─── RENDER HEADER ───
  renderHeader() {
    const t = this.getThemeColors();
    const termW = process.stdout.columns || 80;
    const aiName = this.config.get('ai.name', 'OpenDesktop');
    const userName = this.config.get('user.name', '');
    const persona = this.persona.getActivePersona();

    const line = chalk.hex(t.primary)('─'.repeat(termW));
    const title = gradient([t.primary, t.secondary])(`  ⚡ ${aiName} v1.0.0`);
    const info = chalk.hex(t.accent)(` │ ${os.hostname()} │ ${this.provider.providerName} │ ${this.provider.model}`);
    const userStr = userName ? chalk.hex(t.highlight)(` │ 👤 ${userName}`) : '';
    const personaStr = persona ? chalk.hex(t.highlight)((` │ 🎭 ${persona.displayName}`)) : '';

    console.log(line);
    console.log(title + info + userStr + personaStr);
    console.log(line);
  }

  // ─── RENDER SIDEBAR ───
  renderSidebar() {
    const t = this.getThemeColors();
    const pages = [
      { icon: '💬', label: 'Chat', key: 'chat' },
      { icon: '🔍', label: 'Search', key: 'search' },
      { icon: '🖥️', label: 'System', key: 'system' },
      { icon: '💻', label: 'Code', key: 'code' },
      { icon: '🧠', label: 'Memory', key: 'memory' },
      { icon: '👁️', label: 'Vision', key: 'vision' },
      { icon: '🤖', label: 'Agents', key: 'agents' },
      { icon: '🏠', label: 'IoT', key: 'iot' },
      { icon: '🔒', label: 'Security', key: 'security' },
      { icon: '📦', label: 'Install', key: 'install' },
      { icon: '🚀', label: 'Deploy', key: 'deploy' },
      { icon: '🧩', label: 'Skills', key: 'skills' },
      { icon: '📋', label: 'Workflows', key: 'workflows' },
      { icon: '🎭', label: 'Persona', key: 'persona' },
      { icon: '🎤', label: 'Voice', key: 'voice' },
      { icon: '📱', label: 'Social', key: 'social' },
      { icon: '🧠', label: 'Train', key: 'train' },
      { icon: '⚙️', label: 'Settings', key: 'settings' }
    ];

    const sidebar = pages.map(item => {
      const active = this.currentView === item.key;
      const prefix = active ? chalk.hex(t.primary)(' ▶ ') : chalk.hex(t.accent)('   ');
      const label = active ? chalk.white.bold(`${item.icon} ${item.label}`) : chalk.hex(t.accent)(`${item.icon} ${item.label}`);
      return prefix + label;
    }).join('\n');

    return boxen(sidebar, {
      padding: { top: 0, bottom: 0, left: 1, right: 2 },
      borderStyle: 'single', borderColor: 'red',
      title: chalk.hex(t.primary)('⚡ NAV'),
      width: 22
    });
  }

  // ─── RENDER STATUS BAR ───
  renderStatusBar() {
    const t = this.getThemeColors();
    const stats = this.memory.getStats();
    const hotkey = this.config.get('hotkey.key', 'ctrl+shift+space');
    const progress = this.orchestrator.getProgress();
    const agentStr = progress.running > 0 ? chalk.hex('#FFD700')(` │ 🤖 ${progress.running} agents running`) : '';

    return chalk.hex(t.primary)('─'.repeat(process.stdout.columns || 80)) + '\n' +
      chalk.hex('#00FFFF')(`🧠 ${stats.episodicCount} events`) + chalk.hex(t.accent)(' │ ') +
      chalk.hex('#00FF40')(`✅ ${stats.taskCount} tasks`) + chalk.hex(t.accent)(' │ ') +
      chalk.hex('#FFD700')(`🔌 ${this.provider.providerName}`) + chalk.hex(t.accent)(' │ ') +
      chalk.hex('#FF71CE')(`⌨️ ${hotkey}`) + agentStr + chalk.hex(t.accent)(' │ ') +
      chalk.hex(t.accent)('/help for commands');
  }

  // ─── RENDER NOTIFICATIONS ───
  renderNotifications() {
    if (!this.notifications.length) return '';
    const t = this.getThemeColors();
    return this.notifications.slice(-3).map(n =>
      chalk.hex(t.primary)('  🔔 ') + chalk.hex(t.highlight)(n.message)
    ).join('\n');
  }

  // ─── PAGE VIEWS ───
  async showPage(view) {
    this.currentView = view;
    this.clearScreen();
    this.renderHeader();

    switch (view) {
      case 'chat': await this._showChat(); break;
      case 'search': await this._showSearch(); break;
      case 'system': await this._showSystem(); break;
      case 'code': await this._showCode(); break;
      case 'memory': await this._showMemory(); break;
      case 'vision': await this._showVision(); break;
      case 'agents': await this._showAgents(); break;
      case 'iot': await this._showIoT(); break;
      case 'security': await this._showSecurity(); break;
      case 'install': await this._showInstall(); break;
      case 'deploy': await this._showDeploy(); break;
      case 'skills': await this._showSkills(); break;
      case 'workflows': await this._showWorkflows(); break;
      case 'persona': await this._showPersona(); break;
      case 'voice': await this._showVoice(); break;
      case 'social': await this._showSocial(); break;
      case 'train': await this._showTrain(); break;
      case 'settings': await this.settings.show(); break;
    }

    console.log(this.renderStatusBar());
  }

  async _showChat() {
    const t = this.getThemeColors();
    const greeting = this.adaptive.getPersonalizedGreeting();
    console.log(chalk.hex(t.highlight)(`\n  ${greeting}\n`));

    // Show recent chat history
    const recent = this.chatHistory.slice(-5);
    if (recent.length) {
      for (const msg of recent) {
        const prefix = msg.role === 'user' ? chalk.hex('#00FFFF')('  👤 ') : chalk.hex(t.primary)('  🤖 ');
        console.log(prefix + chalk.hex(t.accent)(msg.content.slice(0, 100)));
      }
      console.log('');
    }

    console.log(chalk.hex(t.accent)('  Type naturally to chat, or use /commands'));
    console.log(chalk.hex(t.accent)('  /help for all commands | /page <name> to switch pages\n'));
  }

  async _showSearch() {
    console.log(chalk.hex('#00FFFF')('\n  🔍 Web Search\n'));
    console.log(chalk.hex('#888888')('  /search <query>      — Quick web search'));
    console.log(chalk.hex('#888888')('  /deep-search <topic> — Multi-source deep search'));
    console.log(chalk.hex('#888888')('  /scrape <url>        — Extract content from URL'));
    console.log(chalk.hex('#888888')('  /analyze <topic>     — Deep analysis'));
    console.log(chalk.hex('#888888')('  /research <topic>    — Technology research'));
    console.log(chalk.hex('#888888')('  /find-ways <goal>    — Find ways to do anything'));
    console.log(chalk.hex('#888888')('  /solve <problem>     — Problem solving\n'));
  }

  async _showSystem() {
    try {
      const sys = await this.automation.getSystemInfo();
      const pm = this.installer.getPackageManager();
      console.log(require('boxen')([
        chalk.hex('#FF0000')('🖥️ System Info'),
        chalk.hex('#00FFFF')('OS: ') + `${sys.os.distro} ${sys.os.release}`,
        chalk.hex('#00FFFF')('CPU: ') + `${sys.cpu.brand} (${sys.cpu.cores} cores)`,
        chalk.hex('#00FFFF')('RAM: ') + `${Math.round(sys.memory.used / 1073741824)}GB / ${Math.round(sys.memory.total / 1073741824)}GB`,
        chalk.hex('#00FFFF')('Host: ') + os.hostname(),
        chalk.hex('#00FFFF')('Pkg Manager: ') + pm.detected.join(', '),
        '',
        chalk.hex('#FF0000')('═══ COMMANDS ═══'),
        chalk.hex('#888888')('  /run <cmd>      — Run shell command'),
        chalk.hex('#888888')('  /open <app>     — Open application'),
        chalk.hex('#888888')('  /processes      — List processes'),
        chalk.hex('#888888')('  /network        — Network info'),
        chalk.hex('#888888')('  /clipboard      — View clipboard')
      ].join('\n'), { padding: 1, borderStyle: 'round', borderColor: 'red' }));
    } catch (err) {
      console.log(chalk.hex('#FF0000')(`  ❌ Error: ${err.message}`));
    }
  }

  async _showCode() {
    const langs = this.codeExecutor.getSupportedLanguages();
    console.log(chalk.hex('#00FFFF')('\n  💻 Code Executor\n'));
    console.log(chalk.hex('#888888')(`  ${langs.length} languages supported:`));
    console.log(chalk.hex('#888888')('  ' + langs.slice(0, 20).map(l => l.name).join(', ') + '...'));
    console.log('');
    console.log(chalk.hex('#888888')('  /code <lang> <code>  — Execute code'));
    console.log(chalk.hex('#888888')('  /project <name>      — Create project'));
    console.log(chalk.hex('#888888')('  /deploy <target>     — Deploy project\n'));
  }

  async _showMemory() {
    const stats = this.memory.getStats();
    const table = new Table({ head: [chalk.hex('#FF0000')('Type'), chalk.hex('#FF0000')('Count'), chalk.hex('#FF0000')('Description')], style: { border: ['red'] } });
    table.push(['📖 Episodic', stats.episodicCount, 'Events & interactions'], ['🧠 Semantic', stats.semanticCount, 'Facts & knowledge'], ['✅ Tasks', stats.taskCount, 'Completed actions'], ['💬 Conversations', stats.conversationCount, 'Chat sessions'], ['📝 Facts', stats.factsCount, 'User facts']);
    console.log(table.toString());
    console.log(chalk.hex('#888888')('\n  /search <q>  — Search memory | /export — Export all\n'));
  }

  async _showVision() {
    console.log(chalk.hex('#00FFFF')('\n  👁️ Vision System\n'));
    console.log(chalk.hex('#888888')('  /screen           — Screenshot & analyze'));
    console.log(chalk.hex('#888888')('  /vision <question> — Ask about screen'));
    console.log(chalk.hex('#888888')('  /watch            — Start screen monitoring\n'));
  }

  async _showAgents() {
    const progress = this.orchestrator.getProgress();
    const agents = this.orchestrator.listAgents();
    console.log(chalk.hex('#00FFFF')('\n  🤖 Agent Orchestrator\n'));
    console.log(chalk.hex('#00FF40')(`  Total: ${progress.total} │ Running: ${progress.running} │ Completed: ${progress.completed}`));
    if (agents.length) {
      agents.slice(0, 10).forEach(a => {
        const status = a.status === 'running' ? '🔄' : a.status === 'completed' ? '✅' : '❌';
        console.log(chalk.hex('#888888')(`  ${status} ${a.name} [${a.specialization}] — ${a.task.slice(0, 40)}`));
      });
    }
    console.log(chalk.hex('#888888')('\n  /orchestrate <task> — Spawn agent team'));
    console.log(chalk.hex('#888888')('  /spawn <task>       — Spawn single agent'));
    console.log(chalk.hex('#888888')('  /progress           — Show progress\n'));
  }

  async _showIoT() {
    const devices = this.iot.listDevices();
    console.log(chalk.hex('#00FFFF')('\n  🏠 IoT Controller\n'));
    if (!devices.length) console.log(chalk.hex('#888888')('  No devices found.'));
    else devices.forEach(d => console.log(chalk.hex('#00FFFF')(`  ${d.name}`) + chalk.hex('#888888')(` [${d.type}] ${d.host}`)));
    console.log(chalk.hex('#888888')('\n  /iot-discover       — Scan for devices'));
    console.log(chalk.hex('#888888')('  /iot-control <id> <action> — Control device\n'));
  }

  async _showSecurity() {
    const report = this.security.getSecurityReport();
    console.log(require('boxen')([
      chalk.hex('#FF0000')('🛡️ Security Dashboard'),
      chalk.hex('#00FFFF')('Session: ') + `${report.sessionDuration}s`,
      chalk.hex('#00FFFF')('Audit entries: ') + report.totalAuditEntries,
      chalk.hex('#00FFFF')('Blocked: ') + report.blockedAttempts,
      chalk.hex('#00FFFF')('Anomalies: ') + report.anomalies,
      chalk.hex('#00FFFF')('Credentials: ') + report.encryptedCredentials,
      '',
      chalk.hex('#888888')('  /security — Full report | /audit — Log | /encrypt — Encrypt')
    ].join('\n'), { padding: 1, borderStyle: 'round', borderColor: 'red' }));
  }

  async _showInstall() {
    const pm = this.installer.getPackageManager();
    console.log(chalk.hex('#00FFFF')('\n  📦 Program Installer\n'));
    console.log(chalk.hex('#00FF40')(`  Package managers: ${pm.detected.join(', ')}`));
    console.log(chalk.hex('#888888')('\n  /install <program>   — Install anything'));
    console.log(chalk.hex('#888888')('  /uninstall <program> — Remove program'));
    console.log(chalk.hex('#888888')('  /programs            — List installed'));
    console.log(chalk.hex('#888888')('  /pkg-manager         — Manager info\n'));
  }

  async _showDeploy() {
    console.log(chalk.hex('#00FFFF')('\n  🚀 Deployer\n'));
    console.log(chalk.hex('#888888')('  Targets: ' + this.deployer.getSupportedTargets().join(', ')));
    console.log(chalk.hex('#888888')('\n  /deploy <target> <path>\n'));
  }

  async _showSkills() {
    const builtins = this.plugins.getBuiltInSkills();
    console.log(chalk.hex('#00FFFF')('\n  🧩 Skills & Plugins\n'));
    builtins.forEach(s => console.log(chalk.hex('#888888')(`  ${s.command} — ${s.description}`)));
    console.log(chalk.hex('#888888')('\n  /create-skill <desc> — Create new skill\n'));
  }

  async _showWorkflows() {
    const wfs = this.workflows.listWorkflows();
    console.log(chalk.hex('#00FFFF')('\n  📋 Workflows\n'));
    if (!wfs.length) console.log(chalk.hex('#888888')('  No workflows yet.'));
    else wfs.forEach(w => console.log(chalk.hex('#888888')(`  ${w.name} — ${w.steps} steps, ${w.runs} runs`)));
    console.log(chalk.hex('#888888')('\n  /workflow <desc> — Create workflow | /run-wf <name> — Run\n'));
  }

  async _showPersona() {
    const presets = this.persona.getPresets();
    const active = this.persona.getActivePersona();
    console.log(chalk.hex('#00FFFF')('\n  🎭 Persona System\n'));
    console.log(chalk.hex('#FFD700')('  Active: ') + (active?.displayName || 'Default'));
    presets.forEach(p => console.log(chalk.hex('#888888')(`  ${p.displayName} — ${p.description}`)));
    console.log(chalk.hex('#888888')('\n  /persona <name> — Activate\n'));
  }

  async _showVoice() {
    const status = this.voice.getStatus();
    console.log(require('boxen')([
      chalk.hex('#FF0000')('🎤 Voice System'),
      chalk.hex('#00FFFF')('Wake Word: ') + status.wakeWord,
      chalk.hex('#00FFFF')('Language: ') + status.language,
      chalk.hex('#00FFFF')('TTS: ') + (status.tts ? 'ON' : 'OFF'),
      chalk.hex('#00FFFF')('STT: ') + (status.stt ? 'ON' : 'OFF')
    ].join('\n'), { padding: 1, borderStyle: 'round', borderColor: 'red' }));
  }

  async _showSocial() {
    console.log(chalk.hex('#00FFFF')('\n  📱 Social Media Automation\n'));
    console.log(chalk.hex('#888888')('  /post <platform> <text>  — Create post'));
    console.log(chalk.hex('#888888')('  /content-plan <topic>    — Content strategy'));
    console.log(chalk.hex('#888888')('  /sign-up <platform>      — Sign up\n'));
  }

  async _showTrain() {
    console.log(chalk.hex('#00FFFF')('\n  🧠 Model Training\n'));
    console.log(chalk.hex('#888888')('  /train <task>              — Generate training data'));
    console.log(chalk.hex('#888888')('  /fine-tune <model> <file>  — Fine-tune model'));
    console.log(chalk.hex('#888888')('  /compare-models <m1> <m2>  — Benchmark'));
    console.log(chalk.hex('#888888')('  /model-hosting             — Cloud hosting options\n'));
  }

  // ─── GET OR CREATE ENGINE ───
  _getEngine() {
    if (!this._engine) {
      const Engine = require('../core/engine.js');
      this._engine = new Engine(this.config);
      Object.assign(this._engine, {
        provider: this.provider, memory: this.memory, automation: this.automation,
        vision: this.vision, plugins: this.plugins, messaging: this.messaging,
        voice: this.voice, codeExecutor: this.codeExecutor, deployer: this.deployer,
        learning: this.learning, skillCreator: this.skillCreator, workflows: this.workflows,
        persona: this.persona, settings: this.settings, selfImprove: this.selfImprove,
        subAgents: this.subAgents, socialMedia: this.socialMedia, research: this.research,
        adaptive: this.adaptive, codeRewriter: this.codeRewriter, webSearch: this.webSearch,
        iot: this.iot, security: this.security, installer: this.installer,
        orchestrator: this.orchestrator, modelTrainer: this.modelTrainer
      });
    }
    return this._engine;
  }

  // ─── MAIN LOOP ───
  async start() {
    this.clearScreen();

    // Show splash
    const t = this.getThemeColors();
    const aiName = this.config.get('ai.name', 'OpenDesktop');
    const userName = this.config.get('user.name', '');
    const hotkey = this.config.get('hotkey.key', 'ctrl+shift+space');

    console.log(boxen(
      chalk.hex(t.primary)(`⚡ ${aiName} v1.0.0 — THE INTELLIGENCE AGENT ⚡\n\n`) +
      chalk.hex('#00FFFF')('Not a dumb chatbot. A self-improving AI desktop agent.\n\n') +
      chalk.hex(t.accent)('Provider: ') + this.provider.providerName + '\n' +
      chalk.hex(t.accent)('Model: ') + this.provider.model + '\n' +
      chalk.hex(t.accent)('Theme: ') + this.config.get('theme') + '\n' +
      chalk.hex(t.accent)('Hotkey: ') + chalk.white.bold(hotkey) + '\n\n' +
      chalk.hex('#888888')('Type naturally to chat | /help for commands | /page <name> for pages'),
      { padding: 1, borderStyle: 'round', borderColor: 'red', title: `🤖 ${aiName}`, titleAlignment: 'center', float: 'center' }
    ));

    await this.plugins.loadAll();
    if (this.config.get('persona.active')) this.persona.activatePersona(this.config.get('persona.active'));

    // Main chat loop
    while (true) {
      const persona = this.persona.getActivePersona();
      const personaName = persona?.displayName || aiName;

      const { input } = await inquirer.prompt([{
        type: 'input', name: 'input',
        message: chalk.hex(t.primary)('❯'),
        prefix: chalk.hex(t.highlight)(`  ${personaName}`)
      }]);

      if (!input.trim()) continue;
      const trimmed = input.trim();

      // Track
      this.chatHistory.push({ role: 'user', content: trimmed, timestamp: new Date().toISOString() });
      this.learning.trackCommand(trimmed);
      this.adaptive.trackInteraction(trimmed, { time: Date.now() });

      // Page navigation
      if (trimmed.startsWith('/page ')) {
        const page = trimmed.slice(6).trim();
        await this.showPage(page);
        continue;
      }

      // Commands
      if (trimmed.startsWith('/')) {
        const engine = this._getEngine();

        // Special GUI commands
        if (trimmed === '/help') {
          await this._showHelp();
          continue;
        }

        await engine.handleCommand(trimmed);
        continue;
      }

      // Natural language chat
      this.isProcessing = true;
      const spinner = ora({ text: `${aiName} thinking...`, spinner: 'dots2', color: 'red' }).start();

      try {
        const startTime = Date.now();
        const context = this._engine ? this._engine.buildContext() : '';
        const personaPrompt = this.persona.getSystemPrompt();
        const systemPrompt = personaPrompt || `You are ${aiName}, an advanced AI desktop agent on ${os.platform()} (${os.hostname()}).
You control the computer, run programs, manage files, browse the web, automate tasks, execute code, deploy projects, create skills, manage workflows, research deeply, and learn from every interaction.
Be helpful, concise, proactive. Use emojis. Current time: ${new Date().toISOString()}`;

        const response = await this.provider.chat(trimmed, { systemPrompt });
        spinner.stop();

        this.chatHistory.push({ role: 'assistant', content: response, timestamp: new Date().toISOString() });
        this.memory.addEvent({ type: 'chat', user: trimmed, assistant: response });
        this.selfImprove.trackPerformance('responseTime', Date.now() - startTime);

        console.log('\n' + boxen(chalk.hex(t.primary)('🤖 ') + chalk.white(response), {
          padding: { left: 1, right: 1, top: 0, bottom: 0 },
          borderStyle: 'round', borderColor: 'red', dimBorder: true
        }) + '\n');
      } catch (err) {
        spinner.stop();
        console.log(chalk.hex('#FF0000')(`\n  ❌ Error: ${err.message}\n`));
      }
      this.isProcessing = false;
    }
  }

  // ─── HELP ───
  async _showHelp() {
    const t = this.getThemeColors();
    console.log(boxen([
      chalk.hex(t.primary)(`⚡ COMMANDS — Type /page <name> to navigate\n`),
      chalk.hex('#00FFFF')('💬 Chat:      ') + 'Type naturally or /commands',
      chalk.hex('#00FFFF')('🔍 Search:    ') + '/search, /deep-search, /scrape, /analyze, /research',
      chalk.hex('#00FFFF')('🖥️ System:    ') + '/run, /open, /system, /processes, /network',
      chalk.hex('#00FFFF')('💻 Code:      ') + '/code, /project, /deploy',
      chalk.hex('#00FFFF')('🧠 Memory:    ') + '/memory, /search, /export',
      chalk.hex('#00FFFF')('👁️ Vision:    ') + '/screen, /vision, /watch',
      chalk.hex('#00FFFF')('🤖 Agents:    ') + '/orchestrate, /spawn, /team, /agents, /progress',
      chalk.hex('#00FFFF')('🏠 IoT:       ') + '/iot, /iot-discover, /iot-control',
      chalk.hex('#00FFFF')('🔒 Security:  ') + '/security, /encrypt, /audit',
      chalk.hex('#00FFFF')('📦 Install:   ') + '/install, /uninstall, /programs, /pkg-manager',
      chalk.hex('#00FFFF')('🧩 Skills:    ') + '/plugins, /create-skill',
      chalk.hex('#00FFFF')('📋 Workflow:   ') + '/workflow, /run-wf, /workflows',
      chalk.hex('#00FFFF')('🎭 Persona:   ') + '/persona, /whoami',
      chalk.hex('#00FFFF')('🎤 Voice:     ') + '/speak, /listen',
      chalk.hex('#00FFFF')('📱 Social:    ') + '/post, /content-plan, /sign-up',
      chalk.hex('#00FFFF')('🧠 Train:     ') + '/train, /fine-tune, /compare-models, /model-hosting',
      chalk.hex('#00FFFF')('🧬 Improve:   ') + '/evolve, /rewrite, /add-feature, /optimize',
      chalk.hex('#00FFFF')('⚙️ Settings:  ') + '/settings, /theme',
      chalk.hex('#00FFFF')('📄 Pages:     ') + '/page chat|search|system|code|memory|agents|iot|security|install|skills|persona|voice|social|train|settings'
    ].join('\n'), { padding: 1, borderStyle: 'round', borderColor: 'red', title: '⚡ Help', titleAlignment: 'center' }));
  }
}

// ─── SUMMON FUNCTION — Called by hotkey ───
async function summon() {
  const gui = new OpenDesktopGUI();
  await gui.start();
}

if (require.main === module) {
  summon().catch(err => { console.error(chalk.hex('#FF0000')('❌ Fatal:'), err.message); process.exit(1); });
}

module.exports = OpenDesktopGUI;
module.exports.summon = summon;
