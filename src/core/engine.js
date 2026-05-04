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
const UniversalToolkit = require('../universal-toolkit/index.js');
const BrowserEngine = require('../browser-engine/index.js');
const ReverseEngineering = require('../reverse-engineering/index.js');
const TaskScheduler = require('../scheduler/index.js');
const BackupManager = require('../backup/index.js');
const PluginMarketplace = require('../marketplace/index.js');
const PerformanceMonitor = require('../monitor/index.js');
const NotificationCenter = require('../notifications/index.js');
const ConfigManager = require('../config-manager/index.js');
const VectorMemory = require('../vector-memory/index.js');
const ModelRouter = require('../model-router/index.js');
const TwoFactor = require('../two-factor/index.js');
const SelfUpdater = require('../self-updater/index.js');
const ThemeEngine = require('../theme-engine/index.js');
const MobileAPI = require('../mobile-api/index.js');

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
    this.toolkit = new UniversalToolkit(this.config, this.provider);
    this.browser = new BrowserEngine(this.config, this.provider);
    this.reverseEng = new ReverseEngineering(this.config, this.provider);

    // ═══ NEW FEATURES ═══
    this.scheduler = new TaskScheduler(this.config, this.automation, this.provider);
    this.backup = new BackupManager(this.config);
    this.marketplace = new PluginMarketplace(this.config, this.plugins);
    this.monitor = new PerformanceMonitor(this.config);
    this.notifications = new NotificationCenter(this.config);
    this.configManager = new ConfigManager(this.config);

    // ═══ NEW MODULES ═══
    this.vectorMemory = new VectorMemory(this.config);
    this.modelRouter = new ModelRouter(this.config);
    this.twoFactor = new TwoFactor(this.config);
    this.updater = new SelfUpdater(this.config);
    this.themeEngine = new ThemeEngine(this.config);
    this.mobileAPI = new MobileAPI(this.config);

    this.userName = this.config.get('user.name', '');
    this.aiName = this.config.get('ai.name', 'OpenDesktop');
    this.isRunning = false;

    // Start proactive monitoring (only when explicitly started)
    // this.proactive.start();
    // this.osIntegration.start();
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
    this.proactive.start();
    this.osIntegration.start();
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
          chalk.hex('#00FFFF')('/trust-log') + chalk.hex('#888888')('          — Audit trail'),
          '',
          chalk.hex('#FF0000')('═══ 🔧 UNIVERSAL TOOLKIT ═══'),
          chalk.hex('#00FFFF')('/toolkit') + chalk.hex('#888888')('             — All toolkit commands'),
          chalk.hex('#00FFFF')('/imagine <prompt>') + chalk.hex('#888888')('      — Generate image'),
          chalk.hex('#00FFFF')('/tts <text>') + chalk.hex('#888888')('          — Text to speech'),
          chalk.hex('#00FFFF')('/stt <audio>') + chalk.hex('#888888')('         — Speech to text'),
          chalk.hex('#00FFFF')('/pdf <content>') + chalk.hex('#888888')('       — Generate PDF'),
          chalk.hex('#00FFFF')('/convert <f> <fmt>') + chalk.hex('#888888')('   — Convert file'),
          chalk.hex('#00FFFF')('/chart <type> <data>') + chalk.hex('#888888')(' — Generate chart'),
          chalk.hex('#00FFFF')('/git <cmd>') + chalk.hex('#888888')('           — Git operations'),
          chalk.hex('#00FFFF')('/docker <cmd>') + chalk.hex('#888888')('        — Docker operations'),
          chalk.hex('#00FFFF')('/ssh <host> <cmd>') + chalk.hex('#888888')('    — SSH command'),
          chalk.hex('#00FFFF')('/http <url>') + chalk.hex('#888888')('          — HTTP request'),
          chalk.hex('#00FFFF')('/encode/decode <text>') + chalk.hex('#888888')(' — Encode/decode'),
          chalk.hex('#00FFFF')('/hash <text>') + chalk.hex('#888888')('         — Hash data'),
          chalk.hex('#00FFFF')('/weather <city>') + chalk.hex('#888888')('      — Get weather'),
          chalk.hex('#00FFFF')('/crypto') + chalk.hex('#888888')('              — Crypto prices'),
          chalk.hex('#00FFFF')('/messaging') + chalk.hex('#888888')('           — Messaging hub')
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
        const [selfResult, evoResult] = await Promise.all([this.selfImprove.evolve(), this.evolution.evolve()]);
        spin.stop();
        console.log(chalk.hex('#00FF40')(`✅ Evolution v${evoResult.version} complete!`));
        console.log(chalk.hex('#00FFFF')(`  Score: ${evoResult.improvementScore}/100`));
        console.log(chalk.hex('#00FFFF')(`  Findings: ${evoResult.findings.length} (evolution) + ${selfResult.actions.length} (self-improve)`));
        evoResult.findings.forEach(f => console.log(chalk.hex('#888888')(`    • ${f.message}`)));
        selfResult.actions.forEach(a => console.log(chalk.hex('#888888')(`    • ${a.findings?.join(', ') || a.type}`)));
        if (evoResult.suggestions.length) {
          console.log(chalk.hex('#FFD700')('\n  💡 Suggestions:'));
          evoResult.suggestions.forEach(s => console.log(chalk.hex('#888888')(`    • ${s.suggestion}`)));
        }
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

      // ═══ SELF-EVOLUTION (handled above via /evolve) ═══

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

      // ═══ UNIVERSAL TOOLKIT ═══
      case '/toolkit': {
        console.log(require('boxen')([
          chalk.hex('#FF0000')('🔧 Universal Toolkit — Does EVERYTHING'),
          '',
          chalk.hex('#FF0000')('═══ IMAGE GENERATION ═══'),
          chalk.hex('#00FFFF')('/imagine <prompt>') + chalk.hex('#888888')('      — Generate image (DALL-E 3)'),
          chalk.hex('#00FFFF')('/imagine-sd <prompt>') + chalk.hex('#888888')('   — Generate image (Stability AI)'),
          '',
          chalk.hex('#FF0000')('═══ VOICE & AUDIO ═══'),
          chalk.hex('#00FFFF')('/tts <text>') + chalk.hex('#888888')('           — Text to speech (OpenAI)'),
          chalk.hex('#00FFFF')('/tts-11 <text>') + chalk.hex('#888888')('        — Text to speech (ElevenLabs)'),
          chalk.hex('#00FFFF')('/stt <audio-file>') + chalk.hex('#888888')('      — Speech to text (Whisper)'),
          '',
          chalk.hex('#FF0000')('═══ DOCUMENTS ═══'),
          chalk.hex('#00FFFF')('/pdf <content>') + chalk.hex('#888888')('         — Generate PDF'),
          chalk.hex('#00FFFF')('/convert <file> <fmt>') + chalk.hex('#888888')('   — Convert file format'),
          chalk.hex('#00FFFF')('/csv2json <file>') + chalk.hex('#888888')('      — CSV to JSON'),
          chalk.hex('#00FFFF')('/json2csv <file>') + chalk.hex('#888888')('      — JSON to CSV'),
          chalk.hex('#00FFFF')('/spreadsheet <data>') + chalk.hex('#888888')('   — Create spreadsheet'),
          '',
          chalk.hex('#FF0000')('═══ CHARTS ═══'),
          chalk.hex('#00FFFF')('/chart <type> <data>') + chalk.hex('#888888')('    — Generate chart (bar/line/pie)'),
          '',
          chalk.hex('#FF0000')('═══ GIT ═══'),
          chalk.hex('#00FFFF')('/git <command>') + chalk.hex('#888888')('        — Git operations'),
          chalk.hex('#00FFFF')('/git-log') + chalk.hex('#888888')('             — Git log'),
          chalk.hex('#00FFFF')('/git-diff') + chalk.hex('#888888')('            — Git diff'),
          '',
          chalk.hex('#FF0000')('═══ DOCKER ═══'),
          chalk.hex('#00FFFF')('/docker <command>') + chalk.hex('#888888')('     — Docker operations'),
          chalk.hex('#00FFFF')('/docker-ps') + chalk.hex('#888888')('           — List containers'),
          '',
          chalk.hex('#FF0000')('═══ SSH ═══'),
          chalk.hex('#00FFFF')('/ssh <host> <cmd>') + chalk.hex('#888888')('     — Run SSH command'),
          '',
          chalk.hex('#FF0000')('═══ HTTP/API ═══'),
          chalk.hex('#00FFFF')('/http <url>') + chalk.hex('#888888')('          — HTTP request'),
          chalk.hex('#00FFFF')('/api-test <url>') + chalk.hex('#888888')('      — Test API endpoint'),
          '',
          chalk.hex('#FF0000')('═══ ENCODING ═══'),
          chalk.hex('#00FFFF')('/encode <text>') + chalk.hex('#888888')('        — Encode base64/hex/url'),
          chalk.hex('#00FFFF')('/decode <text>') + chalk.hex('#888888')('        — Decode base64/hex/url'),
          chalk.hex('#00FFFF')('/hash <text>') + chalk.hex('#888888')('          — Hash (sha256/md5)'),
          chalk.hex('#00FFFF')('/uuid') + chalk.hex('#888888')('                — Generate UUID'),
          '',
          chalk.hex('#FF0000')('═══ DATA ═══'),
          chalk.hex('#00FFFF')('/json <operation> <data>') + chalk.hex('#888888')(' — JSON operations'),
          chalk.hex('#00FFFF')('/db <type> <query>') + chalk.hex('#888888')('     — Query database'),
          '',
          chalk.hex('#FF0000')('═══ INFO ═══'),
          chalk.hex('#00FFFF')('/weather <city>') + chalk.hex('#888888')('       — Get weather'),
          chalk.hex('#00FFFF')('/crypto') + chalk.hex('#888888')('              — Crypto prices'),
          chalk.hex('#00FFFF')('/email <to> <subj>') + chalk.hex('#888888')('   — Send email')
        ].join('\n'), { padding: 1, borderStyle: 'round', borderColor: 'red' }));
        break;
      }

      case '/imagine': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /imagine <prompt>')); break; }
        const spin = ora('🎨 Generating image...').start();
        const imgResult = await this.toolkit.generateImage(args);
        spin.stop();
        console.log(imgResult.success ? chalk.hex('#00FF40')(`✅ Image saved: ${imgResult.path}`) : chalk.hex('#FF0000')(`❌ ${imgResult.error}`));
        if (imgResult.revisedPrompt) console.log(chalk.hex('#888888')(`  Revised: ${imgResult.revisedPrompt.slice(0, 100)}`));
        break;
      }

      case '/tts': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /tts <text>')); break; }
        const spin = ora('🔊 Generating speech...').start();
        const ttsResult = await this.toolkit.textToSpeech(args);
        spin.stop();
        console.log(ttsResult.success ? chalk.hex('#00FF40')(`✅ Audio saved: ${ttsResult.path}`) : chalk.hex('#FF0000')(`❌ ${ttsResult.error}`));
        break;
      }

      case '/stt': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /stt <audio-file>')); break; }
        const spin = ora('🎤 Transcribing...').start();
        const sttResult = await this.toolkit.speechToText(args);
        spin.stop();
        console.log(sttResult.success ? chalk.hex('#00FF40')(`✅ Transcription: ${sttResult.text}`) : chalk.hex('#FF0000')(`❌ ${sttResult.error}`));
        break;
      }

      case '/pdf': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /pdf <content or file>')); break; }
        let content = args;
        if (fs.existsSync(args)) content = fs.readFileSync(args, 'utf8');
        const pdfResult = await this.toolkit.generatePDF(content, { title: 'OpenDesktop Document' });
        console.log(pdfResult.success ? chalk.hex('#00FF40')(`✅ PDF saved: ${pdfResult.path}`) : chalk.hex('#FF0000')(`❌ ${pdfResult.error}`));
        break;
      }

      case '/convert': {
        const [convertFile, convertFmt] = args.split(' ');
        if (!convertFile || !convertFmt) { console.log(chalk.hex('#FF0000')('Usage: /convert <file> <format>')); break; }
        const convertResult = await this.toolkit.convertFile(convertFile, convertFmt);
        console.log(convertResult.success ? chalk.hex('#00FF40')(`✅ Converted: ${convertResult.output}`) : chalk.hex('#FF0000')(`❌ ${convertResult.error}`));
        break;
      }

      case '/chart': {
        const [chartType, ...chartDataParts] = args.split(' ');
        if (!chartType) { console.log(chalk.hex('#FF0000')('Usage: /chart <bar|line|pie> <label:value,...>')); break; }
        try {
          const chartData = chartDataParts.join(' ').split(',').map(item => {
            const [label, value] = item.split(':');
            return { label: label?.trim(), value: parseFloat(value) || 0 };
          });
          const chartResult = await this.toolkit.generateChart(chartData, { type: chartType, title: 'Chart' });
          console.log(chartResult.success ? chalk.hex('#00FF40')(`✅ Chart saved: ${chartResult.svg}`) : chalk.hex('#FF0000')(`❌ ${chartResult.error}`));
        } catch (e) { console.log(chalk.hex('#FF0000')(`❌ ${e.message}`)); }
        break;
      }

      case '/git': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /git <status|log|diff|branch|stash|remote|tags|contributors>')); break; }
        const gitResult = await this.toolkit.gitOperation(args);
        console.log(gitResult.success ? gitResult.output : chalk.hex('#FF0000')(`❌ ${gitResult.error}`));
        break;
      }

      case '/git-log': {
        const gitLogResult = await this.toolkit.gitOperation('log');
        console.log(gitLogResult.success ? gitLogResult.output : chalk.hex('#FF0000')(`❌ ${gitLogResult.error}`));
        break;
      }

      case '/git-diff': {
        const gitDiffResult = await this.toolkit.gitOperation('diff');
        console.log(gitDiffResult.success ? gitDiffResult.output : chalk.hex('#FF0000')(`❌ ${gitDiffResult.error}`));
        break;
      }

      case '/docker': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /docker <ps|images|volumes|networks|stats|logs|pull|stop|start|prune>')); break; }
        const dockerResult = await this.toolkit.dockerOperation(args);
        console.log(dockerResult.success ? dockerResult.output : chalk.hex('#FF0000')(`❌ ${dockerResult.error}`));
        break;
      }

      case '/docker-ps': {
        const dpsResult = await this.toolkit.dockerOperation('ps');
        console.log(dpsResult.success ? dpsResult.output : chalk.hex('#FF0000')(`❌ ${dpsResult.error}`));
        break;
      }

      case '/ssh': {
        const [sshHost, ...sshCmdParts] = args.split(' ');
        if (!sshHost || !sshCmdParts.length) { console.log(chalk.hex('#FF0000')('Usage: /ssh <host> <command>')); break; }
        const sshResult = await this.toolkit.sshCommand(sshHost, sshCmdParts.join(' '));
        console.log(sshResult.success ? sshResult.output : chalk.hex('#FF0000')(`❌ ${sshResult.error}`));
        break;
      }

      case '/http': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /http <url>')); break; }
        const httpResult = await this.toolkit.httpRequest(args);
        console.log(chalk.hex('#00FFFF')(`Status: ${httpResult.status}`));
        console.log(typeof httpResult.data === 'object' ? JSON.stringify(httpResult.data, null, 2).slice(0, 500) : String(httpResult.data).slice(0, 500));
        break;
      }

      case '/encode': {
        const [encFmt, ...encParts] = args.split(' ');
        const encResult = this.toolkit.encode(encParts.join(' '), encFmt);
        console.log(chalk.hex('#00FF40')(`✅ ${encResult.encoded}`));
        break;
      }

      case '/decode': {
        const [decFmt, ...decParts] = args.split(' ');
        const decResult = this.toolkit.decode(decParts.join(' '), decFmt);
        console.log(chalk.hex('#00FF40')(`✅ ${decResult.decoded}`));
        break;
      }

      case '/hash': {
        const [hashAlg, ...hashParts] = args.split(' ');
        const hashResult = this.toolkit.hash(hashParts.join(' ') || args, hashAlg || 'sha256');
        console.log(chalk.hex('#00FF40')(`${hashResult.algorithm}: ${hashResult.hash}`));
        break;
      }

      case '/uuid': {
        const count = parseInt(args) || 1;
        const uuid = this.toolkit.generateUUID(count);
        if (Array.isArray(uuid)) uuid.forEach(u => console.log(chalk.hex('#00FF40')(u)));
        else console.log(chalk.hex('#00FF40')(uuid));
        break;
      }

      case '/weather': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /weather <city>')); break; }
        const weather = await this.toolkit.getWeather(args);
        if (weather.success) {
          console.log(chalk.hex('#00FFFF')(`🌡️ ${weather.city}: ${weather.temp} (feels ${weather.feelsLike})`));
          console.log(chalk.hex('#888888')(`   ${weather.description} | Humidity: ${weather.humidity} | Wind: ${weather.wind}`));
        } else console.log(chalk.hex('#FF0000')(`❌ ${weather.error}`));
        break;
      }

      case '/crypto': {
        const cryptoResult = await this.toolkit.cryptoPrice();
        if (cryptoResult.success) {
          for (const [coin, data] of Object.entries(cryptoResult.data)) {
            console.log(chalk.hex('#00FFFF')(`  ${coin}: $${data.usd}`) + chalk.hex(data.usd_24h_change > 0 ? '#00FF40' : '#FF0000')(` (${data.usd_24h_change?.toFixed(2)}%)`));
          }
        } else console.log(chalk.hex('#FF0000')(`❌ ${cryptoResult.error}`));
        break;
      }

      // ═══ TASK SCHEDULER ═══
      case '/schedule': {
        const schedStatus = this.scheduler.getStatus();
        console.log(require('boxen')([
          chalk.hex('#FF0000')('⏰ Task Scheduler'),
          '',
          chalk.hex('#00FFFF')('Running: ') + (schedStatus.running ? '✅' : '❌'),
          chalk.hex('#00FFFF')('Total Jobs: ') + schedStatus.totalJobs,
          chalk.hex('#00FFFF')('Enabled: ') + schedStatus.enabledJobs,
          chalk.hex('#00FFFF')('Next Job: ') + schedStatus.nextJob,
          '',
          chalk.hex('#888888')('  /schedule-list           — List all jobs'),
          chalk.hex('#888888')('  /schedule-add <name> <action> — Add job'),
          chalk.hex('#888888')('  /schedule-daily <name> <time> <action> — Daily job'),
          chalk.hex('#888888')('  /schedule-run <id>       — Run job now')
        ].join('\n'), { padding: 1, borderStyle: 'round', borderColor: 'red' }));
        break;
      }
      case '/schedule-list': {
        const jobs = this.scheduler.listJobs();
        if (!jobs.length) console.log(chalk.hex('#888888')('  No scheduled jobs.'));
        else jobs.forEach(j => console.log(chalk.hex('#00FFFF')(`  ${j.name}`) + chalk.hex('#888888')(` [${j.type}] ${j.enabled ? '✅' : '❌'} Runs: ${j.runCount} Next: ${j.nextRun}`)));
        break;
      }
      case '/schedule-daily': {
        const [schedName, schedTime, ...schedAction] = args.split(' ');
        if (!schedName || !schedTime) { console.log(chalk.hex('#FF0000')('Usage: /schedule-daily <name> <HH:MM> <action>')); break; }
        const schedResult = this.scheduler.scheduleDaily(schedName, schedTime, { type: 'chat', value: schedAction.join(' ') });
        console.log(chalk.hex('#00FF40')(`✅ Scheduled: ${schedName} daily at ${schedTime}`));
        break;
      }
      case '/schedule-run': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /schedule-run <job-id>')); break; }
        const runResult = await this.scheduler.runJob(args);
        console.log(runResult.success ? chalk.hex('#00FF40')(`✅ Job executed: ${runResult.name}`) : chalk.hex('#FF0000')(`❌ ${runResult.error}`));
        break;
      }

      // ═══ BACKUP MANAGER ═══
      case '/backup': {
        const backupStatus = this.backup.getStatus();
        console.log(require('boxen')([
          chalk.hex('#FF0000')('💾 Backup Manager'),
          '',
          chalk.hex('#00FFFF')('Total Backups: ') + backupStatus.totalBackups,
          chalk.hex('#00FFFF')('Total Size: ') + backupStatus.totalSize,
          chalk.hex('#00FFFF')('Last Backup: ') + backupStatus.lastBackup,
          chalk.hex('#00FFFF')('Encrypted: ') + backupStatus.encryptedBackups,
          '',
          chalk.hex('#888888')('  /backup-create           — Create backup'),
          chalk.hex('#888888')('  /backup-create-enc <pw>  — Encrypted backup'),
          chalk.hex('#888888')('  /backup-list             — List backups'),
          chalk.hex('#888888')('  /backup-restore <name>   — Restore backup'),
          chalk.hex('#888888')('  /backup-verify <name>    — Verify integrity'),
          chalk.hex('#888888')('  /backup-cleanup [n]      — Keep last n backups')
        ].join('\n'), { padding: 1, borderStyle: 'round', borderColor: 'red' }));
        break;
      }
      case '/backup-create': {
        const spin = ora('💾 Creating backup...').start();
        const backupResult = await this.backup.createBackup();
        spin.stop();
        console.log(backupResult.success ? chalk.hex('#00FF40')(`✅ Backup: ${backupResult.name} (${backupResult.sizeHuman})`) : chalk.hex('#FF0000')(`❌ ${backupResult.error}`));
        break;
      }
      case '/backup-create-enc': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /backup-create-enc <password>')); break; }
        const spin = ora('🔐 Creating encrypted backup...').start();
        const encResult = await this.backup.createEncryptedBackup(args);
        spin.stop();
        console.log(encResult.success ? chalk.hex('#00FF40')(`✅ Encrypted backup created`) : chalk.hex('#FF0000')(`❌ ${encResult.error}`));
        break;
      }
      case '/backup-list': {
        const backups = this.backup.listBackups();
        if (!backups.length) console.log(chalk.hex('#888888')('  No backups found.'));
        backups.forEach(b => console.log(chalk.hex('#00FFFF')(`  ${b.name}`) + chalk.hex('#888888')(` ${b.size} ${b.encrypted ? '🔐' : ''} ${b.timestamp}`)));
        break;
      }
      case '/backup-restore': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /backup-restore <name>')); break; }
        const restoreResult = await this.backup.restoreBackup(args);
        console.log(restoreResult.success ? chalk.hex('#00FF40')(`✅ Restored: ${args}`) : chalk.hex('#FF0000')(`❌ ${restoreResult.error}`));
        break;
      }
      case '/backup-verify': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /backup-verify <name>')); break; }
        const verifyResult = this.backup.verifyBackup(args);
        console.log(verifyResult.valid ? chalk.hex('#00FF40')(`✅ Backup valid: ${args}`) : chalk.hex('#FF0000')(`❌ ${verifyResult.error}`));
        break;
      }

      // ═══ PLUGIN MARKETPLACE ═══
      case '/marketplace': {
        const mktStatus = this.marketplace.getStatus();
        console.log(require('boxen')([
          chalk.hex('#FF0000')('🛒 Plugin Marketplace'),
          '',
          chalk.hex('#00FFFF')('Installed: ') + mktStatus.installedPlugins,
          chalk.hex('#00FFFF')('Total Installs: ') + mktStatus.totalInstalls,
          '',
          chalk.hex('#888888')('  /marketplace-browse      — Browse plugins'),
          chalk.hex('#888888')('  /marketplace-search <q>  — Search plugins'),
          chalk.hex('#888888')('  /marketplace-install <n> — Install plugin'),
          chalk.hex('#888888')('  /marketplace-update <n>  — Update plugin'),
          chalk.hex('#888888')('  /marketplace-list        — List installed'),
          chalk.hex('#888888')('  /marketplace-updates     — Check updates')
        ].join('\n'), { padding: 1, borderStyle: 'round', borderColor: 'red' }));
        break;
      }
      case '/marketplace-browse': {
        const spin = ora('🛒 Browsing marketplace...').start();
        const browseResult = await this.marketplace.browse({ search: args });
        spin.stop();
        console.log(chalk.hex('#00FF40')(`✅ Found ${browseResult.total} plugins (${browseResult.source}):\n`));
        browseResult.plugins.slice(0, 15).forEach(p => console.log(chalk.hex('#00FFFF')(`  ${p.name}`) + chalk.hex('#888888')(` — ${p.description}`)));
        break;
      }
      case '/marketplace-search': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /marketplace-search <query>')); break; }
        const searchResult = await this.marketplace.search(args);
        console.log(chalk.hex('#00FF40')(`✅ Found ${searchResult.total} plugins:\n`));
        searchResult.plugins.forEach(p => console.log(chalk.hex('#00FFFF')(`  ${p.name}`) + chalk.hex('#888888')(` — ${p.description}`)));
        break;
      }
      case '/marketplace-install': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /marketplace-install <plugin-name>')); break; }
        const spin = ora(`📦 Installing ${args}...`).start();
        const installResult = await this.marketplace.install(args);
        spin.stop();
        console.log(installResult.success ? chalk.hex('#00FF40')(`✅ Installed: ${args}`) : chalk.hex('#FF0000')(`❌ ${installResult.error}`));
        break;
      }
      case '/marketplace-list': {
        const installed = this.marketplace.listInstalled();
        if (!installed.length) console.log(chalk.hex('#888888')('  No plugins installed.'));
        installed.forEach(p => console.log(chalk.hex('#00FFFF')(`  ${p.name}@${p.version}`) + chalk.hex('#888888')(` — ${p.description}`)));
        break;
      }
      case '/marketplace-updates': {
        const spin = ora('🔄 Checking updates...').start();
        const updates = await this.marketplace.checkUpdates();
        spin.stop();
        if (!updates.total) console.log(chalk.hex('#00FF40')('✅ All plugins up to date!'));
        updates.updates.forEach(u => console.log(chalk.hex('#00FFFF')(`  ${u.name}`) + chalk.hex('#888888')(` ${u.current} → ${u.latest}`)));
        break;
      }

      // ═══ PERFORMANCE MONITOR ═══
      case '/monitor': {
        const current = this.monitor.getCurrent();
        const report = this.monitor.generateReport();
        console.log(require('boxen')([
          chalk.hex('#FF0000')('📊 Performance Monitor'),
          '',
          chalk.hex('#FF0000')('═══ CPU ═══'),
          chalk.hex('#00FFFF')('  Current: ') + `${current.cpu}%`,
          chalk.hex('#00FFFF')('  Average: ') + `${report.summary.cpu.average}%`,
          chalk.hex('#00FFFF')('  Model: ') + current.cpuModel,
          chalk.hex('#00FFFF')('  Cores: ') + current.cpuCount,
          '',
          chalk.hex('#FF0000')('═══ MEMORY ═══'),
          chalk.hex('#00FFFF')('  Used: ') + `${current.memory.usedHuman} / ${current.memory.totalHuman} (${current.memory.percent}%)`,
          '',
          chalk.hex('#FF0000')('═══ DISK ═══'),
          chalk.hex('#00FFFF')('  Usage: ') + `${current.disk.percent}%`,
          chalk.hex('#00FFFF')('  Available: ') + `${current.disk.available}`,
          '',
          chalk.hex('#FF0000')('═══ NETWORK ═══'),
          chalk.hex('#00FFFF')('  Online: ') + (current.network.online ? '✅' : '❌'),
          chalk.hex('#00FFFF')('  Latency: ') + `${current.network.latency}ms`,
          '',
          chalk.hex('#FF0000')('═══ SYSTEM ═══'),
          chalk.hex('#00FFFF')('  Uptime: ') + report.summary.uptime,
          chalk.hex('#00FFFF')('  Load: ') + current.loadAvg.map(l => l.toFixed(2)).join(', '),
          chalk.hex('#00FFFF')('  Platform: ') + `${current.platform} ${current.arch}`,
          '',
          chalk.hex('#888888')('  /monitor-start — Start monitoring'),
          chalk.hex('#888888')('  /monitor-stop  — Stop monitoring'),
          chalk.hex('#888888')('  /monitor-alerts — Active alerts')
        ].join('\n'), { padding: 1, borderStyle: 'round', borderColor: 'red' }));
        break;
      }
      case '/monitor-start': {
        const startResult = this.monitor.start();
        console.log(chalk.hex('#00FF40')(`✅ Monitoring started (interval: ${startResult.interval}ms)`));
        break;
      }
      case '/monitor-stop': {
        this.monitor.stop();
        console.log(chalk.hex('#00FF40')('✅ Monitoring stopped'));
        break;
      }
      case '/monitor-alerts': {
        const alerts = this.monitor.getActiveAlerts();
        if (!alerts.length) console.log(chalk.hex('#00FF40')('✅ No active alerts'));
        alerts.forEach(a => console.log(chalk.hex(a.severity === 'high' ? '#FF0000' : '#FFD700')(`  ⚠️ ${a.message}`)));
        break;
      }

      // ═══ NOTIFICATION CENTER ═══
      case '/notifications': {
        const notifStatus = this.notifications.getStatus();
        const unread = this.notifications.getUnread();
        console.log(require('boxen')([
          chalk.hex('#FF0000')('🔔 Notification Center'),
          '',
          chalk.hex('#00FFFF')('Total: ') + notifStatus.total,
          chalk.hex('#00FFFF')('Unread: ') + notifStatus.unread,
          chalk.hex('#00FFFF')('Channels: ') + notifStatus.channels,
          '',
          ...unread.slice(0, 5).map(n => chalk.hex('#FFD700')(`  ${n.icon} ${n.title}`) + chalk.hex('#888888')(` — ${n.body.slice(0, 50)}`)),
          '',
          chalk.hex('#888888')('  /notifications-recent   — Recent notifications'),
          chalk.hex('#888888')('  /notifications-read     — Mark all read'),
          chalk.hex('#888888')('  /notifications-clear    — Clear history'),
          chalk.hex('#888888')('  /notify <channel> <msg> — Send notification')
        ].join('\n'), { padding: 1, borderStyle: 'round', borderColor: 'red' }));
        break;
      }
      case '/notifications-recent': {
        const recent = this.notifications.getRecent(10);
        if (!recent.length) console.log(chalk.hex('#888888')('  No notifications.'));
        recent.forEach(n => {
          const time = new Date(n.timestamp).toLocaleTimeString();
          const readMark = n.read ? '  ' : '🔴';
          console.log(chalk.hex('#888888')(`  [${time}]`) + ` ${readMark} ${n.icon} ${chalk.hex('#00FFFF')(n.title)} — ${n.body.slice(0, 60)}`);
        });
        break;
      }
      case '/notifications-read': {
        const markResult = this.notifications.markAllRead();
        console.log(chalk.hex('#00FF40')(`✅ Marked ${markResult.marked} notifications as read`));
        break;
      }
      case '/notifications-clear': {
        this.notifications.clearHistory();
        console.log(chalk.hex('#00FF40')('✅ Notification history cleared'));
        break;
      }
      case '/notify': {
        const [notifChannel, ...notifParts] = args.split(' ');
        if (!notifChannel || !notifParts.length) { console.log(chalk.hex('#FF0000')('Usage: /notify <channel> <message>')); break; }
        const notifResult = this.notifications.notify(notifChannel, 'OpenDesktop', notifParts.join(' '));
        console.log(notifResult.sent ? chalk.hex('#00FF40')('✅ Notification sent') : chalk.hex('#FF0000')(`❌ ${notifResult.reason || 'Failed'}`));
        break;
      }

      // ═══ CONFIG MANAGER ═══
      case '/profiles': {
        const profiles = this.configManager.listProfiles();
        const templates = Object.keys(this.configManager.templates);
        console.log(require('boxen')([
          chalk.hex('#FF0000')('⚙️ Config Manager'),
          '',
          chalk.hex('#FF0000')('═══ PROFILES ═══'),
          ...profiles.map(p => chalk.hex('#00FFFF')(`  ${p.name}`) + chalk.hex('#888888')(` — ${p.description || 'No description'}`)),
          profiles.length === 0 ? chalk.hex('#888888')('  No saved profiles') : '',
          '',
          chalk.hex('#FF0000')('═══ TEMPLATES ═══'),
          ...templates.map(t => chalk.hex('#00FFFF')(`  ${t}`)),
          '',
          chalk.hex('#888888')('  /profile-save <name>    — Save current config'),
          chalk.hex('#888888')('  /profile-load <name>    — Load profile'),
          chalk.hex('#888888')('  /profile-apply <tmpl>   — Apply template'),
          chalk.hex('#888888')('  /profile-export         — Export config'),
          chalk.hex('#888888')('  /profile-import <file>  — Import config'),
          chalk.hex('#888888')('  /profile-validate       — Validate config'),
          chalk.hex('#888888')('  /profile-reset          — Reset to defaults')
        ].join('\n'), { padding: 1, borderStyle: 'round', borderColor: 'red' }));
        break;
      }
      case '/profile-save': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /profile-save <name>')); break; }
        const saveResult = this.configManager.saveProfile(args);
        console.log(saveResult.saved ? chalk.hex('#00FF40')(`✅ Profile saved: ${args}`) : chalk.hex('#FF0000')('Failed'));
        break;
      }
      case '/profile-load': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /profile-load <name>')); break; }
        const loadResult = this.configManager.loadProfile(args);
        console.log(loadResult.loaded ? chalk.hex('#00FF40')(`✅ Profile loaded: ${args}`) : chalk.hex('#FF0000')(`❌ ${loadResult.error}`));
        break;
      }
      case '/profile-apply': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /profile-apply <template-name>')); break; }
        const applyResult = this.configManager.applyTemplate(args);
        console.log(applyResult.applied ? chalk.hex('#00FF40')(`✅ Template applied: ${args} — ${applyResult.description}`) : chalk.hex('#FF0000')(`❌ ${applyResult.error}`));
        break;
      }
      case '/profile-export': {
        const exportResult = this.configManager.exportConfig();
        console.log(chalk.hex('#00FF40')(`✅ Config exported: ${exportResult.path}`));
        break;
      }
      case '/profile-import': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /profile-import <file-path>')); break; }
        const importResult = this.configManager.importConfig(args, { merge: true });
        console.log(importResult.imported ? chalk.hex('#00FF40')('✅ Config imported') : chalk.hex('#FF0000')(`❌ ${importResult.error}`));
        break;
      }
      case '/profile-validate': {
        const validation = this.configManager.validateConfig();
        console.log(validation.valid ? chalk.hex('#00FF40')('✅ Config is valid') : chalk.hex('#FF0000')('❌ Config has issues:'));
        validation.issues.forEach(i => console.log(chalk.hex(i.severity === 'error' ? '#FF0000' : '#FFD700')(`  ${i.severity}: ${i.message}`)));
        break;
      }
      case '/profile-reset': {
        const resetResult = this.configManager.resetToDefaults();
        console.log(chalk.hex('#00FF40')(`✅ Config reset to defaults (backup: ${resetResult.backup})`));
        break;
      }

      // ═══ MESSAGING ═══
      case '/messaging': {
        const msgStatus = this.messaging.getStatus();
        console.log(require('boxen')([
          chalk.hex('#FF0000')('💬 Messaging Hub — 20 Platforms'),
          '',
          chalk.hex('#00FFFF')('Active: ') + (msgStatus.active ? '✅' : '❌'),
          chalk.hex('#00FFFF')('Platforms: ') + msgStatus.platforms.length,
          chalk.hex('#00FFFF')('Messages: ') + msgStatus.totalMessages,
          chalk.hex('#00FFFF')('Supported: ') + msgStatus.supportedPlatforms + ' platforms',
          '',
          chalk.hex('#FF0000')('═══ PLATFORMS ═══'),
          ...this.messaging.getSupportedPlatforms().map(p =>
            chalk.hex('#00FFFF')(`  ${p.icon} ${p.name.padEnd(15)}`) + chalk.hex('#888888')(` ${p.requires}`)
          )
        ].join('\n'), { padding: 1, borderStyle: 'round', borderColor: 'red' }));
        break;
      }

      // ═══ BROWSER & DOWNLOADS ═══
      case '/download': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /download <url>')); break; }
        const dlResult = await this.browser.downloadWithProgress(args);
        console.log(dlResult.success ? chalk.hex('#00FF40')(`✅ Downloaded: ${dlResult.path} (${dlResult.sizeHuman || this.browser._formatBytes(dlResult.size)})`) : chalk.hex('#FF0000')(`❌ ${dlResult.error}`));
        break;
      }

      case '/browse': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /browse <url>')); break; }
        const browseResult = await this.browser.openBrowser(args);
        console.log(browseResult.opened ? chalk.hex('#00FF40')(`✅ Opening: ${args}`) : chalk.hex('#FF0000')(`❌ ${browseResult.error}`));
        break;
      }

      case '/find-links': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /find-links <url>')); break; }
        const linksResult = await this.browser.findDownloadLinks(args);
        console.log(chalk.hex('#00FF40')(`✅ Found ${linksResult.total} links:\n`));
        (linksResult.links || []).slice(0, 20).forEach((l, i) => console.log(chalk.hex('#00FFFF')(`  ${i + 1}. `) + l));
        break;
      }

      case '/scrape-deep': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /scrape-deep <url>')); break; }
        const spin = ora('🌐 Deep scraping...').start();
        const scrapeResult = await this.browser.scrapeDeep(args, { depth: 2, maxPages: 10 });
        spin.stop();
        console.log(chalk.hex('#00FF40')(`✅ Scraped ${scrapeResult.pagesScraped} pages:\n`));
        scrapeResult.results?.forEach(r => console.log(chalk.hex('#00FFFF')(`  ${r.title || r.url}`) + chalk.hex('#888888')(` [depth: ${r.depth}]`)));
        break;
      }

      case '/screenshot': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /screenshot <url>')); break; }
        const spin = ora('📸 Taking screenshot...').start();
        const ssResult = await this.browser.screenshotPage(args, { fullPage: true });
        spin.stop();
        console.log(ssResult.success ? chalk.hex('#00FF40')(`✅ Screenshot: ${ssResult.path}`) : chalk.hex('#FF0000')(`❌ ${ssResult.error}`));
        break;
      }

      case '/find': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /find <anything>')); break; }
        const spin = ora('🔍 Searching everywhere...').start();
        const findResult = await this.browser.searchAndFind(args);
        spin.stop();
        console.log(chalk.hex('#00FF40')(`✅ Found ${findResult.totalResults} results:\n`));
        if (findResult.results?.web?.length) {
          console.log(chalk.hex('#FF0000')('  ═══ WEB ═══'));
          findResult.results.web.slice(0, 5).forEach((u, i) => console.log(chalk.hex('#00FFFF')(`    ${i + 1}. `) + u));
        }
        if (findResult.results?.github?.length) {
          console.log(chalk.hex('#FF0000')('  ═══ GITHUB ═══'));
          findResult.results.github.forEach(r => console.log(chalk.hex('#00FFFF')(`    ⭐ ${r.stars} `) + `${r.name} — ${r.description?.slice(0, 60)}`));
        }
        if (findResult.results?.npm?.length) {
          console.log(chalk.hex('#FF0000')('  ═══ NPM ═══'));
          findResult.results.npm.forEach(r => console.log(chalk.hex('#00FFFF')(`    📦 ${r.name}@${r.version} `) + `— ${r.description?.slice(0, 60)}`));
        }
        if (findResult.results?.downloads?.length) {
          console.log(chalk.hex('#FF0000')('  ═══ DOWNLOADS ═══'));
          findResult.results.downloads.slice(0, 10).forEach((d, i) => console.log(chalk.hex('#00FF40')(`    📥 ${i + 1}. `) + d));
        }
        break;
      }

      case '/how': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /how <anything you want to do>')); break; }
        const spin = ora('🧠 Finding ways...').start();
        const howResult = await this.browser.findHowTo(args);
        spin.stop();
        console.log(chalk.hex('#00FF40')(`✅ ${howResult.conclusion}\n`));
        for (const strategy of howResult.strategies) {
          console.log(chalk.hex('#FF0000')(`  ═══ ${strategy.source?.toUpperCase()} ═══`));
          if (strategy.result) console.log(strategy.result);
          if (strategy.results?.length) strategy.results.forEach(r => console.log(chalk.hex('#00FFFF')(`    • `) + (r.title || r.name || r.url || JSON.stringify(r).slice(0, 80))));
        }
        break;
      }

      // ═══ REVERSE ENGINEERING ═══
      case '/analyze-bin': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /analyze-bin <file>')); break; }
        const spin = ora('🔬 Analyzing binary...').start();
        const binResult = await this.reverseEng.analyzeBinary(args);
        spin.stop();
        console.log(require('boxen')([
          chalk.hex('#FF0000')('🔬 Binary Analysis'),
          '',
          chalk.hex('#00FFFF')('File: ') + binResult.file,
          chalk.hex('#00FFFF')('Size: ') + binResult.sizeHuman,
          chalk.hex('#00FFFF')('Type: ') + binResult.magic?.description,
          chalk.hex('#00FFFF')('Entropy: ') + binResult.entropy?.toFixed(2),
          chalk.hex('#00FFFF')('MD5: ') + binResult.hashes?.md5,
          chalk.hex('#00FFFF')('SHA256: ') + binResult.hashes?.sha256,
          '',
          chalk.hex('#FF0000')('═══ STRINGS ═══'),
          ...(binResult.strings || []).slice(0, 10).map(s => chalk.hex('#888888')('  ' + s.slice(0, 80))),
          '',
          chalk.hex('#FF0000')('═══ PATTERNS ═══'),
          ...(binResult.patterns || []).map(p => chalk.hex('#00FFFF')(`  ${p.type}: ${p.count || ''}`) + (p.samples ? chalk.hex('#888888')(` — ${p.samples[0]?.slice(0, 50)}`) : ''))
        ].join('\n'), { padding: 1, borderStyle: 'round', borderColor: 'red' }));
        if (binResult.aiAnalysis) console.log('\n' + binResult.aiAnalysis);
        break;
      }

      case '/hexdump': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /hexdump <file>')); break; }
        const content = fs.readFileSync(args);
        const dump = this.reverseEng._hexDump(content.slice(0, 512));
        dump.forEach(line => console.log(chalk.hex('#00FFFF')(line)));
        break;
      }

      case '/strings': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /strings <file>')); break; }
        const content = fs.readFileSync(args);
        const strings = this.reverseEng._extractStrings(content, 6);
        console.log(chalk.hex('#00FF40')(`✅ Found ${strings.length} strings:\n`));
        strings.slice(0, 50).forEach((s, i) => console.log(chalk.hex('#888888')(`  ${i}: `) + s));
        break;
      }

      case '/entropy': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /entropy <file>')); break; }
        const content = fs.readFileSync(args);
        const entropy = this.reverseEng._calculateEntropy(content);
        const level = entropy > 7.5 ? '🔴 Very high (encrypted/compressed)' : entropy > 6 ? '🟡 High (binary)' : entropy > 4 ? '🟢 Medium (structured)' : '⚪ Low (text/simple)';
        console.log(chalk.hex('#00FFFF')(`Entropy: ${entropy.toFixed(4)} — ${level}`));
        break;
      }

      case '/patterns': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /patterns <file>')); break; }
        const spin = ora('🔍 Finding patterns...').start();
        const patterns = await this.reverseEng.findPatterns(args);
        spin.stop();
        console.log(chalk.hex('#00FF40')(`✅ Patterns found:\n`));
        console.log(chalk.hex('#00FFFF')(`  Entropy: ${patterns.entropy?.toFixed(2)}`));
        (patterns.urls?.samples || []).forEach(u => console.log(chalk.hex('#00FFFF')('  URL: ') + u));
        (patterns.sequences || []).slice(0, 5).forEach(s => console.log(chalk.hex('#00FFFF')('  Seq: ') + `${s.hex.slice(0, 20)}... (${s.count}x)`));
        if (patterns.recommendation) console.log('\n' + patterns.recommendation);
        break;
      }

      case '/diff': {
        const [diffFile1, diffFile2] = args.split(' ');
        if (!diffFile1 || !diffFile2) { console.log(chalk.hex('#FF0000')('Usage: /diff <file1> <file2>')); break; }
        const diffResult = await this.reverseEng.diffFiles(diffFile1, diffFile2);
        console.log(diffResult.identical ? chalk.hex('#00FF40')('✅ Files are identical') : [
          chalk.hex('#FF0000')('📊 Diff Results:'),
          chalk.hex('#00FFFF')(`  Size diff: ${diffResult.sizeDiff} bytes`),
          chalk.hex('#00FFFF')(`  Byte diffs: ${diffResult.totalByteDiffs} (${diffResult.diffPercentage})`),
          ...diffResult.byteDiffs.slice(0, 10).map(d => chalk.hex('#888888')(`  ${d.hex}: ${d.file1} → ${d.file2}`))
        ].join('\n'));
        break;
      }

      case '/hardware': {
        const spin = ora('🖥️ Analyzing hardware...').start();
        const hw = await this.reverseEng.analyzeHardware();
        spin.stop();
        console.log(require('boxen')([
          chalk.hex('#FF0000')('🖥️ Hardware Analysis'),
          '',
          chalk.hex('#FF0000')('═══ CPU ═══'),
          chalk.hex('#00FFFF')('  Brand: ') + hw.cpu.brand,
          chalk.hex('#00FFFF')('  Cores: ') + `${hw.cpu.cores} (${hw.cpu.physicalCores} physical)`,
          chalk.hex('#00FFFF')('  Speed: ') + hw.cpu.speed,
          '',
          chalk.hex('#FF0000')('═══ MEMORY ═══'),
          chalk.hex('#00FFFF')('  Total: ') + hw.memory.total,
          chalk.hex('#00FFFF')('  Used: ') + hw.memory.used,
          '',
          chalk.hex('#FF0000')('═══ STORAGE ═══'),
          ...hw.storage.map(s => chalk.hex('#00FFFF')(`  ${s.mount}: ${s.size} (${s.percent} used)`)),
          '',
          chalk.hex('#FF0000')('═══ GPU ═══'),
          ...hw.gpu.map(g => chalk.hex('#00FFFF')(`  ${g.model} (${g.vram})`)),
          '',
          chalk.hex('#FF0000')('═══ MOTHERBOARD ═══'),
          chalk.hex('#00FFFF')('  Manufacturer: ') + hw.motherboard.manufacturer,
          chalk.hex('#00FFFF')('  Model: ') + hw.motherboard.model,
          '',
          chalk.hex('#FF0000')('═══ BIOS ═══'),
          chalk.hex('#00FFFF')('  Vendor: ') + hw.bios.vendor,
          chalk.hex('#00FFFF')('  Version: ') + hw.bios.version,
          '',
          chalk.hex('#FF0000')('═══ NETWORK ═══'),
          ...hw.network.map(n => chalk.hex('#00FFFF')(`  ${n.iface}: ${n.ip4} (${n.mac})`))
        ].join('\n'), { padding: 1, borderStyle: 'round', borderColor: 'red' }));
        break;
      }

      case '/net-analyze': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /net-analyze <host>')); break; }
        const spin = ora('🌐 Analyzing network...').start();
        const netResult = await this.reverseEng.analyzeNetwork(args);
        spin.stop();
        console.log(chalk.hex('#00FF40')(`✅ Network analysis for ${netResult.target}:\n`));
        if (netResult.ping?.success) console.log(chalk.hex('#00FFFF')('  Ping: ') + 'Reachable');
        if (netResult.ports?.length) {
          console.log(chalk.hex('#FF0000')('  ═══ OPEN PORTS ═══'));
          netResult.ports.forEach(p => console.log(chalk.hex('#00FF40')(`    Port ${p.port}: OPEN`)));
        }
        if (netResult.dns?.output) console.log(chalk.hex('#00FFFF')('  DNS: ') + netResult.dns.output.split('\n')[2]);
        break;
      }

      case '/portscan': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /portscan <host>')); break; }
        const spin = ora('🔍 Scanning ports...').start();
        const scanResult = await this.reverseEng.analyzeNetwork(args, { ports: [21,22,23,25,53,80,110,143,443,993,995,3306,3389,5432,8080,8443,27017,6379,9200,5601] });
        spin.stop();
        console.log(chalk.hex('#00FF40')(`✅ Open ports on ${scanResult.target}:\n`));
        (scanResult.ports || []).forEach(p => console.log(chalk.hex('#00FF40')(`  ✅ Port ${p.port}: OPEN`)));
        if (!scanResult.ports?.length) console.log(chalk.hex('#888888')('  No open ports found in scanned range'));
        break;
      }

      // ═══ VECTOR MEMORY ═══
      case '/vector-search': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /vector-search <query>')); break; }
        const results = this.vectorMemory.search(args);
        console.log(chalk.hex('#00FF40')(`✅ Found ${results.length} results:\n`));
        results.slice(0, 10).forEach((r, i) => {
          console.log(chalk.hex('#00FFFF')(`  ${i + 1}. [${(r.score * 100).toFixed(1)}%]`) + ` ${r.text.slice(0, 80)}`);
        });
        break;
      }
      case '/vector-add': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /vector-add <text>')); break; }
        const addResult = this.vectorMemory.add(args);
        console.log(chalk.hex('#00FF40')(`✅ Added to vector memory: ${addResult.id}`));
        break;
      }

      // ═══ MODEL ROUTER ═══
      case '/model-route': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /model-route <task description>')); break; }
        const route = this.modelRouter.route(args);
        console.log(require('boxen')([
          chalk.hex('#FF0000')('🔀 Model Router'),
          '',
          chalk.hex('#00FFFF')('Task: ') + args,
          chalk.hex('#00FFFF')('Model: ') + route.model,
          chalk.hex('#00FFFF')('Category: ') + route.category,
          chalk.hex('#00FFFF')('Reason: ') + route.reason,
          chalk.hex('#00FFFF')('Confidence: ') + `${route.confidence}%`
        ].join('\n'), { padding: 1, borderStyle: 'round', borderColor: 'red' }));
        break;
      }

      // ═══ TWO-FACTOR AUTH ═══
      case '/2fa-setup': {
        const setupResult = this.twoFactor.setup();
        console.log(require('boxen')([
          chalk.hex('#FF0000')('🔐 2FA Setup'),
          '',
          chalk.hex('#00FFFF')('Secret: ') + setupResult.secret,
          chalk.hex('#00FFFF')('URI: ') + setupResult.uri.slice(0, 60) + '...',
          '',
          chalk.hex('#FF0000')('═══ BACKUP CODES ═══'),
          ...setupResult.backupCodes.map(c => chalk.hex('#888888')(`  ${c}`)),
          '',
          chalk.hex('#FFD700')('⚠️ Save these backup codes! They won\'t be shown again.')
        ].join('\n'), { padding: 1, borderStyle: 'round', borderColor: 'red' }));
        break;
      }
      case '/2fa-verify': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /2fa-verify <code>')); break; }
        const verifyResult = this.twoFactor.verify(args);
        console.log(verifyResult.verified
          ? chalk.hex('#00FF40')(`✅ Verified! Method: ${verifyResult.method}`)
          : chalk.hex('#FF0000')(`❌ ${verifyResult.error}`));
        break;
      }

      // ═══ SELF-UPDATER ═══
      case '/update-check': {
        const spin = ora('🔄 Checking for updates...').start();
        const checkResult = this.updater.checkForUpdates();
        spin.stop();
        console.log(require('boxen')([
          chalk.hex('#FF0000')('🔄 Update Status'),
          '',
          chalk.hex('#00FFFF')('Current: ') + checkResult.current,
          chalk.hex('#00FFFF')('Latest: ') + checkResult.latest,
          chalk.hex('#00FFFF')('Available: ') + (checkResult.updateAvailable ? '✅ Yes' : '❌ No'),
          chalk.hex('#00FFFF')('Checked: ') + checkResult.checkedAt
        ].join('\n'), { padding: 1, borderStyle: 'round', borderColor: 'red' }));
        break;
      }
      case '/update-apply': {
        const spin = ora('⬆️ Applying update...').start();
        const updateResult = this.updater.applyUpdate();
        spin.stop();
        console.log(updateResult.applied
          ? chalk.hex('#00FF40')(`✅ Updated ${updateResult.from} → ${updateResult.to}`)
          : chalk.hex('#FF0000')(`❌ ${updateResult.error}`));
        break;
      }

      // ═══ THEME ENGINE ═══
      case '/theme-list': {
        const themes = this.themeEngine.listThemes();
        console.log(chalk.hex('#00FF40')('🎨 Available Themes:\n'));
        themes.forEach(t => {
          const marker = t.active ? chalk.hex('#FF0000')(' ← ACTIVE') : '';
          console.log(chalk.hex('#00FFFF')(`  ${t.id}`) + chalk.hex('#888888')(` — ${t.description}`) + marker);
        });
        break;
      }
      case '/theme-create': {
        if (!args) { console.log(chalk.hex('#FF0000')('Usage: /theme-create <name>')); break; }
        const createResult = this.themeEngine.createTheme(args, {});
        console.log(createResult.created
          ? chalk.hex('#00FF40')(`✅ Theme created: ${args}`)
          : chalk.hex('#FF0000')(`❌ ${createResult.error}`));
        break;
      }

      // ═══ MOBILE API ═══
      case '/mobile-status': {
        const mobileStatus = this.mobileAPI.getStatus();
        console.log(require('boxen')([
          chalk.hex('#FF0000')('📱 Mobile API'),
          '',
          chalk.hex('#00FFFF')('Running: ') + (mobileStatus.running ? '✅' : '❌'),
          chalk.hex('#00FFFF')('Devices: ') + mobileStatus.registeredDevices,
          chalk.hex('#00FFFF')('Sessions: ') + mobileStatus.activeSessions,
          chalk.hex('#00FFFF')('Push Tokens: ') + mobileStatus.pushTokens
        ].join('\n'), { padding: 1, borderStyle: 'round', borderColor: 'red' }));
        break;
      }

      // ═══ WEB UI ═══
      case '/web-ui': {
        try {
          const WebUIServer = require('../web-ui/server.js');
          const webUI = new WebUIServer(this);
          webUI.start();
          console.log(chalk.hex('#00FF40')('✅ Web UI started on port 3000'));
        } catch (err) {
          console.log(chalk.hex('#FF0000')(`❌ Failed to start Web UI: ${err.message}`));
        }
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
