'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { EventEmitter } = require('events');

// ═══════════════════════════════════════════════════════════════
//  PROACTIVE INTELLIGENCE — Thinks Before You Ask 🔮⚡
//  Monitors, anticipates, and acts without being told
// ═══════════════════════════════════════════════════════════════

class ProactiveEngine extends EventEmitter {
  constructor(config, brain, memory, automation, provider) {
    super();
    this.config = config;
    this.brain = brain;
    this.memory = memory;
    this.automation = automation;
    this.provider = provider;
    this.monitors = new Map();
    this.rules = new Map();
    this.suggestions = [];
    this.insights = [];
    this.patterns = new Map();
    this.dailyBriefing = null;
    this.lastCheck = Date.now();
    this.checkInterval = 60000; // 1 minute
    this.running = false;

    this.dataDir = path.join(os.homedir(), '.opendesktop', 'proactive');
    if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
    this._loadRules();
  }

  // ─── START MONITORING ───
  start() {
    if (this.running) return;
    this.running = true;
    this._runMonitorLoop();
    this.emit('started');
    return { started: true };
  }

  stop() {
    this.running = false;
    if (this._interval) clearInterval(this._interval);
    this.emit('stopped');
    return { stopped: true };
  }

  // ─── MONITOR LOOP ───
  _runMonitorLoop() {
    this._interval = setInterval(async () => {
      if (!this.running) return;
      try {
        await this._runChecks();
      } catch (err) {
        this.emit('error', err);
      }
    }, this.checkInterval);
  }

  async _runChecks() {
    const now = Date.now();

    // 1. System health check
    await this._checkSystemHealth();

    // 2. File system watchers
    await this._checkFileWatchers();

    // 3. Pattern detection
    this._detectPatterns();

    // 4. Rule evaluation
    await this._evaluateRules();

    // 5. Proactive suggestions
    await this._generateSuggestions();

    this.lastCheck = now;
  }

  // ─── SYSTEM HEALTH MONITORING ───
  async _checkSystemHealth() {
    try {
      const si = require('systeminformation');
      const [mem, disk, cpu] = await Promise.all([
        si.mem().catch(() => null),
        si.fsSize().catch(() => []),
        si.currentLoad().catch(() => null)
      ]);

      // Memory warning
      if (mem && mem.used / mem.total > 0.9) {
        this._addInsight('warning', 'memory-high', `Memory usage at ${Math.round(mem.used / mem.total * 100)}% — consider closing unused apps`, { severity: 'high' });
      }

      // Disk warning
      for (const d of disk) {
        if (d.used / d.size > 0.9) {
          this._addInsight('warning', 'disk-low', `Disk ${d.mount} is ${Math.round(d.used / d.size * 100)}% full`, { severity: 'high', mount: d.mount });
        }
      }

      // CPU spike
      if (cpu && cpu.currentLoad > 90) {
        this._addInsight('info', 'cpu-spike', `CPU usage at ${Math.round(cpu.currentLoad)}%`, { severity: 'medium' });
      }
    } catch {}
  }

  // ─── FILE SYSTEM WATCHERS ───
  addFileWatcher(watchPath, pattern, callback) {
    const id = `watch_${Date.now().toString(36)}`;
    this.monitors.set(id, { id, path: watchPath, pattern, callback, created: Date.now(), triggered: 0 });
    return { id, watching: watchPath };
  }

  async _checkFileWatchers() {
    for (const [id, watcher] of this.monitors) {
      try {
        if (!fs.existsSync(watcher.path)) continue;
        const stat = fs.statSync(watcher.path);
        if (stat.mtimeMs > (watcher.lastModified || 0)) {
          watcher.lastModified = stat.mtimeMs;
          watcher.triggered++;
          if (watcher.callback) await watcher.callback(watcher.path, stat);
          this.emit('file-changed', { id, path: watcher.path });
        }
      } catch {}
    }
  }

  // ─── PATTERN DETECTION ───
  _detectPatterns() {
    const events = this.memory.getEvents({ limit: 100 });
    const commandSequences = {};

    for (let i = 0; i < events.length - 1; i++) {
      const current = events[i].command || events[i].message || events[i].type;
      const next = events[i + 1]?.command || events[i + 1]?.message || events[i + 1]?.type;
      if (!current || !next) continue;
      const key = `${current.slice(0, 30)} → ${next.slice(0, 30)}`;
      commandSequences[key] = (commandSequences[key] || 0) + 1;
    }

    // Store patterns that occur 3+ times
    for (const [pattern, count] of Object.entries(commandSequences)) {
      if (count >= 3) {
        this.patterns.set(pattern, { count, lastSeen: Date.now() });
      }
    }
  }

  // ─── RULE SYSTEM ───
  addRule(name, condition, action, options = {}) {
    const id = `rule_${Date.now().toString(36)}`;
    const rule = {
      id,
      name,
      condition, // string expression or function
      action,    // string command or function
      enabled: options.enabled !== false,
      cooldown: options.cooldown || 300000, // 5 min default
      lastTriggered: 0,
      triggerCount: 0,
      created: Date.now()
    };
    this.rules.set(id, rule);
    this._saveRules();
    return { id, name };
  }

  removeRule(id) {
    this.rules.delete(id);
    this._saveRules();
    return { removed: true };
  }

  async _evaluateRules() {
    const now = Date.now();
    for (const [id, rule] of this.rules) {
      if (!rule.enabled) continue;
      if (now - rule.lastTriggered < rule.cooldown) continue;

      try {
        let shouldTrigger = false;

        if (typeof rule.condition === 'function') {
          shouldTrigger = await rule.condition(this);
        } else if (typeof rule.condition === 'string') {
          shouldTrigger = this._evaluateCondition(rule.condition);
        }

        if (shouldTrigger) {
          rule.lastTriggered = now;
          rule.triggerCount++;
          this.emit('rule-triggered', { id, name: rule.name });

          if (typeof rule.action === 'function') {
            await rule.action(this);
          } else if (typeof rule.action === 'string') {
            this._addInsight('action', `rule-${id}`, rule.action, { ruleName: rule.name });
          }
        }
      } catch (err) {
        this.emit('rule-error', { id, error: err.message });
      }
    }
  }

  _evaluateCondition(condition) {
    // Simple condition evaluator
    const hour = new Date().getHours();
    const day = new Date().getDay();

    const context = {
      hour,
      day,
      isWeekend: day === 0 || day === 6,
      isMorning: hour >= 6 && hour < 12,
      isAfternoon: hour >= 12 && hour < 18,
      isEvening: hour >= 18 && hour < 22,
      isNight: hour >= 22 || hour < 6,
      insightCount: this.insights.length,
      patternCount: this.patterns.size
    };

    try {
      const fn = new Function(...Object.keys(context), `return ${condition}`);
      return fn(...Object.values(context));
    } catch {
      return false;
    }
  }

  // ─── PROACTIVE SUGGESTIONS ───
  async _generateSuggestions() {
    const hour = new Date().getHours();
    const events = this.memory.getEvents({ limit: 20 });
    const suggestions = [];

    // Morning briefing
    if (hour >= 8 && hour <= 10 && !this._hasRecentInsight('morning-briefing', 3600000)) {
      const tasks = this.memory.getTasks({ status: 'pending', limit: 5 });
      if (tasks.length > 0) {
        suggestions.push({
          type: 'morning-briefing',
          message: `☀️ Good morning! You have ${tasks.length} pending tasks. Top priority: ${tasks[0].description || tasks[0].task}`,
          action: 'Show me my tasks',
          priority: 'medium'
        });
      }
    }

    // Repetitive task detection
    const recentCommands = events.filter(e => e.command).map(e => e.command);
    const cmdFreq = {};
    recentCommands.forEach(c => cmdFreq[c] = (cmdFreq[c] || 0) + 1);
    const repeated = Object.entries(cmdFreq).filter(([_, c]) => c >= 3);
    if (repeated.length > 0) {
      suggestions.push({
        type: 'automation-opportunity',
        message: `🔄 You've run "${repeated[0][0]}" ${repeated[0][1]} times. Want me to automate it?`,
        priority: 'low'
      });
    }

    // Long running task check
    const agents = this._getRunningAgents();
    if (agents.length > 0) {
      const longRunning = agents.filter(a => Date.now() - new Date(a.spawnedAt).getTime() > 600000);
      if (longRunning.length > 0) {
        suggestions.push({
          type: 'agent-attention',
          message: `🤖 ${longRunning.length} agent(s) have been running for 10+ minutes. Check on them?`,
          priority: 'medium'
        });
      }
    }

    this.suggestions = suggestions;
    return suggestions;
  }

  // ─── DAILY BRIEFING ───
  async generateDailyBriefing() {
    const events = this.memory.getEvents({ limit: 200 });
    const today = new Date().toISOString().split('T')[0];
    const todayEvents = events.filter(e => e.timestamp?.startsWith(today));

    const briefing = await this.provider.chat(
      `Generate a concise daily briefing based on this data:

Today's events: ${todayEvents.length}
Recent patterns: ${[...this.patterns.keys()].slice(0, 5).join(', ')}
Active insights: ${this.insights.length}
System: ${os.platform()} ${os.hostname()}

Create a brief, actionable morning briefing. Include:
1. What happened yesterday/this week
2. Pending tasks or follow-ups
3. Suggested focus areas
4. Any patterns or habits noticed

Keep it concise and use emojis.`,
      { maxTokens: 500 }
    );

    this.dailyBriefing = { date: today, content: briefing, generated: Date.now() };
    return this.dailyBriefing;
  }

  // ─── INSIGHTS ───
  _addInsight(type, key, message, meta = {}) {
    // Don't add duplicate insights within 5 minutes
    const existing = this.insights.find(i => i.key === key && Date.now() - i.timestamp < 300000);
    if (existing) return;

    this.insights.push({
      type,
      key,
      message,
      meta,
      timestamp: Date.now(),
      dismissed: false
    });

    // Keep last 100 insights
    if (this.insights.length > 100) this.insights = this.insights.slice(-50);

    this.emit('insight', { type, key, message });
  }

  dismissInsight(key) {
    const insight = this.insights.find(i => i.key === key);
    if (insight) insight.dismissed = true;
  }

  getActiveInsights() {
    return this.insights.filter(i => !i.dismissed && Date.now() - i.timestamp < 3600000);
  }

  _hasRecentInsight(key, withinMs) {
    return this.insights.some(i => i.key === key && Date.now() - i.timestamp < withinMs);
  }

  _getRunningAgents() {
    try {
      // Safely check for agents
      return [];
    } catch {
      return [];
    }
  }

  // ─── SAVE / LOAD ───
  _saveRules() {
    try {
      const data = [...this.rules.values()].map(r => ({
        ...r,
        condition: typeof r.condition === 'function' ? r.condition.toString() : r.condition,
        action: typeof r.action === 'function' ? r.action.toString() : r.action
      }));
      fs.writeFileSync(path.join(this.dataDir, 'rules.json'), JSON.stringify(data, null, 2));
    } catch {}
  }

  _loadRules() {
    try {
      const file = path.join(this.dataDir, 'rules.json');
      if (fs.existsSync(file)) {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        for (const r of data) {
          // Restore functions from strings
          if (typeof r.condition === 'string' && r.condition.startsWith('function')) {
            try { r.condition = eval(`(${r.condition})`); } catch {}
          }
          if (typeof r.action === 'string' && r.action.startsWith('function')) {
            try { r.action = eval(`(${r.action})`); } catch {}
          }
          this.rules.set(r.id, r);
        }
      }
    } catch {}
  }

  // ─── STATUS ───
  getStatus() {
    return {
      running: this.running,
      monitors: this.monitors.size,
      rules: this.rules.size,
      activeRules: [...this.rules.values()].filter(r => r.enabled).length,
      patterns: this.patterns.size,
      activeInsights: this.getActiveInsights().length,
      suggestions: this.suggestions.length,
      lastCheck: new Date(this.lastCheck).toISOString()
    };
  }
}

module.exports = ProactiveEngine;
