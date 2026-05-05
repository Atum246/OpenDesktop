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

  // Build smart provider list based on what's detected
  const providerChoices = [];
  const envKeyProviders = Object.keys(detected.envKeys);

  // If local providers are running, put them first
  if (detected.ollamaRunning) {
    providerChoices.push({ name: `🏠 Ollama — RUNNING LOCALLY (${detected.ollamaModels.length} models found) — Free, private, fast`, value: 'ollama' });
  }
  if (detected.lmstudioRunning) {
    providerChoices.push({ name: '🏠 LM Studio — RUNNING LOCALLY — Free, private', value: 'lmstudio' });
  }

  // If API keys found in env, mark those providers
  const providerInfo = {
    openrouter: { icon: '🌐', label: 'OpenRouter', note: 'Access 50+ models with one key' },
    openai: { icon: '🧠', label: 'OpenAI', note: 'GPT-4o, o1 (most capable)' },
    anthropic: { icon: '📚', label: 'Anthropic', note: 'Claude 3.5 (best reasoning)' },
    google: { icon: '💎', label: 'Google', note: 'Gemini (fast & free tier)' },
    groq: { icon: '⚡', label: 'Groq', note: 'Llama/Mixtral (fastest inference)' },
    nvidia: { icon: '🟢', label: 'Nvidia NIM', note: 'Enterprise AI' },
    deepseek: { icon: '🐋', label: 'DeepSeek', note: 'Coding specialist' }
  };

  for (const [id, info] of Object.entries(providerInfo)) {
    const hasKey = envKeyProviders.includes(id);
    const keyNote = hasKey ? ' — API KEY FOUND IN ENV' : '';
    providerChoices.push({ name: `${info.icon} ${info.label} — ${info.note}${keyNote}`, value: id });
  }

  if (!detected.ollamaRunning && !detected.lmstudioRunning) {
    providerChoices.push({ name: '🏠 Ollama — 100% local (not detected — install from ollama.ai)', value: 'ollama' });
    providerChoices.push({ name: '🏠 LM Studio — Local models (not detected)', value: 'lmstudio' });
  }

  providerChoices.push({ name: '🔧 Custom endpoint', value: 'custom' });
  providerChoices.push(new inquirer.Separator());
  providerChoices.push({ name: '⏭️ Skip (configure later)', value: 'skip' });

  // Determine best default provider
  let defaultProvider = 'openrouter';
  if (detected.ollamaRunning) defaultProvider = 'ollama';
  else if (detected.lmstudioRunning) defaultProvider = 'lmstudio';
  else if (detected.envKeys.openrouter) defaultProvider = 'openrouter';
  else if (detected.envKeys.openai) defaultProvider = 'openai';
  else if (detected.envKeys.anthropic) defaultProvider = 'anthropic';

  const providerAnswers = await inquirer.prompt([
    { type: 'list', name: 'provider', message: chalk.hex('#FFD700')('🤖 Which AI should power me?'), choices: providerChoices, default: defaultProvider },
    { type: 'password', name: 'apiKey', message: chalk.hex('#FFD700')('🔑 API Key:'),
      when: a => !['skip', 'ollama', 'lmstudio'].includes(a.provider),
      default: a => detected.envKeys[a.provider] || undefined },
    { type: 'input', name: 'endpoint', message: chalk.hex('#FFD700')('🔗 Endpoint URL:'),
      when: a => ['custom', 'ollama', 'lmstudio'].includes(a.provider),
      default: a => a.provider === 'ollama' ? 'http://localhost:11434' : a.provider === 'lmstudio' ? 'http://localhost:1234' : '' },
    { type: 'list', name: 'model', message: chalk.hex('#FFD700')('🎯 Default model:'),
      when: a => a.provider !== 'skip',
      choices: a => {
        // If Ollama, show actually installed models
        if (a.provider === 'ollama' && detected.ollamaModels.length > 0) {
          return detected.ollamaModels.map(m => ({ name: `${m} (installed)`, value: m }));
        }
        const models = {
          openrouter: ['anthropic/claude-3.5-sonnet','openai/gpt-4o','google/gemini-pro-1.5','meta-llama/llama-3.1-405b-instruct','deepseek/deepseek-chat'],
          openai: ['gpt-4o','gpt-4o-mini','gpt-4-turbo','o1-preview','o1-mini'],
          anthropic: ['claude-3.5-sonnet-20241022','claude-3-opus-20240229','claude-3-haiku-20240307'],
          google: ['gemini-1.5-pro','gemini-1.5-flash','gemini-pro'],
          groq: ['llama-3.1-70b-versatile','llama-3.1-8b-instant','mixtral-8x7b-32768'],
          nvidia: ['meta/llama-3.1-405b-instruct','meta/llama-3.1-70b-instruct'],
          deepseek: ['deepseek-chat','deepseek-coder','deepseek-reasoner'],
          ollama: ['llama3.1','llama3.1:70b','codellama','mistral','qwen2','deepseek-coder-v2'],
          lmstudio: ['local-model'],
          custom: ['custom-model']
        };
        return (models[a.provider] || ['default']).map(m => ({ name: m, value: m }));
      }
    }
  ]);

  // Skip API key prompt if key was found in env and user didn't change it
  if (!providerAnswers.apiKey && detected.envKeys[providerAnswers.provider]) {
    providerAnswers.apiKey = detected.envKeys[providerAnswers.provider];
    console.log(chalk.hex('#00FF40')(`  ✅ Using API key from environment variable\n`));
  }

  const defaultModels = { openrouter: 'anthropic/claude-3.5-sonnet', openai: 'gpt-4o', anthropic: 'claude-3.5-sonnet-20241022', google: 'gemini-1.5-pro', groq: 'llama-3.1-70b-versatile', nvidia: 'meta/llama-3.1-405b-instruct', deepseek: 'deepseek-chat', ollama: 'llama3.1' };

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
      model: providerAnswers.model || defaultModels[providerAnswers.provider] || 'anthropic/claude-3.5-sonnet'
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
