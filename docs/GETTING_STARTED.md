# OpenDesktop — Getting Started Guide

## Quick Install

### Windows (PowerShell)
```powershell
powershell -ExecutionPolicy Bypass -c "irm https://raw.githubusercontent.com/Atum246/OpenDesktop/main/install.ps1 | iex"
```

### Windows (cmd)
```cmd
curl -o install.bat https://raw.githubusercontent.com/Atum246/OpenDesktop/main/install.bat && install.bat
```

### Linux / macOS
```bash
curl -fsSL https://raw.githubusercontent.com/Atum246/OpenDesktop/main/install.sh | bash
```

### npm (Any Platform)
```bash
npm install -g opendesktop-ai
opendesktop --setup
```

---

## Environment Variables

OpenDesktop auto-detects API keys from your environment. Set these before running setup and it will pick them up automatically.

### Create a `.env` file (optional)

Create `~/.opendesktop/.env` or set them in your shell:

```bash
# ─── Cloud AI Providers ───

# OpenRouter (access 50+ models with one key)
export OPENROUTER_API_KEY="sk-or-v1-xxxxxxxxxxxx"

# OpenAI (GPT-4o, o1, etc.)
export OPENAI_API_KEY="sk-xxxxxxxxxxxx"

# Anthropic (Claude 3.5 Sonnet, Opus)
export ANTHROPIC_API_KEY="sk-ant-xxxxxxxxxxxx"

# Google AI (Gemini Pro, Flash)
export GOOGLE_API_KEY="AIzaxxxxxxxxxxxx"

# Groq (fastest inference — Llama, Mixtral)
export GROQ_API_KEY="gsk_xxxxxxxxxxxx"

# DeepSeek (coding specialist)
export DEEPSEEK_API_KEY="sk-xxxxxxxxxxxx"

# Nvidia NIM (enterprise AI)
export NVIDIA_API_KEY="nvapi-xxxxxxxxxxxx"

# Mistral AI
export MISTRAL_API_KEY="xxxxxxxxxxxx"

# ─── Optional: Messaging Platforms ───

# Telegram Bot
export TELEGRAM_BOT_TOKEN="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"

# Discord Bot
export DISCORD_BOT_TOKEN="xxxxxxxxxxxx"

# ─── Optional: Other Services ───

# ElevenLabs (voice TTS)
export ELEVENLABS_API_KEY="xxxxxxxxxxxx"

# Weather API
export WEATHER_API_KEY="xxxxxxxxxxxx"
```

### Shell-specific setup

**Bash / Zsh** — Add to `~/.bashrc` or `~/.zshrc`:
```bash
export OPENAI_API_KEY="sk-xxxxxxxxxxxx"
export ANTHROPIC_API_KEY="sk-ant-xxxxxxxxxxxx"
```
Then: `source ~/.bashrc`

**Windows PowerShell** — Add to `$PROFILE`:
```powershell
$env:OPENAI_API_KEY = "sk-xxxxxxxxxxxx"
$env:ANTHROPIC_API_KEY = "sk-ant-xxxxxxxxxxxx"
```

**Windows cmd** — Set permanently:
```cmd
setx OPENAI_API_KEY "sk-xxxxxxxxxxxx"
setx ANTHROPIC_API_KEY "sk-ant-xxxxxxxxxxxx"
```

---

## What the Setup Wizard Auto-Detects

When you run `opendesktop --setup`, it automatically finds:

| What | How | You do |
|------|-----|--------|
| Username | Reads from OS | Nothing — pre-filled |
| Timezone | System locale | Nothing — pre-selected |
| OS/Platform | `os.platform()` | Nothing — shown in summary |
| RAM | `os.totalmem()` | Nothing — warns if low |
| GPU | `systeminformation` | Nothing — recommends local models if powerful |
| Ollama | Checks `localhost:11434` | Nothing — appears first if running |
| LM Studio | Checks `localhost:1234` | Nothing — appears first if running |
| API keys | Checks environment vars | Nothing — auto-filled |
| Shell | `process.env.SHELL` | Nothing — detected |

**Just run `opendesktop --setup` and hit Enter through everything.** It figures out the rest.

---

## Local AI (Free, Private, No API Key)

### Ollama

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull a model
ollama pull llama3.1
ollama pull codellama

# It runs on localhost:11434 — OpenDesktop detects it automatically
opendesktop --setup
# Choose "Ollama — RUNNING LOCALLY" when it asks for provider
```

### LM Studio

1. Download from https://lmstudio.ai
2. Load a model and start the server
3. Runs on `localhost:1234` — OpenDesktop detects it automatically

---

## Hotkey Setup

The setup wizard lets you choose a global hotkey to summon OpenDesktop from anywhere.

**Presets:**
- `Ctrl+Shift+Space` — Recommended
- `Ctrl+Alt+O` — O for OpenDesktop
- `Ctrl+Shift+D` — D for Desktop
- `Alt+Space` — Quick launcher style
- `F12` — Classic dev tools

**Custom:** Pick your own modifiers + key combination.

The hotkey works system-wide — press it in any app to summon the agent.

---

## Messaging Platforms

Connect OpenDesktop to chat platforms so you can talk to it from your phone or other devices.

### Telegram
1. Message @BotFather on Telegram
2. Create a bot: `/newbot`
3. Copy the token
4. Set: `export TELEGRAM_BOT_TOKEN="your-token"`
5. Run `opendesktop --setup` and enable Telegram

### Discord
1. Go to https://discord.com/developers/applications
2. Create an application → Bot → Copy token
3. Set: `export DISCORD_BOT_TOKEN="your-token"`
4. Run `opendesktop --setup` and enable Discord

### WhatsApp
1. Run `opendesktop --setup` and enable WhatsApp
2. Scan the QR code with your phone
3. Done — chat with your agent on WhatsApp

---

## Docker

```bash
# Build
docker build -t opendesktop .

# Run
docker run -it -p 4444:4444 \
  -e OPENDESKTOP_API_KEY=your-key \
  -e OPENDESKTOP_PROVIDER=openrouter \
  -e OPENDESKTOP_MODEL=anthropic/claude-3.5-sonnet \
  opendesktop

# Docker Compose
docker-compose up -d
```

---

## Commands Cheat Sheet

### Conversational
Just type naturally — no commands needed:
```
> What's the weather in Tokyo?
> Open Chrome and go to github.com
> Write a Python script to rename all .txt files in this folder
> What did we talk about yesterday?
```

### Slash Commands
```
/help                   Show all commands
/whoami                 Identity info
/settings               Settings page
/model <name>           Switch AI model
/providers              List providers
/memory                 Memory dashboard
/screen                 Screenshot & analyze
/run <cmd>              Shell command
/code <lang> <code>     Execute code
/web-search <query>     Web search
/ghost                  Ghost mode status
/mesh                   Device mesh status
/context                Neural context status
/ambient                Voice ambient status
/red-team               Security audit
/record <name>          Record workflow
/semantic-search <q>    Search files by meaning
/collab                 Collaboration status
```

---

## Configuration File

Config is stored at `~/.opendesktop/config.json`:

```json
{
  "version": "1.0.0",
  "user": {
    "name": "John",
    "timezone": "Asia/Shanghai"
  },
  "ai": {
    "name": "OpenDesktop"
  },
  "provider": {
    "name": "openrouter",
    "apiKey": "sk-or-v1-xxx",
    "model": "anthropic/claude-3.5-sonnet"
  },
  "features": {
    "voice": true,
    "vision": true,
    "memory": true,
    "automation": true,
    "webSearch": true,
    "iot": false,
    "security": true,
    "selfImprove": true
  },
  "theme": "hacker-red",
  "hotkey": {
    "enabled": true,
    "key": "ctrl+shift+space"
  },
  "persona": {
    "active": "hacker"
  }
}
```

---

## Troubleshooting

### "Command not found: opendesktop"
```bash
# Refresh your PATH
source ~/.bashrc  # or ~/.zshrc

# Or restart your terminal

# Windows: restart PowerShell/cmd
```

### "Node.js not found"
Install from https://nodejs.org (LTS version), then re-run the installer.

### "API key not working"
```bash
# Check your key is set
echo $OPENAI_API_KEY

# Re-run setup to reconfigure
opendesktop --setup
```

### "Ollama not detected"
```bash
# Make sure Ollama is running
ollama serve

# Check it responds
curl http://localhost:11434/api/tags
```

---

## Links

| Resource | URL |
|----------|-----|
| GitHub | https://github.com/Atum246/OpenDesktop |
| npm | https://www.npmjs.com/package/opendesktop-ai |
| Landing Page | https://atum246.github.io/OpenDesktop/ |
| Issues | https://github.com/Atum246/OpenDesktop/issues |
