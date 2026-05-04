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
const GlobalHotkey = require('../hotkey/index.js');
const VoiceSystem = require('../voice/index.js');
const CodeExecutor = require('../code-executor/index.js');
const Deployer = require('../deployer/index.js');
const LearningSystem = require('../learning/index.js');
const SkillCreator = require('../skill-creator/index.js');
const WorkflowBuilder = require('../workflows/index.js');
const PersonaSystem = require('../persona/index.js');
const SettingsPage = require('../settings/index.js');

// ═══════════════════════════════════════════════════════════════
//  OPENDESKTOP CORE ENGINE — The Brain 🧠⚡
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
    this.hotkey = new GlobalHotkey(this.config, () => this._onHotkey());
    this.voice = new VoiceSystem(this.config, this);
    this.codeExecutor = new CodeExecutor(this.config);
    this.deployer = new Deployer(this.config);
    this.learning = new LearningSystem(this.config, this.memory);
    this.skillCreator = new SkillCreator(this.config);
    this.workflows = new WorkflowBuilder(this.config, this.automation, this.provider);
    this.persona = new PersonaSystem(this.config, this.memory);
    this.settings = new SettingsPage(this.config, this);
    this.sessions = new Map();
    this.currentSessionId = Date.now().toString(36);
    this.isRunning = false;
  }

  _onHotkey() { console.log(chalk.hex('#FF0000')('\n⚡ OpenDesktop summoned! ⚡\n')); }

  async start() {
    this.isRunning = true;
    this.memory.addEvent({ type: 'system', message: 'OpenDesktop session started' });
    await this.plugins.loadAll();
    if (this.config.get('messaging.enabled')) await this.messaging.init();
    if (this.config.get('hotkey.enabled')) await this.hotkey.start();
    if (this.config.get('persona.active')) this.persona.activatePersona(this.config.get('persona.active'));
    await this.chatLoop();
  }

  async chatLoop() {
    while (this.isRunning) {
      const personaName = this.persona.getActivePersona()?.displayName || '🤖';
      const { input } = await inquirer.prompt([{
        type: 'input', name: 'input',
        message: chalk.hex('#FF0000')('❯'),
        prefix: chalk.hex('#00FFFF')(`  ${personaName}`)
      }]);

      if (!input.trim()) continue;
      if (input.trim() === '/quit' || input.trim() === '/exit') {
        console.log(chalk.hex('#FF0000')('\n  👋 Goodbye! 🚀\n'));
        this.isRunning = false;
        process.exit(0);
      }

      this.learning.trackCommand(input);

      if (input.startsWith('/')) {
        await this.handleCommand(input);
        continue;
      }

      try {
        const processAnim = require('ora')({ text: '🧠 Thinking...', spinner: 'dots2', color: 'red' }).start();
        const context = this.buildContext();
        const personaPrompt = this.persona.getSystemPrompt();
        const systemPrompt = personaPrompt || `You are OpenDesktop, an advanced AI desktop agent on ${os.platform()} (${os.hostname()}).
You control the computer, run programs, manage files, browse the web, and automate tasks.
Be helpful, concise, proactive. Use emojis. Context:\n${context}`;

        const response = await this.provider.chat(input, { systemPrompt });
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
    const recentContext = recent.map(e => `[${e.timestamp}] ${e.type}: ${e.message || e.user || JSON.stringify(e)}`).join('\n');
    const suggestions = this.learning.getSuggestions().slice(0, 3).map(s => s.suggestion).join(', ');
    return `${sysInfo}\nMemory: ${stats.episodicCount} events, ${stats.taskCount} tasks\nSuggestions: ${suggestions}\nRecent:\n${recentContext}`;
  }

  formatResponse(text) {
    return text.split('\n').map(line => {
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
    const ora = require('ora');

    switch (cmd) {
      case '/help':
        console.log(require('boxen')([
          chalk.hex('#FF0000')('⚡ OpenDesktop — Full Command List ⚡'),
          '',
          chalk.hex('#FF0000')('═══ CORE ═══'),
          chalk.hex('#00FFFF')('/help') + chalk.hex('#888888')('             — Show this help'),
          chalk.hex('#00FFFF')('/settings') + chalk.hex('#888888')('          — Settings page'),
          chalk.hex('#00FFFF')('/status') + chalk.hex('#888888')('            — System status'),
          chalk.hex('#00FFFF')('/quit') + chalk.hex('#888888')('             — Exit'),
          '',
          chalk.hex('#FF0000')('═══ AI & MODELS ═══'),
          chalk.hex('#00FFFF')('/model <name>') + chalk.hex('#888888')('        — Switch model'),
          chalk.hex('#00FFFF')('/providers') + chalk.hex('#888888')('          — List providers'),
          chalk.hex('#00FFFF')('/models') + chalk.hex('#888888')('             — List models'),
          chalk.hex('#00FFFF')('/persona') + chalk.hex('#888888')('            — Manage personas'),
          chalk.hex('#00FFFF')('/reset') + chalk.hex('#888888')('             — Reset AI context'),
          '',
          chalk.hex('#FF0000')('═══ MEMORY ═══'),
          chalk.hex('#00FFFF')('/memory') + chalk.hex('#888888')('             — Memory dashboard'),
          chalk.hex('#00FFFF')('/search <q>') + chalk.hex('#888888')('         — Search memory'),
          chalk.hex('#00FFFF')('/export') + chalk.hex('#888888')('            — Export memory'),
          chalk.hex('#00FFFF')('/history') + chalk.hex('#888888')('            — Chat history'),
          '',
          chalk.hex('#FF0000')('═══ SCREEN & VISION ═══'),
          chalk.hex('#00FFFF')('/screen') + chalk.hex('#888888')('             — Screenshot & analyze'),
          chalk.hex('#00FFFF')('/vision <q>') + chalk.hex('#888888')('         — Analyze screen'),
          chalk.hex('#00FFFF')('/watch') + chalk.hex('#888888')('             — Start screen watch'),
          '',
          chalk.hex('#FF0000')('═══ SYSTEM ═══'),
          chalk.hex('#00FFFF')('/run <cmd>') + chalk.hex('#888888')('          — Run shell command'),
          chalk.hex('#00FFFF')('/open <app>') + chalk.hex('#888888')('         — Open application'),
          chalk.hex('#00FFFF')('/browse <url>') + chalk.hex('#888888')('       — Open URL'),
          chalk.hex('#00FFFF')('/system') + chalk.hex('#888888')('             — System info'),
          chalk.hex('#00FFFF')('/processes') + chalk.hex('#888888')('          — List processes'),
          chalk.hex('#00FFFF')('/clipboard') + chalk.hex('#888888')('          — Show clipboard'),
          chalk.hex('#00FFFF')('/network') + chalk.hex('#888888')('            — Network info'),
          chalk.hex('#00FFFF')('/ping <host>') + chalk.hex('#888888')('         — Ping host'),
          chalk.hex('#00FFFF')('/notify <msg>') + chalk.hex('#888888')('       — Desktop notification'),
          '',
          chalk.hex('#FF0000')('═══ CODE & DEPLOY ═══'),
          chalk.hex('#00FFFF')('/code <lang> <code>') + chalk.hex('#888888')('   — Execute code'),
          chalk.hex('#00FFFF')('/project <name> <tmpl>') + chalk.hex('#888888')(' — Create project'),
          chalk.hex('#00FFFF')('/deploy <target>') + chalk.hex('#888888')('      — Deploy project'),
          chalk.hex('#00FFFF')('/deployments') + chalk.hex('#888888')('          — Deployment targets'),
          '',
          chalk.hex('#FF0000')('═══ SKILLS & WORKFLOWS ═══'),
          chalk.hex('#00FFFF')('/plugins') + chalk.hex('#888888')('             — List plugins'),
          chalk.hex('#00FFFF')('/create-skill <desc>') + chalk.hex('#888888')('  — Create new skill'),
          chalk.hex('#00FFFF')('/workflow <desc>') + chalk.hex('#888888')('      — Create workflow'),
          chalk.hex('#00FFFF')('/run-wf <name>') + chalk.hex('#888888')('        — Run workflow'),
          chalk.hex('#00FFFF')('/workflows') + chalk.hex('#888888')('           — List workflows'),
          '',
          chalk.hex('#FF0000')('═══ VOICE ═══'),
          chalk.hex('#00FFFF')('/voice') + chalk.hex('#888888')('              — Voice settings'),
          chalk.hex('#00FFFF')('/speak <text>') + chalk.hex('#888888')('         — Text to speech'),
          chalk.hex('#00FFFF')('/listen') + chalk.hex('#888888')('             — Start listening'),
          '',
          chalk.hex('#FF0000')('═══ MESSAGING ═══'),
          chalk.hex('#00FFFF')('/messaging') + chalk.hex('#888888')('           — Messaging status'),
          chalk.hex('#00FFFF')('/send <platform> <msg>') + chalk.hex('#888888')('— Send message'),
          '',
          chalk.hex('#FF0000')('═══ APPEARANCE ═══'),
          chalk.hex('#00FFFF')('/theme <name>') + chalk.hex('#888888')('         — Change theme'),
          chalk.hex('#00FFFF')('/clear') + chalk.hex('#888888')('             — Clear screen')
        ].join('\n'), { padding: 1, borderStyle: 'round', borderColor: 'red', title: '⚡ Help', titleAlignment: 'center' }));
        break;

      case '/settings': await this.settings.show(); break;
      case '/providers': this.provider.listProviders().forEach(p => console.log(chalk.hex('#00FFFF')(`  ${p.name}`) + chalk.hex('#888888')(` — ${p.models.length} models`))); break;
      case '/models': this.provider.listModels().forEach(m => console.log(chalk.hex('#00FFFF')(`  • ${m}`))); break;
      case '/model': if (args) { this.provider.switchModel(args); console.log(chalk.hex('#00FF40')(`✅ Model: ${args}`)); } else this.provider.listModels().forEach(m => console.log(`  • ${m}`)); break;
      case '/reset': this.provider.clearHistory(); console.log(chalk.hex('#00FF40')('✅ Context reset')); break;

      case '/memory': {
        const stats = this.memory.getStats();
        const table = new (require('cli-table3'))({ head: [chalk.hex('#FF0000')('Type'), chalk.hex('#FF0000')('Count')], style: { border: ['red'] } });
        table.push(['📖 Episodic', stats.episodicCount], ['🧠 Semantic', stats.semanticCount], ['✅ Tasks', stats.taskCount], ['💬 Conversations', stats.conversationCount], ['📝 Facts', stats.factsCount]);
        console.log(table.toString());
        break;
      }

      case '/search': const results = this.memory.search(args); console.log(chalk.hex('#00FFFF')(`Found ${results.length} results:`)); results.slice(0, 10).forEach(r => console.log(chalk.hex('#888888')(`  [${r.type}]`) + ` ${JSON.stringify(r.data).slice(0, 120)}`)); break;

      case '/screen':
        const spin = ora('📸 Taking screenshot...').start();
        const shot = await this.vision.takeScreenshot();
        spin.stop();
        if (shot.error) { console.log(chalk.hex('#FF0000')(`❌ ${shot.error}`)); break; }
        console.log(chalk.hex('#00FF40')(`✅ Screenshot: ${shot.path}`));
        const analysis = await this.vision.analyzeScreen(shot.path, 'Describe what you see.');
        console.log(chalk.hex('#00FFFF')('👁️ ') + (analysis.analysis || analysis.error));
        break;

      case '/vision': const visResult = await this.vision.analyzeScreen(null, args || 'Describe the screen'); console.log(chalk.hex('#00FFFF')('👁️ ') + (visResult.analysis || visResult.error)); break;

      case '/watch': const watchResult = await this.vision.startWatching(5000, (a) => console.log(chalk.hex('#00FFFF')('👁️ ') + (a.analysis || ''))); console.log(chalk.hex('#00FF40')(`✅ Screen watching: ${watchResult.interval}ms`)); break;

      case '/run':
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /run <command>')); break; }
        const runOra = ora(`⚙️ Running: ${args}`).start();
        const result = await this.automation.runCommand(args);
        runOra.stop();
        console.log(result.success ? chalk.hex('#00FF40')('✅') : chalk.hex('#FF0000')('❌'));
        console.log(result.stdout || result.stderr || result.error);
        break;

      case '/open': await this.automation.openApp(args); console.log(chalk.hex('#00FF40')(`✅ Opening ${args}...`)); break;
      case '/browse': await this.automation.openBrowser(args || 'https://google.com'); console.log(chalk.hex('#00FF40')('✅ Opening browser...')); break;

      case '/system':
        const sys = await this.automation.getSystemInfo();
        console.log(require('boxen')([
          chalk.hex('#FF0000')('🖥️ System Info'),
          chalk.hex('#00FFFF')('OS: ') + `${sys.os.distro} ${sys.os.release}`,
          chalk.hex('#00FFFF')('CPU: ') + `${sys.cpu.brand} (${sys.cpu.cores} cores)`,
          chalk.hex('#00FFFF')('RAM: ') + `${Math.round(sys.memory.used / 1073741824)}GB / ${Math.round(sys.memory.total / 1073741824)}GB`
        ].join('\n'), { padding: 1, borderStyle: 'round', borderColor: 'red' }));
        break;

      case '/processes': const procs = await this.automation.listProcesses(); console.log((procs.stdout || '').split('\n').slice(0, 20).join('\n')); break;
      case '/clipboard': const clip = await this.automation.getClipboard(); console.log(chalk.hex('#00FFFF')('📋 ') + (clip.content || clip.stdout || 'Empty')); break;
      case '/network': const net = await this.automation.getNetworkInfo(); console.log(chalk.hex('#00FFFF')('🌐 Network:')); net.interfaces.filter(i => !i.internal).forEach(i => console.log(`  ${i.iface}: ${i.ip4} (${i.mac})`)); break;
      case '/ping': const pingResult = await this.automation.ping(args); console.log(pingResult.stdout || pingResult.error); break;
      case '/notify': await this.automation.notify('OpenDesktop', args || 'Hello!'); console.log(chalk.hex('#00FF40')('✅ Notification sent')); break;

      case '/code': {
        const parts = args.split(' ');
        const lang = parts[0];
        const code = parts.slice(1).join(' ');
        if (!lang) { console.log(chalk.hex('#FF0000')('Usage: /code <language> <code>')); break; }
        const codeResult = await this.codeExecutor.execute(code, lang);
        console.log(codeResult.success ? chalk.hex('#00FF40')('✅ Output:') : chalk.hex('#FF0000')('❌ Error:'));
        console.log(codeResult.output || codeResult.error);
        break;
      }

      case '/project': {
        const parts = args.split(' ');
        const projResult = await this.codeExecutor.createProject(parts[0], 'javascript', parts[1]);
        console.log(chalk.hex('#00FF40')(`✅ Project created: ${projResult.path}`));
        break;
      }

      case '/deploy': {
        const parts = args.split(' ');
        const deployResult = await this.deployer.deploy(parts[0], parts[1] || '.', {});
        console.log(deployResult.success ? chalk.hex('#00FF40')('✅ Deployed!') : chalk.hex('#FF0000')(`❌ ${deployResult.error}`));
        break;
      }

      case '/deployments': this.deployer.getSupportedTargets().forEach(t => console.log(chalk.hex('#00FFFF')(`  • ${t}`))); break;

      case '/plugins': this.plugins.getBuiltInSkills().forEach(p => console.log(chalk.hex('#00FFFF')(`  ${p.command}`) + chalk.hex('#888888')(` — ${p.description}`))); break;

      case '/create-skill': {
        const skillResult = await this.skillCreator.generateSkill(args || 'A custom skill');
        console.log(chalk.hex('#00FF40')(`✅ Skill created: ${skillResult.name}`));
        console.log(chalk.hex('#888888')(`   Path: ${skillResult.path}`));
        break;
      }

      case '/workflow': {
        const wfResult = await this.workflows.generateWorkflow(args);
        console.log(wfResult.created ? chalk.hex('#00FF40')(`✅ Workflow created: ${wfResult.workflow.name}`) : chalk.hex('#FF0000')(`❌ ${wfResult.error}`));
        break;
      }

      case '/run-wf': {
        const wfRun = await this.workflows.runWorkflow(args);
        console.log(wfRun.success ? chalk.hex('#00FF40')(`✅ Workflow completed in ${wfRun.duration}ms`) : chalk.hex('#FF0000')(`❌ ${wfRun.error}`));
        if (wfRun.results) wfRun.results.forEach(r => console.log(`  ${r.success ? '✅' : '❌'} ${r.step}`));
        break;
      }

      case '/workflows': this.workflows.listWorkflows().forEach(w => console.log(chalk.hex('#00FFFF')(`  ${w.name}`) + chalk.hex('#888888')(` — ${w.steps} steps, ${w.runs} runs`))); break;

      case '/persona': {
        const personas = this.persona.listPersonas();
        const presets = this.persona.getPresets();
        console.log(chalk.hex('#FF0000')('\n  Presets:'));
        presets.forEach(p => console.log(chalk.hex('#00FFFF')(`    ${p.displayName}`) + chalk.hex('#888888')(` — ${p.description}`)));
        if (personas.length) { console.log(chalk.hex('#FF0000')('\n  Custom:')); personas.forEach(p => console.log(chalk.hex('#00FFFF')(`    ${p.name}`) + chalk.hex('#888888')(` — ${p.description || p.tone}`))); }
        if (args) { this.persona.activatePersona(args); console.log(chalk.hex('#00FF40')(`✅ Activated: ${args}`)); }
        break;
      }

      case '/voice': console.log(JSON.stringify(this.voice.getStatus(), null, 2)); break;
      case '/speak': await this.voice.speak(args || 'Hello from OpenDesktop!'); break;
      case '/listen': await this.voice.startListening(); console.log(chalk.hex('#00FF40')('🎤 Listening...')); break;

      case '/messaging': console.log(JSON.stringify(this.messaging.getStatus(), null, 2)); break;

      case '/send': {
        const [platform, ...msgParts] = args.split(' ');
        const msg = msgParts.join(' ');
        if (!platform || !msg) { console.log(chalk.hex('#FF0000')('Usage: /send <platform> <message>')); break; }
        const sendResult = await this.messaging.sendMessage(platform, 'default', msg);
        console.log(sendResult.error ? chalk.hex('#FF0000')(`❌ ${sendResult.error}`) : chalk.hex('#00FF40')('✅ Sent'));
        break;
      }

      case '/theme':
        if (args) { this.config.set('theme', args); console.log(chalk.hex('#00FF40')(`✅ Theme: ${args}`)); }
        else console.log('Themes: hacker-red, matrix, cyberpunk, minimal, vaporwave');
        break;

      case '/history':
        this.memory.getEvents({ limit: 10 }).forEach(e => {
          const time = e.timestamp?.slice(11, 19) || '-';
          if (e.user) console.log(chalk.hex('#888888')(time) + chalk.hex('#00FFFF')(' 👤 ') + String(e.user).slice(0, 80));
          if (e.assistant) console.log(chalk.hex('#888888')(time) + chalk.hex('#FF0000')(' 🤖 ') + String(e.assistant).slice(0, 80));
        });
        break;

      case '/export': const data = this.memory.exportAll(); const p = path.join(os.homedir(), '.opendesktop', 'memory-export.json'); fs.writeFileSync(p, JSON.stringify(data, null, 2)); console.log(chalk.hex('#00FF40')(`✅ Exported to ${p}`)); break;
      case '/clear': process.stdout.write('\x1B[2J\x1B[0f'); break;

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
  async stop() { this.isRunning = false; this.memory.addEvent({ type: 'system', message: 'OpenDesktop session ended' }); }
}

module.exports = OpenDesktopEngine;
