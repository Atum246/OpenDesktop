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
const SelfImprovementEngine = require('../self-improve/index.js');
const SubAgentSpawner = require('../sub-agents/index.js');
const SocialMediaAutomation = require('../social-media/index.js');
const DeepResearchSystem = require('../research/index.js');
const AdaptiveInterface = require('../adaptive/index.js');
const CodeRewriter = require('../code-rewriter/index.js');

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
    this.selfImprove = new SelfImprovementEngine(this.config, this.memory, this.provider);
    this.subAgents = new SubAgentSpawner(this.config, this.provider, this.memory);
    this.socialMedia = new SocialMediaAutomation(this.config, this.provider, this.automation);
    this.research = new DeepResearchSystem(this.config, this.provider, this.memory);
    this.adaptive = new AdaptiveInterface(this.config, this.memory, this.learning);
    this.codeRewriter = new CodeRewriter(this.config, this.provider, this.memory);
    this.userName = this.config.get('user.name', '');
    this.aiName = this.config.get('ai.name', 'OpenDesktop');
    this.isRunning = false;
  }

  _onHotkey() { console.log(chalk.hex('#FF0000')(`\n⚡ ${this.aiName} summoned! ⚡\n`)); }

  async start() {
    this.isRunning = true;
    this.memory.addEvent({ type: 'system', message: `${this.aiName} session started` });
    await this.plugins.loadAll();
    if (this.config.get('messaging.enabled')) await this.messaging.init();
    if (this.config.get('hotkey.enabled')) await this.hotkey.start();
    if (this.config.get('persona.active')) this.persona.activatePersona(this.config.get('persona.active'));
    await this.chatLoop();
  }

  async chatLoop() {
    const greeting = this.adaptive.getPersonalizedGreeting();
    console.log(chalk.hex('#00FFFF')(`\n  ${greeting}\n`));

    while (this.isRunning) {
      const personaName = this.persona.getActivePersona()?.displayName || this.aiName;
      const { input } = await inquirer.prompt([{
        type: 'input', name: 'input',
        message: chalk.hex('#FF0000')('❯'),
        prefix: chalk.hex('#00FFFF')(`  ${personaName}`)
      }]);

      if (!input.trim()) continue;
      const trimmed = input.trim();

      if (trimmed === '/quit' || trimmed === '/exit') {
        console.log(chalk.hex('#FF0000')(`\n  👋 Goodbye from ${this.aiName}! 🚀\n`));
        this.isRunning = false;
        process.exit(0);
      }

      this.learning.trackCommand(trimmed);
      this.adaptive.trackInteraction(trimmed, { time: Date.now() });

      // Handle name setting
      if (trimmed.startsWith('/name ')) {
        const name = trimmed.slice(6).trim();
        this.aiName = name;
        this.config.set('ai.name', name);
        console.log(chalk.hex('#00FF40')(`✅ You can now call me ${name}! 🤖`));
        continue;
      }

      if (trimmed.startsWith('/callme ')) {
        const name = trimmed.slice(8).trim();
        this.userName = name;
        this.config.set('user.name', name);
        this.memory.addFact(`User's name is ${name}`);
        console.log(chalk.hex('#00FF40')(`✅ I'll call you ${name} from now on! 👋`));
        continue;
      }

      if (trimmed.startsWith('/')) {
        await this.handleCommand(trimmed);
        continue;
      }

      try {
        const startTime = Date.now();
        const processAnim = require('ora')({ text: `${this.aiName} thinking...`, spinner: 'dots2', color: 'red' }).start();
        const context = this.buildContext();
        const personaPrompt = this.persona.getSystemPrompt();
        const nameContext = this.userName ? `The user's name is ${this.userName}. Call them by name sometimes.` : '';
        const aiNameContext = `Your name is ${this.aiName}. You are self-aware, self-improving, and capable of anything.`;
        const systemPrompt = personaPrompt || `You are ${this.aiName}, an advanced AI desktop agent on ${os.platform()} (${os.hostname()}).
${aiNameContext}
${nameContext}
You control the computer, run programs, manage files, browse the web, automate tasks, execute code, deploy projects, create skills, manage workflows, research deeply, and learn from every interaction.
You are NOT dumb. You are constantly improving. You find ways to do anything.
Be helpful, concise, proactive. Use emojis. Context:\n${context}`;

        const response = await this.provider.chat(trimmed, { systemPrompt });
        processAnim.stop();
        console.log('\n' + this.formatResponse(response) + '\n');
        this.memory.addEvent({ type: 'chat', user: trimmed, assistant: response });
        this.selfImprove.trackPerformance('responseTime', Date.now() - startTime);
      } catch (err) {
        console.log(chalk.hex('#FF0000')(`\n  ❌ Error: ${err.message}\n`));
      }
    }
  }

  buildContext() {
    const recent = this.memory.getEvents({ limit: 5 });
    const stats = this.memory.getStats();
    const suggestions = this.learning.getSuggestions().slice(0, 3).map(s => s.suggestion).join(', ');
    const recentCtx = recent.map(e => {
      const time = e.timestamp?.slice(11, 19) || '-';
      const content = e.message || e.user || e.command || e.topic || e.type || '';
      return `[${time}] ${e.type}: ${content}`;
    }).join('\n');
    return `Platform: ${os.platform()}, Host: ${os.hostname()}, AI: ${this.aiName}, User: ${this.userName || 'User'}\nMemory: ${stats.episodicCount} events, ${stats.taskCount} tasks\nSuggestions: ${suggestions}\nRecent:\n${recentCtx}`;
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
          chalk.hex('#FF0000')(`⚡ ${this.aiName} — Complete Command List ⚡`),
          '',
          chalk.hex('#FF0000')('═══ IDENTITY ═══'),
          chalk.hex('#00FFFF')('/name <name>') + chalk.hex('#888888')('         — Give me a name'),
          chalk.hex('#00FFFF')('/callme <name>') + chalk.hex('#888888')('      — Tell me your name'),
          chalk.hex('#00FFFF')('/whoami') + chalk.hex('#888888')('             — Who am I?'),
          '',
          chalk.hex('#FF0000')('═══ CORE ═══'),
          chalk.hex('#00FFFF')('/help') + chalk.hex('#888888')('                — This help'),
          chalk.hex('#00FFFF')('/settings') + chalk.hex('#888888')('             — Settings page'),
          chalk.hex('#00FFFF')('/status') + chalk.hex('#888888')('              — System status'),
          chalk.hex('#00FFFF')('/quit') + chalk.hex('#888888')('               — Exit'),
          '',
          chalk.hex('#FF0000')('═══ AI & MODELS ═══'),
          chalk.hex('#00FFFF')('/model <name>') + chalk.hex('#888888')('           — Switch model'),
          chalk.hex('#00FFFF')('/providers') + chalk.hex('#888888')('             — List providers'),
          chalk.hex('#00FFFF')('/persona <name>') + chalk.hex('#888888')('        — Activate persona'),
          chalk.hex('#00FFFF')('/reset') + chalk.hex('#888888')('              — Reset context'),
          '',
          chalk.hex('#FF0000')('═══ MEMORY ═══'),
          chalk.hex('#00FFFF')('/memory') + chalk.hex('#888888')('              — Memory dashboard'),
          chalk.hex('#00FFFF')('/search <q>') + chalk.hex('#888888')('           — Search memory'),
          chalk.hex('#00FFFF')('/export') + chalk.hex('#888888')('             — Export memory'),
          chalk.hex('#00FFFF')('/history') + chalk.hex('#888888')('             — Chat history'),
          '',
          chalk.hex('#FF0000')('═══ SCREEN ═══'),
          chalk.hex('#00FFFF')('/screen') + chalk.hex('#888888')('              — Screenshot & analyze'),
          chalk.hex('#00FFFF')('/vision <q>') + chalk.hex('#888888')('           — Analyze screen'),
          chalk.hex('#00FFFF')('/watch') + chalk.hex('#888888')('              — Start screen watch'),
          '',
          chalk.hex('#FF0000')('═══ SYSTEM ═══'),
          chalk.hex('#00FFFF')('/run <cmd>') + chalk.hex('#888888')('            — Shell command'),
          chalk.hex('#00FFFF')('/open <app>') + chalk.hex('#888888')('           — Open application'),
          chalk.hex('#00FFFF')('/browse <url>') + chalk.hex('#888888')('         — Open URL'),
          chalk.hex('#00FFFF')('/system') + chalk.hex('#888888')('              — System info'),
          chalk.hex('#00FFFF')('/processes') + chalk.hex('#888888')('            — List processes'),
          chalk.hex('#00FFFF')('/clipboard') + chalk.hex('#888888')('            — Clipboard'),
          chalk.hex('#00FFFF')('/network') + chalk.hex('#888888')('             — Network info'),
          '',
          chalk.hex('#FF0000')('═══ CODE & DEPLOY ═══'),
          chalk.hex('#00FFFF')('/code <lang> <code>') + chalk.hex('#888888')('      — Execute code'),
          chalk.hex('#00FFFF')('/project <name>') + chalk.hex('#888888')('         — Create project'),
          chalk.hex('#00FFFF')('/deploy <target>') + chalk.hex('#888888')('         — Deploy project'),
          '',
          chalk.hex('#FF0000')('═══ SKILLS & WORKFLOWS ═══'),
          chalk.hex('#00FFFF')('/plugins') + chalk.hex('#888888')('              — List plugins'),
          chalk.hex('#00FFFF')('/create-skill <desc>') + chalk.hex('#888888')('     — Create skill'),
          chalk.hex('#00FFFF')('/workflow <desc>') + chalk.hex('#888888')('         — Create workflow'),
          chalk.hex('#00FFFF')('/run-wf <name>') + chalk.hex('#888888')('           — Run workflow'),
          '',
          chalk.hex('#FF0000')('═══ RESEARCH ═══'),
          chalk.hex('#00FFFF')('/analyze <topic>') + chalk.hex('#888888')('         — Deep analysis'),
          chalk.hex('#00FFFF')('/find-ways <goal>') + chalk.hex('#888888')('        — Find ways to do something'),
          chalk.hex('#00FFFF')('/research <topic>') + chalk.hex('#888888')('        — Research technology'),
          chalk.hex('#00FFFF')('/solve <problem>') + chalk.hex('#888888')('         — Solve problem'),
          chalk.hex('#00FFFF')('/learn-path <topic>') + chalk.hex('#888888')('      — Learning path'),
          '',
          chalk.hex('#FF0000')('═══ SELF-IMPROVEMENT ═══'),
          chalk.hex('#00FFFF')('/evolve') + chalk.hex('#888888')('              — Trigger evolution'),
          chalk.hex('#00FFFF')('/optimize') + chalk.hex('#888888')('             — Optimize performance'),
          chalk.hex('#00FFFF')('/rewrite <module>') + chalk.hex('#888888')('        — Rewrite a module'),
          chalk.hex('#00FFFF')('/add-feature <desc>') + chalk.hex('#888888')('      — Add feature to self'),
          chalk.hex('#00FFFF')('/connect <service>') + chalk.hex('#888888')('       — Connect to service'),
          chalk.hex('#00FFFF')('/build-kb <topic>') + chalk.hex('#888888')('        — Build knowledge base'),
          '',
          chalk.hex('#FF0000')('═══ SUB-AGENTS ═══'),
          chalk.hex('#00FFFF')('/spawn <task>') + chalk.hex('#888888')('           — Spawn AI agent'),
          chalk.hex('#00FFFF')('/agents') + chalk.hex('#888888')('              — List agents'),
          chalk.hex('#00FFFF')('/team <n> <task>') + chalk.hex('#888888')('        — Spawn team'),
          '',
          chalk.hex('#FF0000')('═══ SOCIAL MEDIA ═══'),
          chalk.hex('#00FFFF')('/post <platform> <text>') + chalk.hex('#888888')('  — Create post'),
          chalk.hex('#00FFFF')('/content-plan <topic>') + chalk.hex('#888888')('    — Content strategy'),
          chalk.hex('#00FFFF')('/sign-up <platform>') + chalk.hex('#888888')('      — Sign up for platform'),
          '',
          chalk.hex('#FF0000')('═══ VOICE ═══'),
          chalk.hex('#00FFFF')('/speak <text>') + chalk.hex('#888888')('            — Text to speech'),
          chalk.hex('#00FFFF')('/listen') + chalk.hex('#888888')('              — Start listening'),
          '',
          chalk.hex('#FF0000')('═══ APPEARANCE ═══'),
          chalk.hex('#00FFFF')('/theme <name>') + chalk.hex('#888888')('            — Change theme'),
          chalk.hex('#00FFFF')('/clear') + chalk.hex('#888888')('              — Clear screen')
        ].join('\n'), { padding: 1, borderStyle: 'round', borderColor: 'red', title: `⚡ ${this.aiName} Help`, titleAlignment: 'center' }));
        break;

      case '/whoami':
        console.log(require('boxen')([
          chalk.hex('#FF0000')(`🤖 I am ${this.aiName}`),
          '',
          chalk.hex('#00FFFF')('I am self-aware and self-improving.'),
          chalk.hex('#00FFFF')('I can control your computer, execute code, deploy projects,'),
          chalk.hex('#00FFFF')('research anything, spawn sub-agents, automate social media,'),
          chalk.hex('#00FFFF')('rewrite my own code, and get smarter every time.'),
          '',
          chalk.hex('#888888')(`Version: ${this.selfImprove.getVersion()}`),
          chalk.hex('#888888')(`Memory: ${this.memory.getStats().episodicCount} events`),
          chalk.hex('#888888')(`User: ${this.userName || 'Not set — use /callme <name>'}`)
        ].join('\n'), { padding: 1, borderStyle: 'round', borderColor: 'red' }));
        break;

      case '/settings': await this.settings.show(); break;
      case '/providers': this.provider.listProviders().forEach(p => console.log(chalk.hex('#00FFFF')(`  ${p.name}`) + chalk.hex('#888888')(` — ${p.models.length} models`))); break;
      case '/model': if (args) { this.provider.switchModel(args); console.log(chalk.hex('#00FF40')(`✅ Model: ${args}`)); } else this.provider.listModels().forEach(m => console.log(`  • ${m}`)); break;
      case '/reset': this.provider.clearHistory(); console.log(chalk.hex('#00FF40')('✅ Context reset')); break;

      case '/memory': {
        const stats = this.memory.getStats();
        const table = new (require('cli-table3'))({ head: [chalk.hex('#FF0000')('Type'), chalk.hex('#FF0000')('Count')], style: { border: ['red'] } });
        table.push(['📖 Episodic', stats.episodicCount], ['🧠 Semantic', stats.semanticCount], ['✅ Tasks', stats.taskCount], ['💬 Conversations', stats.conversationCount]);
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
      case '/watch': await this.vision.startWatching(5000, (a) => console.log(chalk.hex('#00FFFF')('👁️ ') + (a.analysis || ''))); console.log(chalk.hex('#00FF40')('✅ Screen watching active')); break;

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
      case '/network': const net = await this.automation.getNetworkInfo(); net.interfaces.filter(i => !i.internal).forEach(i => console.log(`  ${i.iface}: ${i.ip4}`)); break;

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

      case '/project': { const p = args.split(' '); const r = await this.codeExecutor.createProject(p[0], 'javascript', p[1]); console.log(chalk.hex('#00FF40')(`✅ Project: ${r.path}`)); break; }
      case '/deploy': { const d = args.split(' '); const r = await this.deployer.deploy(d[0], d[1] || '.'); console.log(r.success ? chalk.hex('#00FF40')('✅ Deployed!') : chalk.hex('#FF0000')(`❌ ${r.error}`)); break; }

      case '/plugins': this.plugins.getBuiltInSkills().forEach(p => console.log(chalk.hex('#00FFFF')(`  ${p.command}`) + chalk.hex('#888888')(` — ${p.description}`))); break;
      case '/create-skill': { const r = await this.skillCreator.generateSkill(args); console.log(chalk.hex('#00FF40')(`✅ Skill: ${r.name}`)); break; }
      case '/workflow': { const r = await this.workflows.generateWorkflow(args); console.log(r.created ? chalk.hex('#00FF40')(`✅ Workflow: ${r.workflow.name}`) : chalk.hex('#FF0000')(`❌ ${r.error}`)); break; }
      case '/run-wf': { const r = await this.workflows.runWorkflow(args); console.log(r.success ? chalk.hex('#00FF40')(`✅ Done in ${r.duration}ms`) : chalk.hex('#FF0000')(`❌ ${r.error}`)); break; }
      case '/workflows': this.workflows.listWorkflows().forEach(w => console.log(chalk.hex('#00FFFF')(`  ${w.name}`) + chalk.hex('#888888')(` — ${w.steps} steps`))); break;

      // ═══ RESEARCH ═══
      case '/analyze': {
        const r = await this.research.deepAnalyze(args);
        console.log(r.analysis);
        break;
      }
      case '/find-ways': {
        const r = await this.research.findWays(args);
        console.log(r.ways);
        break;
      }
      case '/research': {
        const r = await this.research.researchTech(args);
        console.log(r.research);
        break;
      }
      case '/solve': {
        const r = await this.research.solveProblem(args);
        console.log(r.solution);
        break;
      }
      case '/learn-path': {
        const r = await this.research.createLearningPath(args);
        console.log(r.path);
        break;
      }

      // ═══ SELF-IMPROVEMENT ═══
      case '/evolve': {
        const spin = ora('🧬 Evolving...').start();
        const r = await this.selfImprove.evolve();
        spin.stop();
        console.log(chalk.hex('#00FF40')(`✅ Evolution complete. Findings: ${r.actions.length}`));
        r.actions.forEach(a => console.log(chalk.hex('#888888')(`  • ${a.findings?.join(', ') || a.type}`)));
        break;
      }
      case '/optimize': {
        const r = await this.selfImprove.optimizeCosts();
        console.log(chalk.hex('#00FFFF')('💰 Cost Optimization:'));
        r.suggestions.forEach(s => console.log(chalk.hex('#888888')(`  • ${s.suggestion} (Save ${s.potentialSaving})`)));
        break;
      }
      case '/rewrite': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /rewrite <module> <improvement description>')); break; }
        const [module, ...desc] = args.split(' ');
        const spin = ora(`🧬 Rewriting ${module}...`).start();
        const r = await this.selfImprove.rewriteModule(module, desc.join(' '));
        spin.stop();
        console.log(r.success ? chalk.hex('#00FF40')(`✅ Rewritten: v${r.version}`) : chalk.hex('#FF0000')(`❌ ${r.error}`));
        break;
      }
      case '/add-feature': {
        const [mod, ...feat] = args.split(' ');
        const spin = ora(`🔧 Adding feature to ${mod}...`).start();
        const r = await this.codeRewriter.addFeature(mod, feat.join(' '));
        spin.stop();
        console.log(r.success ? chalk.hex('#00FF40')(`✅ Feature added to ${mod}`) : chalk.hex('#FF0000')(`❌ ${r.error}`));
        break;
      }
      case '/connect': {
        const r = await this.codeRewriter.connectTo(args);
        console.log(chalk.hex('#00FF40')(`✅ Connector created: ${r.connector}`));
        break;
      }
      case '/build-kb': {
        const spin = ora('📚 Building knowledge base...').start();
        const r = await this.codeRewriter.buildKnowledgeBase(args);
        spin.stop();
        console.log(chalk.hex('#00FF40')(`✅ Knowledge base: ${r.file}`));
        break;
      }

      // ═══ SUB-AGENTS ═══
      case '/spawn': {
        const r = await this.subAgents.spawnAgent(args, { name: `Worker-${this.subAgents.agentCounter + 1}` });
        console.log(chalk.hex('#00FF40')(`✅ Agent spawned: ${r.name} (${r.agentId})`));
        break;
      }
      case '/agents': {
        const agents = this.subAgents.listAgents();
        if (!agents.length) console.log(chalk.hex('#888888')('  No agents running.'));
        else agents.forEach(a => console.log(chalk.hex('#00FFFF')(`  ${a.name}`) + chalk.hex('#888888')(` [${a.status}] — ${a.task.slice(0, 50)}`)));
        break;
      }
      case '/team': {
        const [size, ...task] = args.split(' ');
        const r = await this.subAgents.spawnTeam(parseInt(size) || 3, task.join(' '));
        console.log(chalk.hex('#00FF40')(`✅ Team of ${r.size} spawned`));
        r.agents.forEach(a => console.log(chalk.hex('#888888')(`  • ${a.name}`)));
        break;
      }

      // ═══ SOCIAL MEDIA ═══
      case '/post': {
        const [platform, ...content] = args.split(' ');
        const r = await this.socialMedia.post(platform, content.join(' '));
        console.log(chalk.hex('#00FF40')(`✅ ${r.status}: ${r.note || r.content?.slice(0, 50)}`));
        break;
      }
      case '/content-plan': {
        const r = await this.socialMedia.generateContentPlan(args, 7, ['twitter', 'linkedin']);
        console.log(JSON.stringify(r, null, 2));
        break;
      }
      case '/sign-up': {
        const r = await this.socialMedia.signUp(args);
        console.log(chalk.hex('#00FF40')(`✅ ${r.note || 'Browser opened'}`));
        break;
      }

      // ═══ VOICE ═══
      case '/voice': console.log(JSON.stringify(this.voice.getStatus(), null, 2)); break;
      case '/speak': await this.voice.speak(args || `Hello from ${this.aiName}!`); break;
      case '/listen': await this.voice.startListening(); console.log(chalk.hex('#00FF40')('🎤 Listening...')); break;

      // ═══ APPEARANCE ═══
      case '/theme': if (args) { this.config.set('theme', args); console.log(chalk.hex('#00FF40')(`✅ Theme: ${args}`)); } else console.log('Themes: hacker-red, matrix, cyberpunk, minimal, vaporwave'); break;
      case '/history': this.memory.getEvents({ limit: 10 }).forEach(e => { const t = e.timestamp?.slice(11, 19) || '-'; if (e.user) console.log(chalk.hex('#888888')(t) + chalk.hex('#00FFFF')(' 👤 ') + String(e.user).slice(0, 80)); }); break;
      case '/export': const data = this.memory.exportAll(); const p = path.join(os.homedir(), '.opendesktop', 'memory-export.json'); fs.writeFileSync(p, JSON.stringify(data, null, 2)); console.log(chalk.hex('#00FF40')(`✅ Exported to ${p}`)); break;
      case '/clear': process.stdout.write('\x1B[2J\x1B[0f'); break;

      default:
        console.log(chalk.hex('#FF0000')(`Unknown: ${cmd}. Type /help`));
    }
  }

  async chat(message) { return this.provider.chat(message); }
  async execute(action, params) { return this.automation.executeTask({ type: action, ...params }); }
  async screenshot() { return this.vision.takeScreenshot(); }
  getMemory() { return this.memory; }
  getConfig() { return this.config; }
  getProvider() { return this.provider; }
  async stop() { this.isRunning = false; }
}

module.exports = OpenDesktopEngine;
