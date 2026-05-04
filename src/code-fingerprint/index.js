/**
 * Live Code Fingerprinting
 * 
 * Every piece of code gets a semantic fingerprint — understanding WHY it was
 * written, what problem it solves, and how it relates to everything else.
 * Traces the intent chain back to original decisions.
 */

const EventEmitter = require('events');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class CodeFingerprint extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      indexPath: config.indexPath || path.join(process.env.HOME || '~', '.opendesktop', 'code-fingerprints'),
      maxHistory: config.maxHistory || 10000,
      ...config
    };

    this.fingerprints = new Map();  // hash -> fingerprint
    this.intentGraph = new Map();   // hash -> { intents, related }
    this.decisionLog = [];          // ordered list of code decisions
    this.patterns = new Map();      // pattern type -> occurrences
  }

  async initialize() {
    try {
      await fs.mkdir(this.config.indexPath, { recursive: true });
      await this._loadIndex();
    } catch (e) {}

    this.emit('initialized');
    return this;
  }

  /**
   * Fingerprint a piece of code — analyze and record its semantic meaning.
   */
  async fingerprint(code, metadata = {}) {
    const analysis = this._analyzeCode(code);
    const hash = this._computeHash(code);

    const fingerprint = {
      hash,
      timestamp: Date.now(),
      language: metadata.language || analysis.language,
      purpose: metadata.purpose || analysis.inferredPurpose,
      problem: metadata.problem || null,
      author: metadata.author || 'agent',
      file: metadata.file || null,
      project: metadata.project || null,
      complexity: analysis.complexity,
      dependencies: analysis.dependencies,
      exports: analysis.exports,
      patterns: analysis.patterns,
      intent: metadata.intent || null,
      relatedTo: [],
      decisionId: null
    };

    // Link to related fingerprints
    fingerprint.relatedTo = this._findRelated(fingerprint);

    this.fingerprints.set(hash, fingerprint);

    // Record in intent graph
    this.intentGraph.set(hash, {
      intents: [fingerprint.intent, fingerprint.purpose].filter(Boolean),
      related: fingerprint.relatedTo,
      dependencies: fingerprint.dependencies
    });

    this.emit('fingerprinted', fingerprint);
    return fingerprint;
  }

  /**
   * Record a code decision — why code was written or changed.
   */
  async recordDecision(decision) {
    const entry = {
      id: this._generateId(),
      timestamp: Date.now(),
      type: decision.type, // 'create', 'modify', 'delete', 'refactor', 'fix', 'optimize'
      reason: decision.reason,
      problem: decision.problem,
      solution: decision.solution,
      files: decision.files || [],
      codeHash: decision.codeHash || null,
      context: decision.context || {},
      relatedDecisions: []
    };

    // Link to related decisions
    entry.relatedDecisions = this._findRelatedDecisions(entry);

    this.decisionLog.push(entry);

    // Keep bounded
    if (this.decisionLog.length > this.config.maxHistory) {
      this.decisionLog = this.decisionLog.slice(-this.config.maxHistory / 2);
    }

    // Update fingerprint with decision link
    if (entry.codeHash && this.fingerprints.has(entry.codeHash)) {
      this.fingerprints.get(entry.codeHash).decisionId = entry.id;
    }

    this.emit('decision_recorded', entry);
    return entry;
  }

  /**
   * Trace the intent chain for a piece of code.
   * Returns the full history of WHY this code exists.
   */
  async traceIntent(codeHash) {
    const fingerprint = this.fingerprints.get(codeHash);
    if (!fingerprint) {
      return { found: false, hash: codeHash };
    }

    const chain = {
      code: fingerprint,
      decisions: [],
      relatedCode: [],
      evolution: []
    };

    // Find all decisions involving this code
    chain.decisions = this.decisionLog.filter(d => 
      d.codeHash === codeHash || d.files.includes(fingerprint.file)
    );

    // Find related code
    chain.relatedCode = fingerprint.relatedTo
      .map(hash => this.fingerprints.get(hash))
      .filter(Boolean);

    // Trace evolution — how this code changed over time
    chain.evolution = this._traceEvolution(codeHash);

    // Build narrative
    chain.narrative = this._buildNarrative(chain);

    return { found: true, ...chain };
  }

  /**
   * Analyze a codebase and build a fingerprint map.
   */
  async analyzeCodebase(directory) {
    const results = {
      files: 0,
      fingerprints: 0,
      patterns: new Map(),
      dependencies: new Map(),
      complexity: { total: 0, average: 0 }
    };

    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          const subResults = await this.analyzeCodebase(fullPath);
          results.files += subResults.files;
          results.fingerprints += subResults.fingerprints;
          results.complexity.total += subResults.complexity.total;
        } else if (entry.isFile() && this._isCodeFile(entry.name)) {
          try {
            const code = await fs.readFile(fullPath, 'utf8');
            const fp = await this.fingerprint(code, {
              file: fullPath,
              project: directory
            });
            
            results.files++;
            results.fingerprints++;
            results.complexity.total += fp.complexity;

            // Aggregate patterns
            for (const pattern of fp.patterns) {
              results.patterns.set(pattern, (results.patterns.get(pattern) || 0) + 1);
            }

            // Aggregate dependencies
            for (const dep of fp.dependencies) {
              results.dependencies.set(dep, (results.dependencies.get(dep) || 0) + 1);
            }
          } catch (e) {
            // Skip unreadable files
          }
        }
      }
    } catch (e) {
      // Directory not accessible
    }

    results.complexity.average = results.fingerprints > 0 
      ? results.complexity.total / results.fingerprints 
      : 0;

    return results;
  }

  /**
   * Find code that solves a similar problem.
   */
  async findSimilarCode(problem) {
    const problemWords = problem.toLowerCase().split(/\s+/);
    const matches = [];

    for (const [hash, fp] of this.fingerprints) {
      const fpText = [fp.purpose, fp.problem, ...fp.patterns].join(' ').toLowerCase();
      let score = 0;
      for (const word of problemWords) {
        if (fpText.includes(word)) score++;
      }
      if (score > 0) {
        matches.push({ hash, fingerprint: fp, relevance: score / problemWords.length });
      }
    }

    return matches.sort((a, b) => b.relevance - a.relevance).slice(0, 10);
  }

  /**
   * Get the decision timeline for a file.
   */
  getFileTimeline(filePath) {
    return this.decisionLog
      .filter(d => d.files.includes(filePath))
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(d => ({
        id: d.id,
        timestamp: d.timestamp,
        type: d.type,
        reason: d.reason,
        problem: d.problem
      }));
  }

  /**
   * Get statistics about code patterns.
   */
  getPatternStats() {
    const stats = {
      totalFingerprints: this.fingerprints.size,
      totalDecisions: this.decisionLog.length,
      topPatterns: [],
      topDependencies: [],
      complexityDistribution: { low: 0, medium: 0, high: 0 }
    };

    const patternCounts = new Map();
    const depCounts = new Map();

    for (const fp of this.fingerprints.values()) {
      for (const p of fp.patterns) {
        patternCounts.set(p, (patternCounts.get(p) || 0) + 1);
      }
      for (const d of fp.dependencies) {
        depCounts.set(d, (depCounts.get(d) || 0) + 1);
      }

      if (fp.complexity < 5) stats.complexityDistribution.low++;
      else if (fp.complexity < 15) stats.complexityDistribution.medium++;
      else stats.complexityDistribution.high++;
    }

    stats.topPatterns = Array.from(patternCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([pattern, count]) => ({ pattern, count }));

    stats.topDependencies = Array.from(depCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([dep, count]) => ({ dependency: dep, count }));

    return stats;
  }

  // ==================== PRIVATE METHODS ====================

  _analyzeCode(code) {
    const lines = code.split('\n');
    const analysis = {
      language: this._detectLanguage(code),
      inferredPurpose: this._inferPurpose(code),
      complexity: this._computeComplexity(code),
      dependencies: this._extractDependencies(code),
      exports: this._extractExports(code),
      patterns: this._detectPatterns(code)
    };
    return analysis;
  }

  _detectLanguage(code) {
    if (code.includes('require(') || code.includes('module.exports')) return 'javascript';
    if (code.includes('import ') && code.includes('from ')) return 'javascript';
    if (code.includes('def ') && code.includes(':') && code.includes('self')) return 'python';
    if (code.includes('fn ') && code.includes('let mut')) return 'rust';
    if (code.includes('func ') && code.includes('package ')) return 'go';
    if (code.includes('public class ') || code.includes('private ')) return 'java';
    if (code.includes('#include')) return 'c';
    return 'unknown';
  }

  _inferPurpose(code) {
    const codeLower = code.toLowerCase();
    const purposes = [];

    if (codeLower.includes('class ') && codeLower.includes('constructor')) purposes.push('class definition');
    if (codeLower.includes('async ') && codeLower.includes('await')) purposes.push('async operation');
    if (codeLower.includes('fetch') || codeLower.includes('axios') || codeLower.includes('request')) purposes.push('http client');
    if (codeLower.includes('express') || codeLower.includes('app.get') || codeLower.includes('router')) purposes.push('http server');
    if (codeLower.includes('test') || codeLower.includes('describe') || codeLower.includes('it(')) purposes.push('testing');
    if (codeLower.includes('create') || codeLower.includes('build') || codeLower.includes('make')) purposes.push('creation');
    if (codeLower.includes('parse') || codeLower.includes('transform') || codeLower.includes('convert')) purposes.push('data transformation');
    if (codeLower.includes('validate') || codeLower.includes('check') || codeLower.includes('verify')) purposes.push('validation');

    return purposes.length > 0 ? purposes.join(', ') : 'general purpose';
  }

  _computeComplexity(code) {
    let complexity = 0;
    const lines = code.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.includes('if ') || trimmed.includes('else ')) complexity += 1;
      if (trimmed.includes('for ') || trimmed.includes('while ')) complexity += 2;
      if (trimmed.includes('try') || trimmed.includes('catch')) complexity += 1;
      if (trimmed.includes('switch') || trimmed.includes('case ')) complexity += 2;
      if (trimmed.includes('await ')) complexity += 0.5;
      if (trimmed.includes('.then(') || trimmed.includes('.catch(')) complexity += 1;
    }

    return Math.round(complexity);
  }

  _extractDependencies(code) {
    const deps = [];
    const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
    const importRegex = /import.*from\s+['"]([^'"]+)['"]/g;

    let match;
    while ((match = requireRegex.exec(code)) !== null) {
      deps.push(match[1]);
    }
    while ((match = importRegex.exec(code)) !== null) {
      deps.push(match[1]);
    }

    return [...new Set(deps)];
  }

  _extractExports(code) {
    const exports = [];
    const exportRegex = /(?:module\.exports\.|export\s+(?:default\s+)?)(\w+)/g;
    let match;
    while ((match = exportRegex.exec(code)) !== null) {
      exports.push(match[1]);
    }
    return exports;
  }

  _detectPatterns(code) {
    const patterns = [];
    if (code.includes('class ')) patterns.push('oop');
    if (code.includes('=>')) patterns.push('arrow-functions');
    if (code.includes('async')) patterns.push('async');
    if (code.includes('Promise')) patterns.push('promises');
    if (code.includes('EventEmitter')) patterns.push('event-driven');
    if (code.includes('Map') || code.includes('Set')) patterns.push('modern-collections');
    if (code.includes('try') && code.includes('catch')) patterns.push('error-handling');
    if (code.includes('prototype')) patterns.push('prototypal');
    if (code.includes('singleton') || code.includes('getInstance')) patterns.push('singleton');
    if (code.includes('factory') || code.includes('create')) patterns.push('factory');
    if (code.includes('subscribe') || code.includes('on(')) patterns.push('observer');
    if (code.includes('middleware') || code.includes('use(')) patterns.push('middleware');
    return patterns;
  }

  _findRelated(fingerprint) {
    const related = [];
    for (const [hash, fp] of this.fingerprints) {
      if (hash === fingerprint.hash) continue;
      
      let similarity = 0;
      if (fp.language === fingerprint.language) similarity += 0.2;
      if (fp.project === fingerprint.project) similarity += 0.3;
      
      const commonDeps = fp.dependencies.filter(d => fingerprint.dependencies.includes(d));
      similarity += commonDeps.length * 0.1;
      
      const commonPatterns = fp.patterns.filter(p => fingerprint.patterns.includes(p));
      similarity += commonPatterns.length * 0.1;

      if (similarity > 0.4) {
        related.push(hash);
      }
    }
    return related.slice(0, 20);
  }

  _findRelatedDecisions(decision) {
    return this.decisionLog
      .filter(d => d.id !== decision.id)
      .filter(d => {
        if (d.problem && decision.problem && d.problem === decision.problem) return true;
        if (d.files.some(f => decision.files.includes(f))) return true;
        return false;
      })
      .map(d => d.id)
      .slice(0, 10);
  }

  _traceEvolution(codeHash) {
    return this.decisionLog
      .filter(d => d.codeHash === codeHash)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(d => ({
        timestamp: d.timestamp,
        type: d.type,
        reason: d.reason
      }));
  }

  _buildNarrative(chain) {
    const parts = [];

    if (chain.decisions.length > 0) {
      const first = chain.decisions[0];
      parts.push(`This code was ${first.type}d because: ${first.reason || 'no reason recorded'}`);
      
      if (first.problem) {
        parts.push(`It solves: ${first.problem}`);
      }
    }

    if (chain.evolution.length > 1) {
      parts.push(`It has been modified ${chain.evolution.length} times`);
    }

    if (chain.relatedCode.length > 0) {
      parts.push(`Related to ${chain.relatedCode.length} other code segments`);
    }

    return parts.join('. ') || 'No history available for this code.';
  }

  _computeHash(code) {
    return crypto.createHash('sha256').update(code).digest('hex').substring(0, 16);
  }

  _isCodeFile(filename) {
    const exts = ['.js', '.ts', '.py', '.rs', '.go', '.java', '.c', '.cpp', '.h', '.rb', '.php', '.swift', '.kt'];
    return exts.some(ext => filename.endsWith(ext));
  }

  _generateId() {
    return `decision_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async _loadIndex() {
    try {
      const indexPath = path.join(this.config.indexPath, 'index.json');
      const data = await fs.readFile(indexPath, 'utf8');
      const index = JSON.parse(data);
      if (index.fingerprints) {
        for (const [hash, fp] of Object.entries(index.fingerprints)) {
          this.fingerprints.set(hash, fp);
        }
      }
      if (index.decisions) {
        this.decisionLog = index.decisions;
      }
    } catch (e) {}
  }

  async saveIndex() {
    try {
      const indexPath = path.join(this.config.indexPath, 'index.json');
      const index = {
        fingerprints: Object.fromEntries(this.fingerprints),
        decisions: this.decisionLog.slice(-1000),
        lastSaved: Date.now()
      };
      await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
    } catch (e) {}
  }
}

module.exports = { CodeFingerprint };
