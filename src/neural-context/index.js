/**
 * Neural Context Engine
 * 
 * A background reasoning thread that continuously correlates past actions,
 * predicts what the user will need next, and pre-loads context before they ask.
 * Maintains a rolling "working memory" that primes relevant context automatically.
 */

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

class NeuralContextEngine extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      maxWorkingMemory: config.maxWorkingMemory || 50,
      predictionWindow: config.predictionWindow || 300000, // 5 min
      decayRate: config.decayRate || 0.95,
      primingThreshold: config.primingThreshold || 0.6,
      contextPath: config.contextPath || path.join(process.env.HOME || '~', '.opendesktop', 'neural-context'),
      ...config
    };

    this.workingMemory = [];       // Active context items
    this.episodicBuffer = [];      // Recent action sequences
    this.predictionGraph = new Map(); // action -> predicted next actions
    this.semanticIndex = new Map();   // concept -> related contexts
    this.primedContexts = [];      // Pre-loaded contexts ready to use
    this.isActive = false;
    this.reasoningInterval = null;

    // Patterns that trigger context priming
    this.triggerPatterns = new Map();
    this.userBehaviorModel = {
      timePatterns: new Map(),      // hour -> typical actions
      appSequences: new Map(),      // app -> usual follow-up actions
      projectContexts: new Map(),   // project -> related files/contexts
      taskArchetypes: new Map()     // task type -> typical workflow
    };
  }

  async initialize(memorySystem, providerSystem) {
    this.memory = memorySystem;
    this.providers = providerSystem;
    
    try {
      await fs.mkdir(this.config.contextPath, { recursive: true });
      await this._loadPersistedState();
    } catch (e) {
      // Fresh start
    }

    this.isActive = true;
    this._startBackgroundReasoning();
    
    this.emit('initialized', {
      workingMemorySize: this.workingMemory.length,
      predictionGraphSize: this.predictionGraph.size,
      primedContexts: this.primedContexts.length
    });

    return this;
  }

  /**
   * Record an action into the episodic buffer.
   * The engine uses this to learn behavioral patterns.
   */
  async recordAction(action) {
    const entry = {
      id: this._generateId(),
      timestamp: Date.now(),
      type: action.type,         // 'command', 'file_edit', 'search', 'app_switch', etc.
      content: action.content,   // What was done
      context: action.context,   // Surrounding context (file, app, project)
      outcome: action.outcome,   // Success, failure, partial
      metadata: action.metadata || {}
    };

    this.episodicBuffer.push(entry);

    // Keep buffer bounded
    if (this.episodicBuffer.length > 500) {
      this.episodicBuffer = this.episodicBuffer.slice(-300);
    }

    // Update prediction graph
    await this._updatePredictions(entry);

    // Update user behavior model
    this._updateBehaviorModel(entry);

    // Check if this triggers any context priming
    await this._checkTriggers(entry);

    // Add to working memory
    this._addToWorkingMemory(entry);

    this.emit('action_recorded', entry);
    return entry;
  }

  /**
   * Query the engine for relevant context about a topic or intent.
   * Returns primed contexts ranked by relevance.
   */
  async queryContext(query) {
    const queryEmbedding = await this._computeSemanticSimilarity(query);
    
    // Search working memory
    const workingResults = this.workingMemory
      .map(item => ({
        ...item,
        relevance: this._computeRelevance(query, item)
      }))
      .filter(item => item.relevance > 0.3)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 10);

    // Search primed contexts
    const primedResults = this.primedContexts
      .filter(ctx => this._computeRelevance(query, ctx) > this.config.primingThreshold)
      .sort((a, b) => b.confidence - a.confidence);

    // Search episodic buffer for historical patterns
    const historicalResults = this.episodicBuffer
      .filter(item => this._computeRelevance(query, item) > 0.4)
      .slice(-20);

    // Search semantic index
    const semanticResults = this._searchSemanticIndex(query);

    const result = {
      query,
      timestamp: Date.now(),
      primed: primedResults.slice(0, 5),
      workingMemory: workingResults.slice(0, 5),
      historical: historicalResults.slice(0, 5),
      semantic: semanticResults.slice(0, 5),
      predictions: await this._predictNextActions(query),
      totalRelevantItems: workingResults.length + primedResults.length + historicalResults.length
    };

    this.emit('context_queried', result);
    return result;
  }

  /**
   * Get the current state of the reasoning engine.
   */
  getStatus() {
    return {
      active: this.isActive,
      workingMemory: {
        size: this.workingMemory.length,
        capacity: this.config.maxWorkingMemory,
        utilization: (this.workingMemory.length / this.config.maxWorkingMemory * 100).toFixed(1) + '%'
      },
      episodicBuffer: {
        size: this.episodicBuffer.length,
        oldestEntry: this.episodicBuffer[0]?.timestamp || null,
        newestEntry: this.episodicBuffer[this.episodicBuffer.length - 1]?.timestamp || null
      },
      predictionGraph: {
        nodes: this.predictionGraph.size,
        totalEdges: Array.from(this.predictionGraph.values()).reduce((sum, edges) => sum + edges.size, 0)
      },
      semanticIndex: {
        concepts: this.semanticIndex.size
      },
      primedContexts: this.primedContexts.length,
      behaviorModel: {
        timePatterns: this.userBehaviorModel.timePatterns.size,
        appSequences: this.userBehaviorModel.appSequences.size,
        projectContexts: this.userBehaviorModel.projectContexts.size
      }
    };
  }

  /**
   * Force a reasoning cycle. Useful for testing or manual refresh.
   */
  async forceReason() {
    return await this._reasoningCycle();
  }

  /**
   * Manually prime a context for future use.
   */
  primeContext(context) {
    const primed = {
      id: this._generateId(),
      content: context.content,
      source: context.source || 'manual',
      confidence: context.confidence || 1.0,
      timestamp: Date.now(),
      ttl: context.ttl || 3600000, // 1 hour default
      tags: context.tags || []
    };
    this.primedContexts.push(primed);
    this.emit('context_primed', primed);
    return primed;
  }

  /**
   * Clear expired primed contexts and decay working memory.
   */
  async cleanup() {
    const now = Date.now();

    // Remove expired primed contexts
    this.primedContexts = this.primedContexts.filter(ctx => 
      now - ctx.timestamp < ctx.ttl
    );

    // Decay working memory relevance
    this.workingMemory = this.workingMemory
      .map(item => ({
        ...item,
        relevance: item.relevance * this.config.decayRate
      }))
      .filter(item => item.relevance > 0.1)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, this.config.maxWorkingMemory);

    await this._persistState();
    
    this.emit('cleanup_complete', {
      primedContexts: this.primedContexts.length,
      workingMemory: this.workingMemory.length
    });
  }

  // ==================== PRIVATE METHODS ====================

  _startBackgroundReasoning() {
    this.reasoningInterval = setInterval(async () => {
      if (this.isActive) {
        try {
          await this._reasoningCycle();
        } catch (err) {
          this.emit('reasoning_error', err);
        }
      }
    }, 30000); // Every 30 seconds
  }

  async _reasoningCycle() {
    // 1. Analyze recent actions for patterns
    const recentActions = this.episodicBuffer.slice(-20);
    const patterns = this._detectPatterns(recentActions);

    // 2. Predict what user might need next
    const predictions = this._generatePredictions(patterns);

    // 3. Prime contexts based on predictions
    for (const prediction of predictions) {
      if (prediction.confidence > this.config.primingThreshold) {
        await this._primeFromPrediction(prediction);
      }
    }

    // 4. Consolidate working memory
    this._consolidateWorkingMemory();

    // 5. Update semantic relationships
    this._updateSemanticLinks();

    this.emit('reasoning_cycle_complete', {
      patterns: patterns.length,
      predictions: predictions.length,
      primedContexts: this.primedContexts.length
    });
  }

  _detectPatterns(actions) {
    const patterns = [];

    // Time-based patterns
    const hour = new Date().getHours();
    const timeActions = actions.filter(a => {
      const actionHour = new Date(a.timestamp).getHours();
      return Math.abs(actionHour - hour) <= 1;
    });
    if (timeActions.length > 3) {
      patterns.push({
        type: 'temporal',
        frequency: timeActions.length,
        actions: timeActions.map(a => a.type),
        confidence: Math.min(timeActions.length / 10, 1)
      });
    }

    // Sequence patterns (A followed by B)
    for (let i = 0; i < actions.length - 1; i++) {
      const key = `${actions[i].type}:${actions[i + 1].type}`;
      const existing = this.predictionGraph.get(key) || new Map();
      const count = (existing.get('count') || 0) + 1;
      existing.set('count', count);
      existing.set('confidence', Math.min(count / 5, 1));
      existing.set('source', actions[i].type);
      existing.set('target', actions[i + 1].type);
      this.predictionGraph.set(key, existing);
    }

    // App-switching patterns
    const appSwitches = actions.filter(a => a.type === 'app_switch');
    if (appSwitches.length > 2) {
      const sequence = appSwitches.map(a => a.content);
      patterns.push({
        type: 'app_sequence',
        sequence,
        confidence: 0.7
      });
    }

    // Project clustering
    const projectActions = actions.filter(a => a.context?.project);
    const projectGroups = new Map();
    for (const action of projectActions) {
      const project = action.context.project;
      if (!projectGroups.has(project)) projectGroups.set(project, []);
      projectGroups.get(project).push(action);
    }
    for (const [project, projectActions] of projectGroups) {
      if (projectActions.length > 2) {
        patterns.push({
          type: 'project_focus',
          project,
          actionCount: projectActions.length,
          files: [...new Set(projectActions.map(a => a.context?.file).filter(Boolean))],
          confidence: Math.min(projectActions.length / 8, 1)
        });
      }
    }

    return patterns;
  }

  _generatePredictions(patterns) {
    const predictions = [];

    // Based on current time patterns
    const hour = new Date().getHours();
    const timePattern = this.userBehaviorModel.timePatterns.get(hour);
    if (timePattern) {
      predictions.push({
        type: 'time_based',
        predicted: timePattern.commonActions,
        confidence: timePattern.confidence,
        reason: `User typically does this around ${hour}:00`
      });
    }

    // Based on last action
    const lastAction = this.episodicBuffer[this.episodicBuffer.length - 1];
    if (lastAction) {
      const key = `${lastAction.type}:`;
      for (const [graphKey, value] of this.predictionGraph) {
        if (graphKey.startsWith(key)) {
          predictions.push({
            type: 'sequence_based',
            predicted: value.get('target'),
            confidence: value.get('confidence'),
            reason: `After ${lastAction.type}, user typically does ${value.get('target')}`
          });
        }
      }
    }

    // Based on project focus
    const projectPatterns = patterns.filter(p => p.type === 'project_focus');
    for (const pattern of projectPatterns) {
      predictions.push({
        type: 'project_based',
        project: pattern.project,
        predictedFiles: pattern.files,
        confidence: pattern.confidence,
        reason: `User is actively working on ${pattern.project}`
      });
    }

    return predictions.sort((a, b) => b.confidence - a.confidence);
  }

  async _primeFromPrediction(prediction) {
    const context = {
      content: prediction,
      source: 'prediction',
      confidence: prediction.confidence,
      ttl: this.config.predictionWindow,
      tags: [prediction.type]
    };

    // Don't duplicate
    const exists = this.primedContexts.find(ctx => 
      ctx.source === 'prediction' && 
      JSON.stringify(ctx.content.predicted) === JSON.stringify(prediction.predicted)
    );

    if (!exists) {
      this.primedContexts.push({
        id: this._generateId(),
        ...context,
        timestamp: Date.now()
      });
    }
  }

  _addToWorkingMemory(entry) {
    const item = {
      id: entry.id,
      content: entry.content,
      type: entry.type,
      context: entry.context,
      relevance: 1.0,
      timestamp: entry.timestamp
    };

    this.workingMemory.push(item);

    // Evict oldest if over capacity
    if (this.workingMemory.length > this.config.maxWorkingMemory) {
      this.workingMemory.sort((a, b) => b.relevance - a.relevance);
      this.workingMemory = this.workingMemory.slice(0, this.config.maxWorkingMemory);
    }
  }

  _consolidateWorkingMemory() {
    // Merge similar items
    const consolidated = new Map();
    
    for (const item of this.workingMemory) {
      const key = `${item.type}:${typeof item.content === 'string' ? item.content.substring(0, 50) : 'obj'}`;
      if (consolidated.has(key)) {
        const existing = consolidated.get(key);
        existing.relevance = Math.max(existing.relevance, item.relevance);
        existing.count = (existing.count || 1) + 1;
      } else {
        consolidated.set(key, { ...item, count: 1 });
      }
    }

    this.workingMemory = Array.from(consolidated.values())
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, this.config.maxWorkingMemory);
  }

  _updateBehaviorModel(entry) {
    const hour = new Date(entry.timestamp).getHours();
    
    // Time patterns
    if (!this.userBehaviorModel.timePatterns.has(hour)) {
      this.userBehaviorModel.timePatterns.set(hour, {
        commonActions: [],
        count: 0,
        confidence: 0
      });
    }
    const timePattern = this.userBehaviorModel.timePatterns.get(hour);
    timePattern.commonActions.push(entry.type);
    timePattern.count++;
    timePattern.confidence = Math.min(timePattern.count / 20, 1);
    // Keep only last 50 actions per hour
    if (timePattern.commonActions.length > 50) {
      timePattern.commonActions = timePattern.commonActions.slice(-30);
    }

    // App sequences
    if (entry.type === 'app_switch' && entry.content) {
      if (!this.userBehaviorModel.appSequences.has(entry.content)) {
        this.userBehaviorModel.appSequences.set(entry.content, { next: new Map(), count: 0 });
      }
      const appSeq = this.userBehaviorModel.appSequences.get(entry.content);
      appSeq.count++;
      
      // Track what comes after this app
      const lastApp = this.episodicBuffer[this.episodicBuffer.length - 2];
      if (lastApp && lastApp.type === 'app_switch') {
        const nextCount = appSeq.next.get(lastApp.content) || 0;
        appSeq.next.set(lastApp.content, nextCount + 1);
      }
    }

    // Project contexts
    if (entry.context?.project) {
      if (!this.userBehaviorModel.projectContexts.has(entry.context.project)) {
        this.userBehaviorModel.projectContexts.set(entry.context.project, {
          files: new Set(),
          lastAccessed: 0,
          actionCount: 0
        });
      }
      const projCtx = this.userBehaviorModel.projectContexts.get(entry.context.project);
      if (entry.context.file) projCtx.files.add(entry.context.file);
      projCtx.lastAccessed = entry.timestamp;
      projCtx.actionCount++;
    }
  }

  _updateSemanticLinks() {
    // Build semantic relationships between concepts in working memory
    for (let i = 0; i < this.workingMemory.length; i++) {
      for (let j = i + 1; j < this.workingMemory.length; j++) {
        const similarity = this._computeItemSimilarity(this.workingMemory[i], this.workingMemory[j]);
        if (similarity > 0.5) {
          const key = this._extractConcept(this.workingMemory[i]);
          if (!this.semanticIndex.has(key)) {
            this.semanticIndex.set(key, new Set());
          }
          this.semanticIndex.get(key).add(this._extractConcept(this.workingMemory[j]));
        }
      }
    }
  }

  _searchSemanticIndex(query) {
    const results = [];
    const queryLower = query.toLowerCase();
    
    for (const [concept, related] of this.semanticIndex) {
      if (concept.toLowerCase().includes(queryLower) || queryLower.includes(concept.toLowerCase())) {
        results.push({
          concept,
          related: Array.from(related),
          relevance: 0.8
        });
      }
    }

    return results;
  }

  async _computeSemanticSimilarity(text) {
    // Simplified semantic similarity using word overlap
    // In production, this would use embeddings
    const words = text.toLowerCase().split(/\s+/);
    return words;
  }

  _computeRelevance(query, item) {
    const queryWords = query.toLowerCase().split(/\s+/);
    const itemText = typeof item.content === 'string' 
      ? item.content.toLowerCase() 
      : JSON.stringify(item.content).toLowerCase();
    
    let matches = 0;
    for (const word of queryWords) {
      if (itemText.includes(word)) matches++;
    }
    
    const baseRelevance = matches / queryWords.length;
    const recencyBoost = item.timestamp ? Math.max(0, 1 - (Date.now() - item.timestamp) / 3600000) * 0.2 : 0;
    
    return Math.min(baseRelevance + recencyBoost, 1);
  }

  _computeItemSimilarity(a, b) {
    const textA = typeof a.content === 'string' ? a.content : JSON.stringify(a.content);
    const textB = typeof b.content === 'string' ? b.content : JSON.stringify(b.content);
    
    const wordsA = new Set(textA.toLowerCase().split(/\s+/));
    const wordsB = new Set(textB.toLowerCase().split(/\s+/));
    
    let common = 0;
    for (const word of wordsA) {
      if (wordsB.has(word)) common++;
    }
    
    return common / Math.max(wordsA.size, wordsB.size);
  }

  _extractConcept(item) {
    if (typeof item.content === 'string') {
      return item.content.substring(0, 100);
    }
    return item.type || 'unknown';
  }

  async _updatePredictions(entry) {
    const recent = this.episodicBuffer.slice(-5);
    if (recent.length < 2) return;

    for (let i = 0; i < recent.length - 1; i++) {
      const key = `${recent[i].type}:${recent[i + 1].type}`;
      if (!this.predictionGraph.has(key)) {
        this.predictionGraph.set(key, new Map());
      }
      const edge = this.predictionGraph.get(key);
      const count = (edge.get('count') || 0) + 1;
      edge.set('count', count);
      edge.set('confidence', Math.min(count / 10, 1));
      edge.set('lastSeen', Date.now());
    }
  }

  async _checkTriggers(entry) {
    for (const [pattern, callback] of this.triggerPatterns) {
      if (this._matchesPattern(entry, pattern)) {
        await callback(entry);
      }
    }
  }

  _matchesPattern(entry, pattern) {
    if (pattern.type && entry.type !== pattern.type) return false;
    if (pattern.content && !entry.content?.includes(pattern.content)) return false;
    return true;
  }

  async _loadPersistedState() {
    try {
      const statePath = path.join(this.config.contextPath, 'state.json');
      const data = await fs.readFile(statePath, 'utf8');
      const state = JSON.parse(data);
      
      this.episodicBuffer = state.episodicBuffer || [];
      this.workingMemory = state.workingMemory || [];
      this.primedContexts = state.primedContexts || [];
      
      // Rebuild prediction graph
      if (state.predictions) {
        for (const [key, value] of state.predictions) {
          this.predictionGraph.set(key, new Map(Object.entries(value)));
        }
      }

      // Rebuild behavior model
      if (state.behaviorModel) {
        if (state.behaviorModel.timePatterns) {
          for (const [k, v] of Object.entries(state.behaviorModel.timePatterns)) {
            this.userBehaviorModel.timePatterns.set(parseInt(k), v);
          }
        }
      }
    } catch (e) {
      // No persisted state
    }
  }

  async _persistState() {
    try {
      const statePath = path.join(this.config.contextPath, 'state.json');
      const state = {
        episodicBuffer: this.episodicBuffer.slice(-200),
        workingMemory: this.workingMemory,
        primedContexts: this.primedContexts,
        predictions: Array.from(this.predictionGraph.entries()).map(([k, v]) => [k, Object.fromEntries(v)]),
        behaviorModel: {
          timePatterns: Object.fromEntries(this.userBehaviorModel.timePatterns)
        },
        lastPersisted: Date.now()
      };
      await fs.writeFile(statePath, JSON.stringify(state, null, 2));
    } catch (e) {
      this.emit('persist_error', e);
    }
  }

  _generateId() {
    return `nc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async shutdown() {
    this.isActive = false;
    if (this.reasoningInterval) {
      clearInterval(this.reasoningInterval);
    }
    await this._persistState();
    this.emit('shutdown');
  }
}

module.exports = { NeuralContextEngine };
