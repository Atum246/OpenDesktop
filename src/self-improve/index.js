'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

// ═══════════════════════════════════════════════════════════════
//  SELF-IMPROVEMENT ENGINE — Rewrites Its Own Code 🧬🔄
// ═══════════════════════════════════════════════════════════════

class SelfImprovementEngine {
  constructor(config, memory, provider) {
    this.config = config;
    this.memory = memory;
    this.provider = provider;
    this.srcDir = path.join(__dirname, '..');
    this.logFile = path.join(os.homedir(), '.opendesktop', 'self-improve-log.json');
    this.performanceLog = [];
    this.improvementHistory = this._loadLog();
    this.benchmarks = { responseTime: [], accuracy: [], taskSuccess: [] };
    this.version = 1;
  }

  _loadLog() {
    try { return fs.existsSync(this.logFile) ? JSON.parse(fs.readFileSync(this.logFile, 'utf8')) : []; }
    catch { return []; }
  }

  _saveLog() { fs.writeFileSync(this.logFile, JSON.stringify(this.improvementHistory, null, 2)); }

  // ─── PERFORMANCE TRACKING ───
  trackPerformance(metric, value) {
    if (!this.benchmarks[metric]) this.benchmarks[metric] = [];
    this.benchmarks[metric].push({ value, timestamp: Date.now() });
    if (this.benchmarks[metric].length > 1000) this.benchmarks[metric] = this.benchmarks[metric].slice(-500);
  }

  getPerformanceReport() {
    const report = {};
    for (const [metric, data] of Object.entries(this.benchmarks)) {
      if (!data.length) continue;
      const values = data.map(d => d.value);
      report[metric] = {
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        trend: values.length > 10 ? (values.slice(-5).reduce((a, b) => a + b, 0) / 5) - (values.slice(0, 5).reduce((a, b) => a + b, 0) / 5) : 0,
        count: values.length
      };
    }
    return report;
  }

  // ─── CODE ANALYSIS ───
  async analyzeOwnCode() {
    const files = this._getSourceFiles();
    const analysis = { files: 0, totalLines: 0, modules: [], complexity: 0, suggestions: [], errors: [] };

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        analysis.files++;
        analysis.totalLines += lines.length;

        const moduleName = path.relative(this.srcDir, file).split(path.sep)[0];
        if (!analysis.modules.includes(moduleName)) analysis.modules.push(moduleName);

        // Detect complexity patterns
        const functions = (content.match(/(?:async\s+)?(?:function|\w+\s*=\s*(?:async\s*)?\(|(?:async\s*)?\w+\s*\()/g) || []).length;
        const conditions = (content.match(/if\s*\(|else\s+if|switch\s*\(|case\s+/g) || []).length;
        const loops = (content.match(/for\s*\(|while\s*\(|\.forEach|\.map\(|\.filter\(/g) || []).length;
        analysis.complexity += functions + conditions * 2 + loops * 1.5;

        // Detect potential improvements
        if (content.includes('TODO') || content.includes('FIXME') || content.includes('HACK')) {
          analysis.suggestions.push({ file, type: 'todo', message: 'Contains TODO/FIXME markers' });
        }
        if (lines.length > 300) {
          analysis.suggestions.push({ file, type: 'refactor', message: `Large file (${lines.length} lines) — consider splitting` });
        }
        if (content.match(/catch\s*\(\s*\w+\s*\)\s*\{[\s\n]*\}/)) {
          analysis.suggestions.push({ file, type: 'error-handling', message: 'Empty catch blocks detected' });
        }
        // Detect console.log in production code (not tests)
        if (!file.includes('test') && (content.match(/console\.log\(/g) || []).length > 5) {
          analysis.suggestions.push({ file, type: 'logging', message: 'Excessive console.log — consider using a logger' });
        }
      } catch (err) {
        analysis.errors.push({ file, error: err.message });
      }
    }
    return analysis;
  }

  // ─── SELF-REWRITE ───
  async rewriteModule(moduleName, improvements) {
    const modulePath = path.join(this.srcDir, moduleName, 'index.js');
    if (!fs.existsSync(modulePath)) return { error: `Module ${moduleName} not found` };

    const original = fs.readFileSync(modulePath, 'utf8');
    const backup = path.join(os.homedir(), '.opendesktop', 'backups', `${moduleName}_v${this.version}.js`);
    const backupDir = path.dirname(backup);
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    fs.writeFileSync(backup, original);

    try {
      const improved = await this.provider.chat(
        `You are improving the OpenDesktop module "${moduleName}". Here is the current code:\n\n\`\`\`javascript\n${original}\n\`\`\`\n\nImprovements requested:\n${improvements}\n\nReturn ONLY the improved JavaScript code, no explanations. Keep the same module.exports structure. Make it better, faster, more capable.`,
        { maxTokens: 8000 }
      );

      const codeMatch = improved.match(/```(?:javascript)?\n([\s\S]*?)```/) || [null, improved];
      const newCode = codeMatch[1].trim();

      if (newCode.length < 100) return { error: 'Generated code too short, aborting' };

      fs.writeFileSync(modulePath, newCode);
      this.version++;
      this.improvementHistory.push({ module: moduleName, improvements, timestamp: new Date().toISOString(), version: this.version, backup });
      this._saveLog();

      return { success: true, module: moduleName, version: this.version, linesChanged: Math.abs(original.split('\n').length - newCode.split('\n').length), backup };
    } catch (err) {
      fs.writeFileSync(modulePath, original);
      return { error: `Rewrite failed: ${err.message}. Original restored.` };
    }
  }

  // ─── SELF-OPTIMIZATION ───
  async optimize() {
    const analysis = await this.analyzeOwnCode();
    const report = this.getPerformanceReport();
    const optimizations = [];

    // Identify slow areas
    if (report.responseTime?.trend > 0) {
      optimizations.push({ type: 'performance', suggestion: 'Response time increasing — consider caching or simplifying prompts', impact: 'high' });
    }

    // Identify refactoring opportunities
    for (const suggestion of analysis.suggestions) {
      if (suggestion.type === 'refactor') optimizations.push({ type: 'refactor', suggestion: suggestion.message, impact: 'medium' });
      if (suggestion.type === 'error-handling') optimizations.push({ type: 'error-handling', suggestion: suggestion.message, impact: 'medium' });
      if (suggestion.type === 'todo') optimizations.push({ type: 'todo', suggestion: suggestion.message, impact: 'low' });
    }

    // Identify unused code
    const modules = analysis.modules;
    for (const mod of modules) {
      const modPath = path.join(this.srcDir, mod, 'index.js');
      try {
        const content = fs.readFileSync(modPath, 'utf8');
        const exports = content.match(/module\.exports\s*=\s*(\w+)/)?.[1];
        if (exports) {
          const usedElsewhere = modules.some(otherMod => {
            if (otherMod === mod) return false;
            try {
              const otherContent = fs.readFileSync(path.join(this.srcDir, otherMod, 'index.js'), 'utf8');
              return otherContent.includes(mod) || otherContent.includes(exports);
            } catch { return false; }
          });
          if (!usedElsewhere) optimizations.push({ type: 'unused', suggestion: `Module ${mod} may be unused`, impact: 'low' });
        }
      } catch {}
    }

    return { analysis, report, optimizations, timestamp: new Date().toISOString() };
  }

  // ─── EVOLUTION ───
  async evolve() {
    const optimization = await this.optimize();
    const actions = [];

    // Auto-apply safe optimizations
    if (optimization.optimizations.length > 0) {
      actions.push({ type: 'analysis', findings: optimization.optimizations });
    }

    // Track evolution progress
    this.improvementHistory.push({
      type: 'evolution',
      timestamp: new Date().toISOString(),
      performance: optimization.report,
      findings: optimization.optimizations.length
    });
    this._saveLog();

    return { evolved: true, actions, nextEvolution: 'Run /evolve again after more interactions for better results' };
  }

  // ─── COST OPTIMIZATION ───
  async optimizeCosts() {
    const provider = this.provider;
    const suggestions = [];

    // Check if using expensive model for simple tasks
    const expensiveModels = ['gpt-4o', 'claude-3-opus', 'gpt-4-turbo'];
    if (expensiveModels.includes(provider.model)) {
      suggestions.push({ suggestion: 'Use a cheaper model (gpt-4o-mini, llama-3.1) for simple tasks', potentialSaving: '60-80%' });
    }

    // Check conversation history length
    if (provider.conversationHistory.length > 50) {
      suggestions.push({ suggestion: 'Trim conversation history to reduce token usage', potentialSaving: '30-50%' });
    }

    // Suggest local models
    suggestions.push({ suggestion: 'Use Ollama for local inference — zero API cost', potentialSaving: '100%' });

    return { suggestions, currentModel: provider.model, provider: provider.providerName };
  }

  _getSourceFiles() {
    const files = [];
    const walk = (dir) => {
      try {
        fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') walk(full);
          else if (entry.name.endsWith('.js')) files.push(full);
        });
      } catch {}
    };
    walk(this.srcDir);
    return files;
  }

  getHistory() { return this.improvementHistory; }
  getVersion() { return this.version; }
}

module.exports = SelfImprovementEngine;
