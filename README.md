<div align="center">

# ⚡ OpenDesktop ⚡

### **AI-Powered Desktop Agent**

**Your computer, controlled by AI. Voice. Vision. Automation. Memory. 50+ AI Providers.**

[![npm version](https://img.shields.io/npm/v/opendesktop-ai.svg)](https://www.npmjs.com/package/opendesktop-ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-red.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20macOS%20%7C%20Windows-blue.svg)]()
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)]()
[![Tests](https://img.shields.io/badge/tests-61%2F61%20passing-brightgreen.svg)]()

```
  ╔═══════════════════════════════════════════════════════════════╗
  ║                                                               ║
  ║    ██████╗ ██████╗ ███████╗███╗   ██╗██████╗ ███████╗███████╗║
  ║   ██╔═══██╗██╔══██╗██╔════╝████╗  ██║██╔══██╗██╔════╝██╔════╝║
  ║   ██║   ██║██████╔╝█████╗  ██╔██╗ ██║██║  ██║█████╗  ███████╗║
  ║   ██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║██║  ██║██╔══╝  ╚════██║║
  ║   ╚██████╔╝██║     ███████╗██║ ╚████║██████╔╝███████╗███████║║
  ║    ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝╚═════╝ ╚══════╝╚══════╝║
  ║                                                               ║
  ╚═══════════════════════════════════════════════════════════════╝
```

</div>

---

## 🚀 What is OpenDesktop?

OpenDesktop is an **open-source AI desktop agent** that takes control of your computer and does things for you. Installed via CLI, it connects to 50+ AI model providers and can:

- 🖥️ **Control your desktop** — click, type, drag, scroll, manage windows
- 🌐 **Browse the web** — open tabs, fill forms, download files, scrape data
- 📁 **Manage files** — create, read, move, search, organize
- 👁️ **See your screen** — take screenshots, analyze UI, read text (OCR)
- 🎤 **Listen to your voice** — voice commands and dictation
- 🧠 **Remember everything** — persistent memory that never forgets
- 💻 **Execute code** — 30+ programming languages
- 🚀 **Deploy anywhere** — 18 deployment targets (Vercel, AWS, Docker, etc.)
- 🧩 **Create skills** — build tools and plugins on the fly
- 📋 **Automate workflows** — chain actions, schedule tasks
- 🎭 **Custom personas** — give your AI a personality
- 📈 **Learn over time** — gets smarter with every interaction
- 💬 **Message you anywhere** — Telegram, Discord, WhatsApp, Slack
- ⌨️ **Summon with hotkey** — press a key, AI appears

**Install it. Set it up. Press a key. It does the rest.**

---

## ⚡ Quick Start

```bash
# Install globally via npm
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

### npm (Recommended)
```bash
npm install -g opendesktop-ai
```

### From Source
```bash
git clone https://github.com/Atum246/OpenDesktop.git
cd OpenDesktop
npm install
npm link
```

### Platform-Specific

#### 🐧 Linux
```bash
sudo apt update && sudo apt install -y nodejs npm  # Ubuntu/Debian
sudo dnf install -y nodejs npm                      # Fedora
sudo pacman -S nodejs npm                            # Arch
npm install -g opendesktop-ai
```

#### 🍎 macOS
```bash
brew install node
npm install -g opendesktop-ai
```

#### 🪟 Windows
```powershell
winget install OpenJS.NodeJS.LTS
npm install -g opendesktop-ai
```

---

## 📋 Prerequisites

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| **Node.js** | v18.0.0 | v20+ (LTS) |
| **npm** | v8.0.0 | v10+ |
| **OS** | Linux, macOS 12+, Windows 10+ | Latest |
| **RAM** | 4GB | 8GB+ |
| **Network** | Internet connection | Broadband |

---

## 🎯 Complete Feature List

### 🤖 AI Engine
- **19 AI Providers** — OpenRouter, OpenAI, Anthropic, Google, Nvidia NIM, Groq, Together, Fireworks, Mistral, Cohere, Perplexity, DeepSeek, xAI, Cerebras, SambaNova, Ollama, LM Studio, vLLM, TextGen
- **100+ Models** — GPT-4o, Claude 3.5, Gemini, Llama 3.1 405B, Mixtral, and more
- **Smart Model Router** — Auto-picks best model for each task
- **Streaming Responses** — Real-time output
- **Custom Endpoints** — Any OpenAI-compatible API

### 👁️ Vision System
- **Screenshot Capture** — Any screen, any monitor
- **Screen Analysis** — AI reads and understands everything
- **UI Element Detection** — Buttons, text, inputs, menus
- **OCR Text Extraction** — Read text from images
- **Multi-Monitor Support** — Multiple displays
- **Screen Watching** — Continuous monitoring mode

### 🖥️ Desktop Automation
- **Mouse Control** — Click, drag, scroll, hover
- **Keyboard Control** — Type text, hotkeys, shortcuts
- **Window Management** — Open, close, minimize, maximize, resize
- **Application Launcher** — Open any program
- **File System** — CRUD operations, search
- **Clipboard** — Read/write clipboard
- **Shell Commands** — Run anything
- **Process Management** — List, monitor, kill
- **Desktop Notifications** — Native alerts

### 💻 Code Executor (30+ Languages)
- JavaScript, Python, TypeScript, Go, Rust, C, C++, Java, Ruby, PHP, Lua, R, Julia, Swift, Kotlin, Bash, PowerShell, SQL, HTML, Zig, Elixir, Haskell, Clojure, Scala, Dart, Nim, and more
- **Auto Language Detection** — Detects language from code
- **Project Scaffolding** — Create projects from templates
- **Compile & Run** — Compiled languages supported

### 🚀 Deployer (18 Targets)
- Vercel, Netlify, GitHub Pages, Docker, AWS, GCP, Azure, Heroku, Fly.io, Railway, Render, Surge, Firebase, Cloudflare, npm, PyPI, SSH, FTP

### 🧠 Memory System
- **Episodic Memory** — Chronological events
- **Semantic Memory** — Facts and knowledge
- **Task Memory** — Track completed actions
- **Conversation Memory** — Save chat sessions
- **Profile Memory** — User preferences
- **Full-Text Search** — Search everything
- **Export/Import** — Backup and restore

### 📈 Learning System
- **Command Tracking** — Learns what you do frequently
- **Correction Learning** — Learns from mistakes
- **Preference Learning** — Adapts to your style
- **Pattern Detection** — Identifies behavior patterns
- **Smart Suggestions** — Proactive recommendations
- **User Profile Building** — Builds a model of you

### 🧩 Skill Creator
- **Create Skills** — Build tools from natural language
- **Plugin Architecture** — Extensible plugin system
- **15+ Built-in Skills** — Web search, Git, Docker, SSH, API client, PDF, translate, weather, email, calendar, crypto, stocks
- **Hot Reload** — Skills load dynamically

### 📋 Workflow Builder
- **Create Workflows** — Chain actions together
- **Natural Language** — Describe workflow in English
- **Conditional Logic** — If/then branching
- **Variables** — Pass data between steps
- **Error Handling** — Retry, skip, or stop on error
- **Scheduling** — Run workflows on schedule

### 🎭 Persona System
- **6 Preset Personas** — Professional, Casual, Hacker, Creative, Teacher, Butler
- **Custom Personas** — Create your own
- **Trait System** — Humor, formality, verbosity
- **Auto-Generate** — From your interaction history

### 🎤 Voice System
- **Text-to-Speech** — Native TTS on all platforms
- **Speech-to-Text** — Whisper API integration
- **Wake Word** — "Hey Desktop" trigger
- **Multi-Language** — 12+ languages

### ⌨️ Global Hotkey
- **Summon Anywhere** — Press hotkey from any app
- **Customizable** — Ctrl+Shift+Space, Ctrl+Alt+O, etc.
- **Cross-Platform** — Linux, macOS, Windows

### 💬 Messaging Integration
- **Telegram** — Bot integration
- **Discord** — Bot integration
- **WhatsApp** — Web integration
- **Slack** — Bot integration

### ⚙️ Settings (14 Sections)
- AI Models, Providers, Messaging, Voice, Vision, Memory, Theme, Hotkey, Permissions, Persona, Skills, Workflows, System Status, Advanced

### 🎨 Themes
- 🔴 Hacker Red (default)
- 🟢 Matrix Green
- 🔵 Cyberpunk Blue
- ⚪ Minimal Light
- 🟣 Vaporwave

---

## 💬 Commands

| Command | Description |
|---------|-------------|
| `/help` | Show all commands |
| `/settings` | Settings page (14 sections) |
| `/model <name>` | Switch AI model |
| `/providers` | List providers |
| `/memory` | Memory dashboard |
| `/search <q>` | Search memory |
| `/screen` | Screenshot & analyze |
| `/vision <q>` | Analyze screen |
| `/run <cmd>` | Shell command |
| `/open <app>` | Open application |
| `/browse <url>` | Open URL |
| `/code <lang> <code>` | Execute code |
| `/project <name>` | Create project |
| `/deploy <target>` | Deploy project |
| `/create-skill <desc>` | Create skill |
| `/workflow <desc>` | Create workflow |
| `/run-wf <name>` | Run workflow |
| `/persona <name>` | Activate persona |
| `/speak <text>` | Text to speech |
| `/listen` | Start voice |
| `/theme <name>` | Change theme |
| `/clear` | Clear screen |
| `/quit` | Exit |

---

## 🏗️ Architecture

```
OpenDesktop/
├── bin/opendesktop              # CLI entry point
├── src/
│   ├── core/
│   │   ├── engine.js            # 🧠 Core AI engine (integrates everything)
│   │   └── config.js            # ⚙️ Configuration manager
│   ├── providers/index.js       # 🤖 19 AI providers, 100+ models
│   ├── vision/index.js          # 👁️ Screen vision & OCR
│   ├── automation/index.js      # 🖥️ Desktop automation engine
│   ├── memory/index.js          # 🧠 Persistent memory system
│   ├── messaging/index.js       # 💬 Messaging integrations
│   ├── gui/index.js             # 🖥️ Rich terminal GUI
│   ├── cli/setup.js             # 🔧 Setup wizard
│   ├── plugins/index.js         # 🧩 Plugin manager
│   ├── hotkey/index.js          # ⌨️ Global hotkey
│   ├── voice/index.js           # 🎤 Voice system
│   ├── code-executor/index.js   # 💻 Code executor (30+ languages)
│   ├── deployer/index.js        # 🚀 Deployer (18 targets)
│   ├── learning/index.js        # 📈 Learning system
│   ├── skill-creator/index.js   # 🧩 Skill creator
│   ├── workflows/index.js       # 📋 Workflow builder
│   ├── persona/index.js         # 🎭 Persona system
│   └── settings/index.js        # ⚙️ Settings page
├── tests/test.js                # ✅ 61 tests, all passing
├── install.sh                   # 📦 Installation script
├── package.json
├── LICENSE (MIT)
└── README.md
```

---

## 🤝 Contributing

```bash
git clone https://github.com/Atum246/OpenDesktop.git
cd OpenDesktop
npm install
npm test
```

---

## 📄 License

MIT License — see [LICENSE](LICENSE)

---

<div align="center">

**Made with ❤️ by the OpenDesktop Community**

[GitHub](https://github.com/Atum246/OpenDesktop) • [npm](https://www.npmjs.com/package/opendesktop-ai) • [Issues](https://github.com/Atum246/OpenDesktop/issues)

</div>
