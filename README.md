# ⚡ OpenDesktop — AI Desktop Agent That Controls Your Computer

> **Not a dumb chatbot.** OpenDesktop is a self-improving, self-rewriting intelligence agent that takes control of your computer, researches the internet, spawns AI armies, trains custom models, controls IoT devices, and gets smarter every single interaction.

[![npm version](https://img.shields.io/npm/v/opendesktop-ai.svg)](https://www.npmjs.com/package/opendesktop-ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-red.svg)](https://opensource.org/licenses/MIT)

---

## 🧠 What Makes This Different

| Feature | ChatGPT/Claude | OpenDesktop |
|---------|---------------|-------------|
| Control your computer | ❌ | ✅ Mouse, keyboard, windows |
| Browse the web | Limited | ✅ Real web search, scraping |
| Execute code | Sandbox only | ✅ 35+ languages, real execution |
| Persistent memory | ❌ | ✅ Never forgets anything |
| Self-improving | ❌ | ✅ Rewrites its own code |
| Spawn AI agents | ❌ | ✅ Hundreds of specialized agents |
| IoT control | ❌ | ✅ Smart lights, plugs, thermostats |
| Custom model training | ❌ | ✅ Train & deploy your own AI |
| Install programs | ❌ | ✅ Any package manager |
| Voice control | ❌ | ✅ TTS, STT, wake word |
| Deploy projects | ❌ | ✅ 18 cloud targets |
| Messaging bots | ❌ | ✅ Telegram, Discord, WhatsApp |

---

## 🚀 Quick Start

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

### One-line Install

```bash
curl -fsSL https://raw.githubusercontent.com/Atum246/OpenDesktop/main/install.sh | bash
```

---

## 🏗️ Architecture — 30 Modules

```
OpenDesktop/
├── bin/opendesktop              # CLI entry point
├── src/
│   ├── core/
│   │   ├── engine.js            # 🧠 Core engine — integrates ALL 28 subsystems
│   │   └── config.js            # ⚙️ Configuration manager
│   ├── providers/index.js       # 🤖 19 AI providers, 100+ models
│   ├── web-search/index.js      # 🔍 Real web search — DuckDuckGo, Wikipedia, GitHub, StackOverflow, npm
│   ├── memory/index.js          # 🧠 5 memory types: episodic, semantic, tasks, profile, conversations
│   ├── automation/index.js      # 🖥️ Desktop control — mouse, keyboard, windows, files
│   ├── vision/index.js          # 👁️ Screen vision, OCR, UI analysis
│   ├── orchestrator/index.js    # 🤖 Agent orchestrator — hive mind coordination
│   ├── sub-agents/index.js      # 🤖 Sub-agent spawner with worker threads
│   ├── security/index.js        # 🔒 AES-256 encryption, audit logging, sandboxing
│   ├── iot/index.js             # 🏠 IoT control — Hue, Tasmota, LIFX, Home Assistant, MQTT
│   ├── model-trainer/index.js   # 🧠 Custom AI model training, fine-tuning, deployment
│   ├── code-executor/index.js   # 💻 35+ programming languages
│   ├── code-rewriter/index.js   # 🧬 Self-modifying code engine
│   ├── self-improve/index.js    # 🧬 Self-improvement, performance tracking, evolution
│   ├── research/index.js        # 🔍 Deep research, analysis, problem solving
│   ├── learning/index.js        # 📈 Pattern detection, correction learning
│   ├── deployer/index.js        # 🚀 18 deployment targets
│   ├── program-installer/index.js # 📦 Smart installer for any platform
│   ├── skill-creator/index.js   # 🧩 Create tools from natural language
│   ├── workflows/index.js       # 📋 Workflow automation with conditions
│   ├── persona/index.js         # 🎭 6 personality presets + custom
│   ├── voice/index.js           # 🎤 TTS + STT + wake word
│   ├── messaging/index.js       # 💬 Telegram, Discord, WhatsApp, Slack
│   ├── social-media/index.js    # 📱 Content creation for 8 platforms
│   ├── hotkey/index.js          # ⌨️ Global hotkey summon
│   ├── plugins/index.js         # 🧩 Plugin system with 15 built-in skills
│   ├── adaptive/index.js        # 🎨 Adaptive interface
│   ├── gui/index.js             # 🖥️ Rich terminal GUI
│   ├── cli/setup.js             # 🔧 Setup wizard
│   └── settings/index.js        # ⚙️ 14-section settings UI
├── tests/test.js                # ✅ 65 tests, all passing
├── install.sh                   # 📦 Cross-platform installer
└── package.json
```

---

## 🔍 Web Search — No API Keys Needed

```bash
/search what is quantum computing
/deep-search machine learning best practices 2025
/scrape https://example.com
```

Searches DuckDuckGo, Wikipedia, GitHub, StackOverflow, and npm simultaneously.

---

## 🤖 Agent Orchestrator — Hive Mind

```bash
/orchestrate Build a full-stack web app with authentication, database, and deploy to Vercel
```

Decomposes complex tasks into subtasks, spawns specialized agents (researcher, coder, tester, deployer), coordinates them with shared memory, and aggregates results.

**Agent Specializations:**
- 🔍 **Researcher** — Finds information, analyzes sources
- 💻 **Coder** — Writes clean, tested code
- 🧪 **Tester** — Finds bugs, writes tests
- 🚀 **Deployer** — Ships to production
- 📊 **Analyst** — Finds patterns, extracts insights
- 🎨 **Designer** — Creates beautiful interfaces
- 🔒 **Security** — Audits and hardens
- ⚡ **Optimizer** — Makes things faster

---

## 🏠 IoT Control

```bash
/iot-discover              # Scan network for smart devices
/iot                       # List all devices
/iot-control light_1 on    # Turn on a light
/iot-control light_1 brightness 50
```

**Supported:** Philips Hue, Tasmota/Sonoff, LIFX, Home Assistant, generic HTTP devices, MQTT

---

## 🔒 Ultra Security

```bash
/security                  # View security report
/encrypt "my secret"       # AES-256-GCM encryption
/audit                     # View audit log
```

- AES-256-GCM encryption for all credentials
- Command whitelist/blacklist
- Rate limiting
- Audit logging of every action
- Anomaly detection
- Sandbox mode for untrusted operations

---

## 🧠 Custom AI Model Training

```bash
/train coding assistant           # Generate training data from your interactions
/fine-tune my-model training.json # Fine-tune via Ollama
/compare-models gpt-4o claude-3   # Benchmark models
/model-hosting                     # Get free cloud hosting suggestions
```

**Free Hosting Options:** Ollama (local), Google Colab, HuggingFace Spaces, Railway, Fly.io, Modal

---

## 📦 Smart Program Installer

```bash
/install docker           # Install on any platform
/install typescript       # Auto-detects npm
/uninstall docker
/programs                 # List installed
/pkg-manager              # Show detected package managers
```

Auto-detects: apt, dnf, brew, winget, pacman, snap, flatpak, npm, pip, cargo

---

## 🔧 Self-Improvement Engine

```bash
/evolve                   # Trigger self-evolution
/rewrite memory "make it faster"
/add-feature orchestrator "add retry logic"
/optimize                 # Cost optimization suggestions
```

The AI analyzes its own code, detects bottlenecks, suggests improvements, and can rewrite its own modules with automatic backups.

---

## 🎭 Persona System

```bash
/persona hacker           # Activate hacker persona
/persona professional     # Business mode
/persona creative         # Artistic mode
/persona teacher          # Educational mode
```

6 presets + fully custom personas with traits, tone, expertise, and personality settings.

---

## 📋 All Commands

### Core
| Command | Description |
|---------|-------------|
| `/help` | Show all commands |
| `/settings` | Settings page (14 sections) |
| `/status` | System status |
| `/quit` | Exit |

### AI & Models
| Command | Description |
|---------|-------------|
| `/model <name>` | Switch AI model |
| `/providers` | List 19 providers |
| `/persona <name>` | Activate persona |
| `/reset` | Reset context |

### Intelligence
| Command | Description |
|---------|-------------|
| `/search <query>` | Web search (DuckDuckGo, Wikipedia, etc.) |
| `/deep-search <topic>` | Multi-source deep search |
| `/scrape <url>` | Scrape and extract web content |
| `/analyze <topic>` | Deep analysis |
| `/find-ways <goal>` | Find ways to accomplish anything |
| `/research <topic>` | Research technology |
| `/solve <problem>` | Problem solving |

### Agents
| Command | Description |
|---------|-------------|
| `/orchestrate <task>` | Spawn agent team for complex tasks |
| `/spawn <task>` | Spawn single AI agent |
| `/team <n> <task>` | Spawn team of N agents |
| `/agents` | List running agents |
| `/progress` | Show agent progress |

### System Control
| Command | Description |
|---------|-------------|
| `/run <cmd>` | Shell command |
| `/open <app>` | Open application |
| `/browse <url>` | Open URL |
| `/system` | System info |
| `/processes` | List processes |
| `/install <program>` | Install program |
| `/programs` | List installed programs |

### Code & Deploy
| Command | Description |
|---------|-------------|
| `/code <lang> <code>` | Execute code (35+ languages) |
| `/project <name>` | Create project |
| `/deploy <target>` | Deploy project |

### Memory
| Command | Description |
|---------|-------------|
| `/memory` | Memory dashboard |
| `/search <query>` | Search memory |
| `/export` | Export memory |

### Security
| Command | Description |
|---------|-------------|
| `/security` | Security report |
| `/encrypt <text>` | AES-256 encrypt |
| `/audit` | View audit log |

### IoT
| Command | Description |
|---------|-------------|
| `/iot` | List devices |
| `/iot-discover` | Scan for devices |
| `/iot-control <id> <action>` | Control device |

### AI Training
| Command | Description |
|---------|-------------|
| `/train <task>` | Generate training data |
| `/fine-tune <model> <file>` | Fine-tune model |
| `/compare-models <m1> <m2>` | Benchmark models |
| `/model-hosting` | Cloud hosting suggestions |

### Self-Improvement
| Command | Description |
|---------|-------------|
| `/evolve` | Trigger evolution |
| `/rewrite <module> <desc>` | Rewrite a module |
| `/add-feature <mod> <desc>` | Add feature |
| `/optimize` | Cost optimization |

### Voice & Appearance
| Command | Description |
|---------|-------------|
| `/speak <text>` | Text to speech |
| `/listen` | Start voice listening |
| `/theme <name>` | Change theme |

---

## 🎨 Themes

- 🔴 **Hacker Red** (default) — Dark, aggressive, terminal-native
- 🟢 **Matrix Green** — Classic hacker aesthetic
- 🔵 **Cyberpunk Blue** — Neon futuristic
- ⚪ **Minimal Light** — Clean and professional
- 🟣 **Vaporwave** — Aesthetic retro-future

---

## 🤖 Supported AI Providers (19)

| Provider | Models |
|----------|--------|
| OpenRouter | Claude, GPT-4o, Gemini, Llama, Mixtral, DeepSeek |
| OpenAI | GPT-4o, GPT-4 Turbo, o1 |
| Anthropic | Claude 3.5 Sonnet, Claude 3 Opus |
| Google AI | Gemini Pro, Gemini 1.5 |
| Groq | Llama 3.1, Mixtral, Gemma |
| Nvidia NIM | Llama 3.1 405B, Nemotron |
| Together AI | Llama 405B, Mixtral, Qwen |
| Fireworks AI | Llama, Mixtral |
| Mistral AI | Mistral Large, Mixtral |
| Cohere | Command R+ |
| Perplexity | Sonar models |
| DeepSeek | DeepSeek Chat, Coder |
| xAI | Grok 2 |
| Cerebras | Llama 3.1 |
| SambaNova | Llama 405B |
| Ollama | Local models (Llama, Mistral, etc.) |
| LM Studio | Local models |
| vLLM | Local models |
| TextGen WebUI | Local models |

---

## 📊 System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| Node.js | v18.0.0 | v20+ (LTS) |
| npm | v8.0.0 | v10+ |
| OS | Linux, macOS 12+, Windows 10+ | Latest |
| RAM | 4GB | 8GB+ |
| Network | Internet connection | Broadband |

---

## 🧪 Tests

```bash
npm test
# Results: 65 passed, 0 failed, 65 total ✅
```

---

## 📄 License

MIT License — see [LICENSE](LICENSE)

---

## 🔗 Links

- **npm:** https://www.npmjs.com/package/opendesktop-ai
- **GitHub:** https://github.com/Atum246/OpenDesktop
- **Issues:** https://github.com/Atum246/OpenDesktop/issues

---

**Built with ❤️ by OpenDesktop Contributors**
