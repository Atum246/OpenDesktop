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
const WebSearchEngine = require('../web-search/index.js');
const IoTController = require('../iot/index.js');
const SecurityModule = require('../security/index.js');
const ProgramInstaller = require('../program-installer/index.js');
const AgentOrchestrator = require('../orchestrator/index.js');
const ModelTrainer = require('../model-trainer/index.js');
const ContextualBrain = require('../brain/index.js');
const ProactiveEngine = require('../proactive/index.js');
const DeepOSIntegration = require('../os-integration/index.js');
const VisualUnderstanding = require('../visual-understanding/index.js');
const EvolutionEngine = require('../evolution/index.js');
const APIGateway = require('../api-gateway/index.js');
const CodeIntelligence = require('../code-intelligence/index.js');
const TrustSafety = require('../trust-safety/index.js');

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
    this.webSearch = new WebSearchEngine(this.config);
    this.iot = new IoTController(this.config);
    this.security = new SecurityModule(this.config);
    this.installer = new ProgramInstaller(this.config);
    this.orchestrator = new AgentOrchestrator(this.config, this.provider, this.memory);
    this.modelTrainer = new ModelTrainer(this.config, this.provider, this.memory);

    // ═══ LEGENDARY FEATURES ═══
    this.brain = new ContextualBrain(this.config, this.memory);
    this.proactive = new ProactiveEngine(this.config, this.brain, this.memory, this.automation, this.provider);
    this.osIntegration = new DeepOSIntegration(this.config, this.brain);
    this.visualUnderstanding = new VisualUnderstanding(this.config, this.provider, this.vision);
    this.evolution = new EvolutionEngine(this.config, this.brain, this.memory, this.provider);
    this.apiGateway = new APIGateway(this.config, this);
    this.codeIntel = new CodeIntelligence(this.config, this.provider, this.memory);
    this.trustSafety = new TrustSafety(this.config, this.security);

    this.userName = this.config.get('user.name', '');
    this.aiName = this.config.get('ai.name', 'OpenDesktop');
    this.isRunning = false;

    // Start proactive monitoring
    this.proactive.start();
    this.osIntegration.start();
  }

  _onHotkey() {
    console.log(chalk.hex('#FF0000')(`\n⚡ ${this.aiName} summoned! ⚡\n`));
    // Launch hybrid GUI
    try {
      const { summon } = require('../gui/index.js');
      summon().catch(() => {});
    } catch {}
  }

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

        // Learn from interaction
        this.brain.learnFromConversation(trimmed, response);
        this.evolution.logInteraction({ type: 'chat', input: trimmed, output: response, success: true, duration: Date.now() - startTime, model: this.provider.model });
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

    // Brain context — weighted knowledge graph
    const brainContext = this.brain.getContextSummary(500);

    // Proactive insights
    const insights = this.proactive.getActiveInsights().slice(0, 3);
    const insightStr = insights.length ? '\nInsights: ' + insights.map(i => i.message).join('; ') : '';

    // Evolution status
    const evoStatus = this.evolution.getStatus();
    const corrections = this.evolution.getRelevantCorrections(recent.map(e => e.message || '').join(' '), 2);
    const correctionStr = corrections.length ? '\nRecent corrections: ' + corrections.map(c => `I said "${c.original.slice(0, 50)}" but should have said "${c.corrected.slice(0, 50)}"`).join('; ') : '';

    return `Platform: ${os.platform()}, Host: ${os.hostname()}, AI: ${this.aiName}, User: ${this.userName || 'User'}\nMemory: ${stats.episodicCount} events, ${stats.taskCount} tasks\nBrain: ${brainContext ? 'Active' : 'Empty'} | Evolution: v${evoStatus.version} | Score: ${evoStatus.improvementScore}\nSuggestions: ${suggestions}${insightStr}${correctionStr}\nRecent:\n${recentCtx}`;
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
          chalk.hex('#00FFFF')('/memory-search <q>') + chalk.hex('#888888')('    — Search memory'),
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
          chalk.hex('#00FFFF')('/clear') + chalk.hex('#888888')('              — Clear screen'),
          '',
          chalk.hex('#FF0000')('═══ WEB SEARCH ═══'),
          chalk.hex('#00FFFF')('/web-search <query>') + chalk.hex('#888888')('     — Web search'),
          chalk.hex('#00FFFF')('/deep-search <topic>') + chalk.hex('#888888')('    — Deep search'),
          chalk.hex('#00FFFF')('/scrape <url>') + chalk.hex('#888888')('          — Scrape URL'),
          '',
          chalk.hex('#FF0000')('═══ 🧠 BRAIN ═══'),
          chalk.hex('#00FFFF')('/brain') + chalk.hex('#888888')('              — Brain status'),
          chalk.hex('#00FFFF')('/brain-query <q>') + chalk.hex('#888888')('      — Query knowledge graph'),
          chalk.hex('#00FFFF')('/brain-decay') + chalk.hex('#888888')('         — Forget unimportant'),
          chalk.hex('#00FFFF')('/brain-consolidate') + chalk.hex('#888888')('   — Merge duplicates'),
          '',
          chalk.hex('#FF0000')('═══ 🔮 PROACTIVE ═══'),
          chalk.hex('#00FFFF')('/proactive') + chalk.hex('#888888')('          — Proactive status'),
          chalk.hex('#00FFFF')('/insights') + chalk.hex('#888888')('           — Active insights'),
          chalk.hex('#00FFFF')('/add-rule <a> when <c>') + chalk.hex('#888888')(' — Add automation rule'),
          '',
          chalk.hex('#FF0000')('═══ 🖥️ OS INTEGRATION ═══'),
          chalk.hex('#00FFFF')('/os') + chalk.hex('#888888')('                — OS status'),
          chalk.hex('#00FFFF')('/watch <dir>') + chalk.hex('#888888')('         — Watch directory'),
          chalk.hex('#00FFFF')('/active-window') + chalk.hex('#888888')('      — Current window'),
          chalk.hex('#00FFFF')('/open-windows') + chalk.hex('#888888')('      — List windows'),
          chalk.hex('#00FFFF')('/sys-events') + chalk.hex('#888888')('         — System events'),
          chalk.hex('#00FFFF')('/lock') + chalk.hex('#888888')('              — Lock screen'),
          chalk.hex('#00FFFF')('/sleep') + chalk.hex('#888888')('             — Sleep'),
          chalk.hex('#00FFFF')('/empty-trash') + chalk.hex('#888888')('       — Empty trash'),
          '',
          chalk.hex('#FF0000')('═══ 👁️ VISUAL ═══'),
          chalk.hex('#00FFFF')('/find-element <desc>') + chalk.hex('#888888')('  — Find UI element'),
          chalk.hex('#00FFFF')('/click <desc>') + chalk.hex('#888888')('        — Click element'),
          chalk.hex('#00FFFF')('/type-at <el> <text>') + chalk.hex('#888888')('  — Type at element'),
          chalk.hex('#00FFFF')('/screen-diff') + chalk.hex('#888888')('         — Compare screenshots'),
          chalk.hex('#00FFFF')('/read-screen') + chalk.hex('#888888')('        — Read screen text'),
          '',
          chalk.hex('#FF0000')('═══ 🧬 EVOLUTION ═══'),
          chalk.hex('#00FFFF')('/evolve') + chalk.hex('#888888')('             — Trigger evolution'),
          chalk.hex('#00FFFF')('/evolution') + chalk.hex('#888888')('          — Evolution status'),
          chalk.hex('#00FFFF')('/correct <w> → <r>') + chalk.hex('#888888')('    — Teach correction'),
          chalk.hex('#00FFFF')('/skills') + chalk.hex('#888888')('             — View skills'),
          '',
          chalk.hex('#FF0000')('═══ 🌐 API GATEWAY ═══'),
          chalk.hex('#00FFFF')('/api') + chalk.hex('#888888')('                — API status'),
          chalk.hex('#00FFFF')('/api-start') + chalk.hex('#888888')('          — Start API server'),
          chalk.hex('#00FFFF')('/api-stop') + chalk.hex('#888888')('           — Stop API server'),
          chalk.hex('#00FFFF')('/api-key <key>') + chalk.hex('#888888')('       — Add API key'),
          chalk.hex('#00FFFF')('/webhook <n> <u>') + chalk.hex('#888888')('      — Register webhook'),
          chalk.hex('#00FFFF')('/broadcast <e> <d>') + chalk.hex('#888888')('    — WebSocket broadcast'),
          '',
          chalk.hex('#FF0000')('═══ 💻 CODE INTEL ═══'),
          chalk.hex('#00FFFF')('/code-review <file>') + chalk.hex('#888888')('  — Review code'),
          chalk.hex('#00FFFF')('/code-explain <file>') + chalk.hex('#888888')(' — Understand code'),
          chalk.hex('#00FFFF')('/generate-tests <f>') + chalk.hex('#888888')('  — Generate tests'),
          chalk.hex('#00FFFF')('/debug <error>') + chalk.hex('#888888')('        — Debug error'),
          chalk.hex('#00FFFF')('/analyze-codebase <d>') + chalk.hex('#888888')(' — Analyze codebase'),
          '',
          chalk.hex('#FF0000')('═══ 🛡️ TRUST & SAFETY ═══'),
          chalk.hex('#00FFFF')('/trust') + chalk.hex('#888888')('             — Trust status'),
          chalk.hex('#00FFFF')('/trust-mode <mode>') + chalk.hex('#888888')('   — Set mode'),
          chalk.hex('#00FFFF')('/sandbox on|off') + chalk.hex('#888888')('      — Toggle sandbox'),
          chalk.hex('#00FFFF')('/rollbacks') + chalk.hex('#888888')('          — List rollbacks'),
          chalk.hex('#00FFFF')('/rollback <id>') + chalk.hex('#888888')('      — Undo action'),
          chalk.hex('#00FFFF')('/approvals') + chalk.hex('#888888')('          — Pending approvals'),
          chalk.hex('#00FFFF')('/trust-log') + chalk.hex('#888888')('          — Audit trail')
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

      case '/memory-search': {
        const results = this.memory.search(args);
        console.log(chalk.hex('#00FFFF')(`Found ${results.length} memory results:`));
        results.slice(0, 10).forEach(r => console.log(chalk.hex('#888888')(`  [${r.type}]`) + ` ${JSON.stringify(r.data).slice(0, 120)}`));
        break;
      }

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

      // ═══ WEB SEARCH ═══
      case '/web-search': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /web-search <query>')); break; }
        const spin = ora('🔍 Searching the web...').start();
        const searchResult = await this.webSearch.search(args);
        spin.stop();
        const results = searchResult.results || searchResult;
        console.log(chalk.hex('#00FF40')(`✅ Found ${results.length} results:\n`));
        results.slice(0, 10).forEach((r, i) => {
          console.log(chalk.hex('#00FFFF')(`  ${i + 1}. ${r.title}`));
          console.log(chalk.hex('#888888')(`     ${r.snippet?.slice(0, 100)}`));
          console.log(chalk.hex('#708090')(`     ${r.url}`));
        });
        break;
      }

      case '/deep-search': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /deep-search <topic>')); break; }
        const spin = ora('🔍 Deep searching...').start();
        const deepResult = await this.webSearch.deepSearch(args);
        spin.stop();
        const deepResults = deepResult.primaryResults || deepResult.results || deepResult;
        console.log(chalk.hex('#00FF40')(`✅ Deep search: ${deepResults.length} results\n`));
        (Array.isArray(deepResults) ? deepResults : []).slice(0, 15).forEach((r, i) => {
          console.log(chalk.hex('#00FFFF')(`  ${i + 1}. ${r.title} [${r.source}]`));
          console.log(chalk.hex('#888888')(`     ${r.snippet?.slice(0, 120)}`));
        });
        break;
      }

      case '/scrape': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /scrape <url>')); break; }
        const spin = ora('📄 Scraping...').start();
        const result = await this.webSearch.scrapeUrl(args);
        spin.stop();
        if (result.error) console.log(chalk.hex('#FF0000')(`❌ ${result.error}`));
        else {
          console.log(chalk.hex('#00FF40')(`✅ ${result.title}`));
          console.log((result.content || result.text || '').slice(0, 500));
        }
        break;
      }

      // ═══ IoT ═══
      case '/iot': {
        const deviceList = this.iot.listDevices();
        const devices = deviceList.devices || deviceList;
        if (!devices.length) console.log(chalk.hex('#888888')('  No devices found. Use /iot-discover'));
        else {
          console.log(chalk.hex('#00FF40')('🏠 IoT Devices:\n'));
          devices.forEach(d => console.log(chalk.hex('#00FFFF')(`  ${d.name}`) + chalk.hex('#888888')(` [${d.type}] ${d.ip || d.host}`)));
        }
        break;
      }

      case '/iot-discover': {
        const spin = ora('🔍 Scanning for IoT devices...').start();
        const devices = await this.iot.discover();
        spin.stop();
        console.log(chalk.hex('#00FF40')(`✅ Found ${devices.length} devices`));
        devices.forEach(d => console.log(chalk.hex('#00FFFF')(`  ${d.name}`) + chalk.hex('#888888')(` [${d.type}] ${d.host}`)));
        break;
      }

      case '/iot-control': {
        const [deviceId, action, ...params] = args.split(' ');
        const result = await this.iot.control(deviceId, action, { level: parseInt(params[0]) });
        console.log(result.success ? chalk.hex('#00FF40')(`✅ ${result.device}: ${action}`) : chalk.hex('#FF0000')(`❌ ${result.error}`));
        break;
      }

      // ═══ SECURITY ═══
      case '/security': {
        const report = this.security.getSecurityReport();
        const lockStatus = this.security.getLockStatus();
        console.log(require('boxen')([
          chalk.hex('#FF0000')('🛡️ Security Report'),
          '',
          chalk.hex('#00FFFF')('Total audit entries: ') + report.totalAuditEntries,
          chalk.hex('#00FFFF')('Last 24h events: ') + report.last24h?.total,
          chalk.hex('#00FFFF')('Blocked attempts: ') + report.last24h?.blocked,
          chalk.hex('#00FFFF')('Violations: ') + report.last24h?.violations,
          chalk.hex('#00FFFF')('Sandbox enabled: ') + report.sandbox?.enabled,
          chalk.hex('#00FFFF')('Sandbox violations: ') + report.sandbox?.violations,
          chalk.hex('#00FFFF')('Lock status: ') + (lockStatus.locked ? '🔒 Locked' : '🔓 Unlocked'),
          chalk.hex('#00FFFF')('Rate limiters: ') + report.rateLimiters,
          chalk.hex('#00FFFF')('Roles: ') + report.roles?.join(', ')
        ].join('\n'), { padding: 1, borderStyle: 'round', borderColor: 'red' }));
        break;
      }

      case '/encrypt': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /encrypt <text>')); break; }
        const encrypted = this.security.encrypt(args);
        console.log(chalk.hex('#00FF40')('🔒 Encrypted: ') + encrypted);
        break;
      }

      case '/audit': {
        const logs = this.security.getAuditLog({ limit: 10 });
        logs.forEach(l => console.log(chalk.hex('#888888')(`  [${l.timestamp?.slice(11, 19)}]`) + chalk.hex('#00FFFF')(` ${l.event}`)));
        break;
      }

      // ═══ PROGRAM INSTALLER ═══
      case '/install': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /install <program>')); break; }
        const spin = ora(`📦 Installing ${args}...`).start();
        const result = await this.installer.install(args);
        spin.stop();
        console.log(result.success ? chalk.hex('#00FF40')(`✅ Installed: ${result.program}`) : chalk.hex('#FF0000')(`❌ ${result.error}`));
        if (result.suggestion) console.log(chalk.hex('#888888')(`💡 Try: ${result.suggestion}`));
        break;
      }

      case '/uninstall': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /uninstall <program>')); break; }
        const result = await this.installer.uninstall(args);
        console.log(result.success ? chalk.hex('#00FF40')(`✅ Uninstalled: ${args}`) : chalk.hex('#FF0000')(`❌ ${result.error}`));
        break;
      }

      case '/programs': {
        const spin = ora('📋 Listing installed programs...').start();
        const list = await this.installer.listInstalled();
        spin.stop();
        console.log(chalk.hex('#00FF40')(`📦 ${list.length} programs installed:`));
        list.slice(0, 30).forEach(p => console.log(chalk.hex('#00FFFF')(`  ${p.name}`) + chalk.hex('#888888')(` ${p.version}`)));
        break;
      }

      case '/pkg-manager': {
        const info = this.installer.getPackageManager();
        console.log(chalk.hex('#00FF40')(`📦 Package Manager: ${info.primary}`));
        console.log(chalk.hex('#888888')(`  Platform: ${info.platform}`));
        console.log(chalk.hex('#888888')(`  Available: ${info.detected.join(', ')}`));
        break;
      }

      // ═══ AGENT ORCHESTRATOR ═══
      case '/orchestrate': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /orchestrate <complex task>')); break; }
        const spin = ora('🧠 Orchestrating agents...').start();
        const result = await this.orchestrator.orchestrate(args);
        spin.stop();
        console.log(chalk.hex('#00FF40')(`✅ Task completed in ${result.duration}ms`));
        console.log(chalk.hex('#888888')(`  Agents: ${result.agentCount || 1}, Success: ${result.success}`));
        if (result.results) {
          result.results.forEach(r => console.log(chalk.hex('#00FFFF')(`  ${r.agent}`) + chalk.hex('#888888')(` [${r.status}] ${r.summary?.slice(0, 80)}`)));
        }
        break;
      }

      case '/progress': {
        const p = this.orchestrator.getProgress();
        console.log(chalk.hex('#00FF40')(`📊 Progress: ${p.total} agents, ${p.running} running, ${p.completed} completed, ${p.error} errors`));
        break;
      }

      // ═══ MODEL TRAINER ═══
      case '/train': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /train <task description>')); break; }
        const spin = ora('📚 Generating training data...').start();
        const result = await this.modelTrainer.generateTrainingData(args);
        spin.stop();
        console.log(chalk.hex('#00FF40')(`✅ Training data: ${result.examples} examples → ${result.filename}`));
        break;
      }

      case '/fine-tune': {
        const [modelName, ...rest] = args.split(' ');
        const trainingFile = rest.join(' ');
        if (!modelName || !trainingFile) { console.log(chalk.hex('#FF0000')('Usage: /fine-tune <model-name> <training-file>')); break; }
        const spin = ora(`🔬 Fine-tuning ${modelName}...`).start();
        const result = await this.modelTrainer.fineTune(modelName, trainingFile);
        spin.stop();
        console.log(result.success ? chalk.hex('#00FF40')(`✅ Model created: ${result.model} v${result.version}`) : chalk.hex('#FF0000')(`❌ ${result.error}`));
        if (result.suggestion) console.log(chalk.hex('#888888')(`💡 ${result.suggestion}`));
        break;
      }

      case '/compare-models': {
        const models = args.split(' ');
        if (models.length < 2) { console.log(chalk.hex('#FF0000')('Usage: /compare-models <model1> <model2> [model3...]')); break; }
        const spin = ora('⚖️ Comparing models...').start();
        const result = await this.modelTrainer.compareModels(models, 'What is the meaning of life?');
        spin.stop();
        result.results.forEach(r => {
          console.log(chalk.hex('#00FFFF')(`  ${r.model}`) + chalk.hex('#888888')(` — ${r.duration}ms, ${r.tokensPerSecond || 0} tok/s`));
        });
        break;
      }

      case '/model-hosting': {
        const suggestions = this.modelTrainer.suggestHosting(args || 'medium');
        console.log(chalk.hex('#00FF40')('☁️ Cloud Hosting Options:\n'));
        suggestions.suggestions.forEach(s => {
          console.log(chalk.hex('#00FFFF')(`  ${s.name}`) + chalk.hex('#888888')(` — ${s.cost}`));
          console.log(chalk.hex('#708090')(`    ${s.bestFor}`));
        });
        console.log(chalk.hex('#FFD700')(`\n💡 Recommendation: ${suggestions.recommendation}`));
        break;
      }

      // ═══ BRAIN — Knowledge Graph ═══
      case '/brain': {
        const stats = this.brain.getStats();
        console.log(require('boxen')([
          chalk.hex('#FF0000')('🧠 Contextual Brain'),
          '',
          chalk.hex('#00FFFF')('Nodes: ') + stats.totalNodes,
          chalk.hex('#00FFFF')('Edges: ') + stats.totalEdges,
          chalk.hex('#00FFFF')('Index size: ') + stats.indexSize,
          chalk.hex('#00FFFF')('Avg weight: ') + stats.avgWeight?.toFixed(2),
          chalk.hex('#00FFFF')('Types: ') + JSON.stringify(stats.types),
          '',
          chalk.hex('#888888')('  /brain-query <q> — Query the brain'),
          chalk.hex('#888888')('  /brain-decay     — Forget unimportant things'),
          chalk.hex('#888888')('  /brain-consolidate — Merge duplicates')
        ].join('\n'), { padding: 1, borderStyle: 'round', borderColor: 'red' }));
        break;
      }

      case '/brain-query': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /brain-query <query>')); break; }
        const results = this.brain.query(args);
        console.log(chalk.hex('#00FF40')(`🧠 Found ${results.length} results:\n`));
        results.forEach((r, i) => {
          console.log(chalk.hex('#00FFFF')(`  ${i + 1}. [${r.type}]`) + ` ${r.content.slice(0, 100)}`);
          console.log(chalk.hex('#888888')(`     Weight: ${r.weight.toFixed(2)} | Score: ${r.score.toFixed(2)} | Accessed: ${r.accessCount}x`));
        });
        break;
      }

      case '/brain-decay': {
        const decay = this.brain.decay();
        console.log(chalk.hex('#00FF40')(`🧠 Decay complete. Forgotten: ${decay.forgotten}, Remaining: ${decay.remaining}`));
        break;
      }

      case '/brain-consolidate': {
        const consolidated = this.brain.consolidate();
        console.log(chalk.hex('#00FF40')(`🧠 Consolidated. Merged: ${consolidated.merged}, Remaining: ${consolidated.remaining}`));
        break;
      }

      // ═══ PROACTIVE INTELLIGENCE ═══
      case '/proactive': {
        const status = this.proactive.getStatus();
        const insights = this.proactive.getActiveInsights();
        console.log(require('boxen')([
          chalk.hex('#FF0000')('🔮 Proactive Intelligence'),
          '',
          chalk.hex('#00FFFF')('Running: ') + (status.running ? '✅' : '❌'),
          chalk.hex('#00FFFF')('Rules: ') + status.rules + ' (' + status.activeRules + ' active)',
          chalk.hex('#00FFFF')('Patterns: ') + status.patterns,
          chalk.hex('#00FFFF')('Insights: ') + status.activeInsights,
          chalk.hex('#00FFFF')('Monitors: ') + status.monitors,
          '',
          chalk.hex('#FF0000')('═══ ACTIVE INSIGHTS ═══'),
          ...insights.map(i => chalk.hex('#FFD700')('  🔔 ') + i.message)
        ].join('\n'), { padding: 1, borderStyle: 'round', borderColor: 'red' }));
        break;
      }

      case '/add-rule': {
        const parts = args.split(' when ');
        if (parts.length < 2) { console.log(chalk.hex('#FF0000')('Usage: /add-rule <action> when <condition>')); break; }
        const rule = this.proactive.addRule('custom-rule', parts[1].trim(), parts[0].trim());
        console.log(chalk.hex('#00FF40')(`✅ Rule added: ${rule.id}`));
        break;
      }

      case '/insights': {
        const insights = this.proactive.getActiveInsights();
        if (!insights.length) console.log(chalk.hex('#888888')('  No active insights.'));
        else insights.forEach(i => console.log(chalk.hex('#FFD700')('  🔔 ') + i.message));
        break;
      }

      // ═══ DEEP OS INTEGRATION ═══
      case '/os': {
        const osStatus = this.osIntegration.getStatus();
        console.log(require('boxen')([
          chalk.hex('#FF0000')('🖥️ Deep OS Integration'),
          '',
          chalk.hex('#00FFFF')('Running: ') + (osStatus.running ? '✅' : '❌'),
          chalk.hex('#00FFFF')('File watchers: ') + osStatus.fileWatchers,
          chalk.hex('#00FFFF')('Clipboard entries: ') + osStatus.clipboardEntries,
          chalk.hex('#00FFFF')('System events: ') + osStatus.systemEvents,
          chalk.hex('#00FFFF')('Platform: ') + osStatus.platform,
          '',
          chalk.hex('#888888')('  /watch <dir>     — Watch directory for changes'),
          chalk.hex('#888888')('  /clipboard       — Clipboard history'),
          chalk.hex('#888888')('  /active-window   — Current active window'),
          chalk.hex('#888888')('  /open-windows    — List open windows'),
          chalk.hex('#888888')('  /sys-events      — System events log'),
          chalk.hex('#888888')('  /lock            — Lock screen'),
          chalk.hex('#888888')('  /sleep           — Sleep/hibernate'),
          chalk.hex('#888888')('  /empty-trash     — Empty trash')
        ].join('\n'), { padding: 1, borderStyle: 'round', borderColor: 'red' }));
        break;
      }

      case '/watch': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /watch <directory>')); break; }
        const watchResult = this.osIntegration.watchDirectory(args);
        console.log(watchResult.watching ? chalk.hex('#00FF40')(`✅ Watching: ${args}`) : chalk.hex('#FF0000')(`❌ ${watchResult.error}`));
        break;
      }

      case '/active-window': {
        const win = await this.osIntegration.getActiveWindow();
        console.log(win ? chalk.hex('#00FFFF')(`🪟 ${win.title}`) : chalk.hex('#888888')('  Could not detect active window'));
        break;
      }

      case '/open-windows': {
        const windows = await this.osIntegration.getOpenWindows();
        if (!windows.length) console.log(chalk.hex('#888888')('  No windows detected'));
        else windows.forEach(w => console.log(chalk.hex('#00FFFF')(`  🪟 ${w.title}`)));
        break;
      }

      case '/sys-events': {
        const events = this.osIntegration.getSystemEvents();
        if (!events.length) console.log(chalk.hex('#888888')('  No system events'));
        else events.forEach(e => console.log(chalk.hex('#888888')(`  [${new Date(e.timestamp).toLocaleTimeString()}]`) + ` ${e.type}: ${e.message}`));
        break;
      }

      case '/lock': await this.osIntegration.lockScreen(); console.log(chalk.hex('#00FF40')('🔒 Screen locked')); break;
      case '/sleep': await this.osIntegration.sleep(); console.log(chalk.hex('#00FF40')('😴 Sleeping...')); break;
      case '/empty-trash': {
        const trash = await this.osIntegration.emptyTrash();
        console.log(trash.error ? chalk.hex('#FF0000')(`❌ ${trash.error}`) : chalk.hex('#00FF40')('🗑️ Trash emptied'));
        break;
      }

      // ═══ VISUAL UNDERSTANDING ═══
      case '/find-element': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /find-element <description>')); break; }
        const element = await this.visualUnderstanding.findElement(args);
        console.log(element.found
          ? chalk.hex('#00FF40')(`✅ Found at (${element.x}, ${element.y}) — confidence: ${element.confidence}`)
          : chalk.hex('#FF0000')(`❌ Not found: ${args}`));
        break;
      }

      case '/click': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /click <element description>')); break; }
        const clickResult = await this.visualUnderstanding.clickElement(args, this.automation);
        console.log(clickResult.clicked ? chalk.hex('#00FF40')(`✅ Clicked at (${clickResult.x}, ${clickResult.y})`) : chalk.hex('#FF0000')(`❌ ${clickResult.error}`));
        break;
      }

      case '/type-at': {
        const [elementDesc, ...textParts] = args.split(' ');
        const text = textParts.join(' ');
        if (!elementDesc || !text) { console.log(chalk.hex('#FF0000')('Usage: /type-at <element> <text>')); break; }
        const typeResult = await this.visualUnderstanding.typeAtElement(elementDesc, text, this.automation);
        console.log(typeResult.typed ? chalk.hex('#00FF40')(`✅ Typed at ${elementDesc}`) : chalk.hex('#FF0000')(`❌ ${typeResult.error}`));
        break;
      }

      case '/screen-diff': {
        const shots = this.visualUnderstanding.screenHistory;
        if (shots.length < 2) { console.log(chalk.hex('#FF0000')('Need at least 2 screenshots. Use /screen first.')); break; }
        const diff = await this.visualUnderstanding.diffScreens(shots[shots.length - 2].path, shots[shots.length - 1].path);
        console.log(chalk.hex('#00FFFF')('📊 Changes:\n') + diff.changes);
        break;
      }

      case '/read-screen': {
        const text = await this.visualUnderstanding.readScreen();
        console.log(chalk.hex('#00FFFF')('📖 Screen text:\n') + (text || 'No text detected'));
        break;
      }

      // ═══ SELF-EVOLUTION ═══
      case '/evolve': {
        const spin = ora('🧬 Evolving...').start();
        const evoResult = await this.evolution.evolve();
        spin.stop();
        console.log(chalk.hex('#00FF40')(`✅ Evolution v${evoResult.version} complete!`));
        console.log(chalk.hex('#00FFFF')(`  Score: ${evoResult.improvementScore}/100`));
        console.log(chalk.hex('#00FFFF')(`  Findings: ${evoResult.findings.length}`));
        evoResult.findings.forEach(f => console.log(chalk.hex('#888888')(`    • ${f.message}`)));
        if (evoResult.suggestions.length) {
          console.log(chalk.hex('#FFD700')('\n  💡 Suggestions:'));
          evoResult.suggestions.forEach(s => console.log(chalk.hex('#888888')(`    • ${s.suggestion}`)));
        }
        break;
      }

      case '/evolution': {
        const evoStatus = this.evolution.getStatus();
        const report = this.evolution.getPerformanceReport('24h');
        console.log(require('boxen')([
          chalk.hex('#FF0000')('🧬 Self-Evolution System'),
          '',
          chalk.hex('#00FFFF')('Version: ') + evoStatus.version,
          chalk.hex('#00FFFF')('Score: ') + evoStatus.improvementScore + '/100',
          chalk.hex('#00FFFF')('Interactions: ') + evoStatus.totalInteractions,
          chalk.hex('#00FFFF')('Corrections: ') + evoStatus.corrections,
          chalk.hex('#00FFFF')('Skills: ') + evoStatus.skills,
          chalk.hex('#00FFFF')('Experiments: ') + evoStatus.experiments,
          '',
          chalk.hex('#FF0000')('═══ 24H PERFORMANCE ═══'),
          chalk.hex('#00FFFF')('Success rate: ') + (report.successRate || 0) + '%',
          chalk.hex('#00FFFF')('Avg duration: ') + (report.avgDuration || 0) + 'ms',
          chalk.hex('#00FFFF')('Total tokens: ') + (report.totalTokens || 0)
        ].join('\n'), { padding: 1, borderStyle: 'round', borderColor: 'red' }));
        break;
      }

      case '/correct': {
        const [original, ...correctedParts] = args.split(' → ');
        const corrected = correctedParts.join(' → ');
        if (!original || !corrected) { console.log(chalk.hex('#FF0000')('Usage: /correct <wrong> → <right>')); break; }
        this.evolution.learnCorrection(original.trim(), corrected.trim());
        console.log(chalk.hex('#00FF40')('✅ Correction learned! I\'ll remember this.'));
        break;
      }

      case '/skills': {
        const skillCandidates = this.evolution.detectSkillCandidates();
        const crystallized = [...this.evolution.skills.values()];
        console.log(chalk.hex('#00FF40')(`🧩 Crystallized Skills (${crystallized.length}):`));
        crystallized.forEach(s => console.log(chalk.hex('#00FFFF')(`  ⚡ ${s.name}`) + chalk.hex('#888888')(` — used ${s.usageCount}x`)));
        if (skillCandidates.length) {
          console.log(chalk.hex('#FFD700')(`\n  💡 Candidates (${skillCandidates.length}):`));
          skillCandidates.slice(0, 5).forEach(c => console.log(chalk.hex('#888888')(`    • "${c.pattern}" (${c.frequency}x, ${c.successRate}% success)`)));
        }
        break;
      }

      // ═══ API GATEWAY ═══
      case '/api': {
        const apiStatus = this.apiGateway.getStatus();
        console.log(require('boxen')([
          chalk.hex('#FF0000')('🌐 API Gateway'),
          '',
          chalk.hex('#00FFFF')('Running: ') + (apiStatus.running ? '✅' : '❌'),
          chalk.hex('#00FFFF')('Port: ') + apiStatus.port,
          chalk.hex('#00FFFF')('Routes: ') + apiStatus.routes,
          chalk.hex('#00FFFF')('WebSocket clients: ') + apiStatus.wsClients,
          chalk.hex('#00FFFF')('Webhooks: ') + apiStatus.webhooks,
          chalk.hex('#00FFFF')('API keys: ') + apiStatus.apiKeys,
          chalk.hex('#00FFFF')('Total requests: ') + apiStatus.totalRequests,
          '',
          chalk.hex('#888888')('  /api-start      — Start API server'),
          chalk.hex('#888888')('  /api-stop       — Stop API server'),
          chalk.hex('#888888')('  /api-key <key>  — Add API key'),
          chalk.hex('#888888')('  /webhook <name> <url> — Register webhook'),
          chalk.hex('#888888')('  /broadcast <event> <data> — WebSocket broadcast')
        ].join('\n'), { padding: 1, borderStyle: 'round', borderColor: 'red' }));
        break;
      }

      case '/api-start': {
        const startResult = this.apiGateway.start();
        console.log(startResult.started ? chalk.hex('#00FF40')(`✅ API server started on port ${startResult.port}`) : chalk.hex('#FF0000')(`❌ ${startResult.error}`));
        break;
      }

      case '/api-stop': {
        this.apiGateway.stop();
        console.log(chalk.hex('#00FF40')('✅ API server stopped'));
        break;
      }

      case '/api-key': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /api-key <key>')); break; }
        this.apiGateway.addApiKey(args);
        console.log(chalk.hex('#00FF40')('✅ API key added'));
        break;
      }

      case '/webhook': {
        const [whName, whUrl] = args.split(' ');
        if (!whName || !whUrl) { console.log(chalk.hex('#FF0000')('Usage: /webhook <name> <url>')); break; }
        this.apiGateway.registerWebhook(whName, whUrl);
        console.log(chalk.hex('#00FF40')(`✅ Webhook registered: ${whName} → ${whUrl}`));
        break;
      }

      case '/broadcast': {
        const [eventName, ...dataParts] = args.split(' ');
        if (!eventName) { console.log(chalk.hex('#FF0000')('Usage: /broadcast <event> <data>')); break; }
        const bcResult = this.apiGateway.broadcast(eventName, dataParts.join(' '));
        console.log(chalk.hex('#00FF40')(`✅ Broadcast sent to ${bcResult.clients} clients`));
        break;
      }

      // ═══ CODE INTELLIGENCE ═══
      case '/code-review': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /code-review <file>')); break; }
        const spin = ora('🔍 Reviewing code...').start();
        const review = await this.codeIntel.reviewCode(args);
        spin.stop();
        console.log(review.review);
        break;
      }

      case '/code-explain': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /code-explain <file>')); break; }
        const understanding = await this.codeIntel.understandFile(args);
        console.log(understanding.understanding);
        break;
      }

      case '/generate-tests': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /generate-tests <file>')); break; }
        const spin = ora('🧪 Generating tests...').start();
        const tests = await this.codeIntel.generateTests(args, { save: true });
        spin.stop();
        console.log(tests.saved ? chalk.hex('#00FF40')(`✅ Tests saved: ${tests.testFile}`) : chalk.hex('#FF0000')('Could not generate tests'));
        break;
      }

      case '/debug': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /debug <error message>')); break; }
        const debugResult = await this.codeIntel.debugError(args);
        console.log(debugResult.analysis);
        break;
      }

      case '/analyze-codebase': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /analyze-codebase <directory>')); break; }
        const spin = ora('🔍 Analyzing codebase...').start();
        const codebaseAnalysis = await this.codeIntel.analyzeCodebase(args);
        spin.stop();
        console.log(chalk.hex('#00FF40')(`✅ Analysis complete:`));
        console.log(chalk.hex('#00FFFF')(`  Files: ${codebaseAnalysis.totalFiles}`));
        console.log(chalk.hex('#00FFFF')(`  Languages: ${JSON.stringify(codebaseAnalysis.languages)}`));
        console.log(chalk.hex('#00FFFF')(`  Dependencies: ${codebaseAnalysis.dependencies.length}`));
        console.log(chalk.hex('#00FFFF')(`  Complexity: ${codebaseAnalysis.complexity}`));
        if (codebaseAnalysis.description) console.log('\n' + codebaseAnalysis.description);
        break;
      }

      // ═══ TRUST & SAFETY ═══
      case '/trust': {
        const trustStatus = this.trustSafety.getStatus();
        console.log(require('boxen')([
          chalk.hex('#FF0000')('🛡️ Trust & Safety'),
          '',
          chalk.hex('#00FFFF')('Mode: ') + trustStatus.mode,
          chalk.hex('#00FFFF')('Sandbox: ') + (trustStatus.sandboxEnabled ? '✅ Enabled' : '❌ Disabled'),
          chalk.hex('#00FFFF')('Pending approvals: ') + trustStatus.pendingApprovals,
          chalk.hex('#00FFFF')('Rollbacks available: ') + trustStatus.rollbacksAvailable,
          chalk.hex('#00FFFF')('Audit entries: ') + trustStatus.auditEntries,
          '',
          chalk.hex('#888888')('  /trust-mode <mode>  — Set mode (safe/supervised/full)'),
          chalk.hex('#888888')('  /sandbox on|off     — Toggle sandbox'),
          chalk.hex('#888888')('  /rollback <id>      — Undo an action'),
          chalk.hex('#888888')('  /rollbacks          — List available rollbacks'),
          chalk.hex('#888888')('  /approvals          — Pending approvals'),
          chalk.hex('#888888')('  /trust-log          — View audit trail')
        ].join('\n'), { padding: 1, borderStyle: 'round', borderColor: 'red' }));
        break;
      }

      case '/trust-mode': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /trust-mode <safe|supervised|full>')); break; }
        const modeResult = this.trustSafety.setMode(args);
        console.log(modeResult.error ? chalk.hex('#FF0000')(`❌ ${modeResult.error}`) : chalk.hex('#00FF40')(`✅ ${modeResult.description}`));
        break;
      }

      case '/sandbox': {
        if (args === 'on') {
          this.trustSafety.enableSandbox();
          console.log(chalk.hex('#00FF40')('✅ Sandbox enabled'));
        } else if (args === 'off') {
          this.trustSafety.disableSandbox();
          console.log(chalk.hex('#00FF40')('✅ Sandbox disabled'));
        } else {
          console.log(chalk.hex('#FF0000')('Usage: /sandbox on|off'));
        }
        break;
      }

      case '/rollbacks': {
        const rollbacks = this.trustSafety.getRollbackStack();
        if (!rollbacks.length) console.log(chalk.hex('#888888')('  No rollbacks available'));
        else rollbacks.forEach(r => console.log(chalk.hex('#00FFFF')(`  ${r.id}`) + chalk.hex('#888888')(` — ${r.action.type || 'action'} at ${new Date(r.timestamp).toLocaleTimeString()}`)));
        break;
      }

      case '/rollback': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /rollback <id>')); break; }
        const rbResult = await this.trustSafety.rollback(args);
        console.log(rbResult.rolledBack ? chalk.hex('#00FF40')('✅ Rolled back!') : chalk.hex('#FF0000')(`❌ ${rbResult.error}`));
        break;
      }

      case '/approvals': {
        const approvals = this.trustSafety.getPendingApprovals();
        if (!approvals.length) console.log(chalk.hex('#888888')('  No pending approvals'));
        else approvals.forEach(a => console.log(chalk.hex('#FFD700')(`  ${a.preview.id}`) + chalk.hex('#888888')(` — ${a.preview.description} [${a.preview.risk}]`)));
        break;
      }

      case '/trust-log': {
        const log = this.trustSafety.getAuditTrail({ limit: 15 });
        log.forEach(l => console.log(chalk.hex('#888888')(`  [${new Date(l.timestamp).toLocaleTimeString()}]`) + ` ${l.action}`));
        break;
      }

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
