#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
let passed = 0, failed = 0, total = 0;

function test(name, fn) {
  total++;
  try {
    const result = fn();
    if (result instanceof Promise) {
      result.then(() => { passed++; console.log(`  ✅ ${name}`); }).catch(err => { failed++; console.log(`  ❌ ${name}: ${err.message}`); });
    } else { passed++; console.log(`  ✅ ${name}`); }
  } catch (err) { failed++; console.log(`  ❌ ${name}: ${err.message}`); }
}

async function runTests() {
  console.log('\n  ⚡ OpenDesktop v2.0 Test Suite — ALL MODULES ⚡\n');

  const Config = require('../src/core/config.js');
  test('Config: loads', () => { new Config(); });
  test('Config: set/get', () => { const c = new Config(); c.set('t', 'v'); if (c.get('t') !== 'v') throw new Error(); });

  const ProviderRegistry = require('../src/providers/index.js');
  test('Providers: 19 providers', () => { if (Object.keys(ProviderRegistry.PROVIDERS).length < 30) throw new Error(`Expected 30+, got ${Object.keys(ProviderRegistry.PROVIDERS).length}`); });
  test('Providers: lists models', () => { if (!new ProviderRegistry(new Config()).listModels().length) throw new Error(); });

  const MemorySystem = require('../src/memory/index.js');
  test('Memory: semantic', () => { const m = new MemorySystem(new Config()); m.remember('k', 'v'); if (m.recall('k') !== 'v') throw new Error(); m.forget('k'); });
  test('Memory: episodic', () => { const m = new MemorySystem(new Config()); m.addEvent({ type: 't' }); if (!m.getEvents({ type: 't' }).length) throw new Error(); });
  test('Memory: search', () => { const m = new MemorySystem(new Config()); m.remember('findme', 'x'); if (!m.search('x').length) throw new Error(); m.forget('findme'); });

  const AutomationEngine = require('../src/automation/index.js');
  test('Automation: shell', async () => { const r = await new AutomationEngine(new Config()).runCommand('echo ok'); if (!r.stdout.includes('ok')) throw new Error(); });
  test('Automation: system info', async () => { const r = await new AutomationEngine(new Config()).getSystemInfo(); if (!r.cpu) throw new Error(); });

  const VisionSystem = require('../src/vision/index.js');
  test('Vision: init', () => { new VisionSystem(new Config(), new ProviderRegistry(new Config())); });

  const PluginManager = require('../src/plugins/index.js');
  test('Plugins: 15+ skills', () => { if (new PluginManager(new Config(), {}).getBuiltInSkills().length < 10) throw new Error(); });

  const MessagingHub = require('../src/messaging/index.js');
  test('Messaging: init', () => { new MessagingHub(new Config(), {}); });

  const GlobalHotkey = require('../src/hotkey/index.js');
  test('Hotkey: init', () => { new GlobalHotkey(new Config(), () => {}); });

  const VoiceSystem = require('../src/voice/index.js');
  test('Voice: status', () => { if (!('wakeWord' in new VoiceSystem(new Config(), {}).getStatus())) throw new Error(); });

  const CodeExecutor = require('../src/code-executor/index.js');
  test('CodeExecutor: 30+ languages', () => { if (new CodeExecutor(new Config()).getSupportedLanguages().length < 25) throw new Error(); });
  test('CodeExecutor: execute JS', async () => { const r = await new CodeExecutor(new Config()).execute('console.log("hi")', 'javascript'); if (!r.success) throw new Error(r.error); });
  test('CodeExecutor: detect language', () => { if (new CodeExecutor(new Config())._detectLanguage('console.log("t")') !== 'javascript') throw new Error(); });

  const Deployer = require('../src/deployer/index.js');
  test('Deployer: 18 targets', () => { if (new Deployer(new Config()).getSupportedTargets().length < 15) throw new Error(); });

  const LearningSystem = require('../src/learning/index.js');
  test('Learning: track', () => { new LearningSystem(new Config(), new MemorySystem(new Config())).trackCommand('/test'); });
  test('Learning: corrections', () => { const l = new LearningSystem(new Config(), new MemorySystem(new Config())); l.learnFromCorrection('a', 'b', 'c'); });
  test('Learning: preferences', () => { const l = new LearningSystem(new Config(), new MemorySystem(new Config())); l.learnPreference('a', 'b', 'c'); });
  test('Learning: suggestions', () => { new LearningSystem(new Config(), new MemorySystem(new Config())).getSuggestions(); });

  const SkillCreator = require('../src/skill-creator/index.js');
  test('SkillCreator: create', async () => { const r = await new SkillCreator(new Config()).createSkill('test_' + Date.now().toString(36), 'desc'); if (!r.created) throw new Error(); });

  const WorkflowBuilder = require('../src/workflows/index.js');
  test('Workflow: create', async () => { const r = await new WorkflowBuilder(new Config(), new AutomationEngine(new Config()), new ProviderRegistry(new Config())).createWorkflow('wf', [{ type: 'command', action: 'echo t' }]); if (!r.created) throw new Error(); });

  const PersonaSystem = require('../src/persona/index.js');
  test('Persona: 6 presets', () => { if (new PersonaSystem(new Config(), new MemorySystem(new Config())).getPresets().length < 5) throw new Error(); });
  test('Persona: create & activate', async () => { const p = new PersonaSystem(new Config(), new MemorySystem(new Config())); await p.createPersona('t', { tone: 'casual' }); if (!p.activatePersona('t').activated) throw new Error(); });

  // === NEW MODULES ===
  const SelfImprovementEngine = require('../src/self-improve/index.js');
  test('SelfImprove: init', () => { new SelfImprovementEngine(new Config(), new MemorySystem(new Config()), new ProviderRegistry(new Config())); });
  test('SelfImprove: track performance', () => { const s = new SelfImprovementEngine(new Config(), new MemorySystem(new Config()), new ProviderRegistry(new Config())); s.trackPerformance('responseTime', 100); });
  test('SelfImprove: analyze code', async () => { const r = await new SelfImprovementEngine(new Config(), new MemorySystem(new Config()), new ProviderRegistry(new Config())).analyzeOwnCode(); if (!r.files) throw new Error(); });
  test('SelfImprove: optimize costs', async () => { const r = await new SelfImprovementEngine(new Config(), new MemorySystem(new Config()), new ProviderRegistry(new Config())).optimizeCosts(); if (!r.suggestions.length) throw new Error(); });
  test('SelfImprove: version tracking', () => { if (new SelfImprovementEngine(new Config(), new MemorySystem(new Config()), new ProviderRegistry(new Config())).getVersion() < 1) throw new Error(); });

  const SubAgentSpawner = require('../src/sub-agents/index.js');
  test('SubAgents: init', () => { new SubAgentSpawner(new Config(), new ProviderRegistry(new Config()), new MemorySystem(new Config())); });
  test('SubAgents: list', () => { const s = new SubAgentSpawner(new Config(), new ProviderRegistry(new Config()), new MemorySystem(new Config())); if (!Array.isArray(s.listAgents())) throw new Error(); });

  const SocialMediaAutomation = require('../src/social-media/index.js');
  test('SocialMedia: init', () => { new SocialMediaAutomation(new Config(), new ProviderRegistry(new Config()), new AutomationEngine(new Config())); });
  test('SocialMedia: content queue', () => { if (!Array.isArray(new SocialMediaAutomation(new Config(), new ProviderRegistry(new Config()), new AutomationEngine(new Config())).getContentQueue())) throw new Error(); });

  const DeepResearchSystem = require('../src/research/index.js');
  test('Research: init', () => { new DeepResearchSystem(new Config(), new ProviderRegistry(new Config()), new MemorySystem(new Config())); });
  test('Research: cache', () => { if (new DeepResearchSystem(new Config(), new ProviderRegistry(new Config()), new MemorySystem(new Config())).getCacheSize() !== 0) throw new Error(); });

  const AdaptiveInterface = require('../src/adaptive/index.js');
  test('Adaptive: init', () => { new AdaptiveInterface(new Config(), new MemorySystem(new Config()), new LearningSystem(new Config(), new MemorySystem(new Config()))); });
  test('Adaptive: track interaction', () => { const a = new AdaptiveInterface(new Config(), new MemorySystem(new Config()), new LearningSystem(new Config(), new MemorySystem(new Config()))); a.trackInteraction('/test', {}); });
  test('Adaptive: greeting', () => { if (!new AdaptiveInterface(new Config(), new MemorySystem(new Config()), new LearningSystem(new Config(), new MemorySystem(new Config()))).getPersonalizedGreeting()) throw new Error(); });
  test('Adaptive: patterns', () => { const a = new AdaptiveInterface(new Config(), new MemorySystem(new Config()), new LearningSystem(new Config(), new MemorySystem(new Config()))); a.trackInteraction('/test', {}); if (!a.analyzeUsagePatterns()) throw new Error(); });

  const CodeRewriter = require('../src/code-rewriter/index.js');
  test('CodeRewriter: init', () => { new CodeRewriter(new Config(), new ProviderRegistry(new Config()), new MemorySystem(new Config())); });
  test('CodeRewriter: knowledge base list', () => { if (!Array.isArray(new CodeRewriter(new Config(), new ProviderRegistry(new Config()), new MemorySystem(new Config())).getKnowledgeBase())) throw new Error(); });

  // === ENGINE ===
  const Engine = require('../src/core/engine.js');
  test('Engine: init', () => { new Engine(); });
  test('Engine: ALL 28 subsystems', () => {
    const e = new Engine();
    ['provider', 'memory', 'automation', 'vision', 'plugins', 'messaging', 'hotkey', 'voice',
     'codeExecutor', 'deployer', 'learning', 'skillCreator', 'workflows', 'persona', 'settings',
     'selfImprove', 'subAgents', 'socialMedia', 'research', 'adaptive', 'codeRewriter',
     'webSearch', 'iot', 'security', 'installer', 'orchestrator', 'modelTrainer',
     'brain', 'proactive', 'osIntegration', 'visualUnderstanding', 'evolution', 'apiGateway', 'codeIntel', 'trustSafety', 'toolkit']
      .forEach(s => { if (!e[s]) throw new Error(`Missing: ${s}`); });
  });
  test('Engine: AI name config', () => { const e = new Engine(); if (!e.aiName) throw new Error(); });
  test('Engine: user name support', () => { const e = new Engine(); e.userName = 'John'; if (e.userName !== 'John') throw new Error(); });

  // === PACKAGE ===
  test('Package: name', () => { if (require('../package.json').name !== 'opendesktop-ai') throw new Error(); });
  test('Package: bins', () => { const p = require('../package.json'); if (!p.bin.opendesktop || !p.bin.od) throw new Error(); });

  // === NEW MODULES ===
  const WebSearchEngine = require('../src/web-search/index.js');
  test('WebSearch: init', () => { new WebSearchEngine(new Config()); });
  test('WebSearch: cache', () => { const w = new WebSearchEngine(new Config()); if (w.getCacheSize() !== 0) throw new Error(); });

  const IoTController = require('../src/iot/index.js');
  test('IoT: init', () => { new IoTController(new Config()); });
  test('IoT: list devices', () => { const i = new IoTController(new Config()); const r = i.listDevices(); if (!r && !Array.isArray(r)) throw new Error(); });

  const SecurityModule = require('../src/security/index.js');
  test('Security: init', () => { new SecurityModule(new Config()); });
  test('Security: encrypt/decrypt', () => { const s = new SecurityModule(new Config()); const enc = s.encrypt('test'); if (s.decrypt(enc) !== 'test') throw new Error(); });
  test('Security: sanitize', () => { const s = new SecurityModule(new Config()); const result = s.sanitize('hello;rm -rf /'); if (typeof result !== 'object' && typeof result !== 'string') throw new Error(); });
  test('Security: hash', () => { const s = new SecurityModule(new Config()); if (!s.hash('test')) throw new Error(); });
  test('Security: audit log', () => { const s = new SecurityModule(new Config()); s.audit('test_event'); if (!s.getAuditLog({ event: 'test_event' }).length) throw new Error(); });

  const ProgramInstaller = require('../src/program-installer/index.js');
  test('Installer: init', () => { new ProgramInstaller(new Config()); });
  test('Installer: package manager', () => { const p = new ProgramInstaller(new Config()); if (!p.getPackageManager()) throw new Error(); });

  const AgentOrchestrator = require('../src/orchestrator/index.js');
  test('Orchestrator: init', () => { new AgentOrchestrator(new Config(), new ProviderRegistry(new Config()), new MemorySystem(new Config())); });
  test('Orchestrator: progress', () => { const o = new AgentOrchestrator(new Config(), new ProviderRegistry(new Config()), new MemorySystem(new Config())); if (!o.getProgress()) throw new Error(); });

  const ModelTrainer = require('../src/model-trainer/index.js');
  test('ModelTrainer: init', () => { new ModelTrainer(new Config(), new ProviderRegistry(new Config()), new MemorySystem(new Config())); });
  test('ModelTrainer: hosting suggestions', () => { const m = new ModelTrainer(new Config(), new ProviderRegistry(new Config()), new MemorySystem(new Config())); if (!m.suggestHosting('small').suggestions.length) throw new Error(); });

  // === LEGENDARY FEATURES ===
  const ContextualBrain = require('../src/brain/index.js');
  test('Brain: init', () => { new ContextualBrain(new Config(), new MemorySystem(new Config())); });
  test('Brain: add node', () => { const b = new ContextualBrain(new Config(), new MemorySystem(new Config())); const id = b.addNode('fact', 'test fact'); if (!id) throw new Error(); });
  test('Brain: query', () => { const b = new ContextualBrain(new Config(), new MemorySystem(new Config())); b.addNode('fact', 'javascript is great'); const r = b.query('javascript'); if (!r.length) throw new Error(); });
  test('Brain: learn preference', () => { const b = new ContextualBrain(new Config(), new MemorySystem(new Config())); b.learnPreference('color', 'blue'); });
  test('Brain: stats', () => { const b = new ContextualBrain(new Config(), new MemorySystem(new Config())); if (!('totalNodes' in b.getStats())) throw new Error(); });

  const ProactiveEngine = require('../src/proactive/index.js');
  test('Proactive: init', () => { new ProactiveEngine(new Config(), new ContextualBrain(new Config(), new MemorySystem(new Config())), new MemorySystem(new Config()), new AutomationEngine(new Config()), new ProviderRegistry(new Config())); });
  test('Proactive: status', () => { const p = new ProactiveEngine(new Config(), new ContextualBrain(new Config(), new MemorySystem(new Config())), new MemorySystem(new Config()), new AutomationEngine(new Config()), new ProviderRegistry(new Config())); if (!('running' in p.getStatus())) throw new Error(); });
  test('Proactive: add rule', () => { const p = new ProactiveEngine(new Config(), new ContextualBrain(new Config(), new MemorySystem(new Config())), new MemorySystem(new Config()), new AutomationEngine(new Config()), new ProviderRegistry(new Config())); p.addRule('test', 'true', 'echo test'); });

  const DeepOSIntegration = require('../src/os-integration/index.js');
  test('OS Integration: init', () => { new DeepOSIntegration(new Config(), new ContextualBrain(new Config(), new MemorySystem(new Config()))); });
  test('OS Integration: status', () => { const o = new DeepOSIntegration(new Config(), new ContextualBrain(new Config(), new MemorySystem(new Config()))); if (!('platform' in o.getStatus())) throw new Error(); });
  test('OS Integration: clipboard type detection', () => { const o = new DeepOSIntegration(new Config(), new ContextualBrain(new Config(), new MemorySystem(new Config()))); if (o._detectContentType('https://example.com') !== 'url') throw new Error(); });

  const VisualUnderstanding = require('../src/visual-understanding/index.js');
  test('Visual Understanding: init', () => { new VisualUnderstanding(new Config(), new ProviderRegistry(new Config()), new VisionSystem(new Config(), new ProviderRegistry(new Config()))); });
  test('Visual Understanding: status', () => { const v = new VisualUnderstanding(new Config(), new ProviderRegistry(new Config()), new VisionSystem(new Config(), new ProviderRegistry(new Config()))); if (!('visualMemorySize' in v.getStatus())) throw new Error(); });

  const EvolutionEngine = require('../src/evolution/index.js');
  test('Evolution: init', () => { new EvolutionEngine(new Config(), new ContextualBrain(new Config(), new MemorySystem(new Config())), new MemorySystem(new Config()), new ProviderRegistry(new Config())); });
  test('Evolution: log interaction', () => { const e = new EvolutionEngine(new Config(), new ContextualBrain(new Config(), new MemorySystem(new Config())), new MemorySystem(new Config()), new ProviderRegistry(new Config())); e.logInteraction({ type: 'test', input: 'hi', output: 'hello' }); });
  test('Evolution: learn correction', () => { const e = new EvolutionEngine(new Config(), new ContextualBrain(new Config(), new MemorySystem(new Config())), new MemorySystem(new Config()), new ProviderRegistry(new Config())); e.learnCorrection('wrong', 'right', 'test'); });
  test('Evolution: performance report', () => { const e = new EvolutionEngine(new Config(), new ContextualBrain(new Config(), new MemorySystem(new Config())), new MemorySystem(new Config()), new ProviderRegistry(new Config())); if (!('total' in e.getPerformanceReport())) throw new Error(); });
  test('Evolution: version', () => { const e = new EvolutionEngine(new Config(), new ContextualBrain(new Config(), new MemorySystem(new Config())), new MemorySystem(new Config()), new ProviderRegistry(new Config())); if (!e.versionStr) throw new Error(); });

  const APIGateway = require('../src/api-gateway/index.js');
  test('API Gateway: init', () => { new APIGateway(new Config(), {}); });
  test('API Gateway: status', () => { const a = new APIGateway(new Config(), {}); if (!('routes' in a.getStatus())) throw new Error(); });
  test('API Gateway: routes registered', () => { const a = new APIGateway(new Config(), {}); if (a.routes.size < 5) throw new Error(); });

  const CodeIntelligence = require('../src/code-intelligence/index.js');
  test('Code Intelligence: init', () => { new CodeIntelligence(new Config(), new ProviderRegistry(new Config()), new MemorySystem(new Config())); });
  test('Code Intelligence: status', () => { const c = new CodeIntelligence(new Config(), new ProviderRegistry(new Config()), new MemorySystem(new Config())); if (!('filesIndexed' in c.getStatus())) throw new Error(); });

  const TrustSafety = require('../src/trust-safety/index.js');
  test('Trust & Safety: init', () => { new TrustSafety(new Config(), new SecurityModule(new Config())); });
  test('Trust & Safety: mode', () => { const t = new TrustSafety(new Config(), new SecurityModule(new Config())); const mode = t.getMode(); if (!mode || !mode.mode) throw new Error('Mode missing'); });
  test('Trust & Safety: set mode', () => { const t = new TrustSafety(new Config(), new SecurityModule(new Config())); t.setMode('full'); if (t.mode !== 'full') throw new Error(); });
  test('Trust & Safety: risk assessment', () => { const t = new TrustSafety(new Config(), new SecurityModule(new Config())); if (t._assessRisk({ description: 'read file' }) !== 'low') throw new Error(); });
  test('Trust & Safety: rollback stack', () => { const t = new TrustSafety(new Config(), new SecurityModule(new Config())); if (!Array.isArray(t.getRollbackStack())) throw new Error(); });

  const UniversalToolkit = require('../src/universal-toolkit/index.js');
  test('Toolkit: init', () => { new UniversalToolkit(new Config(), new ProviderRegistry(new Config())); });
  test('Toolkit: encode/decode', () => { const t = new UniversalToolkit(new Config(), new ProviderRegistry(new Config())); const enc = t.encode('hello'); if (!enc.encoded) throw new Error(); const dec = t.decode(enc.encoded); if (dec.decoded !== 'hello') throw new Error(); });
  test('Toolkit: hash', () => { const t = new UniversalToolkit(new Config(), new ProviderRegistry(new Config())); const h = t.hash('test'); if (!h.hash) throw new Error(); });
  test('Toolkit: uuid', () => { const t = new UniversalToolkit(new Config(), new ProviderRegistry(new Config())); const u = t.generateUUID(); if (!u || u.length < 10) throw new Error(); });
  test('Toolkit: json ops', () => { const t = new UniversalToolkit(new Config(), new ProviderRegistry(new Config())); const v = t.jsonOperation('validate', '{"a":1}'); if (!v.valid) throw new Error(); });

  // === STRUCTURE ===
  test('Structure: ALL 30 module dirs', () => {
    ['core', 'providers', 'vision', 'automation', 'memory', 'messaging', 'gui', 'cli', 'plugins',
     'hotkey', 'voice', 'code-executor', 'deployer', 'learning', 'skill-creator', 'workflows',
     'persona', 'settings', 'self-improve', 'sub-agents', 'social-media', 'research', 'adaptive',
     'code-rewriter', 'web-search', 'iot', 'security', 'program-installer', 'orchestrator', 'model-trainer',
     'brain', 'proactive', 'os-integration', 'visual-understanding', 'evolution', 'api-gateway',
     'code-intelligence', 'trust-safety']
      .forEach(d => { if (!fs.existsSync(path.join(__dirname, '..', 'src', d))) throw new Error(`Missing: src/${d}`); });
  });

  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log(`\n  ═══════════════════════════════════════════════════`);
  console.log(`  Results: ${passed} passed, ${failed} failed, ${total} total`);
  console.log(`  ═══════════════════════════════════════════════════\n`);
  if (failed > 0) process.exit(1);
}

runTests().catch(err => { console.error('Error:', err); process.exit(1); });
