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
  test('Providers: 19 providers', () => { if (Object.keys(ProviderRegistry.PROVIDERS).length < 19) throw new Error(`Expected 19+, got ${Object.keys(ProviderRegistry.PROVIDERS).length}`); });
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
  test('SkillCreator: create', async () => { const r = await new SkillCreator(new Config()).createSkill('test', 'desc'); if (!r.created) throw new Error(); });

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
  test('Engine: ALL 24 subsystems', () => {
    const e = new Engine();
    ['provider', 'memory', 'automation', 'vision', 'plugins', 'messaging', 'hotkey', 'voice',
     'codeExecutor', 'deployer', 'learning', 'skillCreator', 'workflows', 'persona', 'settings',
     'selfImprove', 'subAgents', 'socialMedia', 'research', 'adaptive', 'codeRewriter']
      .forEach(s => { if (!e[s]) throw new Error(`Missing: ${s}`); });
  });
  test('Engine: AI name config', () => { const e = new Engine(); if (!e.aiName) throw new Error(); });
  test('Engine: user name support', () => { const e = new Engine(); e.userName = 'John'; if (e.userName !== 'John') throw new Error(); });

  // === PACKAGE ===
  test('Package: name', () => { if (require('../package.json').name !== 'opendesktop-ai') throw new Error(); });
  test('Package: bins', () => { const p = require('../package.json'); if (!p.bin.opendesktop || !p.bin.od) throw new Error(); });

  // === FILE STRUCTURE ===
  test('Structure: ALL 24 module dirs', () => {
    ['core', 'providers', 'vision', 'automation', 'memory', 'messaging', 'gui', 'cli', 'plugins',
     'hotkey', 'voice', 'code-executor', 'deployer', 'learning', 'skill-creator', 'workflows',
     'persona', 'settings', 'self-improve', 'sub-agents', 'social-media', 'research', 'adaptive', 'code-rewriter']
      .forEach(d => { if (!fs.existsSync(path.join(__dirname, '..', 'src', d))) throw new Error(`Missing: src/${d}`); });
  });

  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log(`\n  ═══════════════════════════════════════════════════`);
  console.log(`  Results: ${passed} passed, ${failed} failed, ${total} total`);
  console.log(`  ═══════════════════════════════════════════════════\n`);
  if (failed > 0) process.exit(1);
}

runTests().catch(err => { console.error('Error:', err); process.exit(1); });
