#!/usr/bin/env node
'use strict';
const chalk = require('chalk');
const figlet = require('figlet');
const boxen = require('boxen');
const inquirer = require('inquirer');
const path = require('path');
const os = require('os');
const fs = require('fs');

const CONFIG_DIR = path.join(os.homedir(), '.opendesktop');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const PROFILE_FILE = path.join(CONFIG_DIR, 'user-profile.json');

function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }

function checkCommandExists(cmd) {
  return new Promise(resolve => {
    const { exec } = require('child_process');
    const check = detected.platform === 'win32' ? `where ${cmd}` : `which ${cmd}`;
    exec(check, (err) => resolve(!err));
  });
}

function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    const { exec } = require('child_process');
    const child = exec(cmd, { timeout: 300000, shell: true }, (err, stdout, stderr) => {
      if (err) reject(err);
      else resolve(stdout);
    });
    child.stdout?.on('data', (data) => process.stdout.write(data));
    child.stderr?.on('data', (data) => process.stderr.write(data));
  });
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function setup() {
  console.clear();

  // ─── EPIC ASCII ART INTRO ───
  const ascii = figlet.textSync('OpenDesktop', { font: 'ANSI Shadow' });
  const lines = ascii.split('\n');
  const termW = process.stdout.columns || 80;
  lines.forEach(l => {
    const plainLen = l.length;
    const pad = Math.max(0, Math.floor((termW - plainLen) / 2));
    const mid = Math.floor(l.length / 2);
    console.log(' '.repeat(pad) + chalk.hex('#708090')(l.slice(0, mid)) + chalk.hex('#FF0000')(l.slice(mid)));
  });

  console.log(boxen(
    chalk.hex('#FF0000')('⚡ VERSION 1.0.0 — THE INTELLIGENCE AGENT ⚡\n\n') +
    chalk.hex('#00FFFF')('Not a dumb chatbot. A self-improving AI that controls\n') +
    chalk.hex('#00FFFF')('your computer, researches the web, spawns AI armies,\n') +
    chalk.hex('#00FFFF')('trains custom models, and gets smarter every day.'),
    { padding: 1, borderStyle: 'double', borderColor: 'red', title: '🚀 Welcome', titleAlignment: 'center', float: 'center' }
  ));

  console.log('');

  // ═══════════════════════════════════════════════════
  //  AUTO-DETECT SYSTEM INFO
  // ═══════════════════════════════════════════════════
  const detected = {};

  // Username
  detected.username = os.userInfo().username || process.env.USER || process.env.USERNAME || '';

  // Timezone
  try { detected.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { detected.timezone = 'UTC'; }

  // UTC offset
  detected.tzOffset = (() => {
    try {
      const now = new Date();
      const tzDate = new Date(now.toLocaleString('en-US', { timeZone: detected.timezone }));
      const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
      const diff = (tzDate - utcDate) / 3600000;
      return `UTC${diff >= 0 ? '+' : ''}${diff}`;
    } catch (e) { return ''; }
  })();

  // OS
  detected.platform = os.platform(); // win32, darwin, linux
  detected.osRelease = os.release();
  detected.osName = detected.platform === 'win32' ? 'Windows' : detected.platform === 'darwin' ? 'macOS' : 'Linux';
  detected.hostname = os.hostname();

  // RAM
  detected.ramGB = Math.round(os.totalmem() / 1073741824);

  // Shell
  detected.shell = process.env.SHELL || process.env.ComSpec || '';

  // GPU (async, will resolve before provider step)
  detected.gpu = null;
  detected.hasGpu = false;
  try {
    const si = require('systeminformation');
    const gpuInfo = await si.graphics();
    if (gpuInfo.controllers && gpuInfo.controllers.length > 0) {
      const gpu = gpuInfo.controllers[0];
      detected.gpu = gpu.model || gpu.name || null;
      detected.hasGpu = gpu.vram && gpu.vram > 2048; // 2GB+ VRAM
    }
  } catch (e) {}

  // Check for local AI providers
  detected.ollamaRunning = false;
  detected.ollamaModels = [];
  detected.lmstudioRunning = false;
  try {
    const http = require('http');
    const checkLocal = (url) => new Promise((resolve) => {
      const req = http.get(url, { timeout: 2000 }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(null); } });
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
    });
    const ollamaResp = await checkLocal('http://localhost:11434/api/tags');
    if (ollamaResp && ollamaResp.models) {
      detected.ollamaRunning = true;
      detected.ollamaModels = ollamaResp.models.map(m => m.name);
    }
    const lmResp = await checkLocal('http://localhost:1234/v1/models');
    if (lmResp && lmResp.data) {
      detected.lmstudioRunning = true;
    }
  } catch (e) {}

  // Check for API keys in environment
  detected.envKeys = {};
  const keyMap = {
    'OPENAI_API_KEY': 'openai',
    'ANTHROPIC_API_KEY': 'anthropic',
    'GOOGLE_API_KEY': 'google',
    'GROQ_API_KEY': 'groq',
    'DEEPSEEK_API_KEY': 'deepseek',
    'OPENROUTER_API_KEY': 'openrouter',
    'NVIDIA_API_KEY': 'nvidia',
    'MISTRAL_API_KEY': 'mistral'
  };
  for (const [envVar, provider] of Object.entries(keyMap)) {
    if (process.env[envVar]) {
      detected.envKeys[provider] = process.env[envVar];
    }
  }

  console.log(chalk.hex('#888888')(`  Detected: ${detected.osName} ${detected.hostname} | ${detected.ramGB}GB RAM${detected.gpu ? ' | ' + detected.gpu : ''}${detected.ollamaRunning ? ' | Ollama running' : ''}${detected.lmstudioRunning ? ' | LM Studio running' : ''}${Object.keys(detected.envKeys).length > 0 ? ' | API keys found: ' + Object.keys(detected.envKeys).join(', ') : ''}\n`));

  // ═══════════════════════════════════════════════════
  //  STEP 1: USER IDENTITY — Who are you?
  // ═══════════════════════════════════════════════════
  console.log(chalk.hex('#FF0000')('═'.repeat(60)));
  console.log(chalk.hex('#FF0000').bold('  👤 STEP 1: Tell me about yourself'));
  console.log(chalk.hex('#FF0000')('═'.repeat(60)));
  console.log('');

  const identity = await inquirer.prompt([
    { type: 'input', name: 'userName', message: chalk.hex('#FFD700')('👤 What\'s your name?'), default: detected.username, validate: v => v.trim().length > 0 || 'Name is required' },
    { type: 'input', name: 'aiName', message: chalk.hex('#FFD700')('🤖 What should I be called?'), default: 'OpenDesktop' },
    { type: 'list', name: 'timezone', message: chalk.hex('#FFD700')(`🌍 Your timezone (${chalk.white(detected.timezone)} ${detected.tzOffset} detected):`), choices: [
      { name: `✅ ${detected.timezone} (${detected.tzOffset}) — Auto-detected`, value: detected.timezone },
      { name: '🇺🇸 Eastern (US)', value: 'America/New_York' },
      { name: '🇺🇸 Central (US)', value: 'America/Chicago' },
      { name: '🇺🇸 Pacific (US)', value: 'America/Los_Angeles' },
      { name: '🇬🇧 London (UK)', value: 'Europe/London' },
      { name: '🇩🇪 Berlin (EU)', value: 'Europe/Berlin' },
      { name: '🇯🇵 Tokyo (JP)', value: 'Asia/Tokyo' },
      { name: '🇨🇳 Shanghai (CN)', value: 'Asia/Shanghai' },
      { name: '🇮🇳 India (IN)', value: 'Asia/Kolkata' },
      { name: '🇦🇺 Sydney (AU)', value: 'Australia/Sydney' },
      { name: '🇧🇷 São Paulo (BR)', value: 'America/Sao_Paulo' },
      { name: '🌐 UTC', value: 'UTC' },
      { name: '⏭️ Skip', value: 'skip' }
    ], default: detected.timezone }
  ]);

  console.log(chalk.hex('#00FF40')(`\n  ✅ Hey ${identity.userName}! I'm ${identity.aiName}. Let's set things up.\n`));

  // ═══════════════════════════════════════════════════
  //  STEP 2: HOTKEY — Summon me anytime
  // ═══════════════════════════════════════════════════
  console.log(chalk.hex('#FF0000')('═'.repeat(60)));
  console.log(chalk.hex('#FF0000').bold('  ⌨️ STEP 2: Choose your summon hotkey'));
  console.log(chalk.hex('#FF0000')('═'.repeat(60)));
  console.log('');
  console.log(chalk.hex('#00FFFF')('  Press this hotkey ANYTIME to summon me — hybrid GUI + CLI!'));
  console.log(chalk.hex('#888888')('  I\'ll appear instantly, no matter what app you\'re in.\n'));

  const hotkeyChoice = await inquirer.prompt([{
    type: 'list',
    name: 'hotkey',
    message: chalk.hex('#FFD700')('⌨️ Choose a summon hotkey:'),
    choices: [
      { name: '⚡ Ctrl+Shift+Space (Recommended — fast & easy)', value: 'ctrl+shift+space' },
      { name: '🔥 Ctrl+Alt+O (O for OpenDesktop)', value: 'ctrl+alt+o' },
      { name: '💎 Ctrl+Shift+D (D for Desktop)', value: 'ctrl+shift+d' },
      { name: '🚀 Alt+Space (Quick launcher style)', value: 'alt+space' },
      { name: '🧠 Ctrl+Shift+A (A for Agent)', value: 'ctrl+shift+a' },
      { name: '🎯 F12 (Classic dev tools key)', value: 'f12' },
      new inquirer.Separator(),
      { name: '🔧 Create my own custom hotkey', value: 'custom' }
    ]
  }]);

  let hotkey = hotkeyChoice.hotkey;

  if (hotkey === 'custom') {
    console.log(chalk.hex('#00FFFF')('\n  📝 Enter your custom hotkey combination.'));
    console.log(chalk.hex('#888888')('  Format: modifier+modifier+key (e.g. ctrl+shift+k)\n'));

    const customHotkey = await inquirer.prompt([
      { type: 'checkbox', name: 'modifiers', message: chalk.hex('#FFD700')('Modifiers:'), choices: [
        { name: 'Ctrl', value: 'ctrl', checked: true },
        { name: 'Shift', value: 'shift' },
        { name: 'Alt', value: 'alt' },
        { name: 'Super/Win', value: 'super' }
      ]},
      { type: 'list', name: 'key', message: chalk.hex('#FFD700')('Key:'), choices: [
        'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z',
        'Space','F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12'
      ]}
    ]);

    hotkey = [...customHotkey.modifiers, customHotkey.key.toLowerCase()].join('+');
  }

  console.log(chalk.hex('#00FF40')(`\n  ✅ Hotkey set: ${chalk.white.bold(hotkey)}`));
  console.log(chalk.hex('#888888')(`  Press ${hotkey} anytime to summon me!\n`));

  // ═══════════════════════════════════════════════════
  //  STEP 3: AI PROVIDER — My brain
  // ═══════════════════════════════════════════════════
  console.log(chalk.hex('#FF0000')('═'.repeat(60)));
  console.log(chalk.hex('#FF0000').bold('  🧠 STEP 3: Choose my brain (AI provider)'));
  console.log(chalk.hex('#FF0000')('═'.repeat(60)));
  console.log('');

  // Show what's available for free
  const envKeyProviders = Object.keys(detected.envKeys);
  
  if (detected.ollamaRunning) {
    console.log(chalk.hex('#00FF40')(`  Ollama is running with ${detected.ollamaModels.length} models — 100% free!\n`));
  } else if (detected.hasGpu) {
    console.log(chalk.hex('#00FF40')(`  GPU detected: ${detected.gpu}`));
    console.log(chalk.hex('#00FF40')(`  You can run AI models locally for FREE with Ollama!\n`));
  } else if (detected.ramGB >= 8) {
    console.log(chalk.hex('#00FFFF')(`  ${detected.ramGB}GB RAM — You can run smaller local models with Ollama.\n`));
  }

  // Build provider list organized by cost
  const providerChoices = [];

  // ─── FREE LOCAL ───
  providerChoices.push(new inquirer.Separator(chalk.hex('#00FF40')('─── 100% FREE — Runs on your machine (no API key needed) ───')));
  
  if (detected.ollamaRunning) {
    providerChoices.push({ 
      name: chalk.green(`🏠 Ollama — RUNNING (${detected.ollamaModels.length} models: ${detected.ollamaModels.slice(0, 3).join(', ')}${detected.ollamaModels.length > 3 ? '...' : ''})`), 
      value: 'ollama' 
    });
  } else {
    const ollamaNote = detected.hasGpu ? ' — You have a GPU, this will run great!' : detected.ramGB >= 8 ? ` — Works with ${detected.ramGB}GB RAM` : ' — Needs 8GB+ RAM';
    providerChoices.push({ 
      name: chalk.green(`🏠 Ollama — FREE, private, runs locally${ollamaNote}`), 
      value: 'ollama' 
    });
  }
  
  if (detected.lmstudioRunning) {
    providerChoices.push({ 
      name: chalk.green('🏠 LM Studio — RUNNING locally — Free, private'), 
      value: 'lmstudio' 
    });
  } else {
    providerChoices.push({ 
      name: chalk.green('🏠 LM Studio — FREE, private, GUI for local models'), 
      value: 'lmstudio' 
    });
  }

  // ─── FREE CLOUD ───
  providerChoices.push(new inquirer.Separator(chalk.hex('#00FFFF')('─── FREE TIER — Cloud models, no payment required ───')));
  
  const freeProviders = [
    { id: 'google', icon: '💎', label: 'Google Gemini', note: 'Free tier — Gemini 1.5 Flash (fast, generous limits)', free: true },
    { id: 'groq', icon: '⚡', label: 'Groq', note: 'Free tier — Llama 3.1, Mixtral (fastest inference)', free: true },
    { id: 'deepseek', icon: '🐋', label: 'DeepSeek', note: 'Free tier — DeepSeek Chat/Coder (great for code)', free: true },
  ];

  for (const p of freeProviders) {
    const hasKey = envKeyProviders.includes(p.id);
    const keyNote = hasKey ? chalk.green(' — API KEY FOUND') : '';
    providerChoices.push({ 
      name: `${p.icon} ${p.label} — ${p.note}${keyNote}`, 
      value: p.id 
    });
  }

  // ─── PAID CLOUD ───
  providerChoices.push(new inquirer.Separator(chalk.hex('#888888')('─── PAID — API key required ───')));
  
  const paidProviders = [
    { id: 'openrouter', icon: '🌐', label: 'OpenRouter', note: 'Access 50+ models with one key ($1 free credit)' },
    { id: 'openai', icon: '🧠', label: 'OpenAI', note: 'GPT-4o, o1 (most capable)' },
    { id: 'anthropic', icon: '📚', label: 'Anthropic', note: 'Claude 3.5 Sonnet (best reasoning)' },
    { id: 'nvidia', icon: '🟢', label: 'Nvidia NIM', note: 'Enterprise AI' },
  ];

  for (const p of paidProviders) {
    const hasKey = envKeyProviders.includes(p.id);
    const keyNote = hasKey ? chalk.green(' — API KEY FOUND') : '';
    providerChoices.push({ 
      name: `${p.icon} ${p.label} — ${p.note}${keyNote}`, 
      value: p.id 
    });
  }

  providerChoices.push(new inquirer.Separator());
  providerChoices.push({ name: '🔧 Custom endpoint', value: 'custom' });
  providerChoices.push({ name: '⏭️ Skip (configure later)', value: 'skip' });

  // Default: pick the best free option
  let defaultProvider = 'google'; // Google free tier is the easiest start
  if (detected.ollamaRunning) defaultProvider = 'ollama';
  else if (detected.lmstudioRunning) defaultProvider = 'lmstudio';
  else if (detected.envKeys.google) defaultProvider = 'google';
  else if (detected.envKeys.groq) defaultProvider = 'groq';
  else if (detected.envKeys.deepseek) defaultProvider = 'deepseek';

  const providerAnswers = await inquirer.prompt([
    { type: 'list', name: 'provider', message: chalk.hex('#FFD700')('🤖 Which AI should power me?'), choices: providerChoices, default: defaultProvider },
    { type: 'password', name: 'apiKey', message: chalk.hex('#FFD700')('🔑 API Key:'),
      when: a => !['skip', 'ollama', 'lmstudio'].includes(a.provider),
      default: a => detected.envKeys[a.provider] || undefined },
    { type: 'input', name: 'endpoint', message: chalk.hex('#FFD700')('🔗 Endpoint URL:'),
      when: a => ['custom', 'lmstudio'].includes(a.provider),
      default: a => a.provider === 'lmstudio' ? 'http://localhost:1234' : '' },
  ]);

  // ═══════════════════════════════════════════════════
  //  STEP 3b: LOCAL MODEL SETUP — Install & configure if needed
  // ═══════════════════════════════════════════════════
  let selectedModel = null;

  if (providerAnswers.provider === 'ollama') {
    // Check if Ollama is installed
    const ollamaInstalled = await checkCommandExists('ollama');

    if (!ollamaInstalled) {
      console.log('');
      console.log(chalk.hex('#FFFF00')('  Ollama is not installed on this system.'));
      const installOllama = await inquirer.prompt([{
        type: 'confirm',
        name: 'install',
        message: chalk.hex('#FFD700')('📦 Install Ollama now? (free, ~500MB)'),
        default: true
      }]);

      if (installOllama.install) {
        console.log(chalk.hex('#00FFFF')('  Installing Ollama...'));
        try {
          if (detected.platform === 'win32') {
            console.log(chalk.hex('#00FFFF')('  Downloading Ollama for Windows...'));
            console.log(chalk.hex('#888888')('  A browser window will open. Download and install, then come back here.'));
            await runCommand('start https://ollama.ai/download');
            await inquirer.prompt([{ type: 'confirm', name: 'done', message: chalk.hex('#FFD700')('Installed Ollama? Press Enter when ready'), default: true }]);
          } else {
            await runCommand('curl -fsSL https://ollama.ai/install.sh | sh');
            console.log(chalk.hex('#00FF40')('  Ollama installed!'));
          }
        } catch (err) {
          console.log(chalk.hex('#FF0000')(`  Install failed: ${err.message}`));
          console.log(chalk.hex('#888888')('  Install manually from: https://ollama.ai'));
        }
      }
    }

    // Check if Ollama is running, try to start it
    let ollamaReady = detected.ollamaRunning;
    if (!ollamaReady) {
      try {
        console.log(chalk.hex('#00FFFF')('  Starting Ollama...'));
        if (detected.platform !== 'win32') {
          await runCommand('ollama serve &');
          await sleep(3000);
        }
        // Check again
        const http = require('http');
        ollamaReady = await new Promise(resolve => {
          http.get('http://localhost:11434/api/tags', { timeout: 3000 }, (res) => {
            resolve(true);
          }).on('error', () => resolve(false));
        });
      } catch (e) {}
    }

    if (ollamaReady || detected.ollamaRunning) {
      // Get available models or let user pick
      let availableModels = detected.ollamaModels;
      if (availableModels.length === 0) {
        console.log('');
        console.log(chalk.hex('#00FFFF')('  No models found. Let\'s pull some!'));
        console.log('');

        const modelChoices = [
          new inquirer.Separator(chalk.hex('#00FF40')('─── Recommended for your system ───')),
        ];

        // Recommend based on RAM and GPU
        if (detected.hasGpu) {
          modelChoices.push({ name: '🚀 llama3.1:70b — Best quality (needs ~40GB VRAM)', value: 'llama3.1:70b' });
          modelChoices.push({ name: '⚡ llama3.1 — Great all-rounder (4.7GB)', value: 'llama3.1' });
          modelChoices.push({ name: '💻 codellama — Best for coding (3.8GB)', value: 'codellama' });
          modelChoices.push({ name: '🧠 mixtral — Mixture of experts (26GB)', value: 'mixtral' });
        } else if (detected.ramGB >= 16) {
          modelChoices.push({ name: '⚡ llama3.1 — Recommended (4.7GB)', value: 'llama3.1' });
          modelChoices.push({ name: '💻 codellama — Great for coding (3.8GB)', value: 'codellama' });
          modelChoices.push({ name: '🔮 mistral — Fast and capable (4.1GB)', value: 'mistral' });
          modelChoices.push({ name: '🌏 qwen2 — Good multilingual (4.4GB)', value: 'qwen2' });
        } else {
          modelChoices.push({ name: '⚡ llama3.1:8b — Smallest, still good (4.7GB)', value: 'llama3.1:8b' });
          modelChoices.push({ name: '💻 codellama:7b — Small coding model (3.8GB)', value: 'codellama:7b' });
          modelChoices.push({ name: '🔮 phi3 — Tiny but capable (2.2GB)', value: 'phi3' });
        }

        modelChoices.push(new inquirer.Separator(chalk.hex('#888888')('─── Other options ───')));
        modelChoices.push({ name: '🌐 deepseek-coder-v2 — Best coding model (8.9GB)', value: 'deepseek-coder-v2' });
        modelChoices.push({ name: '🎯 llama3.1 — Meta\'s latest (4.7GB)', value: 'llama3.1' });
        modelChoices.push({ name: '📝 codellama — Code specialist (3.8GB)', value: 'codellama' });

        const modelChoice = await inquirer.prompt([{
          type: 'checkbox',
          name: 'models',
          message: chalk.hex('#FFD700')('📦 Which models to download? (select one or more):'),
          choices: modelChoices,
          validate: v => v.length > 0 || 'Select at least one model'
        }]);

        // Pull selected models
        for (const model of modelChoice.models) {
          console.log(chalk.hex('#00FFFF')(`\n  Pulling ${model}... (this may take a few minutes)`));
          try {
            await runCommand(`ollama pull ${model}`);
            console.log(chalk.hex('#00FF40')(`  ✅ ${model} downloaded!`));
            availableModels.push(model);
          } catch (err) {
            console.log(chalk.hex('#FF0000')(`  Failed to pull ${model}: ${err.message}`));
          }
        }
      }

      // Select default model
      if (availableModels.length > 0) {
        const modelSelect = await inquirer.prompt([{
          type: 'list',
          name: 'model',
          message: chalk.hex('#FFD700')('🎯 Default model:'),
          choices: availableModels.map(m => ({ name: `${m} (installed)`, value: m }))
        }]);
        selectedModel = modelSelect.model;
      }
    } else {
      console.log(chalk.hex('#FFFF00')('  Could not start Ollama. Make sure it\'s running: ollama serve'));
      console.log(chalk.hex('#888888')('  You can configure it later with: opendesktop --setup'));
    }
  }

  if (providerAnswers.provider === 'lmstudio') {
    const lmstudioReady = detected.lmstudioRunning;
    if (!lmstudioReady) {
      console.log('');
      console.log(chalk.hex('#FFFF00')('  LM Studio is not running.'));
      console.log(chalk.hex('#888888')('  1. Download from: https://lmstudio.ai'));
      console.log(chalk.hex('#888888')('  2. Load a model in the app'));
      console.log(chalk.hex('#888888')('  3. Start the local server (green play button)'));
      console.log(chalk.hex('#888888')('  4. Re-run: opendesktop --setup'));
      console.log('');
    }
  }

  // For cloud providers, select model
  if (!selectedModel && !['ollama', 'lmstudio', 'skip'].includes(providerAnswers.provider)) {
    const modelList = {
      google: [
        { name: '💎 gemini-1.5-flash — Free, fast, recommended', value: 'gemini-1.5-flash' },
        { name: '🧠 gemini-1.5-pro — Free, more capable', value: 'gemini-1.5-pro' },
        { name: '⚡ gemini-pro — Free, older', value: 'gemini-pro' }
      ],
      groq: [
        { name: '⚡ llama-3.1-70b-versatile — Free, best quality', value: 'llama-3.1-70b-versatile' },
        { name: '🚀 llama-3.1-8b-instant — Free, fastest', value: 'llama-3.1-8b-instant' },
        { name: '🧠 mixtral-8x7b-32768 — Free, long context', value: 'mixtral-8x7b-32768' }
      ],
      deepseek: [
        { name: '💬 deepseek-chat — Free, general purpose', value: 'deepseek-chat' },
        { name: '💻 deepseek-coder — Free, best for code', value: 'deepseek-coder' },
        { name: '🧠 deepseek-reasoner — Free, best reasoning', value: 'deepseek-reasoner' }
      ],
      openrouter: [
        { name: 'anthropic/claude-3.5-sonnet', value: 'anthropic/claude-3.5-sonnet' },
        { name: 'openai/gpt-4o', value: 'openai/gpt-4o' },
        { name: 'google/gemini-pro-1.5', value: 'google/gemini-pro-1.5' },
        { name: 'meta-llama/llama-3.1-405b-instruct', value: 'meta-llama/llama-3.1-405b-instruct' },
        { name: 'deepseek/deepseek-chat', value: 'deepseek/deepseek-chat' }
      ],
      openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1-preview', 'o1-mini'],
      anthropic: ['claude-3.5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
      nvidia: ['meta/llama-3.1-405b-instruct', 'meta/llama-3.1-70b-instruct'],
      custom: ['custom-model']
    };

    const models = modelList[providerAnswers.provider] || ['default'];
    const modelChoices = models.map(m => typeof m === 'string' ? { name: m, value: m } : m);

    const modelAnswer = await inquirer.prompt([{
      type: 'list',
      name: 'model',
      message: chalk.hex('#FFD700')('🎯 Default model:'),
      choices: modelChoices
    }]);
    selectedModel = modelAnswer.model;
  }

  // Skip API key prompt if key was found in env
  if (!providerAnswers.apiKey && detected.envKeys[providerAnswers.provider]) {
    providerAnswers.apiKey = detected.envKeys[providerAnswers.provider];
    console.log(chalk.hex('#00FF40')(`  ✅ Using API key from environment variable\n`));
  }

  // Show free tier info
  if (['google', 'groq', 'deepseek'].includes(providerAnswers.provider)) {
    console.log(chalk.hex('#00FF40')(`\n  ✅ Great choice! ${providerAnswers.provider} has a generous free tier.`));
    console.log(chalk.hex('#888888')('  No credit card needed. Just use it.\n'));
  }

  const defaultModels = { openrouter: 'anthropic/claude-3.5-sonnet', openai: 'gpt-4o', anthropic: 'claude-3.5-sonnet-20241022', google: 'gemini-1.5-flash', groq: 'llama-3.1-70b-versatile', nvidia: 'meta/llama-3.1-405b-instruct', deepseek: 'deepseek-chat', ollama: 'llama3.1', lmstudio: 'local-model' };

  // ═══════════════════════════════════════════════════
  //  STEP 4: CAPABILITIES — What can I do?
  // ═══════════════════════════════════════════════════
  console.log(chalk.hex('#FF0000')('\n' + '═'.repeat(60)));
  console.log(chalk.hex('#FF0000').bold('  🦾 STEP 4: Enable my superpowers'));
  console.log(chalk.hex('#FF0000')('═'.repeat(60)));
  console.log('');

  // Smart defaults based on detected system
  const defaultVoice = detected.platform !== 'linux' || process.env.DISPLAY ? true : false;
  const defaultIot = false; // Always off by default
  const defaultSocialMedia = false; // Always off by default

  if (detected.hasGpu) {
    console.log(chalk.hex('#00FF40')(`  GPU detected: ${detected.gpu} — Local models will run great!`));
  }
  if (detected.ramGB < 8) {
    console.log(chalk.hex('#FFFF00')(`  ${detected.ramGB}GB RAM detected — Some features may be limited. Cloud providers recommended.`));
  }
  console.log('');

  const features = await inquirer.prompt([
    { type: 'confirm', name: 'voice', message: chalk.hex('#FFD700')('🎤 Voice control (talk to me)?'), default: defaultVoice },
    { type: 'confirm', name: 'vision', message: chalk.hex('#FFD700')('👁️ Screen vision (I can see your screen)?'), default: true },
    { type: 'confirm', name: 'memory', message: chalk.hex('#FFD700')('🧠 Persistent memory (I never forget)?'), default: true },
    { type: 'confirm', name: 'automation', message: chalk.hex('#FFD700')('🖥️ Desktop automation (control mouse/keyboard)?'), default: true },
    { type: 'confirm', name: 'webSearch', message: chalk.hex('#FFD700')('🔍 Web search (search the internet)?'), default: true },
    { type: 'confirm', name: 'iot', message: chalk.hex('#FFD700')('🏠 IoT control (smart home devices)?'), default: defaultIot },
    { type: 'confirm', name: 'security', message: chalk.hex('#FFD700')('🔒 Ultra security (encryption, audit logs)?'), default: true },
    { type: 'confirm', name: 'socialMedia', message: chalk.hex('#FFD700')('📱 Social media automation?'), default: defaultSocialMedia },
    { type: 'confirm', name: 'selfImprove', message: chalk.hex('#FFD700')('🧬 Self-improvement (I rewrite my own code)?'), default: true },
    { type: 'confirm', name: 'autoUpdate', message: chalk.hex('#FFD700')('🔄 Auto-update from npm?'), default: true }
  ]);

  // ═══════════════════════════════════════════════════
  //  STEP 5: PERSONALITY — How should I behave?
  // ═══════════════════════════════════════════════════
  console.log(chalk.hex('#FF0000')('\n' + '═'.repeat(60)));
  console.log(chalk.hex('#FF0000').bold('  🎭 STEP 5: Choose my personality'));
  console.log(chalk.hex('#FF0000')('═'.repeat(60)));
  console.log('');

  const persona = await inquirer.prompt([{
    type: 'list', name: 'personality', message: chalk.hex('#FFD700')('🎭 What vibe do you want?'), choices: [
      { name: '⚡ Hacker — Direct, technical, no BS, terminal aesthetic', value: 'hacker' },
      { name: '🎩 Professional — Polished, efficient, business-ready', value: 'professional' },
      { name: '😎 Casual — Friendly, relaxed, like talking to a friend', value: 'casual' },
      { name: '🎨 Creative — Imaginative, expressive, thinks outside the box', value: 'creative' },
      { name: '📚 Teacher — Patient, explanatory, educational', value: 'teacher' },
      { name: '🤖 Minimal — Shut up and do the work', value: 'minimal' }
    ]
  }]);

  // ═══════════════════════════════════════════════════
  //  STEP 6: THEME — How should I look?
  // ═══════════════════════════════════════════════════
  console.log(chalk.hex('#FF0000')('\n' + '═'.repeat(60)));
  console.log(chalk.hex('#FF0000').bold('  🎨 STEP 6: Choose my look'));
  console.log(chalk.hex('#FF0000')('═'.repeat(60)));
  console.log('');

  const theme = await inquirer.prompt([{
    type: 'list', name: 'theme', message: chalk.hex('#FFD700')('🎨 Theme:'), choices: [
      { name: '🔴 Hacker Red — Dark, aggressive, terminal-native', value: 'hacker-red' },
      { name: '🟢 Matrix Green — Classic hacker aesthetic', value: 'matrix' },
      { name: '🔵 Cyberpunk Blue — Neon futuristic', value: 'cyberpunk' },
      { name: '⚪ Minimal Light — Clean and professional', value: 'minimal' },
      { name: '🟣 Vaporwave — Aesthetic retro-future', value: 'vaporwave' }
    ]
  }]);

  // ═══════════════════════════════════════════════════
  //  STEP 7: MESSAGING — Reach me anywhere
  // ═══════════════════════════════════════════════════
  console.log(chalk.hex('#FF0000')('\n' + '═'.repeat(60)));
  console.log(chalk.hex('#FF0000').bold('  💬 STEP 7: Connect messaging (optional)'));
  console.log(chalk.hex('#FF0000')('═'.repeat(60)));
  console.log('');

  const messaging = await inquirer.prompt([
    { type: 'confirm', name: 'enabled', message: chalk.hex('#FFD700')('💬 Enable messaging platforms?'), default: false },
    { type: 'checkbox', name: 'platforms', message: chalk.hex('#FFD700')('📱 Platforms:'),
      when: a => a.enabled,
      choices: [
        { name: '📨 Telegram', value: 'telegram' },
        { name: '🎮 Discord', value: 'discord' },
        { name: '💚 WhatsApp', value: 'whatsapp' },
        { name: '💼 Slack', value: 'slack' }
      ]
    }
  ]);

  // ═══════════════════════════════════════════════════
  //  BUILD CONFIG
  // ═══════════════════════════════════════════════════
  const config = {
    version: '1.0.0',
    setupDate: new Date().toISOString(),
    user: {
      name: identity.userName,
      timezone: identity.timezone === 'skip' ? Intl.DateTimeFormat().resolvedOptions().timeZone : identity.timezone
    },
    ai: {
      name: identity.aiName
    },
    provider: {
      name: providerAnswers.provider === 'skip' ? 'openrouter' : providerAnswers.provider,
      apiKey: providerAnswers.apiKey || null,
      endpoint: providerAnswers.endpoint || null,
      model: selectedModel || providerAnswers.model || defaultModels[providerAnswers.provider] || 'anthropic/claude-3.5-sonnet'
    },
    features: {
      voice: features.voice,
      vision: features.vision,
      memory: features.memory,
      automation: features.automation,
      browser: true,
      webSearch: features.webSearch,
      iot: features.iot,
      security: features.security,
      socialMedia: features.socialMedia,
      selfImprove: features.selfImprove,
      autoUpdate: features.autoUpdate
    },
    theme: theme.theme,
    messaging: {
      enabled: messaging.enabled,
      platforms: messaging.platforms || []
    },
    hotkey: {
      enabled: true,
      key: hotkey
    },
    persona: {
      active: persona.personality
    },
    permissions: {
      screenControl: true,
      fileSystem: true,
      network: true,
      clipboard: true,
      notifications: true,
      systemCommands: true
    }
  };

  // Save config
  ensureDir(CONFIG_DIR);
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));

  // Build user profile
  const profile = {
    name: identity.userName,
    aiName: identity.aiName,
    timezone: config.user.timezone,
    personality: persona.personality,
    firstInteraction: new Date().toISOString(),
    preferences: {
      theme: theme.theme,
      hotkey: hotkey,
      features: features
    },
    facts: [`User's name is ${identity.userName}`, `AI name is ${identity.aiName}`],
    habits: {},
    interests: [],
    projects: [],
    commandHistory: [],
    learningStyle: persona.personality === 'teacher' ? 'detailed' : persona.personality === 'minimal' ? 'concise' : 'balanced'
  };
  fs.writeFileSync(PROFILE_FILE, JSON.stringify(profile, null, 2));

  // ═══════════════════════════════════════════════════
  //  DONE — Show summary
  // ═══════════════════════════════════════════════════
  console.log('\n');
  console.log(chalk.hex('#FF0000')('═'.repeat(60)));
  console.log(chalk.hex('#00FF40').bold('  🎉 SETUP COMPLETE! Welcome to OpenDesktop v1.0.0'));
  console.log(chalk.hex('#FF0000')('═'.repeat(60)));
  console.log('');

  console.log(boxen([
    chalk.hex('#FF0000')(`⚡ ${identity.aiName} is ready!\n`),
    chalk.hex('#00FFFF')('👤 User: ') + identity.userName,
    chalk.hex('#00FFFF')('🤖 AI: ') + identity.aiName,
    chalk.hex('#00FFFF')('🧠 Provider: ') + config.provider.name,
    chalk.hex('#00FFFF')('🎯 Model: ') + config.provider.model,
    chalk.hex('#00FFFF')('🎨 Theme: ') + theme.theme,
    chalk.hex('#00FFFF')('🎭 Personality: ') + persona.personality,
    chalk.hex('#00FFFF')('⌨️ Hotkey: ') + chalk.white.bold(hotkey),
    '',
    chalk.hex('#FF0000')('═══ SYSTEM ═══'),
    chalk.hex('#00FFFF')('💻 OS: ') + `${detected.osName} ${detected.hostname}`,
    chalk.hex('#00FFFF')('💾 RAM: ') + `${detected.ramGB}GB`,
    detected.gpu ? chalk.hex('#00FFFF')('🎮 GPU: ') + detected.gpu : null,
    chalk.hex('#00FFFF')('🌍 Timezone: ') + config.user.timezone,
    '',
    chalk.hex('#FF0000')('═══ CAPABILITIES ═══'),
    chalk.hex('#00FFFF')('🎤 Voice: ') + (features.voice ? '✅' : '❌'),
    chalk.hex('#00FFFF')('👁️ Vision: ') + (features.vision ? '✅' : '❌'),
    chalk.hex('#00FFFF')('🧠 Memory: ') + (features.memory ? '✅' : '❌'),
    chalk.hex('#00FFFF')('🖥️ Automation: ') + (features.automation ? '✅' : '❌'),
    chalk.hex('#00FFFF')('🔍 Web Search: ') + (features.webSearch ? '✅' : '❌'),
    chalk.hex('#00FFFF')('🏠 IoT: ') + (features.iot ? '✅' : '❌'),
    chalk.hex('#00FFFF')('🔒 Security: ') + (features.security ? '✅' : '❌'),
    chalk.hex('#00FFFF')('🧬 Self-Improve: ') + (features.selfImprove ? '✅' : '❌'),
    '',
    chalk.hex('#FF0000')('═══ QUICK START ═══'),
    chalk.hex('#888888')(`  opendesktop          → Start chatting`),
    chalk.hex('#888888')(`  opendesktop --gui    → Launch GUI`),
    chalk.hex('#888888')(`  od                   → Short alias`),
    chalk.hex('#888888')(`  ${hotkey}          → Summon from anywhere!`),
    '',
    chalk.hex('#FFD700')(`  💡 Press ${hotkey} anytime to summon me!`)
  ].filter(Boolean).join('\n'), { padding: 1, borderStyle: 'round', borderColor: 'green', title: '🎉 Ready!', titleAlignment: 'center', float: 'center' }));

  console.log('');
  console.log(chalk.hex('#00FF40')(`  ${identity.aiName}: Hey ${identity.userName}! Let's build something amazing together. 🚀`));
  console.log('');
}

setup().catch(err => { console.error(chalk.hex('#FF0000')('❌'), err.message); process.exit(1); });
