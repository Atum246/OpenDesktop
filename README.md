<div align="center">

# ⚡ OpenDesktop ⚡

### **AI-Powered Desktop Agent**

**Your computer, controlled by AI. Voice. Vision. Automation. Memory. 50+ AI Providers.**

[![npm version](https://img.shields.io/npm/v/opendesktop.svg)](https://www.npmjs.com/package/opendesktop)
[![License: MIT](https://img.shields.io/badge/License-MIT-red.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20macOS%20%7C%20Windows-blue.svg)]()
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)]()

---

```
  ┌─────────────────────────────────────────────────────────────┐
  │                                                             │
  │     ██████╗ ██████╗ ███████╗███╗   ██╗██████╗ ███████╗     │
  │    ██╔═══██╗██╔══██╗██╔════╝████╗  ██║██╔══██╗██╔════╝     │
  │    ██║   ██║██████╔╝█████╗  ██╔██╗ ██║██║  ██║█████╗       │
  │    ██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║██║  ██║██╔══╝       │
  │    ╚██████╔╝██║     ███████╗██║ ╚████║██████╔╝███████╗     │
  │     ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝╚═════╝ ╚══════╝     │
  │              ██████╗ ███████╗███████╗██╗  ██╗████████╗      │
  │              ██╔══██╗██╔════╝██╔════╝██║ ██╔╝╚══██╔══╝      │
  │              ██║  ██║█████╗  ███████╗█████╔╝    ██║         │
  │              ██║  ██║██╔══╝  ╚════██║██╔═██╗    ██║         │
  │              ██████╔╝███████╗███████║██║  ██╗   ██║         │
  │              ╚═════╝ ╚══════╝╚══════╝╚═╝  ╚═╝   ╚═╝         │
  │                                                             │
  └─────────────────────────────────────────────────────────────┘
```

---

</div>

## 🚀 What is OpenDesktop?

OpenDesktop is an **open-source AI desktop agent** that takes control of your computer and does things for you. Installed via CLI, it connects to 50+ AI model providers and can:

- 🖥️ **Control your desktop** — click, type, drag, scroll, manage windows
- 🌐 **Browse the web** — open tabs, fill forms, download files, scrape data
- 📁 **Manage files** — create, read, move, search, organize
- 👁️ **See your screen** — take screenshots, analyze UI, read text (OCR)
- 🎤 **Listen to your voice** — voice commands and dictation
- 🧠 **Remember everything** — persistent memory that never forgets
- 🔗 **Connect everything** — WiFi, Bluetooth, SSH, APIs
- 💬 **Message you anywhere** — Telegram, Discord, WhatsApp, Slack
- ⚡ **Automate anything** — schedule tasks, create workflows, run macros

**Install it. Set it up. Press a key. It does the rest.**

---

## 📋 Table of Contents

- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [Prerequisites](#-prerequisites)
- [Features](#-features)
- [AI Providers](#-ai-providers)
- [Commands](#-commands)
- [Configuration](#-configuration)
- [Messaging Integration](#-messaging-integration)
- [Plugin System](#-plugin-system)
- [Architecture](#-architecture)
- [Contributing](#-contributing)
- [License](#-license)

---

## ⚡ Quick Start

```bash
# Install via npm (recommended)
npm install -g opendesktop-ai

# Run setup wizard
opendesktop --setup

# Start chatting
opendesktop

# Or launch GUI interface
opendesktop --gui

# Short alias
od
```

### One-Line Install (Bash)

```bash
curl -fsSL https://raw.githubusercontent.com/Atum246/OpenDesktop/main/install.sh | bash
```

---

## 📦 Installation

### Option 1: npm (Recommended)

```bash
npm install -g opendesktop
```

### Option 2: Install Script

```bash
# Download and run
git clone https://github.com/Atum246/OpenDesktop.git
cd OpenDesktop
bash install.sh
```

### Option 3: Manual Install

```bash
git clone https://github.com/Atum246/OpenDesktop.git
cd OpenDesktop
npm install
npm link
```

### Platform-Specific Notes

#### 🐧 Linux

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install -y nodejs npm
npm install -g opendesktop

# Fedora
sudo dnf install -y nodejs npm
npm install -g opendesktop

# Arch
sudo pacman -S nodejs npm
npm install -g opendesktop
```

#### 🍎 macOS

```bash
# Using Homebrew
brew install node
npm install -g opendesktop
```

#### 🪟 Windows

```powershell
# Using winget
winget install OpenJS.NodeJS.LTS
npm install -g opendesktop

# Or using Chocolatey
choco install nodejs
npm install -g opendesktop
```

---

## 📋 Prerequisites

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| **Node.js** | v18.0.0 | v20+ (LTS) |
| **npm** | v8.0.0 | v10+ |
| **OS** | Linux, macOS 12+, Windows 10+ | Latest version |
| **RAM** | 4GB | 8GB+ |
| **Disk** | 500MB free | 2GB+ |
| **Network** | Internet connection | Broadband |

### Optional Dependencies

| Dependency | Purpose | Install |
|------------|---------|---------|
| **Ollama** | Local AI models | `curl -fsSL https://ollama.ai/install.sh \| sh` |
| **FFmpeg** | Screen recording | `brew install ffmpeg` / `apt install ffmpeg` |
| **Tesseract** | OCR (fallback) | `brew install tesseract` / `apt install tesseract-ocr` |

---

## 🎯 Features

### 🤖 AI Engine
- **50+ AI Providers** — OpenRouter, OpenAI, Anthropic, Google, Nvidia NIM, Groq, Ollama, and many more
- **Smart Model Router** — Auto-picks the best model for each task
- **Streaming Responses** — Real-time output as AI thinks
- **Conversation Memory** — Maintains context across chats
- **Custom System Prompts** — Personalize AI behavior

### 👁️ Vision System
- **Screenshot Capture** — Take screenshots of any screen
- **Screen Analysis** — AI reads and understands everything on screen
- **UI Element Detection** — Identifies buttons, text, inputs, menus
- **OCR Text Extraction** — Read text from images and screen
- **Multi-Monitor Support** — Works with multiple displays
- **Screen Watching** — Continuous monitoring mode
- **Screen Recording** — Record screen activity

### 🖥️ Desktop Automation
- **Mouse Control** — Click, double-click, right-click, drag, scroll
- **Keyboard Control** — Type text, hotkeys, keyboard shortcuts
- **Window Management** — Open, close, minimize, maximize, resize, move
- **Application Launcher** — Open any program by name
- **File System** — Create, read, write, move, delete, search files
- **Clipboard** — Read and write clipboard content
- **System Commands** — Run any shell command
- **Process Management** — List, monitor, kill processes
- **Notifications** — Desktop notifications

### 🔗 Connectivity
- **WiFi Management** — Scan, connect, manage networks
- **Bluetooth** — Pair and manage devices
- **SSH Remote** — Connect to remote servers
- **Network Tools** — Ping, traceroute, DNS lookup
- **API Client** — Make HTTP requests

### 🧠 Memory System
- **Episodic Memory** — Chronological event logging
- **Semantic Memory** — Facts, knowledge, preferences
- **Task Memory** — Track completed actions
- **Conversation Memory** — Save and search chat history
- **Profile Memory** — Learn user preferences over time
- **Full-Text Search** — Search across all memory
- **Export/Import** — Backup and restore memory
- **Selective Forgetting** — Privacy controls

### 🌐 Browser Automation
- **Open URLs** — Launch any website
- **Tab Management** — Open, close, switch tabs
- **Form Filling** — Auto-fill web forms
- **Web Scraping** — Extract data from websites
- **Download Manager** — Download and organize files

### 💬 Messaging Integration
- **Telegram** — Chat with your AI via Telegram bot
- **Discord** — Discord bot integration
- **WhatsApp** — WhatsApp Web integration
- **Slack** — Slack bot integration

### 🧩 Plugin System
- **Built-in Skills** — Web search, code execution, Git, Docker, SSH, and more
- **Custom Plugins** — Build and install your own plugins
- **Community Plugins** — Share plugins with others

---

## 🤖 AI Providers

OpenDesktop supports **18+ providers** with **100+ models**:

| Provider | Models | Notes |
|----------|--------|-------|
| **OpenRouter** | 50+ models | Access to all major models |
| **OpenAI** | GPT-4o, GPT-4, o1 | Latest GPT models |
| **Anthropic** | Claude 3.5, Claude 3 Opus | Best reasoning |
| **Google** | Gemini Pro, Gemini 1.5 | Google's flagship |
| **Nvidia NIM** | Llama 3.1 405B, Nemotron | Enterprise inference |
| **Groq** | Llama 3.1, Mixtral | Ultra-fast inference |
| **Together AI** | Llama, Mixtral, Qwen | Open source models |
| **Fireworks AI** | Llama, Mixtral | Fast inference |
| **Mistral AI** | Mistral Large, Mixtral | European AI |
| **Cohere** | Command R+ | Enterprise RAG |
| **Perplexity** | Sonar models | Search-augmented |
| **DeepSeek** | DeepSeek Chat, Coder | Coding specialist |
| **xAI** | Grok 2 | Elon's AI |
| **Cerebras** | Llama 3.1 | Wafer-scale inference |
| **SambaNova** | Llama 3.1 405B | Enterprise AI |
| **Ollama** | Any local model | 100% local, private |
| **LM Studio** | Any local model | Local inference |
| **vLLM** | Any local model | High-performance local |

---

## 💬 Commands

### CLI Commands

| Command | Description |
|---------|-------------|
| `/help` | Show all commands |
| `/model <name>` | Switch AI model |
| `/providers` | List all providers |
| `/models` | List models for current provider |
| `/memory` | Memory dashboard |
| `/search <query>` | Search memory |
| `/screen` | Take screenshot & analyze |
| `/vision <question>` | Analyze screen with question |
| `/run <command>` | Run shell command |
| `/open <app>` | Open application |
| `/browse <url>` | Open URL in browser |
| `/system` | System information |
| `/processes` | List running processes |
| `/plugins` | List available plugins |
| `/clipboard` | Show clipboard content |
| `/network` | Network information |
| `/ping <host>` | Ping a host |
| `/notify <message>` | Desktop notification |
| `/theme <name>` | Change color theme |
| `/history` | Chat history |
| `/clear` | Clear screen |
| `/reset` | Reset AI context |
| `/export` | Export memory |
| `/quit` | Exit |

### Natural Language

Just talk naturally! Examples:

```
"Open Chrome and go to GitHub"
"What's on my screen right now?"
"Create a file called notes.txt with my todo list"
"What's the weather in Tokyo?"
"Take a screenshot and describe what you see"
"Run git status in my project folder"
"Find all PDF files in my Downloads folder"
"What processes are using the most memory?"
```

---

## ⚙️ Configuration

Configuration is stored in `~/.opendesktop/config.json`:

```json
{
  "version": "1.0.0",
  "provider": {
    "name": "openrouter",
    "apiKey": "your-api-key",
    "endpoint": null,
    "model": "anthropic/claude-3.5-sonnet"
  },
  "features": {
    "voice": true,
    "vision": true,
    "memory": true,
    "automation": true,
    "browser": true
  },
  "theme": "hacker-red",
  "messaging": {
    "enabled": false,
    "platforms": []
  },
  "hotkey": {
    "enabled": true,
    "key": "ctrl+shift+space"
  },
  "permissions": {
    "screenControl": true,
    "fileSystem": true,
    "network": true,
    "clipboard": true,
    "notifications": true,
    "systemCommands": true
  }
}
```

### Themes

| Theme | Description |
|-------|-------------|
| `hacker-red` | 🔴 Red/black hacker aesthetic (default) |
| `matrix` | 🟢 Matrix green terminal |
| `cyberpunk` | 🔵 Cyan/magenta cyberpunk |
| `minimal` | ⚪ Clean minimal light |
| `vaporwave` | 🟣 Pink/purple vaporwave |

---

## 💬 Messaging Integration

### Telegram Bot Setup

1. Create a bot via [@BotFather](https://t.me/BotFather)
2. Get your bot token
3. Add to config:
```json
{
  "messaging": {
    "enabled": true,
    "platforms": ["telegram"],
    "telegram": {
      "token": "YOUR_BOT_TOKEN"
    }
  }
}
```

### Discord Bot Setup

1. Create app at [Discord Developer Portal](https://discord.com/developers)
2. Create bot and get token
3. Add to config:
```json
{
  "messaging": {
    "enabled": true,
    "platforms": ["discord"],
    "discord": {
      "token": "YOUR_BOT_TOKEN"
    }
  }
}
```

---

## 🧩 Plugin System

### Built-in Skills

| Skill | Command | Description |
|-------|---------|-------------|
| `web-search` | `/search` | Search the web |
| `code-exec` | `/code` | Execute code |
| `file-manager` | `/files` | File operations |
| `git-control` | `/git` | Git management |
| `docker-control` | `/docker` | Docker management |
| `ssh-remote` | `/ssh` | SSH connections |
| `api-client` | `/api` | HTTP requests |
| `pdf-reader` | `/pdf` | PDF extraction |
| `image-gen` | `/imagine` | Image generation |
| `translate` | `/translate` | Translation |
| `weather` | `/weather` | Weather info |
| `email-manager` | `/email` | Email management |
| `calendar` | `/calendar` | Calendar |
| `crypto` | `/crypto` | Crypto prices |
| `stock-market` | `/stocks` | Stock data |

### Custom Plugins

Create a plugin in `~/.opendesktop/plugins/my-plugin/`:

**plugin.json:**
```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "My custom plugin",
  "main": "index.js"
}
```

**index.js:**
```javascript
module.exports = {
  async myAction(params, engine) {
    // Your code here
    return { result: 'Hello from my plugin!' };
  }
};
```

---

## 🏗️ Architecture

```
OpenDesktop/
├── bin/
│   └── opendesktop          # CLI entry point
├── src/
│   ├── index.js             # Main export
│   ├── core/
│   │   ├── engine.js        # Core AI engine
│   │   └── config.js        # Configuration manager
│   ├── providers/
│   │   └── index.js         # 50+ AI provider registry
│   ├── vision/
│   │   └── index.js         # Screen vision & OCR
│   ├── automation/
│   │   └── index.js         # Desktop automation engine
│   ├── memory/
│   │   └── index.js         # Persistent memory system
│   ├── messaging/
│   │   └── index.js         # Messaging integrations
│   ├── gui/
│   │   └── index.js         # Rich terminal GUI
│   ├── cli/
│   │   └── setup.js         # Setup wizard
│   └── plugins/
│       └── index.js         # Plugin manager
├── tests/
│   └── test.js              # Test suite
├── install.sh               # Installation script
├── package.json
├── LICENSE
└── README.md
```

---

## 🤝 Contributing

We welcome contributions! Here's how:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Setup

```bash
git clone https://github.com/Atum246/OpenDesktop.git
cd OpenDesktop
npm install
npm test
```

### Roadmap

- [ ] Full robotjs integration (real mouse/keyboard control)
- [ ] Voice input/output (Whisper + TTS)
- [ ] Web UI dashboard
- [ ] Mobile companion app
- [ ] Plugin marketplace
- [ ] Multi-agent collaboration
- [ ] Self-healing capabilities
- [ ] Screen recording with AI analysis
- [ ] Workflow visual builder
- [ ] Cloud sync for memory

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

Built with:
- [OpenAI](https://openai.com) — GPT models
- [Anthropic](https://anthropic.com) — Claude models
- [OpenRouter](https://openrouter.ai) — Multi-model access
- [Nvidia NIM](https://build.nvidia.com) — Enterprise inference
- [Ollama](https://ollama.ai) — Local model serving
- [chalk](https://github.com/chalk/chalk) — Terminal styling
- [inquirer](https://github.com/SBoudrias/Inquirer.js) — CLI prompts
- [figlet](https://github.com/patorjk/figlet.js) — ASCII art

---

<div align="center">

**Made with ❤️ by the OpenDesktop Community**

[GitHub](https://github.com/Atum246/OpenDesktop) • [npm](https://www.npmjs.com/package/opendesktop) • [Issues](https://github.com/Atum246/OpenDesktop/issues)

</div>
