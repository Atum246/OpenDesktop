'use strict';

// ═══════════════════════════════════════════════════════════════
//  LEARNING SYSTEM — Gets Smarter Every Time 🧠📈
// ═══════════════════════════════════════════════════════════════

class LearningSystem {
  constructor(config, memory) {
    this.config = config;
    this.memory = memory;
    this.patterns = [];
    this.corrections = [];
    this.preferences = {};
    this.skillsLearned = [];
    this.commandFrequency = {};
    this.feedbackLog = [];
  }

  // Track what the user does frequently
  trackCommand(command) {
    this.commandFrequency[command] = (this.commandFrequency[command] || 0) + 1;
    this.memory.addEvent({ type: 'command-tracked', command, frequency: this.commandFrequency[command] });
  }

  // Learn from corrections
  learnFromCorrection(original, corrected, context) {
    const lesson = { original, corrected, context, timestamp: new Date().toISOString() };
    this.corrections.push(lesson);
    this.memory.remember(`correction_${Date.now()}`, lesson);
    return { learned: true, lesson };
  }

  // Learn user preferences
  learnPreference(category, key, value) {
    if (!this.preferences[category]) this.preferences[category] = {};
    this.preferences[category][key] = value;
    this.memory.updateProfile(`${category}.${key}`, value);
    return { learned: true, category, key, value };
  }

  // Learn patterns from behavior
  detectPattern(events) {
    const patterns = [];
    const commandSequences = {};

    for (let i = 0; i < events.length - 1; i++) {
      const current = events[i].command || events[i].type;
      const next = events[i + 1]?.command || events[i + 1]?.type;
      if (!current || !next) continue;
      const key = `${current} -> ${next}`;
      commandSequences[key] = (commandSequences[key] || 0) + 1;
    }

    for (const [sequence, count] of Object.entries(commandSequences)) {
      if (count >= 3) patterns.push({ sequence, count, type: 'command-sequence' });
    }

    this.patterns = patterns;
    return patterns;
  }

  // Suggest actions based on learned patterns
  getSuggestions(context) {
    const suggestions = [];
    const recent = this.memory.getEvents({ limit: 10 });
    const frequent = Object.entries(this.commandFrequency).sort((a, b) => b[1] - a[1]).slice(0, 5);

    frequent.forEach(([cmd, count]) => {
      suggestions.push({ type: 'frequent-command', command: cmd, frequency: count, suggestion: `You often use: ${cmd}` });
    });

    // Time-based suggestions
    const hour = new Date().getHours();
    if (hour >= 9 && hour <= 11) suggestions.push({ type: 'time-based', suggestion: 'Good morning! Want to check your tasks for today?' });
    if (hour >= 13 && hour <= 14) suggestions.push({ type: 'time-based', suggestion: 'Afternoon! Need a productivity boost?' });

    return suggestions;
  }

  // Learn from mistakes (when user says "no that's wrong")
  learnFromMistake(context, wrongAnswer, rightAnswer) {
    const lesson = { context, wrong: wrongAnswer, right: rightAnswer, timestamp: new Date().toISOString() };
    this.memory.remember(`mistake_${Date.now()}`, lesson);
    return { learned: true, lesson };
  }

  // Build a custom model of user behavior
  buildUserProfile() {
    const events = this.memory.getEvents({});
    const tasks = this.memory.getTasks({});
    const profile = this.memory.getProfile();

    return {
      totalInteractions: events.length,
      totalTasks: tasks.length,
      topCommands: Object.entries(this.commandFrequency).sort((a, b) => b[1] - a[1]).slice(0, 10),
      preferences: this.preferences,
      correctionsCount: this.corrections.length,
      patterns: this.detectPattern(events),
      profile: profile
    };
  }

  // Get learning stats
  getStats() {
    return {
      commandsTracked: Object.keys(this.commandFrequency).length,
      correctionsLearned: this.corrections.length,
      preferencesLearned: Object.keys(this.preferences).length,
      patternsDetected: this.patterns.length,
      feedbackCount: this.feedbackLog.length
    };
  }

  // Feedback loop
  addFeedback(feedback) {
    this.feedbackLog.push({ ...feedback, timestamp: new Date().toISOString() });
    this.memory.addEvent({ type: 'feedback', ...feedback });
    return { recorded: true };
  }

  getHistory() { return { corrections: this.corrections, feedback: this.feedbackLog, commandFrequency: this.commandFrequency }; }
}

module.exports = LearningSystem;
