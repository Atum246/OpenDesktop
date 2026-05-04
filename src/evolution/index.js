'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { EventEmitter } = require('events');

// ═══════════════════════════════════════════════════════════════
//  SELF-EVOLUTION SYSTEM — Gets Smarter Every Day 🧬🔄
//  Performance journal, correction learning, skill crystallization, A/B testing
// ═══════════════════════════════════════════════════════════════

class EvolutionEngine extends EventEmitter {
  constructor(config, brain, memory, provider) {
    super();
    this.config = config;
    this.brain = brain;
    this.memory = memory;
    this.provider = provider;
    this.dataDir = path.join(os.homedir(), '.opendesktop', 'evolution');
    if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });

    this.performanceJournal = [];
    this.corrections = [];
    this.skills = new Map();
    this.experiments = new Map();
    this.evolutionLog = [];
    this.version = { major: 1, minor: 0, patch: 0 };
    this.improvementScore = 0;

    this._loadState();
  }

  // ═══ PERFORMANCE JOURNAL ═══

  logInteraction(entry) {
    const record = {
      id: `perf_${Date.now().toString(36)}`,
      type: entry.type, // 'chat', 'command', 'task', 'error'
      input: entry.input?.slice(0, 500),
      output: entry.output?.slice(0, 500),
      success: entry.success !== false,
      duration: entry.duration || 0,
      tokens: entry.tokens || 0,
      model: entry.model || 'unknown',
      userSatisfaction: entry.satisfaction || null, // 1-5 if provided
      timestamp: Date.now()
    };

    this.performanceJournal.push(record);
    if (this.performanceJournal.length > 5000) {
      this.performanceJournal = this.performanceJournal.slice(-2500);
    }

    // Auto-detect failures
    if (!record.success) {
      this._logEvolution('failure-detected', { input: record.input, type: record.type });
    }

    this._saveState();
    return record.id;
  }

  getPerformanceReport(timeRange = '24h') {
    const now = Date.now();
    const ranges = { '1h': 3600000, '24h': 86400000, '7d': 604800000, '30d': 2592000000 };
    const since = now - (ranges[timeRange] || ranges['24h']);

    const relevant = this.performanceJournal.filter(p => p.timestamp > since);
    if (!relevant.length) return { timeRange, total: 0 };

    const successful = relevant.filter(r => r.success);
    const failed = relevant.filter(r => !r.success);
    const durations = relevant.map(r => r.duration).filter(d => d > 0);

    return {
      timeRange,
      total: relevant.length,
      successful: successful.length,
      failed: failed.length,
      successRate: Math.round(successful.length / relevant.length * 100),
      avgDuration: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
      totalTokens: relevant.reduce((s, r) => s + r.tokens, 0),
      avgSatisfaction: this._avg(relevant.filter(r => r.userSatisfaction).map(r => r.userSatisfaction)),
      topModels: this._topCounts(relevant.map(r => r.model)),
      errorTypes: this._topCounts(failed.map(r => r.type))
    };
  }

  // ═══ CORRECTION LEARNING ═══

  learnCorrection(original, corrected, context = '') {
    const correction = {
      id: `corr_${Date.now().toString(36)}`,
      original: original.slice(0, 500),
      corrected: corrected.slice(0, 500),
      context: context.slice(0, 200),
      timestamp: Date.now(),
      applied: 0
    };

    this.corrections.push(correction);
    if (this.corrections.length > 1000) this.corrections = this.corrections.slice(-500);

    // Also store in brain
    if (this.brain) {
      this.brain.addNode('fact', `Correction: When I said "${original.slice(0, 100)}", the correct answer was "${corrected.slice(0, 100)}"`, {
        tags: ['correction', 'learning'],
        weight: 0.9
      });
    }

    this._logEvolution('correction-learned', { original: original.slice(0, 100), corrected: corrected.slice(0, 100) });
    this._saveState();
    return correction;
  }

  getRelevantCorrections(context, limit = 5) {
    const contextTokens = context.toLowerCase().split(/\s+/);
    const scored = this.corrections.map(c => {
      const corrTokens = (c.context + ' ' + c.original).toLowerCase().split(/\s+/);
      const overlap = contextTokens.filter(t => corrTokens.includes(t)).length;
      return { ...c, relevance: overlap };
    });

    return scored
      .filter(c => c.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit);
  }

  // ═══ SKILL CRYSTALLIZATION ═══

  crystallizeSkill(name, pattern, options = {}) {
    const skill = {
      name,
      pattern, // The repeated pattern that became a skill
      command: options.command || null,
      frequency: options.frequency || 1,
      successRate: options.successRate || 100,
      avgDuration: options.avgDuration || 0,
      created: Date.now(),
      lastUsed: Date.now(),
      usageCount: 0,
      improvements: []
    };

    this.skills.set(name, skill);
    this._logEvolution('skill-crystallized', { name, pattern: pattern.slice(0, 100) });
    this._saveState();
    return skill;
  }

  useSkill(name) {
    const skill = this.skills.get(name);
    if (skill) {
      skill.usageCount++;
      skill.lastUsed = Date.now();
      this._saveState();
    }
    return skill;
  }

  detectSkillCandidates() {
    // Find repeated successful patterns in journal
    const commandFreq = {};
    const successRates = {};

    for (const entry of this.performanceJournal) {
      if (!entry.input) continue;
      const cmd = entry.input.slice(0, 50);
      commandFreq[cmd] = (commandFreq[cmd] || 0) + 1;
      if (!successRates[cmd]) successRates[cmd] = { success: 0, total: 0 };
      successRates[cmd].total++;
      if (entry.success) successRates[cmd].success++;
    }

    const candidates = [];
    for (const [cmd, freq] of Object.entries(commandFreq)) {
      if (freq >= 5) {
        const rate = successRates[cmd];
        const successPercent = Math.round(rate.success / rate.total * 100);
        if (successPercent >= 80) {
          candidates.push({
            pattern: cmd,
            frequency: freq,
            successRate: successPercent,
            suggestion: `Consider crystallizing "${cmd}" as a skill`
          });
        }
      }
    }

    return candidates.sort((a, b) => b.frequency - a.frequency);
  }

  // ═══ A/B TESTING ═══

  createExperiment(name, strategyA, strategyB, options = {}) {
    const experiment = {
      id: `exp_${Date.now().toString(36)}`,
      name,
      strategyA: { name: strategyA.name, description: strategyA.description, results: [], avgScore: 0 },
      strategyB: { name: strategyB.name, description: strategyB.description, results: [], avgScore: 0 },
      status: 'running',
      minSamples: options.minSamples || 10,
      created: Date.now(),
      completedAt: null,
      winner: null
    };

    this.experiments.set(experiment.id, experiment);
    this._saveState();
    return experiment;
  }

  logExperimentResult(experimentId, strategy, score, details = {}) {
    const exp = this.experiments.get(experimentId);
    if (!exp || exp.status !== 'running') return null;

    const target = strategy === 'A' ? exp.strategyA : exp.strategyB;
    target.results.push({ score, details, timestamp: Date.now() });
    target.avgScore = target.results.reduce((s, r) => s + r.score, 0) / target.results.length;

    // Check if we have enough data
    if (exp.strategyA.results.length >= exp.minSamples && exp.strategyB.results.length >= exp.minSamples) {
      exp.status = 'completed';
      exp.completedAt = Date.now();
      exp.winner = exp.strategyA.avgScore > exp.strategyB.avgScore ? 'A' : 'B';
      this._logEvolution('experiment-completed', {
        name: exp.name,
        winner: exp.winner,
        scoreA: exp.strategyA.avgScore.toFixed(2),
        scoreB: exp.strategyB.avgScore.toFixed(2)
      });
    }

    this._saveState();
    return exp;
  }

  // ═══ CODE GENERATION FOR NEW TOOLS ═══

  async generateTool(description, requirements = []) {
    const toolCode = await this.provider.chat(
      `Create a Node.js module for OpenDesktop that does: ${description}

Requirements:
${requirements.map(r => `- ${r}`).join('\n')}

The module should:
1. Be a class with a constructor(config)
2. Export the class via module.exports
3. Include error handling
4. Include JSDoc comments
5. Be production-ready

Return ONLY the JavaScript code, no explanations.`,
      { maxTokens: 4000 }
    );

    const codeMatch = toolCode.match(/```(?:javascript)?\n([\s\S]*?)```/) || [null, toolCode];
    const code = codeMatch[1].trim();

    // Save the generated tool
    const toolName = description.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
    const toolPath = path.join(this.dataDir, 'generated-tools', `${toolName}.js`);
    const toolDir = path.dirname(toolPath);
    if (!fs.existsSync(toolDir)) fs.mkdirSync(toolDir, { recursive: true });
    fs.writeFileSync(toolPath, code);

    this._logEvolution('tool-generated', { name: toolName, description: description.slice(0, 100) });
    return { name: toolName, path: toolPath, code };
  }

  // ═══ EVOLUTION CYCLE ═══

  async evolve() {
    const findings = [];

    // 1. Analyze performance trends
    const report = this.getPerformanceReport('7d');
    if (report.successRate < 80) {
      findings.push({ type: 'performance', message: `Success rate at ${report.successRate}% — needs improvement`, severity: 'high' });
    }

    // 2. Find skill candidates
    const candidates = this.detectSkillCandidates();
    if (candidates.length > 0) {
      findings.push({ type: 'skills', message: `${candidates.length} patterns could become skills`, candidates: candidates.slice(0, 3) });
    }

    // 3. Review corrections
    const recentCorrections = this.corrections.filter(c => Date.now() - c.timestamp < 604800000);
    if (recentCorrections.length > 5) {
      findings.push({ type: 'corrections', message: `${recentCorrections.length} corrections this week — learning active` });
    }

    // 4. Generate improvement suggestions
    const suggestions = await this._generateImprovementSuggestions(report, candidates, recentCorrections);

    // 5. Auto-crystallize high-confidence skills
    for (const candidate of candidates.filter(c => c.frequency >= 10 && c.successRate >= 95)) {
      if (!this.skills.has(candidate.pattern)) {
        this.crystallizeSkill(candidate.pattern, candidate.pattern, {
          frequency: candidate.frequency,
          successRate: candidate.successRate
        });
        findings.push({ type: 'auto-skill', message: `Auto-crystallized skill: "${candidate.pattern}"` });
      }
    }

    // Bump version
    this.version.patch++;
    this.improvementScore = Math.min(100, this.improvementScore + findings.length * 2);

    this._logEvolution('evolution-cycle', { findings: findings.length, version: this.versionStr });
    this._saveState();

    return {
      evolved: true,
      version: this.versionStr,
      findings,
      suggestions,
      improvementScore: this.improvementScore,
      stats: {
        totalInteractions: this.performanceJournal.length,
        corrections: this.corrections.length,
        skills: this.skills.size,
        experiments: this.experiments.size
      }
    };
  }

  _generateImprovementSuggestions(report, candidates, corrections) {
    const suggestions = [];

    if (report.avgDuration > 5000) {
      suggestions.push({ area: 'speed', suggestion: 'Response times are high — consider caching or shorter prompts', impact: 'high' });
    }

    if (candidates.length > 3) {
      suggestions.push({ area: 'automation', suggestion: 'Multiple patterns detected — create workflows for repeated tasks', impact: 'medium' });
    }

    const errorTypes = report.errorTypes || [];
    if (errorTypes.length > 0) {
      suggestions.push({ area: 'reliability', suggestion: `Focus on fixing: ${errorTypes[0]?.[0] || 'common errors'}`, impact: 'high' });
    }

    return suggestions;
  }

  // ═══ HELPERS ═══

  _logEvolution(type, data) {
    this.evolutionLog.push({ type, data, timestamp: Date.now() });
    if (this.evolutionLog.length > 500) this.evolutionLog = this.evolutionLog.slice(-250);
  }

  _avg(arr) {
    if (!arr.length) return 0;
    return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 100) / 100;
  }

  _topCounts(arr) {
    const counts = {};
    arr.forEach(v => counts[v] = (counts[v] || 0) + 1);
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }

  get versionStr() {
    return `${this.version.major}.${this.version.minor}.${this.version.patch}`;
  }

  _saveState() {
    try {
      fs.writeFileSync(path.join(this.dataDir, 'state.json'), JSON.stringify({
        performanceJournal: this.performanceJournal.slice(-1000),
        corrections: this.corrections.slice(-500),
        skills: [...this.skills.entries()],
        experiments: [...this.experiments.entries()],
        evolutionLog: this.evolutionLog.slice(-100),
        version: this.version,
        improvementScore: this.improvementScore
      }, null, 2));
    } catch {}
  }

  _loadState() {
    try {
      const file = path.join(this.dataDir, 'state.json');
      if (fs.existsSync(file)) {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        this.performanceJournal = data.performanceJournal || [];
        this.corrections = data.corrections || [];
        this.skills = new Map(data.skills || []);
        this.experiments = new Map(data.experiments || []);
        this.evolutionLog = data.evolutionLog || [];
        this.version = data.version || this.version;
        this.improvementScore = data.improvementScore || 0;
      }
    } catch {}
  }

  // ═══ STATUS ═══
  getStatus() {
    return {
      version: this.versionStr,
      improvementScore: this.improvementScore,
      totalInteractions: this.performanceJournal.length,
      corrections: this.corrections.length,
      skills: this.skills.size,
      experiments: this.experiments.size,
      runningExperiments: [...this.experiments.values()].filter(e => e.status === 'running').length,
      evolutionCycles: this.evolutionLog.filter(e => e.type === 'evolution-cycle').length
    };
  }
}

module.exports = EvolutionEngine;
