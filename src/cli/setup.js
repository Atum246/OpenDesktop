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

function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }

async function setup() {
  console.clear();
  const ascii = figlet.textSync('OpenDesktop', { font: 'ANSI Shadow' });
  const lines = ascii.split('\n');
  const termW = process.stdout.columns || 80;
  lines.forEach(l => {
    const plainLen = l.length;
    const pad = Math.max(0, Math.floor((termW - plainLen) / 2));
    const mid = Math.floor(l.length / 2);
    console.log(' '.repeat(pad) + chalk.hex('#708090')(l.slice(0, mid)) + chalk.hex('#FF0000')(l.slice(mid)));
  });

  console.log(boxen(chalk.hex('#FF0000')('⚡ SETUP WIZARD ⚡'), { padding: 1, borderStyle: 'double', borderColor: 'red', title: '🔧 Configuration', titleAlignment: 'center', float: 'center' }));

  const answers = await inquirer.prompt([
    { type: 'list', name: 'provider', message: chalk.hex('#FFD700')('🤖 Primary AI Provider:'), choices: [
      { name: 'OpenRouter (50+ models) 🌐', value: 'openrouter' },
      { name: 'OpenAI (GPT-4o) 🧠', value: 'openai' },
      { name: 'Anthropic (Claude) 📚', value: 'anthropic' },
      { name: 'Google (Gemini) 💎', value: 'google' },
      { name: 'Nvidia NIM 🟢', value: 'nvidia' },
      { name: 'Groq ⚡', value: 'groq' },
      { name: 'Together AI 🤝', value: 'together' },
      { name: 'Fireworks AI 🎆', value: 'fireworks' },
      { name: 'Mistral AI 🌬️', value: 'mistral' },
      { name: 'Cohere 🔵', value: 'cohere' },
      { name: 'Perplexity 🔍', value: 'perplexity' },
      { name: 'DeepSeek 🐋', value: 'deepseek' },
      { name: 'xAI (Grok) 𝕏', value: 'xai' },
      { name: 'Cerebras 🧠', value: 'cerebras' },
      { name: 'SambaNova 🟠', value: 'sambanova' },
      { name: 'Ollama (Local) 🏠', value: 'ollama' },
      { name: 'LM Studio 🏠', value: 'lmstudio' },
      { name: 'vLLM 🏠', value: 'vllm' },
      { name: 'Custom Endpoint 🔧', value: 'custom' },
      new inquirer.Separator(),
      { name: 'Skip ⏭️', value: 'skip' }
    ]},
    { type: 'input', name: 'apiKey', message: chalk.hex('#FFD700')('🔑 API Key:'), when: a => a.provider !== 'skip' && a.provider !== 'ollama' && a.provider !== 'lmstudio' && a.provider !== 'vllm' },
    { type: 'input', name: 'endpoint', message: chalk.hex('#FFD700')('🔗 Endpoint URL:'), when: a => a.provider === 'custom' || a.provider === 'ollama' || a.provider === 'lmstudio' || a.provider === 'vllm', default: a => a.provider === 'ollama' ? 'http://localhost:11434' : a.provider === 'lmstudio' ? 'http://localhost:1234' : a.provider === 'vllm' ? 'http://localhost:8000' : '' },
    { type: 'list', name: 'model', message: chalk.hex('#FFD700')('🎯 Default Model:'), when: a => a.provider !== 'skip', choices: (a) => {
      const models = { openrouter: ['anthropic/claude-3.5-sonnet','openai/gpt-4o','google/gemini-pro-1.5','meta-llama/llama-3.1-405b-instruct'], openai: ['gpt-4o','gpt-4o-mini','gpt-4-turbo','o1-preview'], anthropic: ['claude-3.5-sonnet-20241022','claude-3-opus-20240229','claude-3-haiku-20240307'], google: ['gemini-pro','gemini-1.5-pro','gemini-1.5-flash'], groq: ['llama-3.1-70b-versatile','llama-3.1-8b-instant','mixtral-8x7b-32768'], nvidia: ['meta/llama-3.1-405b-instruct','meta/llama-3.1-70b-instruct'], ollama: ['llama3.1','llama3.1:70b','codellama','mistral','qwen2','deepseek-coder-v2'], lmstudio: ['local-model'], vllm: ['local-model'], custom: ['custom-model'] };
      return (models[a.provider] || ['default']).map(m => ({ name: m, value: m }));
    }},
    { type: 'confirm', name: 'voice', message: chalk.hex('#FFD700')('🎤 Enable voice control?'), default: true },
    { type: 'confirm', name: 'vision', message: chalk.hex('#FFD700')('👁️ Enable screen vision?'), default: true },
    { type: 'confirm', name: 'memory', message: chalk.hex('#FFD700')('🧠 Enable persistent memory?'), default: true },
    { type: 'list', name: 'theme', message: chalk.hex('#FFD700')('🎨 Theme:'), choices: [
      { name: '🔴 Hacker Red', value: 'hacker-red' }, { name: '🟢 Matrix Green', value: 'matrix' },
      { name: '🔵 Cyberpunk Blue', value: 'cyberpunk' }, { name: '⚪ Minimal', value: 'minimal' },
      { name: '🟣 Vaporwave', value: 'vaporwave' }
    ]},
    { type: 'confirm', name: 'messaging', message: chalk.hex('#FFD700')('💬 Enable messaging integrations?'), default: false },
    { type: 'checkbox', name: 'platforms', message: chalk.hex('#FFD700')('📱 Platforms:'), when: a => a.messaging, choices: [
      { name: 'Telegram 📨', value: 'telegram' }, { name: 'Discord 🎮', value: 'discord' },
      { name: 'WhatsApp 💚', value: 'whatsapp' }, { name: 'Slack 💼', value: 'slack' }
    ]},
    { type: 'confirm', name: 'hotkey', message: chalk.hex('#FFD700')('⌨️ Enable keyboard shortcut (Ctrl+Shift+Space)?'), default: true }
  ]);

  const models = { openrouter: 'anthropic/claude-3.5-sonnet', openai: 'gpt-4o', anthropic: 'claude-3.5-sonnet-20241022', google: 'gemini-pro', groq: 'llama-3.1-70b-versatile', nvidia: 'meta/llama-3.1-405b-instruct', ollama: 'llama3.1', together: 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo', fireworks: 'accounts/fireworks/models/llama-v3p1-405b-instruct', mistral: 'mistral-large-latest', cohere: 'command-r-plus', perplexity: 'llama-3.1-sonar-large-128k-online', deepseek: 'deepseek-chat', xai: 'grok-2', cerebras: 'llama3.1-70b', sambanova: 'Meta-Llama-3.1-405B-Instruct' };

  const config = {
    version: '1.0.0', setupDate: new Date().toISOString(),
    provider: { name: answers.provider === 'skip' ? 'openrouter' : answers.provider, apiKey: answers.apiKey || null, endpoint: answers.endpoint || null, model: answers.model || models[answers.provider] || 'anthropic/claude-3.5-sonnet' },
    features: { voice: answers.voice, vision: answers.vision, memory: answers.memory, automation: true, browser: true },
    theme: answers.theme,
    messaging: { enabled: answers.messaging, platforms: answers.platforms || [] },
    hotkey: { enabled: answers.hotkey, key: 'ctrl+shift+space' },
    permissions: { screenControl: true, fileSystem: true, network: true, clipboard: true, notifications: true, systemCommands: true }
  };

  ensureDir(CONFIG_DIR);
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));

  console.log('\n' + boxen(
    chalk.hex('#00FF40')('✅ Setup Complete! 🎉\n\n') +
    chalk.hex('#00FFFF')('Provider: ') + config.provider.name + '\n' +
    chalk.hex('#00FFFF')('Model: ') + config.provider.model + '\n' +
    chalk.hex('#00FFFF')('Theme: ') + config.theme + '\n' +
    chalk.hex('#00FFFF')('Features: ') + [config.features.voice && '🎤Voice', config.features.vision && '👁️Vision', config.features.memory && '🧠Memory'].filter(Boolean).join(' | ') + '\n\n' +
    chalk.hex('#708090')('Run: opendesktop (chat) | opendesktop --gui (GUI) | od (alias)'),
    { padding: 1, borderStyle: 'round', borderColor: 'green', title: '🎉 Ready!', titleAlignment: 'center' }
  ));
}

setup().catch(err => { console.error(chalk.hex('#FF0000')('❌'), err.message); process.exit(1); });
