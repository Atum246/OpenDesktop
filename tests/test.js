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
  console.log('\n  ⚡ OpenDesktop Test Suite — Full Feature Test ⚡\n');

  // === Config ===
  const Config = require('../src/core/config.js');
  test('Config: loads', () => { new Config(); });
  test('Config: has defaults', () => { const c = new Config(); if (!c.get('provider')) throw new Error('Missing'); });
  test('Config: set/get', () => { const c = new Config(); c.set('test.x', 'y'); if (c.get('test.x') !== 'y') throw new Error('Fail'); });

  // === Providers ===
  const ProviderRegistry = require('../src/providers/index.js');
  test('Providers: loads all', () => { const p = new ProviderRegistry(new Config()); if (p.listProviders().length < 15) throw new Error('Too few'); });
  test('Providers: 19 providers', () => { const c = Object.keys(ProviderRegistry.PROVIDERS).length; if (c < 18) throw new Error(`Expected 18+, got ${c}`); console.log(`    (${c} providers)`); });
  test('Providers: lists models', () => { const p = new ProviderRegistry(new Config()); if (!p.listModels().length) throw new Error('None'); });
  test('Providers: switch model', () => { const p = new ProviderRegistry(new Config()); p.switchModel('gpt-4o'); if (p.model !== 'gpt-4o') throw new Error('Fail'); });

  // === Memory ===
  const MemorySystem = require('../src/memory/index.js');
  test('Memory: init', () => { new MemorySystem(new Config()); });
  test('Memory: semantic', () => { const m = new MemorySystem(new Config()); m.remember('k', 'v'); if (m.recall('k') !== 'v') throw new Error('Fail'); m.forget('k'); });
  test('Memory: episodic', () => { const m = new MemorySystem(new Config()); m.addEvent({ type: 'test', message: 'hi' }); if (!m.getEvents({ type: 'test' }).length) throw new Error('None'); });
  test('Memory: tasks', () => { const m = new MemorySystem(new Config()); m.addTask({ description: 'test', type: 'test' }); if (!m.getTasks().length) throw new Error('None'); });
  test('Memory: search', () => { const m = new MemorySystem(new Config()); m.remember('findme', 'xyz123'); if (!m.search('xyz123').length) throw new Error('None'); m.forget('findme'); });
  test('Memory: stats', () => { const s = new MemorySystem(new Config()).getStats(); if (!('episodicCount' in s)) throw new Error('Missing'); });
  test('Memory: export', () => { const d = new MemorySystem(new Config()).exportAll(); if (!d.semantic) throw new Error('Missing'); });

  // === Automation ===
  const AutomationEngine = require('../src/automation/index.js');
  test('Automation: init', () => { new AutomationEngine(new Config()); });
  test('Automation: shell command', async () => { const r = await new AutomationEngine(new Config()).runCommand('echo test'); if (!r.success || !r.stdout.includes('test')) throw new Error('Fail'); });
  test('Automation: list dir', async () => { const r = await new AutomationEngine(new Config()).listDir('.'); if (!r.success) throw new Error('Fail'); });
  test('Automation: read file', async () => { const r = await new AutomationEngine(new Config()).readFile(path.join(__dirname, '..', 'package.json')); if (!r.content.includes('opendesktop')) throw new Error('Fail'); });
  test('Automation: write file', async () => { const f = path.join(os.tmpdir(), 'od_' + Date.now()); const r = await new AutomationEngine(new Config()).writeFile(f, 'test'); if (!r.success) throw new Error('Fail'); fs.unlinkSync(f); });
  test('Automation: system info', async () => { const r = await new AutomationEngine(new Config()).getSystemInfo(); if (!r.cpu || !r.memory) throw new Error('Missing'); });

  // === Vision ===
  const VisionSystem = require('../src/vision/index.js');
  test('Vision: init', () => { new VisionSystem(new Config(), new ProviderRegistry(new Config())); });

  // === Plugins ===
  const PluginManager = require('../src/plugins/index.js');
  test('Plugins: init', () => { new PluginManager(new Config(), {}); });
  test('Plugins: built-in skills', () => { const s = new PluginManager(new Config(), {}).getBuiltInSkills(); if (s.length < 10) throw new Error('Too few'); });

  // === Messaging ===
  const MessagingHub = require('../src/messaging/index.js');
  test('Messaging: init', () => { new MessagingHub(new Config(), {}); });
  test('Messaging: status', () => { const s = new MessagingHub(new Config(), {}).getStatus(); if (!('active' in s)) throw new Error('Missing'); });

  // === Hotkey ===
  const GlobalHotkey = require('../src/hotkey/index.js');
  test('Hotkey: init', () => { new GlobalHotkey(new Config(), () => {}); });
  test('Hotkey: get hotkey', () => { const h = new GlobalHotkey(new Config(), () => {}); if (!h.getHotkey()) throw new Error('None'); });

  // === Voice ===
  const VoiceSystem = require('../src/voice/index.js');
  test('Voice: init', () => { new VoiceSystem(new Config(), {}); });
  test('Voice: status', () => { const s = new VoiceSystem(new Config(), {}).getStatus(); if (!('wakeWord' in s)) throw new Error('Missing'); });

  // === Code Executor ===
  const CodeExecutor = require('../src/code-executor/index.js');
  test('CodeExecutor: init', () => { new CodeExecutor(new Config()); });
  test('CodeExecutor: supported languages', () => { const l = new CodeExecutor(new Config()).getSupportedLanguages(); if (l.length < 20) throw new Error('Too few'); });
  test('CodeExecutor: execute JS', async () => { const r = await new CodeExecutor(new Config()).execute('console.log("hello")', 'javascript'); if (!r.success) throw new Error(r.error); });
  test('CodeExecutor: execute Python', async () => { const r = await new CodeExecutor(new Config()).execute('print("hello")', 'python'); if (!r.success && !r.error?.includes('python3')) throw new Error('Expected success or python not found'); });
  test('CodeExecutor: detect language', () => { const d = new CodeExecutor(new Config())._detectLanguage('console.log("test")'); if (d !== 'javascript') throw new Error('Wrong: ' + d); });
  test('CodeExecutor: create project', async () => { const r = await new CodeExecutor(new Config()).createProject('test-proj', 'javascript'); if (!r.files.length) throw new Error('No files'); });

  // === Deployer ===
  const Deployer = require('../src/deployer/index.js');
  test('Deployer: init', () => { new Deployer(new Config()); });
  test('Deployer: targets', () => { const t = new Deployer(new Config()).getSupportedTargets(); if (t.length < 10) throw new Error('Too few'); });

  // === Learning ===
  const LearningSystem = require('../src/learning/index.js');
  test('Learning: init', () => { new LearningSystem(new Config(), new MemorySystem(new Config())); });
  test('Learning: track command', () => { const l = new LearningSystem(new Config(), new MemorySystem(new Config())); l.trackCommand('/test'); });
  test('Learning: learn correction', () => { const l = new LearningSystem(new Config(), new MemorySystem(new Config())); l.learnFromCorrection('wrong', 'right', 'test'); });
  test('Learning: learn preference', () => { const l = new LearningSystem(new Config(), new MemorySystem(new Config())); l.learnPreference('theme', 'color', 'red'); });
  test('Learning: suggestions', () => { const l = new LearningSystem(new Config(), new MemorySystem(new Config())); l.getSuggestions(); });
  test('Learning: stats', () => { const s = new LearningSystem(new Config(), new MemorySystem(new Config())).getStats(); if (!('commandsTracked' in s)) throw new Error('Missing'); });

  // === Skill Creator ===
  const SkillCreator = require('../src/skill-creator/index.js');
  test('SkillCreator: init', () => { new SkillCreator(new Config()); });
  test('SkillCreator: create skill', async () => { const r = await new SkillCreator(new Config()).createSkill('test-skill', 'A test skill'); if (!r.created) throw new Error('Failed'); });
  test('SkillCreator: list skills', () => { const s = new SkillCreator(new Config()).listSkills(); if (!Array.isArray(s)) throw new Error('Not array'); });

  // === Workflow ===
  const WorkflowBuilder = require('../src/workflows/index.js');
  test('Workflow: init', () => { new WorkflowBuilder(new Config(), new AutomationEngine(new Config()), new ProviderRegistry(new Config())); });
  test('Workflow: create', async () => { const r = await new WorkflowBuilder(new Config(), new AutomationEngine(new Config()), new ProviderRegistry(new Config())).createWorkflow('test-wf', [{ type: 'command', action: 'echo test' }]); if (!r.created) throw new Error('Failed'); });
  test('Workflow: list', () => { const w = new WorkflowBuilder(new Config(), new AutomationEngine(new Config()), new ProviderRegistry(new Config())).listWorkflows(); if (!Array.isArray(w)) throw new Error('Not array'); });

  // === Persona ===
  const PersonaSystem = require('../src/persona/index.js');
  test('Persona: init', () => { new PersonaSystem(new Config(), new MemorySystem(new Config())); });
  test('Persona: presets', () => { const p = new PersonaSystem(new Config(), new MemorySystem(new Config())).getPresets(); if (p.length < 5) throw new Error('Too few'); });
  test('Persona: create', async () => { const r = await new PersonaSystem(new Config(), new MemorySystem(new Config())).createPersona('test-persona', { tone: 'casual' }); if (!r.created) throw new Error('Failed'); });
  test('Persona: activate', async () => { const p = new PersonaSystem(new Config(), new MemorySystem(new Config())); await p.createPersona('test-act', {}); const r = p.activatePersona('test-act'); if (!r.activated) throw new Error('Failed'); });
  test('Persona: system prompt', async () => { const p = new PersonaSystem(new Config(), new MemorySystem(new Config())); await p.createPersona('test-prompt', { tone: 'friendly', traits: ['helpful'] }); p.activatePersona('test-prompt'); const sp = p.getSystemPrompt(); if (!sp.includes('friendly')) throw new Error('Missing tone'); });

  // === Engine ===
  const Engine = require('../src/core/engine.js');
  test('Engine: init', () => { new Engine(); });
  test('Engine: all subsystems', () => {
    const e = new Engine();
    const required = ['provider', 'memory', 'automation', 'vision', 'plugins', 'messaging', 'hotkey', 'voice', 'codeExecutor', 'deployer', 'learning', 'skillCreator', 'workflows', 'persona', 'settings'];
    required.forEach(s => { if (!e[s]) throw new Error(`Missing: ${s}`); });
  });

  // === Package ===
  test('Package: name', () => { if (require('../package.json').name !== 'opendesktop-ai') throw new Error('Wrong'); });
  test('Package: bins', () => { const p = require('../package.json'); if (!p.bin.opendesktop || !p.bin.od) throw new Error('Missing'); });
  test('Package: keywords', () => { if (require('../package.json').keywords.length < 10) throw new Error('Too few'); });

  // === File Structure ===
  test('Structure: all dirs', () => {
    ['core', 'providers', 'vision', 'automation', 'memory', 'messaging', 'gui', 'cli', 'plugins', 'hotkey', 'voice', 'code-executor', 'deployer', 'learning', 'skill-creator', 'workflows', 'persona', 'settings']
      .forEach(d => { if (!fs.existsSync(path.join(__dirname, '..', 'src', d))) throw new Error(`Missing src/${d}`); });
  });
  test('Structure: all files', () => {
    ['src/index.js', 'src/core/engine.js', 'src/core/config.js', 'src/providers/index.js', 'src/memory/index.js',
     'src/vision/index.js', 'src/automation/index.js', 'src/messaging/index.js', 'src/gui/index.js',
     'src/plugins/index.js', 'src/cli/setup.js', 'src/hotkey/index.js', 'src/voice/index.js',
     'src/code-executor/index.js', 'src/deployer/index.js', 'src/learning/index.js',
     'src/skill-creator/index.js', 'src/workflows/index.js', 'src/persona/index.js',
     'src/settings/index.js', 'bin/opendesktop', 'install.sh', 'README.md', 'LICENSE']
      .forEach(f => { if (!fs.existsSync(path.join(__dirname, '..', f))) throw new Error(`Missing ${f}`); });
  });

  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log(`\n  ═══════════════════════════════════════════════`);
  console.log(`  Results: ${passed} passed, ${failed} failed, ${total} total`);
  console.log(`  ═══════════════════════════════════════════════\n`);
  if (failed > 0) process.exit(1);
}

runTests().catch(err => { console.error('Test error:', err); process.exit(1); });
