'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');

// ═══════════════════════════════════════════════════════════════
//  MEMORY SYSTEM — Persistent, Searchable, Never Forgets
// ═══════════════════════════════════════════════════════════════

const MEMORY_DIR = path.join(os.homedir(), '.opendesktop', 'memory');

class MemorySystem {
  constructor(config) {
    this.config = config;
    this.dir = MEMORY_DIR;
    this.episodicFile = path.join(this.dir, 'episodic.json');
    this.semanticFile = path.join(this.dir, 'semantic.json');
    this.taskFile = path.join(this.dir, 'tasks.json');
    this.profileFile = path.join(this.dir, 'profile.json');
    this.conversationsDir = path.join(this.dir, 'conversations');
    [this.dir, this.conversationsDir].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });
    this.episodic = this._load(this.episodicFile, []);
    this.semantic = this._load(this.semanticFile, {});
    this.tasks = this._load(this.taskFile, []);
    this.profile = this._load(this.profileFile, { preferences: {}, habits: {}, facts: [] });
  }

  _load(file, def) { try { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : def; } catch { return def; } }
  _save(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2)); }

  // Episodic Memory — chronological events
  addEvent(event) {
    this.episodic.push({ id: Date.now().toString(36), timestamp: new Date().toISOString(), ...event });
    if (this.episodic.length > 100000) this.episodic = this.episodic.slice(-50000);
    this._save(this.episodicFile, this.episodic);
  }

  getEvents(opts = {}) {
    let events = [...this.episodic];
    if (opts.since) events = events.filter(e => new Date(e.timestamp) >= new Date(opts.since));
    if (opts.type) events = events.filter(e => e.type === opts.type);
    if (opts.limit) events = events.slice(-opts.limit);
    return events;
  }

  // Semantic Memory — facts and knowledge
  remember(key, value) { this.semantic[key] = { value, updated: new Date().toISOString() }; this._save(this.semanticFile, this.semantic); }
  recall(key) { return this.semantic[key]?.value; }
  forget(key) { delete this.semantic[key]; this._save(this.semanticFile, this.semantic); }
  searchSemantic(query) {
    const q = query.toLowerCase();
    return Object.entries(this.semantic)
      .filter(([k, v]) => k.toLowerCase().includes(q) || String(v.value).toLowerCase().includes(q))
      .map(([k, v]) => ({ key: k, ...v }));
  }

  // Task Memory — what was done
  addTask(task) {
    this.tasks.push({ id: Date.now().toString(36), timestamp: new Date().toISOString(), status: 'completed', ...task });
    this._save(this.taskFile, this.tasks);
  }
  getTasks(opts = {}) { let tasks = [...this.tasks]; if (opts.status) tasks = tasks.filter(t => t.status === opts.status); if (opts.limit) tasks = tasks.slice(-opts.limit); return tasks; }

  // Profile Memory — user preferences
  updateProfile(key, value) { this.profile.preferences[key] = value; this._save(this.profileFile, this.profile); }
  getProfile() { return this.profile; }
  addFact(fact) { this.profile.facts.push({ text: fact, added: new Date().toISOString() }); this._save(this.profileFile, this.profile); }

  // Conversation Memory
  saveConversation(id, messages) { this._save(path.join(this.conversationsDir, `${id}.json`), messages); }
  loadConversation(id) { return this._load(path.join(this.conversationsDir, `${id}.json`), []); }
  listConversations() { return fs.readdirSync(this.conversationsDir).filter(f => f.endsWith('.json')).map(f => f.replace('.json', '')); }

  // Full-text search across all memory
  search(query) {
    const q = query.toLowerCase();
    const results = [];
    this.episodic.forEach(e => { if (JSON.stringify(e).toLowerCase().includes(q)) results.push({ type: 'episodic', data: e }); });
    Object.entries(this.semantic).forEach(([k, v]) => { if (k.toLowerCase().includes(q) || JSON.stringify(v).toLowerCase().includes(q)) results.push({ type: 'semantic', data: { key: k, ...v } }); });
    this.tasks.forEach(t => { if (JSON.stringify(t).toLowerCase().includes(q)) results.push({ type: 'task', data: t }); });
    return results;
  }

  // Export / Import
  exportAll() { return { episodic: this.episodic, semantic: this.semantic, tasks: this.tasks, profile: this.profile }; }
  importAll(data) { if (data.episodic) { this.episodic = data.episodic; this._save(this.episodicFile, this.episodic); } if (data.semantic) { this.semantic = data.semantic; this._save(this.semanticFile, this.semantic); } if (data.tasks) { this.tasks = data.tasks; this._save(this.taskFile, this.tasks); } if (data.profile) { this.profile = data.profile; this._save(this.profileFile, this.profile); } }

  getStats() { return { episodicCount: this.episodic.length, semanticCount: Object.keys(this.semantic).length, taskCount: this.tasks.length, conversationCount: this.listConversations().length, factsCount: this.profile.facts.length }; }
}

module.exports = MemorySystem;
