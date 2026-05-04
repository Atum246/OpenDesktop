'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');

// ═══════════════════════════════════════════════════════════════
//  ADAPTIVE INTERFACE — Rewrites Its Own UI Over Time 🎨🔄
// ═══════════════════════════════════════════════════════════════

class AdaptiveInterface {
  constructor(config, memory, learning) {
    this.config = config;
    this.memory = memory;
    this.learning = learning;
    this.uiDir = path.join(os.homedir(), '.opendesktop', 'adaptive-ui');
    this.interactions = [];
    this.preferences = {};
    this.layoutHistory = [];
    if (!fs.existsSync(this.uiDir)) fs.mkdirSync(this.uiDir, { recursive: true });
  }

  trackInteraction(action, context) {
    this.interactions.push({ action, context, timestamp: Date.now() });
    if (this.interactions.length > 10000) this.interactions = this.interactions.slice(-5000);
  }

  analyzeUsagePatterns() {
    const patterns = { commandFrequency: {}, timeDistribution: {}, sessionLengths: [], mostUsedFeatures: [] };
    const commandCounts = {};
    this.interactions.forEach(i => {
      commandCounts[i.action] = (commandCounts[i.action] || 0) + 1;
    });
    patterns.commandFrequency = Object.entries(commandCounts).sort((a, b) => b[1] - a[1]).slice(0, 20);
    return patterns;
  }

  async suggestLayoutChanges() {
    const patterns = this.analyzeUsagePatterns();
    const suggestions = [];
    const topCommands = patterns.commandFrequency.slice(0, 5).map(([cmd]) => cmd);

    suggestions.push({ type: 'quick-access', message: `Add shortcuts for: ${topCommands.join(', ')}`, impact: 'high' });
    suggestions.push({ type: 'theme', message: 'Based on usage, consider a theme optimized for readability', impact: 'medium' });
    return suggestions;
  }

  async adaptCommandSuggestions(input) {
    const patterns = this.analyzeUsagePatterns();
    const frequent = patterns.commandFrequency.map(([cmd]) => cmd);
    const matching = frequent.filter(cmd => cmd.startsWith(input.toLowerCase()));
    return matching.slice(0, 5);
  }

  async rewriteInterface(module, improvements) {
    const uiFile = path.join(this.uiDir, `${module}-overrides.json`);
    const overrides = fs.existsSync(uiFile) ? JSON.parse(fs.readFileSync(uiFile, 'utf8')) : {};
    Object.assign(overrides, improvements, { updated: new Date().toISOString() });
    fs.writeFileSync(uiFile, JSON.stringify(overrides, null, 2));
    return { rewritten: true, module, overrides };
  }

  getPersonalizedGreeting() {
    const hour = new Date().getHours();
    const name = this.config.get('user.name', '');
    const nameStr = name ? `, ${name}` : '';
    if (hour < 6) return `🌙 Late night${nameStr}! Working hard?`;
    if (hour < 12) return `☀️ Good morning${nameStr}! Ready to be productive?`;
    if (hour < 18) return `🌤️ Good afternoon${nameStr}! What are we building?`;
    return `🌆 Good evening${nameStr}! What's the plan tonight?`;
  }

  getPersonalizedPromptPrefix() {
    const patterns = this.analyzeUsagePatterns();
    const topFeature = patterns.commandFrequency[0]?.[0] || 'chat';
    return `You often use ${topFeature}. `;
  }

  getStats() { return { interactions: this.interactions.length, patterns: this.analyzeUsagePatterns() }; }
}

module.exports = AdaptiveInterface;
