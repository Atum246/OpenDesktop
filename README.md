<p align="center">
  <br>
  <img src="https://img.shields.io/badge/version-2.0.0-FF0000?style=for-the-badge&labelColor=0A0A0A" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-00FF41?style=for-the-badge&labelColor=0A0A0A" alt="License">
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-00FFFF?style=for-the-badge&labelColor=0A0A0A" alt="Node.js">
  <img src="https://img.shields.io/badge/tests-119%20passed-00FF41?style=for-the-badge&labelColor=0A0A0A" alt="Tests">
  <img src="https://img.shields.io/badge/providers-50%2B-FF0000?style=for-the-badge&labelColor=0A0A0A" alt="Providers">
  <img src="https://img.shields.io/badge/platforms-3-FFD700?style=for-the-badge&labelColor=0A0A0A" alt="Platforms">
  <br><br>
</p>

```
 ██████╗ ██████╗ ███████╗███╗   ██╗██████╗ ███████╗███████╗██╗  ██╗████████╗ ██████╗ ██████╗
██╔═══██╗██╔══██╗██╔════╝████╗  ██║██╔══██╗██╔════╝██╔════╝██║ ██╔╝╚══██╔══╝██╔═══██╗██╔══██╗
██║   ██║██████╔╝█████╗  ██╔██╗ ██║██║  ██║█████╗  ███████╗█████╔╝    ██║   ██║   ██║██████╔╝
██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║██║  ██║██╔══╝  ╚════██║██╔═██╗    ██║   ██║   ██║██╔══██╗
╚██████╔╝██║     ███████╗██║ ╚████║██████╔╝███████╗███████║██║  ██╗   ██║   ╚██████╔╝██║  ██║
 ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝╚═════╝ ╚══════╝╚══════╝╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝
```

<p align="center">
  <b>⚡ NOT A CHATBOT. AN INTELLIGENCE AGENT. ⚡</b><br>
  <sub>A self-improving, self-rewriting AI desktop agent that controls your computer, researches the web,<br>spawns AI armies, trains custom models, and gets smarter every single interaction.</sub>
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-features">Features</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-commands">Commands</a> •
  <a href="#-providers">Providers</a> •
  <a href="#-api">API</a> •
  <a href="#-docker">Docker</a> •
  <a href="#-contributing">Contributing</a>
</p>

---

## 📖 Table of Contents

- [🚀 Quick Start](#-quick-start)
- [⚡ Features](#-features)
- [🏗️ Architecture](#️-architecture)
- [📋 Commands Reference](#-commands-reference)
- [🤖 AI Providers](#-ai-providers)
- [💬 Messaging Platforms](#-messaging-platforms)
- [🖥️ OS Integration](#️-os-integration)
- [🧠 Memory System](#-memory-system)
- [🧬 Self-Evolution](#-self-evolution)
- [🔮 Proactive Intelligence](#-proactive-intelligence)
- [👁️ Visual Understanding](#️-visual-understanding)
- [🏠 IoT Control](#-iot-control)
- [🔒 Security](#-security)
- [🛡️ Trust & Safety](#️-trust--safety)
- [🌐 API Gateway](#-api-gateway)
- [⏰ Task Scheduler](#-task-scheduler)
- [💾 Backup Manager](#-backup-manager)
- [🛒 Plugin Marketplace](#-plugin-marketplace)
- [📊 Performance Monitor](#-performance-monitor)
- [🔔 Notification Center](#-notification-center)
- [⚙️ Config Manager](#️-config-manager)
- [🐳 Docker](#-docker)
- [🧪 Testing](#-testing)
- [📁 Project Structure](#-project-structure)
- [🔧 Configuration](#-configuration)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

---

## 🚀 Quick Start

### Windows (PowerShell — Recommended)

```powershell
powershell -ExecutionPolicy Bypass -c "irm https://raw.githubusercontent.com/Atum246/OpenDesktop/main/install.ps1 | iex"
```

This handles everything: installs Node.js if missing, installs OpenDesktop globally, and runs setup.

### Windows (Command Prompt / cmd)

```cmd
curl -o install.bat https://raw.githubusercontent.com/Atum246/OpenDesktop/main/install.bat && install.bat
```

### Linux / macOS (One-Line Install)

```bash
curl -fsSL https://raw.githubusercontent.com/Atum246/OpenDesktop/main/install.sh | bash
```

### Via npm (Any Platform)

```bash
npm install -g opendesktop-ai
opendesktop --setup
```

### Via Docker

```bash
docker build -t opendesktop .
docker run -it -p 4444:4444 -e OPENDESKTOP_API_KEY=your-key opendesktop
```

### First Run

```bash
# Start chatting
opendesktop

# Or use the short alias
od

# Launch GUI
opendesktop --gui

# Re-run setup
opendesktop --setup
```

### Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| Node.js | v18.0.0 | v20+ (LTS) |
| npm | v8.0.0 | v10+ |
| OS | Linux, macOS 12+, Windows 10+ | Latest |
| RAM | 4GB | 8GB+ |
| Network | Internet connection | Broadband |

---

## ⚡ Features

OpenDesktop is **NOT** a chatbot. It's a self-improving intelligence agent with **44 subsystems** across **37 modules**.

### 🖥️ Desktop Control
- Mouse control (click, move, drag, scroll)
- Keyboard control (type, hotkeys, key combos)
- Window management (open, close, focus, list)
- File operations (read, write, search, watch)
- Clipboard intelligence (read, write, history)
- Process monitoring (list, kill, track)

### 🌐 Web & Research
- Real web search (DuckDuckGo, Wikipedia, StackOverflow, GitHub, npm)
- Deep multi-source research
- URL scraping and content extraction
- Web page screenshots
- Download management with progress
- Browser automation (Puppeteer)

### 💻 Code Execution
- **37 programming languages** supported
- JavaScript, Python, TypeScript, Go, Rust, C, C++, Java, Ruby, PHP, Swift, Kotlin, Bash, PowerShell, SQL, Lua, R, Julia, Zig, Elixir, Haskell, Clojure, Scala, Dart, Nim, Crystal, and more
- Auto language detection
- Project scaffolding
- Code review, debugging, test generation

### 🧠 Memory & Knowledge
- **5 memory types**: Episodic, Semantic, Tasks, Profile, Conversations
- **Knowledge Graph Brain** with weighted nodes, auto-relating, decay
- Full-text search across all memory
- Export/import memory
- Persistent across sessions

### 🤖 Agent Orchestration
- Spawn hundreds of specialized sub-agents
- Team-based parallel execution
- Task decomposition
- 8 specializations: researcher, coder, tester, deployer, analyst, designer, security, optimizer
- Shared knowledge between agents

### 🧬 Self-Evolution
- Performance journal tracking
- Correction learning
- Skill crystallization
- A/B testing framework
- Self-code rewriting
- Automatic improvement suggestions

### 🔮 Proactive Intelligence
- System health monitoring
- Pattern detection
- Rule-based automation
- Daily briefings
- Repetitive task detection
- Proactive suggestions

### 🏠 IoT Control
- Philips Hue, LIFX, Tasmota, Shelly, Home Assistant
- MQTT support
- Device discovery (mDNS, UPnP, network scan)
- Automation rules
- Generic HTTP device support

### 💬 20 Messaging Platforms
Telegram, Discord, WhatsApp, Slack, Signal, iMessage, IRC, Matrix, LINE, Viber, MS Teams, Twitch, Email, SMS, Mattermost, Rocket.Chat, Element, Guilded, Revolt, Session

### 🔒 Security
- AES-256-GCM encryption
- Command blacklist/whitelist
- Rate limiting
- Audit logging
- Anomaly detection
- Sandbox mode
- Auto-lock
- Permission tiers (admin, user, viewer, restricted)
- Input sanitization (SQL injection, XSS, command injection)

### ⏰ Task Scheduler
- Cron-like scheduling
- Daily, weekly, monthly, interval, once jobs
- Auto-retry on failure
- Execution logging

### 💾 Backup Manager
- Full system backup/restore
- Encrypted backups (AES-256-GCM)
- Backup verification (SHA-256)
- Auto-cleanup old backups
- Migration export

### 🛒 Plugin Marketplace
- Browse/search remote registry
- Install from registry or npm
- Update checking
- Publish plugins
- Built-in skill suggestions

### 📊 Performance Monitor
- Real-time CPU, memory, disk, network
- Configurable alert thresholds
- Historical data tracking
- Export metrics

### 🔔 Notification Center
- 8 channels: system, security, agents, tasks, updates, social, iot, errors
- Desktop notifications (macOS, Linux, Windows)
- Priority levels: critical, high, medium, low
- Notification history

### ⚙️ Config Manager
- Save/load named profiles
- 5 built-in templates: developer, creative, business, privacy, power-user
- Export/import with secret redaction
- Config validation

---

## 🏗️ Architecture

```
OpenDesktop/
├── bin/opendesktop              # CLI entry point
├── src/
│   ├── core/
│   │   ├── engine.js            # 🧠 Core engine — integrates ALL 44 subsystems
│   │   └── config.js            # ⚙️ Configuration manager
│   ├── providers/index.js       # 🤖 50+ AI providers
│   ├── brain/index.js           # 🧠 Weighted knowledge graph brain
│   ├── proactive/index.js       # 🔮 Proactive intelligence engine
│   ├── os-integration/index.js  # 🖥️ Deep OS integration
│   ├── visual-understanding/    # 👁️ Screen understanding engine
│   ├── evolution/index.js       # 🧬 Self-evolution system
│   ├── api-gateway/index.js     # 🌐 REST API + WebSocket + webhooks
│   ├── code-intelligence/       # 💻 Code review, debug, test gen
│   ├── trust-safety/index.js    # 🛡️ Trust & safety layer
│   ├── web-search/index.js      # 🔍 Real web search
│   ├── memory/index.js          # 🧠 5 memory types
│   ├── automation/index.js      # 🖥️ Desktop control
│   ├── vision/index.js          # 👁️ Screen vision, OCR
│   ├── orchestrator/index.js    # 🤖 Agent orchestrator
│   ├── sub-agents/index.js      # 🤖 Sub-agent spawner
│   ├── security/index.js        # 🔒 AES-256 encryption, audit
│   ├── iot/index.js             # 🏠 IoT control
│   ├── model-trainer/index.js   # 🧠 Custom model training
│   ├── code-executor/index.js   # 💻 37 languages
│   ├── code-rewriter/index.js   # 🧬 Self-modifying code
│   ├── self-improve/index.js    # 🧬 Self-improvement
│   ├── research/index.js        # 🔍 Deep research
│   ├── learning/index.js        # 📈 Pattern detection
│   ├── deployer/index.js        # 🚀 18 deployment targets
│   ├── program-installer/       # 📦 Smart installer
│   ├── skill-creator/index.js   # 🧩 Create tools from NL
│   ├── workflows/index.js       # 📋 Workflow automation
│   ├── persona/index.js         # 🎭 6 personality presets
│   ├── voice/index.js           # 🎤 TTS + STT + wake word
│   ├── messaging/index.js       # 💬 20 messaging platforms
│   ├── social-media/index.js    # 📱 Content creation
│   ├── hotkey/index.js          # ⌨️ Global hotkey summon
│   ├── plugins/index.js         # 🧩 Plugin system
│   ├── adaptive/index.js        # 🎨 Adaptive interface
│   ├── gui/index.js             # 🖥️ Rich terminal GUI
│   ├── browser-engine/index.js  # 🌐 Browser automation
│   ├── reverse-engineering/     # 🔬 Binary analysis
│   ├── scheduler/index.js       # ⏰ Task scheduling
│   ├── backup/index.js          # 💾 Backup management
│   ├── marketplace/index.js     # 🛒 Plugin marketplace
│   ├── monitor/index.js         # 📊 Performance monitoring
│   ├── notifications/index.js   # 🔔 Notification center
│   ├── config-manager/index.js  # ⚙️ Config profiles
│   ├── cli/setup.js             # 🔧 Setup wizard
│   └── settings/index.js        # ⚙️ Settings UI
├── tests/test.js                # ✅ 119 tests
├── Dockerfile                   # 🐳 Docker support
├── docker-compose.yml           # 🐳 Docker Compose
├── install.sh                   # 📦 Cross-platform installer
└── package.json
```

---

## 📋 Commands Reference

### 🆔 Identity
| Command | Description |
|---------|-------------|
| `/name <name>` | Give the AI a name |
| `/callme <name>` | Tell the AI your name |
| `/whoami` | Show identity info |

### 🤖 Core
| Command | Description |
|---------|-------------|
| `/help` | Show all commands |
| `/settings` | Settings page (14 sections) |
| `/status` | System status |
| `/quit` | Exit |

### 🧠 AI & Models
| Command | Description |
|---------|-------------|
| `/model <name>` | Switch AI model |
| `/providers` | List 50+ providers |
| `/persona <name>` | Activate persona |
| `/reset` | Reset context |

### 💾 Memory
| Command | Description |
|---------|-------------|
| `/memory` | Memory dashboard |
| `/memory-search <q>` | Search memory |
| `/export` | Export memory |
| `/history` | Chat history |

### 👁️ Screen
| Command | Description |
|---------|-------------|
| `/screen` | Screenshot & analyze |
| `/vision <q>` | Analyze screen |
| `/watch` | Start screen watch |
| `/find-element <desc>` | Find UI element |
| `/click <desc>` | Click element by description |
| `/read-screen` | Read all screen text |

### 🖥️ System
| Command | Description |
|---------|-------------|
| `/run <cmd>` | Shell command |
| `/open <app>` | Open application |
| `/browse <url>` | Open URL |
| `/system` | System info |
| `/processes` | List processes |
| `/active-window` | Current window |
| `/lock` | Lock screen |
| `/sleep` | Sleep/hibernate |
| `/empty-trash` | Empty trash |

### 💻 Code & Deploy
| Command | Description |
|---------|-------------|
| `/code <lang> <code>` | Execute code (37 languages) |
| `/project <name>` | Create project |
| `/deploy <target>` | Deploy project |
| `/code-review <file>` | Review code |
| `/debug <error>` | Debug error |
| `/generate-tests <file>` | Generate tests |

### 🤖 Sub-Agents
| Command | Description |
|---------|-------------|
| `/orchestrate <task>` | Spawn agent team |
| `/spawn <task>` | Spawn single agent |
| `/team <n> <task>` | Spawn team of N agents |
| `/agents` | List running agents |
| `/progress` | Show agent progress |

### 🔍 Web Search
| Command | Description |
|---------|-------------|
| `/web-search <query>` | Quick web search |
| `/deep-search <topic>` | Multi-source deep search |
| `/scrape <url>` | Scrape URL content |

### 🔬 Research
| Command | Description |
|---------|-------------|
| `/analyze <topic>` | Deep analysis |
| `/find-ways <goal>` | Find ways to do something |
| `/research <topic>` | Research technology |
| `/solve <problem>` | Solve problem |
| `/learn-path <topic>` | Learning path |

### 🧬 Self-Improvement
| Command | Description |
|---------|-------------|
| `/evolve` | Trigger evolution |
| `/optimize` | Optimize performance |
| `/rewrite <module>` | Rewrite a module |
| `/add-feature <desc>` | Add feature to self |

### 🧠 Brain
| Command | Description |
|---------|-------------|
| `/brain` | Brain status |
| `/brain-query <q>` | Query knowledge graph |
| `/brain-decay` | Forget unimportant things |
| `/brain-consolidate` | Merge duplicates |

### 🔮 Proactive
| Command | Description |
|---------|-------------|
| `/proactive` | Proactive status |
| `/insights` | Active insights |
| `/add-rule <a> when <c>` | Add automation rule |

### 🧬 Evolution
| Command | Description |
|---------|-------------|
| `/evolution` | Evolution status |
| `/correct <w> → <r>` | Teach correction |
| `/skills` | View crystallized skills |

### 🌐 API Gateway
| Command | Description |
|---------|-------------|
| `/api` | API status |
| `/api-start` | Start API server |
| `/api-stop` | Stop API server |
| `/api-key <key>` | Add API key |
| `/webhook <name> <url>` | Register webhook |
| `/broadcast <event> <data>` | WebSocket broadcast |

### 💻 Code Intelligence
| Command | Description |
|---------|-------------|
| `/code-review <file>` | Review code |
| `/code-explain <file>` | Understand code |
| `/generate-tests <f>` | Generate tests |
| `/debug <error>` | Debug error |
| `/analyze-codebase <d>` | Analyze codebase |

### 🛡️ Trust & Safety
| Command | Description |
|---------|-------------|
| `/trust` | Trust status |
| `/trust-mode <mode>` | Set mode (safe/supervised/full) |
| `/sandbox on\|off` | Toggle sandbox |
| `/rollback <id>` | Undo action |
| `/approvals` | Pending approvals |
| `/trust-log` | Audit trail |

### ⏰ Task Scheduler
| Command | Description |
|---------|-------------|
| `/schedule` | Scheduler status |
| `/schedule-list` | List all jobs |
| `/schedule-daily <name> <HH:MM> <action>` | Daily job |
| `/schedule-run <id>` | Run job now |

### 💾 Backup Manager
| Command | Description |
|---------|-------------|
| `/backup` | Backup status |
| `/backup-create` | Create backup |
| `/backup-create-enc <pw>` | Encrypted backup |
| `/backup-list` | List backups |
| `/backup-restore <name>` | Restore backup |
| `/backup-verify <name>` | Verify integrity |

### 🛒 Plugin Marketplace
| Command | Description |
|---------|-------------|
| `/marketplace` | Marketplace status |
| `/marketplace-browse` | Browse plugins |
| `/marketplace-search <q>` | Search plugins |
| `/marketplace-install <n>` | Install plugin |
| `/marketplace-list` | List installed |
| `/marketplace-updates` | Check updates |

### 📊 Performance Monitor
| Command | Description |
|---------|-------------|
| `/monitor` | Current metrics |
| `/monitor-start` | Start monitoring |
| `/monitor-stop` | Stop monitoring |
| `/monitor-alerts` | Active alerts |

### 🔔 Notification Center
| Command | Description |
|---------|-------------|
| `/notifications` | Notification center |
| `/notifications-recent` | Recent notifications |
| `/notifications-read` | Mark all read |
| `/notifications-clear` | Clear history |
| `/notify <channel> <msg>` | Send notification |

### ⚙️ Config Manager
| Command | Description |
|---------|-------------|
| `/profiles` | Config manager |
| `/profile-save <name>` | Save current config |
| `/profile-load <name>` | Load profile |
| `/profile-apply <tmpl>` | Apply template |
| `/profile-export` | Export config |
| `/profile-import <file>` | Import config |
| `/profile-validate` | Validate config |
| `/profile-reset` | Reset to defaults |

### 📱 Social Media
| Command | Description |
|---------|-------------|
| `/post <platform> <text>` | Create post |
| `/content-plan <topic>` | Content strategy |
| `/sign-up <platform>` | Sign up for platform |

### 🎤 Voice
| Command | Description |
|---------|-------------|
| `/speak <text>` | Text to speech |
| `/listen` | Start listening |

### 🎨 Appearance
| Command | Description |
|---------|-------------|
| `/theme <name>` | Change theme |
| `/clear` | Clear screen |

### 🔧 Universal Toolkit
| Command | Description |
|---------|-------------|
| `/imagine <prompt>` | Generate image (DALL-E 3) |
| `/tts <text>` | Text to speech (OpenAI) |
| `/stt <audio>` | Speech to text (Whisper) |
| `/pdf <content>` | Generate PDF |
| `/convert <f> <fmt>` | Convert file |
| `/chart <type> <data>` | Generate chart |
| `/git <cmd>` | Git operations |
| `/docker <cmd>` | Docker operations |
| `/ssh <host> <cmd>` | SSH command |
| `/http <url>` | HTTP request |
| `/encode/decode <text>` | Encode/decode |
| `/hash <text>` | Hash data |
| `/weather <city>` | Get weather |
| `/crypto` | Crypto prices |

---

## 🤖 AI Providers

OpenDesktop supports **50+ AI providers** through a unified interface:

### Cloud Providers

| Provider | Models | Free Tier |
|----------|--------|-----------|
| **OpenRouter** | Claude, GPT-4o, Gemini, Llama, Mixtral, DeepSeek, Qwen | ✅ $1 free credit |
| **OpenAI** | GPT-4o, GPT-4 Turbo, o1-preview, o1-mini | ❌ Pay per use |
| **Anthropic** | Claude 3.5 Sonnet, Claude 3 Opus | ❌ Pay per use |
| **Google AI** | Gemini Pro, Gemini 1.5 Pro/Flash | ✅ Free tier |
| **Groq** | Llama 3.1, Mixtral, Gemma | ✅ Free tier |
| **DeepSeek** | DeepSeek Chat, Coder, Reasoner | ✅ Free tier |
| **xAI** | Grok 2, Grok 2 Mini | ❌ Pay per use |
| **Mistral AI** | Mistral Large, Mixtral | ❌ Pay per use |
| **Cohere** | Command R+ | ✅ Free tier |
| **Perplexity** | Sonar models | ❌ Pay per use |

### Chinese Providers

| Provider | Models |
|----------|--------|
| **01.AI (Yi)** | Yi Large, Medium, Spark |
| **Moonshot AI** | Moonshot v1 128k/32k/8k |
| **Zhipu AI (GLM)** | GLM-4 Plus, Flash, V |
| **Baidu (ERNIE)** | ERNIE 4.0, 3.5, Speed |
| **Alibaba (Qwen)** | Qwen Max, Plus, Turbo, Long |
| **MiniMax** | Abab 6.5s, 6.5, 5.5 |
| **Baichuan** | Baichuan 4, 3-Turbo |
| **SiliconFlow** | Qwen2, Llama 3.1, DeepSeek |
| **VolcEngine** | Doubao Pro, Lite |

### Local Providers

| Provider | Cost | Privacy |
|----------|------|---------|
| **Ollama** | 100% Free | Full local |
| **LM Studio** | 100% Free | Full local |
| **vLLM** | 100% Free | Full local |
| **TextGen WebUI** | 100% Free | Full local |

### Specialized Providers

| Provider | Purpose |
|----------|---------|
| **ElevenLabs** | TTS (Text-to-Speech) |
| **OpenAI Whisper** | STT (Speech-to-Text) |
| **DALL-E 3** | Image generation |
| **Stability AI** | Image generation |
| **Voyage AI** | Embeddings |
| **Jina AI** | Embeddings & Reranking |

---

## 💬 Messaging Platforms

| Platform | Status | Setup |
|----------|--------|-------|
| 📨 Telegram | ✅ Ready | Bot Token from @BotFather |
| 🎮 Discord | ✅ Ready | Bot Token + discord.js |
| 💚 WhatsApp | ✅ Ready | whatsapp-web.js + QR scan |
| 💼 Slack | ✅ Ready | Bot Token + App Token |
| 🔵 Signal | 📋 Config | signal-cli required |
| 🍎 iMessage | ✅ macOS | AppleScript integration |
| 📡 IRC | ✅ Ready | Server + Channel |
| 🔮 Matrix | ✅ Ready | Homeserver + Access Token |
| 🟢 LINE | 📋 Config | Channel Access Token |
| 💜 Viber | 📋 Config | Auth Token |
| 🟦 MS Teams | 📋 Config | Bot Framework |
| 🟣 Twitch | ✅ Ready | OAuth Token |
| 📧 Email | 📋 Config | IMAP + SMTP |
| 📱 SMS | 📋 Config | Twilio credentials |
| 🟠 Mattermost | ✅ Ready | Server URL + Token |
| 🚀 Rocket.Chat | ✅ Ready | Server URL + Token |
| 🟢 Element | ✅ Ready | Matrix credentials |
| ⚔️ Guilded | 📋 Config | API Token |
| 🏴 Revolt | 📋 Config | API Token |
| 🛡️ Session | 📋 Config | Session desktop app |

---

## 🧠 Memory System

OpenDesktop has **5 types of persistent memory** plus a **Knowledge Graph Brain**:

### Memory Types

| Type | Purpose | Example |
|------|---------|---------|
| 📖 **Episodic** | Chronological events | "User asked about Python at 3:42 PM" |
| 🧠 **Semantic** | Facts & knowledge | "User prefers dark themes" |
| ✅ **Tasks** | Completed actions | "Deployed app to Vercel" |
| 👤 **Profile** | User preferences | "Name: John, Timezone: GMT+8" |
| 💬 **Conversations** | Saved chat sessions | Full conversation history |

### Knowledge Graph Brain

The brain uses a **weighted knowledge graph** with:
- **Nodes**: Facts, entities, concepts, preferences, events
- **Edges**: Relationships (related_to, part_of, caused_by, depends_on, similar_to)
- **Auto-relating**: Automatically connects related knowledge
- **Decay**: Forgets unimportant things over time
- **Consolidation**: Merges duplicate/similar nodes
- **Inverted index**: Fast keyword-based search

---

## 🧬 Self-Evolution

The evolution system gets smarter every interaction:

1. **Performance Journal** — Tracks every interaction with success/failure metrics
2. **Correction Learning** — Learns from user corrections
3. **Skill Crystallization** — Detects repeated patterns and turns them into skills
4. **A/B Testing** — Tests different strategies and picks the winner
5. **Self-Rewriting** — Can modify its own code to improve
6. **Version Tracking** — Tracks improvement score over time

---

## 🔮 Proactive Intelligence

Thinks before you ask:

- **System Health** — Monitors CPU, memory, disk, battery
- **Pattern Detection** — Finds repeated behavior sequences
- **Rule Engine** — Custom automation rules
- **Daily Briefings** — Morning summary of tasks and patterns
- **Automation Opportunities** — Suggests automating repetitive tasks
- **Agent Monitoring** — Watches long-running agents

---

## 👁️ Visual Understanding

Sees like a human:

- **Screen Analysis** — Describes what's on screen
- **Element Detection** — Finds UI elements by description
- **Click by Description** — "Click the login button"
- **Type at Element** — Type into fields by description
- **Screen Diffing** — Compares two screenshots
- **OCR** — Reads text from screen
- **Visual Memory** — Remembers past screenshots

---

## 🏠 IoT Control

Smart home command center:

| Device | Protocol | Commands |
|--------|----------|----------|
| Philips Hue | HTTP | on, off, brightness, color |
| LIFX | HTTP | on, off, brightness, color |
| Tasmota | HTTP | on, off, status |
| Shelly | HTTP | on, off, status |
| Home Assistant | HTTP | on, off, getState, callService |
| Generic MQTT | MQTT | on, off, set |
| Generic HTTP | HTTP | on, off, status, set |

---

## 🔒 Security

Defense in depth:

| Feature | Description |
|---------|-------------|
| AES-256-GCM | Encrypt all credentials and sensitive data |
| Command Blacklist | Block dangerous commands |
| Command Whitelist | Allow only approved commands |
| Rate Limiting | Prevent abuse (100 req/min default) |
| Audit Logging | Every action logged with context |
| Anomaly Detection | Spike detection, unusual hours, rapid-fire |
| Sandbox Mode | Test dangerous operations in isolation |
| Auto-Lock | Locks after 15 min inactivity |
| Permission Tiers | admin, user, viewer, restricted |
| Input Sanitization | SQL injection, XSS, command injection protection |

---

## 🛡️ Trust & Safety

Three trust modes:

| Mode | Description |
|------|-------------|
| 🛡️ **Safe** | Read-only by default, destructive actions blocked |
| 👁️ **Supervised** | Most actions allowed, critical ops need approval |
| ⚡ **Full** | All actions allowed without approval |

Features:
- **Action Preview** — See what will happen before it happens
- **Rollback System** — Undo any action
- **Approval Queue** — Review risky operations
- **Audit Trail** — Complete history of all actions

---

## 🌐 API Gateway

REST API + WebSocket + Webhooks:

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/api/status` | System status |
| POST | `/api/chat` | Send chat message |
| GET | `/api/memory/search` | Search memory |
| GET | `/api/memory/stats` | Memory stats |
| POST | `/api/exec` | Execute command |
| GET | `/api/search` | Web search |
| GET | `/api/iot/devices` | IoT devices |
| POST | `/api/iot/control` | Control IoT device |
| GET | `/api/agents` | List agents |
| POST | `/api/agents/spawn` | Spawn agent |
| GET | `/api/system` | System info |
| GET | `/api/security/report` | Security report |

### Features
- API key authentication
- Rate limiting (100 req/min)
- WebSocket real-time events
- Webhook registration
- CORS support

---

## ⏰ Task Scheduler

Cron-like scheduling within OpenDesktop:

```javascript
// Schedule types
'scheduler.scheduleDaily('Morning Briefing', '09:00', { type: 'chat', value: 'Give me my daily briefing' });
'scheduler.scheduleEvery('Health Check', 300000, { type: 'command', value: 'echo "System OK"' });
'scheduler.scheduleWeekly('Report', 'monday', '10:00', { type: 'chat', value: 'Generate weekly report' });
'scheduler.scheduleCron('Cleanup', '0 2 * * *', { type: 'command', value: 'cleanup.sh' });
```

---

## 💾 Backup Manager

Full system backup with encryption:

```bash
# Create backup
/backup-create

# Encrypted backup
/backup-create-enc mypassword

# Restore
/backup-restore backup_2026-05-05

# Verify integrity
/backup-verify backup_2026-05-05

# Cleanup old backups
/backup-cleanup 5
```

---

## 🛒 Plugin Marketplace

Discover and install plugins:

```bash
# Browse marketplace
/marketplace-browse

# Search for plugins
/marketplace-search web automation

# Install a plugin
/marketplace-install file-organizer

# Check for updates
/marketplace-updates

# List installed
/marketplace-list
```

---

## 📊 Performance Monitor

Real-time system monitoring:

```
📊 Performance Monitor
═══ CPU ═══
  Current: 23%
  Average: 18%
  Model: Intel Core i7-12700K
  Cores: 12

═══ MEMORY ═══
  Used: 8.2 GB / 16.0 GB (51%)

═══ DISK ═══
  Usage: 67%
  Available: 120 GB

═══ NETWORK ═══
  Online: ✅
  Latency: 12ms
```

---

## 🔔 Notification Center

8 channels with priority levels:

| Channel | Icon | Priority |
|---------|------|----------|
| system | 🖥️ | high |
| security | 🔒 | critical |
| agents | 🤖 | medium |
| tasks | 📋 | medium |
| updates | 🔄 | low |
| social | 📱 | low |
| iot | 🏠 | medium |
| errors | ❌ | high |

---

## ⚙️ Config Manager

5 built-in templates:

| Template | Description |
|----------|-------------|
| `developer` | Optimized for software development |
| `creative` | For creative work and content creation |
| `business` | Professional business environment |
| `privacy` | Maximum privacy — local models only |
| `power-user` | Everything enabled — full power |

---

## 🐳 Docker

### Build & Run

```bash
# Build
docker build -t opendesktop .

# Run
docker run -it -p 4444:4444 \
  -e OPENDESKTOP_API_KEY=your-key \
  -e OPENDESKTOP_PROVIDER=openrouter \
  -e OPENDESKTOP_MODEL=anthropic/claude-3.5-sonnet \
  opendesktop
```

### Docker Compose

```bash
# Standard
docker-compose up -d

# With local Ollama
docker-compose --profile with-ollama up -d
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENDESKTOP_PROVIDER` | openrouter | AI provider |
| `OPENDESKTOP_API_KEY` | — | API key |
| `OPENDESKTOP_MODEL` | anthropic/claude-3.5-sonnet | Default model |
| `NODE_ENV` | production | Node environment |

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Results: 119 passed, 0 failed, 119 total ✅
```

### Test Coverage

| Module | Tests |
|--------|-------|
| Config | 2 |
| Providers | 2 |
| Memory | 3 |
| Automation | 2 |
| Vision | 1 |
| Plugins | 1 |
| Messaging | 1 |
| Hotkey | 1 |
| Voice | 1 |
| CodeExecutor | 3 |
| Deployer | 1 |
| Learning | 4 |
| Persona | 2 |
| SelfImprove | 5 |
| SubAgents | 2 |
| SocialMedia | 2 |
| Research | 2 |
| Adaptive | 4 |
| CodeRewriter | 2 |
| Engine | 4 |
| Package | 2 |
| WebSearch | 2 |
| IoT | 2 |
| Security | 5 |
| Installer | 2 |
| Orchestrator | 2 |
| ModelTrainer | 2 |
| Brain | 5 |
| Proactive | 3 |
| OS Integration | 3 |
| Visual Understanding | 2 |
| Evolution | 5 |
| API Gateway | 3 |
| Code Intelligence | 2 |
| Trust & Safety | 5 |
| Toolkit | 5 |
| Scheduler | 4 |
| Backup | 3 |
| Marketplace | 3 |
| Monitor | 3 |
| Notifications | 4 |
| ConfigManager | 4 |
| Structure | 1 |
| SkillCreator | 1 |
| Workflow | 1 |
| Code Execution | 2 |
| **TOTAL** | **119** |

---

## 📁 Project Structure

```
OpenDesktop/
├── bin/opendesktop              # CLI entry point
├── src/
│   ├── adaptive/index.js        # Adaptive interface
│   ├── api-gateway/index.js     # REST API + WebSocket
│   ├── automation/index.js      # Desktop control
│   ├── backup/index.js          # Backup management
│   ├── brain/index.js           # Knowledge graph
│   ├── browser-engine/index.js  # Browser automation
│   ├── cli/
│   │   ├── index.js             # CLI entry
│   │   └── setup.js             # Setup wizard
│   ├── code-executor/index.js   # Code execution
│   ├── code-intelligence/index.js # Code analysis
│   ├── code-rewriter/index.js   # Self-modification
│   ├── config-manager/index.js  # Config profiles
│   ├── core/
│   │   ├── config.js            # Configuration
│   │   └── engine.js            # Core engine
│   ├── deployer/index.js        # Deployment
│   ├── evolution/index.js       # Self-evolution
│   ├── gui/index.js             # Terminal GUI
│   ├── hotkey/index.js          # Global hotkeys
│   ├── index.js                 # Main export
│   ├── iot/index.js             # IoT control
│   ├── learning/index.js        # Pattern learning
│   ├── marketplace/index.js     # Plugin marketplace
│   ├── memory/index.js          # Memory system
│   ├── messaging/index.js       # Messaging hub
│   ├── model-trainer/index.js   # Model training
│   ├── monitor/index.js         # Performance monitor
│   ├── notifications/index.js   # Notification center
│   ├── orchestrator/index.js    # Agent orchestrator
│   ├── os-integration/index.js  # OS integration
│   ├── persona/index.js         # Persona system
│   ├── plugins/index.js         # Plugin system
│   ├── proactive/index.js       # Proactive engine
│   ├── program-installer/index.js # Package installer
│   ├── providers/index.js       # AI providers
│   ├── research/index.js        # Deep research
│   ├── reverse-engineering/     # Binary analysis
│   ├── scheduler/index.js       # Task scheduler
│   ├── security/index.js        # Security module
│   ├── self-improve/index.js    # Self-improvement
│   ├── settings/index.js        # Settings UI
│   ├── skill-creator/index.js   # Skill creation
│   ├── social-media/index.js    # Social media
│   ├── sub-agents/index.js      # Sub-agent spawner
│   ├── trust-safety/index.js    # Trust & safety
│   ├── universal-toolkit/index.js # Universal toolkit
│   ├── vision/index.js          # Screen vision
│   ├── visual-understanding/    # Visual understanding
│   ├── voice/index.js           # Voice system
│   ├── web-search/index.js      # Web search
│   └── workflows/index.js       # Workflow builder
├── tests/test.js                # Test suite
├── Dockerfile                   # Docker support
├── docker-compose.yml           # Docker Compose
├── .dockerignore                # Docker ignore
├── install.sh                   # Installer script
├── package.json                 # Package config
└── README.md                    # This file
```

---

## 🔧 Configuration

Configuration is stored in `~/.opendesktop/config.json`:

```json
{
  "version": "1.0.0",
  "provider": {
    "name": "openrouter",
    "apiKey": "your-api-key",
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
| 🔴 `hacker-red` | Dark, aggressive, terminal-native (default) |
| 🟢 `matrix` | Classic hacker aesthetic |
| 🔵 `cyberpunk` | Neon futuristic |
| ⚪ `minimal` | Clean and professional |
| 🟣 `vaporwave` | Aesthetic retro-future |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

### Development

```bash
# Clone
git clone https://github.com/Atum246/OpenDesktop.git
cd OpenDesktop

# Install dependencies
npm install

# Run tests
npm test

# Start
npm start
```

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🔗 Links

| Resource | URL |
|----------|-----|
| npm | https://www.npmjs.com/package/opendesktop-ai |
| GitHub | https://github.com/Atum246/OpenDesktop |
| Issues | https://github.com/Atum246/OpenDesktop/issues |
| Documentation | https://github.com/Atum246/OpenDesktop#readme |

---

<p align="center">
  <b>Built with ❤️ by OpenDesktop Contributors</b><br>
  <sub>Not a chatbot. An intelligence agent.</sub>
</p>
