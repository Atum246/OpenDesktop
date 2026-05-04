'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');

// ═══════════════════════════════════════════════════════════════
//  PERSONA SYSTEM — Build a Custom Model of You 🎭👤
// ═══════════════════════════════════════════════════════════════

class PersonaSystem {
  constructor(config, memory) {
    this.config = config;
    this.memory = memory;
    this.personasDir = path.join(os.homedir(), '.opendesktop', 'personas');
    if (!fs.existsSync(this.personasDir)) fs.mkdirSync(this.personasDir, { recursive: true });
    this.activePersona = null;
    this.personas = this._loadAll();
  }

  _loadAll() {
    const personas = new Map();
    const files = fs.readdirSync(this.personasDir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const p = JSON.parse(fs.readFileSync(path.join(this.personasDir, file), 'utf8'));
        personas.set(p.name, p);
      } catch {}
    }
    return personas;
  }

  async createPersona(name, options = {}) {
    const persona = {
      name,
      displayName: options.displayName || name,
      description: options.description || '',
      traits: options.traits || [],
      tone: options.tone || 'professional',
      language: options.language || 'english',
      expertise: options.expertise || [],
      personality: options.personality || {
        humor: 'moderate',
        formality: 'balanced',
        verbosity: 'concise',
        proactiveness: 'moderate'
      },
      systemPrompt: options.systemPrompt || this._buildSystemPrompt(options),
      greetings: options.greetings || [`Hey! I'm ${name}, your AI assistant. How can I help?`],
      farewell: options.farewell || [`Goodbye from ${name}! Take care! 👋`],
      shortcuts: options.shortcuts || {},
      restrictions: options.restrictions || [],
      created: new Date().toISOString(),
      interactions: 0
    };

    this.personas.set(name, persona);
    fs.writeFileSync(path.join(this.personasDir, `${name}.json`), JSON.stringify(persona, null, 2));
    return { created: true, persona };
  }

  _buildSystemPrompt(options) {
    const parts = ['You are an AI desktop agent.'];
    if (options.tone) parts.push(`Your tone is ${options.tone}.`);
    if (options.traits?.length) parts.push(`Your traits: ${options.traits.join(', ')}.`);
    if (options.expertise?.length) parts.push(`You specialize in: ${options.expertise.join(', ')}.`);
    if (options.personality?.humor) parts.push(`Humor level: ${options.personality.humor}.`);
    if (options.personality?.formality) parts.push(`Formality: ${options.personality.formality}.`);
    if (options.personality?.verbosity) parts.push(`Verbosity: ${options.personality.verbosity}.`);
    if (options.restrictions?.length) parts.push(`Restrictions: ${options.restrictions.join(', ')}.`);
    parts.push('Be helpful, capable, and use emojis naturally.');
    return parts.join(' ');
  }

  activatePersona(name) {
    const persona = this.personas.get(name);
    if (!persona) return { error: `Persona ${name} not found` };
    this.activePersona = persona;
    this.config.set('persona.active', name);
    return { activated: true, persona };
  }

  deactivatePersona() {
    this.activePersona = null;
    this.config.set('persona.active', null);
    return { deactivated: true };
  }

  getActivePersona() { return this.activePersona; }

  getSystemPrompt() {
    if (!this.activePersona) return null;
    this.activePersona.interactions++;
    return this.activePersona.systemPrompt;
  }

  listPersonas() { return [...this.personas.values()].map(p => ({ name: p.name, displayName: p.displayName, description: p.description, tone: p.tone, traits: p.traits })); }

  getPersona(name) { return this.personas.get(name); }

  async updatePersona(name, updates) {
    const persona = this.personas.get(name);
    if (!persona) return { error: `Persona ${name} not found` };
    Object.assign(persona, updates, { updated: new Date().toISOString() });
    if (updates.traits || updates.tone || updates.personality) persona.systemPrompt = this._buildSystemPrompt(persona);
    fs.writeFileSync(path.join(this.personasDir, `${name}.json`), JSON.stringify(persona, null, 2));
    return { updated: true, persona };
  }

  deletePersona(name) {
    this.personas.delete(name);
    const filePath = path.join(this.personasDir, `${name}.json`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    if (this.activePersona?.name === name) this.deactivatePersona();
    return { deleted: true };
  }

  // Create persona from user interaction patterns
  async generatePersonaFromHistory() {
    const profile = this.memory.getProfile();
    const events = this.memory.getEvents({ limit: 100 });
    const stats = this.memory.getStats();

    const tone = profile.preferences?.tone || 'balanced';
    const topics = events.map(e => e.userMessage || e.message || '').join(' ').toLowerCase();
    const expertise = [];
    if (topics.includes('code') || topics.includes('programming')) expertise.push('programming');
    if (topics.includes('design') || topics.includes('ui')) expertise.push('design');
    if (topics.includes('data') || topics.includes('analysis')) expertise.push('data-analysis');
    if (topics.includes('deploy') || topics.includes('server')) expertise.push('devops');

    return this.createPersona('auto-generated', {
      description: 'Auto-generated based on your interaction history',
      tone,
      expertise,
      personality: { humor: 'moderate', formality: 'balanced', verbosity: 'concise', proactiveness: 'high' }
    });
  }

  // Pre-built personas
  getPresets() {
    return [
      { name: 'professional', displayName: 'Professional', description: 'Formal, efficient, business-focused', tone: 'professional', traits: ['efficient', 'precise', 'formal'] },
      { name: 'casual', displayName: 'Casual', description: 'Relaxed, friendly, conversational', tone: 'casual', traits: ['friendly', 'relaxed', 'approachable'] },
      { name: 'hacker', displayName: 'Hacker', description: 'Technical, edgy, terminal-focused', tone: 'casual', traits: ['technical', 'concise', 'direct'] },
      { name: 'creative', displayName: 'Creative', description: 'Imaginative, expressive, artistic', tone: 'warm', traits: ['creative', 'expressive', 'imaginative'] },
      { name: 'teacher', displayName: 'Teacher', description: 'Patient, explanatory, educational', tone: 'warm', traits: ['patient', 'explanatory', 'encouraging'] },
      { name: 'assistant', displayName: 'Butler', description: 'Polite, anticipatory, service-oriented', tone: 'formal', traits: ['polite', 'anticipatory', 'thorough'] }
    ];
  }
}

module.exports = PersonaSystem;
