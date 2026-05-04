'use strict';

const os = require('os');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');

const Config = require('./config.js');
const ProviderRegistry = require('../providers/index.js');
const MemorySystem = require('../memory/index.js');
const AutomationEngine = require('../automation/index.js');
const VisionSystem = require('../vision/index.js');
const PluginManager = require('../plugins/index.js');
const MessagingHub = require('../messaging/index.js');

// ═══════════════════════════════════════════════════════════════
//  OPENDESKTOP CORE ENGINE — The Brain of the Operation 🧠
// ═══════════════════════════════════════════════════════════════

class OpenDesktopEngine {
  constructor(configData) {
    this.config = configData instanceof Config ? configData : new Config();
    this.provider = new ProviderRegistry(this.config);
    this.memory = new MemorySystem(this.config);
    this.automation = new AutomationEngine(this.config);
    this.vision = new VisionSystem(this.config, this.provider);
    this.plugins = new PluginManager(this.config, this);
    this.messaging = new MessagingHub(this.config, this);
    this.sessions = new Map();
    this.currentSessionId = Date.now().toString(36);
    this.isRunning = false;
  }

  async start() {
    this.isRunning = true;
    this.memory.addEvent({ type: 'system', message: 'OpenDesktop session started' });

    // Load plugins
    await this.plugins.loadAll();

    // Init messaging if configured
    if (this.config.get('messaging.enabled')) {
      await this.messaging.init();
    }

    // Start CLI chat loop
    await this.chatLoop();
  }

  async chatLoop() {
    while (this.isRunning) {
      const { input } = await inquirer.prompt([{
        type: 'input',
        name: 'input',
        message: chalk.hex('#FF0000')('❯'),
        prefix: chalk.hex('#00FFFF')('  🤖')
      }]);

      if (!input.trim()) continue;
      if (input.trim() === '/quit' || input.trim() === '/exit') {
        console.log(chalk.hex('#FF0000')('\n  👋 Goodbye! 🚀\n'));
        this.isRunning = false;
        process.exit(0);
      }

      // Handle commands
      if (input.startsWith('/')) {
        await this.handleCommand(input);
        continue;
      }

      // Process with AI
      try {
        const processAnim = require('ora')({ text: '🧠 Thinking...', spinner: 'dots2', color: 'red' }).start();

        const context = this.buildContext();
        const response = await this.provider.chat(input, {
          systemPrompt: `You are OpenDesktop, an advanced AI desktop agent on ${os.platform()} (${os.hostname()}).
You control the computer, run programs, manage files, browse the web, and automate tasks.
Be helpful, concise, proactive. Use emojis. Context:\n${context}`
        });

        processAnim.stop();
        console.log('\n' + this.formatResponse(response) + '\n');

        this.memory.addEvent({ type: 'chat', user: input, assistant: response });
        this.memory.addTask({ description: `Chat: ${input.slice(0, 100)}`, type: 'conversation' });
      } catch (err) {
        console.log(chalk.hex('#FF0000')(`\n  ❌ Error: ${err.message}\n`));
      }
    }
  }

  buildContext() {
    const recent = this.memory.getEvents({ limit: 5 });
    const stats = this.memory.getStats();
    const sysInfo = `Platform: ${os.platform()}, Arch: ${os.arch()}, Hostname: ${os.hostname()}`;
    const recentContext = recent.map(e => `[${e.timestamp}] ${e.type}: ${e.message || e.userMessage || JSON.stringify(e)}`).join('\n');
    return `${sysInfo}\nMemory: ${stats.episodicCount} events, ${stats.taskCount} tasks\nRecent:\n${recentContext}`;
  }

  formatResponse(text) {
    const lines = text.split('\n');
    return lines.map(line => {
      if (line.startsWith('#')) return chalk.hex('#FF0000').bold(line);
      if (line.startsWith('```')) return chalk.hex('#708090')(line);
      if (line.startsWith('- ') || line.startsWith('* ')) return chalk.hex('#00FFFF')('  •') + chalk.white(line.slice(1));
      if (line.match(/^\d+\./)) return chalk.hex('#00FFFF')('  ' + line.match(/^\d+/)[0] + '.') + chalk.white(line.slice(line.indexOf('.') + 1));
      return chalk.white(line);
    }).join('\n');
  }

  async handleCommand(input) {
    const [cmd, ...rest] = input.trim().split(' ');
    const args = rest.join(' ');

    switch (cmd) {
      case '/help':
        console.log(require('boxen')([
          chalk.hex('#FF0000')('⚡ OpenDesktop Commands ⚡'),
          '',
          chalk.hex('#00FFFF')('/help') + chalk.hex('#888888')('           — Show this help'),
          chalk.hex('#00FFFF')('/model <name>') + chalk.hex('#888888')('    — Switch model'),
          chalk.hex('#00FFFF')('/providers') + chalk.hex('#888888')('      — List providers'),
          chalk.hex('#00FFFF')('/models') + chalk.hex('#888888')('         — List models'),
          chalk.hex('#00FFFF')('/memory') + chalk.hex('#888888')('         — Memory dashboard'),
          chalk.hex('#00FFFF')('/search <q>') + chalk.hex('#888888')('     — Search memory'),
          chalk.hex('#00FFFF')('/screen') + chalk.hex('#888888')('         — Screenshot & analyze'),
          chalk.hex('#00FFFF')('/run <cmd>') + chalk.hex('#888888')('      — Run shell command'),
          chalk.hex('#00FFFF')('/open <app>') + chalk.hex('#888888')('     — Open application'),
          chalk.hex('#00FFFF')('/browse <url>') + chalk.hex('#888888')('   — Open URL'),
          chalk.hex('#00FFFF')('/system') + chalk.hex('#888888')('         — System info'),
          chalk.hex('#00FFFF')('/processes') + chalk.hex('#888888')('      — List processes'),
          chalk.hex('#00FFFF')('/plugins') + chalk.hex('#888888')('        — List plugins/skills'),
          chalk.hex('#00FFFF')('/clipboard') + chalk.hex('#888888')('      — Show clipboard'),
          chalk.hex('#00FFFF')('/network') + chalk.hex('#888888')('        — Network info'),
          chalk.hex('#00FFFF')('/ping <host>') + chalk.hex('#888888')('     — Ping host'),
          chalk.hex('#00FFFF')('/notify <msg>') + chalk.hex('#888888')('   — Desktop notification'),
          chalk.hex('#00FFFF')('/theme <name>') + chalk.hex('#888888')('   — Change theme'),
          chalk.hex('#00FFFF')('/history') + chalk.hex('#888888')('        — Chat history'),
          chalk.hex('#00FFFF')('/clear') + chalk.hex('#888888')('          — Clear screen'),
          chalk.hex('#00FFFF')('/reset') + chalk.hex('#888888')('          — Reset AI context'),
          chalk.hex('#00FFFF')('/export') + chalk.hex('#888888')('         — Export memory'),
          chalk.hex('#00FFFF')('/quit') + chalk.hex('#888888')('           — Exit')
        ].join('\n'), { padding: 1, borderStyle: 'round', borderColor: 'red', title: '⚡ Help' }));
        break;

      case '/providers':
        this.provider.listProviders().forEach(p => console.log(chalk.hex('#00FFFF')(`  ${p.name}`) + chalk.hex('#888888')(` — ${p.models.length} models`)));
        break;

      case '/models':
        this.provider.listModels().forEach(m => console.log(chalk.hex('#00FFFF')(`  • ${m}`)));
        break;

      case '/model':
        if (args) { this.provider.switchModel(args); console.log(chalk.hex('#00FF40')(`✅ Model: ${args}`)); }
        else { const models = this.provider.listModels(); console.log(chalk.hex('#00FFFF')('Models:')); models.forEach(m => console.log(`  • ${m}`)); }
        break;

      case '/memory':
        const stats = this.memory.getStats();
        const Table = require('cli-table3');
        const table = new Table({ head: [chalk.hex('#FF0000')('Type'), chalk.hex('#FF0000')('Count')], style: { border: ['red'] } });
        table.push(['📖 Episodic', stats.episodicCount], ['🧠 Semantic', stats.semanticCount], ['✅ Tasks', stats.taskCount], ['💬 Conversations', stats.conversationCount], ['📝 Facts', stats.factsCount]);
        console.log(table.toString());
        break;

      case '/search':
        const results = this.memory.search(args);
        console.log(chalk.hex('#00FFFF')(`Found ${results.length} results:`));
        results.slice(0, 10).forEach(r => console.log(chalk.hex('#888888')(`  [${r.type}]`) + ` ${JSON.stringify(r.data).slice(0, 120)}`));
        break;

      case '/screen':
        const ora = require('ora');
        const spin = ora('📸 Taking screenshot...').start();
        const shot = await this.vision.takeScreenshot();
        spin.stop();
        if (shot.error) { console.log(chalk.hex('#FF0000')(`❌ ${shot.error}`)); break; }
        console.log(chalk.hex('#00FF40')(`✅ Screenshot: ${shot.path}`));
        const analysis = await this.vision.analyzeScreen(shot.path, 'Describe what you see.');
        console.log(chalk.hex('#00FFFF')('👁️ ') + (analysis.analysis || analysis.error));
        break;

      case '/run':
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /run <command>')); break; }
        const runOra = require('ora')(`⚙️ Running: ${args}`).start();
        const result = await this.automation.runCommand(args);
        runOra.stop();
        console.log(result.success ? chalk.hex('#00FF40')('✅') : chalk.hex('#FF0000')('❌'));
        console.log(result.stdout || result.stderr || result.error);
        break;

      case '/open':
        await this.automation.openApp(args);
        console.log(chalk.hex('#00FF40')(`✅ Opening ${args}...`));
        break;

      case '/browse':
        await this.automation.openBrowser(args || 'https://google.com');
        console.log(chalk.hex('#00FF40')(`✅ Opening browser...`));
        break;

      case '/system':
        const sys = await this.automation.getSystemInfo();
        console.log(require('boxen')([
          chalk.hex('#FF0000')('🖥️ System Info'),
          chalk.hex('#00FFFF')('OS: ') + `${sys.os.distro} ${sys.os.release}`,
          chalk.hex('#00FFFF')('CPU: ') + `${sys.cpu.brand} (${sys.cpu.cores} cores)`,
          chalk.hex('#00FFFF')('RAM: ') + `${Math.round(sys.memory.used/1073741824)}GB / ${Math.round(sys.memory.total/1073741824)}GB`
        ].join('\n'), { padding: 1, borderStyle: 'round', borderColor: 'red' }));
        break;

      case '/processes':
        const procs = await this.automation.listProcesses();
        console.log((procs.stdout || '').split('\n').slice(0, 20).join('\n'));
        break;

      case '/plugins':
        const builtins = this.plugins.getBuiltInSkills();
        builtins.forEach(p => console.log(chalk.hex('#00FFFF')(`  ${p.command}`) + chalk.hex('#888888')(` — ${p.description}`)));
        break;

      case '/clipboard':
        const clip = await this.automation.getClipboard();
        console.log(chalk.hex('#00FFFF')('📋 ') + (clip.content || clip.stdout || 'Empty'));
        break;

      case '/network':
        const net = await this.automation.getNetworkInfo();
        console.log(chalk.hex('#00FFFF')('🌐 Network:'));
        net.interfaces.filter(i => !i.internal).forEach(i => console.log(`  ${i.iface}: ${i.ip4} (${i.mac})`));
        break;

      case '/ping':
        const pingResult = await this.automation.ping(args);
        console.log(pingResult.stdout || pingResult.error);
        break;

      case '/notify':
        await this.automation.notify('OpenDesktop', args || 'Hello!');
        console.log(chalk.hex('#00FF40')('✅ Notification sent'));
        break;

      case '/history':
        this.memory.getEvents({ limit: 10 }).forEach(e => {
          const time = e.timestamp?.slice(11, 19) || '-';
          if (e.user) console.log(chalk.hex('#888888')(time) + chalk.hex('#00FFFF')(' 👤 ') + e.user.slice(0, 80));
          if (e.assistant) console.log(chalk.hex('#888888')(time) + chalk.hex('#FF0000')(' 🤖 ') + e.assistant.slice(0, 80));
        });
        break;

      case '/theme':
        if (args) { this.config.set('theme', args); console.log(chalk.hex('#00FF40')(`✅ Theme: ${args}`)); }
        else console.log('Themes: hacker-red, matrix, cyberpunk, minimal, vaporwave');
        break;

      case '/export':
        const data = this.memory.exportAll();
        const p = path.join(os.homedir(), '.opendesktop', 'memory-export.json');
        fs.writeFileSync(p, JSON.stringify(data, null, 2));
        console.log(chalk.hex('#00FF40')(`✅ Exported to ${p}`));
        break;

      case '/clear':
        process.stdout.write('\x1B[2J\x1B[0f');
        break;

      case '/reset':
        this.provider.clearHistory();
        console.log(chalk.hex('#00FF40')('✅ Context reset'));
        break;

      default:
        console.log(chalk.hex('#FF0000')(`Unknown command: ${cmd}. Type /help`));
    }
  }

  // Programmatic API
  async chat(message) { return this.provider.chat(message); }
  async execute(action, params) { return this.automation.executeTask({ type: action, ...params }); }
  async screenshot() { return this.vision.takeScreenshot(); }
  async analyzeScreen(question) { return this.vision.analyzeScreen(null, question); }
  getMemory() { return this.memory; }
  getConfig() { return this.config; }
  getProvider() { return this.provider; }

  async stop() {
    this.isRunning = false;
    this.memory.addEvent({ type: 'system', message: 'OpenDesktop session ended' });
  }
}

module.exports = OpenDesktopEngine;
