#!/usr/bin/env node
'use strict';

// ═══════════════════════════════════════════════════════════════
//  OPENDESKTOP GUI — Rich Terminal Interface
// ═══════════════════════════════════════════════════════════════

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

const RED = '#FF0000';
const DARK_RED = '#8B0000';
const GRAY = '#708090';
const CYAN = '#00FFFF';
const GREEN = '#00FF40';
const YELLOW = '#FFD700';
const WHITE = '#FFFFFF';
const DIM = '#888888';

class OpenDesktopGUI {
  constructor() {
    this.config = new Config();
    this.provider = new ProviderRegistry(this.config);
    this.memory = new MemorySystem(this.config);
    this.automation = new AutomationEngine(this.config);
    this.vision = new VisionSystem(this.config, this.provider);
    this.plugins = new PluginManager(this.config, this);
    this.chatHistory = [];
    this.currentView = 'chat';
    this.taskLog = [];
    this.isProcessing = false;
  }

  clearScreen() { process.stdout.write('\x1B[2J\x1B[0f'); }

  getThemeColors() {
    const theme = this.config.get('theme', 'hacker-red');
    const themes = {
      'hacker-red': { primary: RED, secondary: DARK_RED, accent: GRAY },
      'matrix': { primary: '#00FF00', secondary: '#003300', accent: '#008F00' },
      'cyberpunk': { primary: '#00FFFF', secondary: '#FF00FF', accent: '#FFFF00' },
      'minimal': { primary: '#FFFFFF', secondary: '#CCCCCC', accent: '#888888' },
      'vaporwave': { primary: '#FF71CE', secondary: '#01CDFE', accent: '#B967FF' }
    };
    return themes[theme] || themes['hacker-red'];
  }

  renderHeader() {
    const t = this.getThemeColors();
    const title = gradient([t.primary, t.secondary])('  ◈ OPENDESKTOP ◈');
    const info = chalk.hex(DIM)(` │ ${os.hostname()} │ ${os.platform()} │ ${this.provider.providerName} │ ${this.provider.model}`);
    const line = chalk.hex(t.primary)('─'.repeat(process.stdout.columns || 80));
    console.log(line);
    console.log(title + info);
    console.log(line);
  }

  renderSidebar() {
    const t = this.getThemeColors();
    const items = [
      { icon: '💬', label: 'Chat', key: 'chat', active: this.currentView === 'chat' },
      { icon: '📋', label: 'Tasks', key: 'tasks', active: this.currentView === 'tasks' },
      { icon: '🧠', label: 'Memory', key: 'memory', active: this.currentView === 'memory' },
      { icon: '👁️', label: 'Vision', key: 'vision', active: this.currentView === 'vision' },
      { icon: '🖥️', label: 'System', key: 'system', active: this.currentView === 'system' },
      { icon: '🧩', label: 'Plugins', key: 'plugins', active: this.currentView === 'plugins' },
      { icon: '⚙️', label: 'Settings', key: 'settings', active: this.currentView === 'settings' }
    ];

    const sidebar = items.map(item => {
      const prefix = item.active ? chalk.hex(t.primary)(' ▶ ') : chalk.hex(DIM)('   ');
      const label = item.active ? chalk.hex(WHITE).bold(`${item.icon} ${item.label}`) : chalk.hex(DIM)(`${item.icon} ${item.label}`);
      return prefix + label;
    }).join('\n');

    return boxen(sidebar, {
      padding: { top: 0, bottom: 0, left: 1, right: 2 },
      borderStyle: 'single',
      borderColor: 'red',
      title: chalk.hex(RED)('⚡ NAV'),
      width: 22
    });
  }

  renderStatusBar() {
    const t = this.getThemeColors();
    const stats = this.memory.getStats();
    const status = [
      chalk.hex(CYAN)(`🧠 Memory: ${stats.episodicCount} events`),
      chalk.hex(GREEN)(`✅ Tasks: ${stats.taskCount}`),
      chalk.hex(YELLOW)(`🔌 ${this.provider.providerName}`),
      chalk.hex(DIM)(`Type /help for commands`)
    ].join(chalk.hex(GRAY)(' │ '));
    return chalk.hex(t.primary)('─'.repeat(process.stdout.columns || 80)) + '\n' + status;
  }

  renderChatMessage(msg) {
    const t = this.getThemeColors();
    if (msg.role === 'user') {
      return boxen(chalk.hex(CYAN)('👤 You: ') + chalk.white(msg.content), {
        padding: { left: 1, right: 1, top: 0, bottom: 0 },
        borderStyle: 'round',
        borderColor: 'cyan',
        dimBorder: true
      });
    } else {
      return boxen(chalk.hex(RED)('🤖 OpenDesktop: ') + chalk.hex(WHITE)(msg.content), {
        padding: { left: 1, right: 1, top: 0, bottom: 0 },
        borderStyle: 'round',
        borderColor: 'red',
        dimBorder: true
      });
    }
  }

  async renderTaskDashboard() {
    const tasks = this.automation.getHistory(20);
    const table = new Table({
      head: [chalk.hex(RED)('Time'), chalk.hex(RED)('Type'), chalk.hex(RED)('Action'), chalk.hex(RED)('Status')],
      style: { head: [], border: ['red'] },
      colWidths: [20, 12, 40, 12]
    });
    tasks.forEach(t => {
      table.push([t.timestamp?.slice(11, 19) || '-', t.type || '-', (t.description || t.cmd || '-').slice(0, 38), '✅']);
    });
    console.log(table.toString());
  }

  async renderMemoryDashboard() {
    const stats = this.memory.getStats();
    const table = new Table({
      head: [chalk.hex(RED)('Memory Type'), chalk.hex(RED)('Count'), chalk.hex(RED)('Description')],
      style: { head: [], border: ['red'] }
    });
    table.push(
      ['📖 Episodic', stats.episodicCount, 'Chronological events & interactions'],
      ['🧠 Semantic', stats.semanticCount, 'Facts, knowledge & preferences'],
      ['✅ Tasks', stats.taskCount, 'Completed tasks & actions'],
      ['💬 Conversations', stats.conversationCount, 'Saved chat sessions'],
      ['📝 Facts', stats.factsCount, 'User facts & preferences']
    );
    console.log(table.toString());
  }

  async handleCommand(input) {
    const cmd = input.trim().toLowerCase().split(' ')[0];
    const args = input.trim().slice(cmd.length).trim();

    switch (cmd) {
      case '/help':
        console.log(boxen([
          chalk.hex(RED)('⚡ OpenDesktop Commands ⚡'),
          '',
          chalk.hex(CYAN)('/help') + chalk.hex(DIM)('          — Show this help'),
          chalk.hex(CYAN)('/model') + chalk.hex(DIM)('         — Switch AI model'),
          chalk.hex(CYAN)('/provider') + chalk.hex(DIM)('      — Switch provider'),
          chalk.hex(CYAN)('/memory') + chalk.hex(DIM)('        — Memory dashboard'),
          chalk.hex(CYAN)('/search <q>') + chalk.hex(DIM)('    — Search memory'),
          chalk.hex(CYAN)('/screen') + chalk.hex(DIM)('        — Take screenshot & analyze'),
          chalk.hex(CYAN)('/vision <q>') + chalk.hex(DIM)('    — Analyze screen with question'),
          chalk.hex(CYAN)('/task') + chalk.hex(DIM)('          — Task dashboard'),
          chalk.hex(CYAN)('/system') + chalk.hex(DIM)('        — System info'),
          chalk.hex(CYAN)('/plugins') + chalk.hex(DIM)('       — List plugins'),
          chalk.hex(CYAN)('/run <cmd>') + chalk.hex(DIM)('     — Run shell command'),
          chalk.hex(CYAN)('/open <app>') + chalk.hex(DIM)('    — Open application'),
          chalk.hex(CYAN)('/browse <url>') + chalk.hex(DIM)('  — Open URL in browser'),
          chalk.hex(CYAN)('/clipboard') + chalk.hex(DIM)('     — Show clipboard'),
          chalk.hex(CYAN)('/notify <msg>') + chalk.hex(DIM)('  — Send notification'),
          chalk.hex(CYAN)('/theme <name>') + chalk.hex(DIM)('  — Change theme'),
          chalk.hex(CYAN)('/export') + chalk.hex(DIM)('        — Export memory'),
          chalk.hex(CYAN)('/clear') + chalk.hex(DIM)('         — Clear chat'),
          chalk.hex(CYAN)('/quit') + chalk.hex(DIM)('          — Exit')
        ].join('\n'), { padding: 1, borderStyle: 'round', borderColor: 'red', title: '⚡ Help', titleAlignment: 'center' }));
        break;

      case '/model':
        const models = this.provider.listModels();
        const { model } = await inquirer.prompt([{ type: 'list', name: 'model', message: 'Select model:', choices: models }]);
        this.provider.switchModel(model);
        console.log(chalk.hex(GREEN)(`✅ Switched to ${model}`));
        break;

      case '/provider':
        const providers = this.provider.listProviders();
        const { provider } = await inquirer.prompt([{ type: 'list', name: 'provider', message: 'Select provider:', choices: providers.map(p => ({ name: `${p.name} (${p.models.length} models)`, value: p.id })) }]);
        const { key } = await inquirer.prompt([{ type: 'password', name: 'key', message: 'API Key:' }]);
        this.provider.switchProvider(provider, key);
        console.log(chalk.hex(GREEN)(`✅ Switched to ${provider}`));
        break;

      case '/memory': await this.renderMemoryDashboard(); break;

      case '/search':
        const results = this.memory.search(args);
        console.log(chalk.hex(CYAN)(`Found ${results.length} results:`));
        results.slice(0, 10).forEach(r => console.log(chalk.hex(DIM)(`  [${r.type}]`), JSON.stringify(r.data).slice(0, 100)));
        break;

      case '/screen':
        const spinner = ora('Taking screenshot...').start();
        const shot = await this.vision.takeScreenshot();
        spinner.stop();
        if (shot.error) { console.log(chalk.hex(RED)(`❌ ${shot.error}`)); break; }
        console.log(chalk.hex(GREEN)(`✅ Screenshot saved: ${shot.path}`));
        const analysis = await this.vision.analyzeScreen(shot.path, 'Describe what you see on screen.');
        console.log(chalk.hex(CYAN)('👁️ Analysis:'), analysis.analysis || analysis.error);
        break;

      case '/vision':
        const visResult = await this.vision.analyzeScreen(null, args || 'Describe the screen');
        console.log(chalk.hex(CYAN)('👁️ '), visResult.analysis || visResult.error);
        break;

      case '/task': await this.renderTaskDashboard(); break;

      case '/system':
        const sysInfo = await this.automation.getSystemInfo();
        console.log(boxen([
          chalk.hex(RED)('🖥️ System Info'),
          '',
          chalk.hex(CYAN)('OS: ') + chalk.white(`${sysInfo.os.distro} ${sysInfo.os.release}`),
          chalk.hex(CYAN)('CPU: ') + chalk.white(`${sysInfo.cpu.brand} (${sysInfo.cpu.cores} cores @ ${sysInfo.cpu.speed}GHz)`),
          chalk.hex(CYAN)('RAM: ') + chalk.white(`${Math.round(sysInfo.memory.used / 1073741824)}GB / ${Math.round(sysInfo.memory.total / 1073741824)}GB`),
          chalk.hex(CYAN)('Disk: ') + sysInfo.disk.map(d => `${d.mount}: ${Math.round(d.used / 1073741824)}GB/${Math.round(d.size / 1073741824)}GB`).join(', '),
          sysInfo.battery ? chalk.hex(CYAN)('Battery: ') + chalk.white(`${sysInfo.battery.percent}%`) : ''
        ].filter(Boolean).join('\n'), { padding: 1, borderStyle: 'round', borderColor: 'red' }));
        break;

      case '/plugins':
        const builtins = this.plugins.getBuiltInSkills();
        const ptable = new Table({ head: [chalk.hex(RED)('Skill'), chalk.hex(RED)('Command'), chalk.hex(RED)('Description')], style: { head: [], border: ['red'] } });
        builtins.forEach(p => ptable.push([p.name, p.command, p.description]));
        console.log(ptable.toString());
        break;

      case '/run':
        if (!args) { console.log(chalk.hex(RED)('❌ Usage: /run <command>')); break; }
        const runSpinner = ora(`Running: ${args}`).start();
        const result = await this.automation.runCommand(args);
        runSpinner.stop();
        console.log(result.success ? chalk.hex(GREEN)('✅ Output:') : chalk.hex(RED)('❌ Error:'));
        console.log(result.stdout || result.stderr || result.error);
        break;

      case '/open':
        if (!args) { console.log(chalk.hex(RED)('❌ Usage: /open <app>')); break; }
        await this.automation.openApp(args);
        console.log(chalk.hex(GREEN)(`✅ Opening ${args}...`));
        break;

      case '/browse':
        if (!args) { console.log(chalk.hex(RED)('❌ Usage: /browse <url>')); break; }
        await this.automation.openBrowser(args);
        console.log(chalk.hex(GREEN)(`✅ Opening ${args} in browser...`));
        break;

      case '/clipboard':
        const clip = await this.automation.getClipboard();
        console.log(chalk.hex(CYAN)('📋 Clipboard:'), clip.content || clip.stdout || 'Empty');
        break;

      case '/notify':
        await this.automation.notify('OpenDesktop', args || 'Test notification');
        console.log(chalk.hex(GREEN)('✅ Notification sent'));
        break;

      case '/theme':
        if (args && ['hacker-red', 'matrix', 'cyberpunk', 'minimal', 'vaporwave'].includes(args)) {
          this.config.set('theme', args);
          console.log(chalk.hex(GREEN)(`✅ Theme changed to ${args}`));
        } else {
          console.log(chalk.hex(CYAN)('Available themes: hacker-red, matrix, cyberpunk, minimal, vaporwave'));
        }
        break;

      case '/export':
        const data = this.memory.exportAll();
        const exportPath = path.join(os.homedir(), '.opendesktop', 'memory-export.json');
        fs.writeFileSync(exportPath, JSON.stringify(data, null, 2));
        console.log(chalk.hex(GREEN)(`✅ Memory exported to ${exportPath}`));
        break;

      case '/clear':
        this.clearScreen();
        this.renderHeader();
        break;

      case '/quit':
        console.log(chalk.hex(RED)('\n  👋 Goodbye from OpenDesktop! See you next time. 🚀\n'));
        process.exit(0);

      default:
        return false; // Not a command, treat as chat
    }
    return true;
  }

  async start() {
    this.clearScreen();
    this.renderHeader();

    console.log(boxen(
      chalk.hex(GREEN)('✅ OpenDesktop GUI Ready!\n\n') +
      chalk.hex(CYAN)('Provider: ') + chalk.white(this.provider.providerName) + '\n' +
      chalk.hex(CYAN)('Model: ') + chalk.white(this.provider.model) + '\n' +
      chalk.hex(CYAN)('Theme: ') + chalk.white(this.config.get('theme')) + '\n\n' +
      chalk.hex(GRAY)('Type naturally to chat, or /help for commands'),
      { padding: 1, borderStyle: 'round', borderColor: 'red', title: '🤖 OpenDesktop', titleAlignment: 'center', float: 'center' }
    ));

    await this.plugins.loadAll();

    // Main chat loop
    while (true) {
      const { input } = await inquirer.prompt([{
        type: 'input',
        name: 'input',
        message: chalk.hex(RED)('❯'),
        prefix: chalk.hex(CYAN)('  🤖')
      }]);

      if (!input.trim()) continue;

      this.chatHistory.push({ role: 'user', content: input, timestamp: new Date().toISOString() });

      // Check if it's a command
      if (input.startsWith('/')) {
        const handled = await this.handleCommand(input);
        if (handled) continue;
      }

      // Regular chat — send to AI
      this.isProcessing = true;
      const spinner = ora({ text: 'Thinking...', spinner: 'dots', color: 'red' }).start();

      try {
        const systemPrompt = `You are OpenDesktop, an advanced AI desktop agent running on ${os.platform()} (${os.hostname()}).
You can control the computer, run programs, manage files, browse the web, and much more.
When the user asks you to do something, provide clear actionable steps or offer to execute commands.
Be concise, helpful, and use emojis. Current time: ${new Date().toISOString()}`;

        const response = await this.provider.chat(input, { systemPrompt });
        spinner.stop();

        this.chatHistory.push({ role: 'assistant', content: response, timestamp: new Date().toISOString() });
        this.memory.addEvent({ type: 'chat', userMessage: input, assistantResponse: response });

        console.log('\n' + this.renderChatMessage({ role: 'assistant', content: response }) + '\n');
      } catch (err) {
        spinner.stop();
        console.log(chalk.hex(RED)(`\n  ❌ Error: ${err.message}\n`));
      }

      this.isProcessing = false;
    }
  }
}

// Run if called directly
if (require.main === module) {
  const gui = new OpenDesktopGUI();
  gui.start().catch(err => { console.error(chalk.hex(RED)('❌ Fatal:'), err.message); process.exit(1); });
}

module.exports = OpenDesktopGUI;
