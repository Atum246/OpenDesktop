#!/usr/bin/env node
'use strict';

// ═══════════════════════════════════════════════════════════════
//  OpenDesktop Test Suite
// ═══════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const os = require('os');

let passed = 0;
let failed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    const result = fn();
    if (result instanceof Promise) {
      result.then(() => { passed++; console.log(`  ✅ ${name}`); })
        .catch(err => { failed++; console.log(`  ❌ ${name}: ${err.message}`); });
    } else {
      passed++;
      console.log(`  ✅ ${name}`);
    }
  } catch (err) {
    failed++;
    console.log(`  ❌ ${name}: ${err.message}`);
  }
}

async function runTests() {
  console.log('\n  ⚡ OpenDesktop Test Suite ⚡\n');

  // Config tests
  const Config = require('../src/core/config.js');
  test('Config: loads without error', () => { new Config(); });
  test('Config: has default values', () => {
    const c = new Config();
    if (!c.get('provider')) throw new Error('Missing provider config');
  });
  test('Config: can set and get values', () => {
    const c = new Config();
    c.set('test.value', 'hello');
    if (c.get('test.value') !== 'hello') throw new Error('Set/get failed');
  });
  test('Config: has correct paths', () => {
    const c = new Config();
    if (!c.paths.configDir.includes('.opendesktop')) throw new Error('Wrong config dir');
  });

  // Provider tests
  const ProviderRegistry = require('../src/providers/index.js');
  test('ProviderRegistry: loads all providers', () => {
    const p = new ProviderRegistry(new Config());
    const providers = p.listProviders();
    if (providers.length < 15) throw new Error(`Expected 15+ providers, got ${providers.length}`);
  });
  test('ProviderRegistry: has correct provider count', () => {
    const count = Object.keys(ProviderRegistry.PROVIDERS).length;
    if (count < 18) throw new Error(`Expected 18+ providers, got ${count}`);
    console.log(`    (${count} providers registered)`);
  });
  test('ProviderRegistry: lists models for provider', () => {
    const p = new ProviderRegistry(new Config());
    const models = p.listModels();
    if (models.length === 0) throw new Error('No models listed');
  });
  test('ProviderRegistry: can switch models', () => {
    const p = new ProviderRegistry(new Config());
    p.switchModel('gpt-4o');
    if (p.model !== 'gpt-4o') throw new Error('Model switch failed');
  });

  // Memory tests
  const MemorySystem = require('../src/memory/index.js');
  test('MemorySystem: initializes', () => { new MemorySystem(new Config()); });
  test('MemorySystem: can add and recall semantic memory', () => {
    const m = new MemorySystem(new Config());
    m.remember('test_key', 'test_value');
    if (m.recall('test_key') !== 'test_value') throw new Error('Recall failed');
    m.forget('test_key');
  });
  test('MemorySystem: can add episodic events', () => {
    const m = new MemorySystem(new Config());
    m.addEvent({ type: 'test', message: 'test event' });
    const events = m.getEvents({ type: 'test' });
    if (events.length === 0) throw new Error('No events found');
  });
  test('MemorySystem: can add tasks', () => {
    const m = new MemorySystem(new Config());
    m.addTask({ description: 'test task', type: 'test' });
    const tasks = m.getTasks({ type: 'test' });
    if (tasks.length === 0) throw new Error('No tasks found');
  });
  test('MemorySystem: search works', () => {
    const m = new MemorySystem(new Config());
    m.remember('searchable_item', 'findme_unique_12345');
    const results = m.search('findme_unique_12345');
    if (results.length === 0) throw new Error('Search returned no results');
    m.forget('searchable_item');
  });
  test('MemorySystem: getStats returns correct structure', () => {
    const m = new MemorySystem(new Config());
    const stats = m.getStats();
    if (!('episodicCount' in stats)) throw new Error('Missing episodicCount');
    if (!('semanticCount' in stats)) throw new Error('Missing semanticCount');
    if (!('taskCount' in stats)) throw new Error('Missing taskCount');
  });
  test('MemorySystem: export/import works', () => {
    const m = new MemorySystem(new Config());
    m.remember('export_test', 'export_value');
    const data = m.exportAll();
    if (!data.semantic) throw new Error('Export missing semantic');
  });

  // Automation tests
  const AutomationEngine = require('../src/automation/index.js');
  test('AutomationEngine: initializes', () => { new AutomationEngine(new Config()); });
  test('AutomationEngine: can run shell commands', async () => {
    const a = new AutomationEngine(new Config());
    const result = await a.runCommand('echo "hello"');
    if (!result.success) throw new Error('Command failed');
    if (!result.stdout.includes('hello')) throw new Error('Wrong output');
  });
  test('AutomationEngine: can list directory', async () => {
    const a = new AutomationEngine(new Config());
    const result = await a.listDir('.');
    if (!result.success) throw new Error('ListDir failed');
    if (!result.entries.length) throw new Error('No entries');
  });
  test('AutomationEngine: can read files', async () => {
    const a = new AutomationEngine(new Config());
    const result = await a.readFile(path.join(__dirname, '..', 'package.json'));
    if (!result.success) throw new Error('ReadFile failed');
    if (!result.content.includes('opendesktop')) throw new Error('Wrong content');
  });
  test('AutomationEngine: can write files', async () => {
    const a = new AutomationEngine(new Config());
    const testFile = path.join(os.tmpdir(), 'od_test_' + Date.now() + '.txt');
    const result = await a.writeFile(testFile, 'test content');
    if (!result.success) throw new Error('WriteFile failed');
    fs.unlinkSync(testFile);
  });
  test('AutomationEngine: getSystemInfo returns data', async () => {
    const a = new AutomationEngine(new Config());
    const info = await a.getSystemInfo();
    if (!info.cpu) throw new Error('Missing cpu info');
    if (!info.memory) throw new Error('Missing memory info');
    if (!info.os) throw new Error('Missing os info');
  });
  test('AutomationEngine: history tracks actions', async () => {
    const a = new AutomationEngine(new Config());
    await a.runCommand('echo test');
    const history = a.getHistory();
    if (history.length === 0) throw new Error('No history');
  });

  // Vision tests
  const VisionSystem = require('../src/vision/index.js');
  test('VisionSystem: initializes', () => { new VisionSystem(new Config(), new ProviderRegistry(new Config())); });

  // Plugin tests
  const PluginManager = require('../src/plugins/index.js');
  test('PluginManager: initializes', () => { new PluginManager(new Config(), {}); });
  test('PluginManager: has built-in skills', () => {
    const pm = new PluginManager(new Config(), {});
    const skills = pm.getBuiltInSkills();
    if (skills.length < 10) throw new Error(`Expected 10+ skills, got ${skills.length}`);
  });

  // Messaging tests
  const MessagingHub = require('../src/messaging/index.js');
  test('MessagingHub: initializes', () => { new MessagingHub(new Config(), {}); });
  test('MessagingHub: getStatus returns structure', () => {
    const m = new MessagingHub(new Config(), {});
    const status = m.getStatus();
    if (!('active' in status)) throw new Error('Missing active field');
    if (!('platforms' in status)) throw new Error('Missing platforms field');
  });

  // Engine tests
  const Engine = require('../src/core/engine.js');
  test('Engine: initializes', () => { new Engine(); });
  test('Engine: has all subsystems', () => {
    const e = new Engine();
    if (!e.provider) throw new Error('Missing provider');
    if (!e.memory) throw new Error('Missing memory');
    if (!e.automation) throw new Error('Missing automation');
    if (!e.vision) throw new Error('Missing vision');
    if (!e.plugins) throw new Error('Missing plugins');
    if (!e.messaging) throw new Error('Missing messaging');
  });

  // Package tests
  test('Package: has correct name', () => {
    const pkg = require('../package.json');
    if (pkg.name !== 'opendesktop') throw new Error('Wrong package name');
  });
  test('Package: has bin entries', () => {
    const pkg = require('../package.json');
    if (!pkg.bin.opendesktop) throw new Error('Missing opendesktop bin');
    if (!pkg.bin.od) throw new Error('Missing od alias');
  });
  test('Package: has keywords', () => {
    const pkg = require('../package.json');
    if (pkg.keywords.length < 10) throw new Error('Too few keywords');
  });

  // File structure tests
  test('Structure: all source directories exist', () => {
    const dirs = ['core', 'providers', 'vision', 'automation', 'memory', 'messaging', 'gui', 'cli', 'plugins'];
    dirs.forEach(d => {
      if (!fs.existsSync(path.join(__dirname, '..', 'src', d))) throw new Error(`Missing src/${d}`);
    });
  });
  test('Structure: all source files exist', () => {
    const files = ['src/index.js', 'src/core/engine.js', 'src/core/config.js', 'src/providers/index.js',
      'src/memory/index.js', 'src/vision/index.js', 'src/automation/index.js', 'src/messaging/index.js',
      'src/gui/index.js', 'src/plugins/index.js', 'src/cli/setup.js', 'bin/opendesktop', 'install.sh'];
    files.forEach(f => {
      if (!fs.existsSync(path.join(__dirname, '..', f))) throw new Error(`Missing ${f}`);
    });
  });

  // Wait for async tests
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log(`\n  ═══════════════════════════════════════`);
  console.log(`  Results: ${passed} passed, ${failed} failed, ${total} total`);
  console.log(`  ═══════════════════════════════════════\n`);

  if (failed > 0) process.exit(1);
}

runTests().catch(err => { console.error('Test runner error:', err); process.exit(1); });
