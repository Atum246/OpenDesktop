/**
 * Model Distillation Pipeline
 * 
 * Observes which models are best at which tasks, then fine-tunes smaller
 * local models on the agent's own successful interactions. Gets faster
 * AND cheaper the more you use it.
 */

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

class ModelDistillation extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      storagePath: config.storagePath || path.join(process.env.HOME || '~', '.opendesktop', 'distillation'),
      minSamplesForTraining: config.minSamplesForTraining || 100,
      qualityThreshold: config.qualityThreshold || 0.8,
      maxTrainingData: config.maxTrainingData || 10000,
      ...config
    };

    this.taskPerformance = new Map();  // task_type -> { model -> performance }
    this.trainingData = [];             // successful interaction logs
    this.distilledModels = new Map();   // model_name -> model_info
    this.routingTable = new Map();      // task_type -> preferred_model
    this.costTracker = { totalSaved: 0, totalSpent: 0 };
  }

  async initialize(providerSystem) {
    this.providers = providerSystem;

    try {
      await fs.mkdir(this.config.storagePath, { recursive: true });
      await this._loadState();
    } catch (e) {}

    this.emit('initialized');
    return this;
  }

  /**
   * Log a model interaction for training data collection.
   */
  async logInteraction(interaction) {
    const entry = {
      id: this._generateId(),
      timestamp: Date.now(),
      taskType: interaction.taskType || 'general',
      model: interaction.model,
      provider: interaction.provider,
      prompt: interaction.prompt,
      response: interaction.response,
      success: interaction.success !== false,
      quality: interaction.quality || this._estimateQuality(interaction),
      tokensUsed: interaction.tokensUsed || 0,
      cost: interaction.cost || 0,
      latency: interaction.latency || 0,
      userFeedback: interaction.userFeedback || null // 'good', 'bad', null
    };

    this.trainingData.push(entry);

    // Update performance tracking
    this._updatePerformance(entry);

    // Update routing table
    this._updateRouting(entry);

    // Trim if too large
    if (this.trainingData.length > this.config.maxTrainingData) {
      this.trainingData = this.trainingData.slice(-this.config.maxTrainingData / 2);
    }

    // Track costs
    if (entry.cost) {
      this.costTracker.totalSpent += entry.cost;
    }

    this.emit('interaction_logged', entry);
    return entry;
  }

  /**
   * Route a task to the best model based on learned performance.
   */
  routeTask(taskType, options = {}) {
    const { preferLocal = false, maxCost = null, maxLatency = null } = options;

    // Check if we have a distilled local model for this task
    if (preferLocal) {
      const localModel = this._findDistilledModel(taskType);
      if (localModel) {
        return {
          model: localModel.name,
          provider: 'local',
          reason: 'distilled_local_model',
          estimatedCost: 0,
          estimatedLatency: localModel.avgLatency
        };
      }
    }

    // Check routing table for best model
    const bestRoute = this.routingTable.get(taskType);
    if (bestRoute) {
      const perf = this.taskPerformance.get(taskType)?.get(bestRoute.model);
      if (perf) {
        // Check constraints
        if (maxCost && perf.avgCost > maxCost) {
          return this._findAlternative(taskType, { maxCost, maxLatency });
        }
        if (maxLatency && perf.avgLatency > maxLatency) {
          return this._findAlternative(taskType, { maxCost, maxLatency });
        }

        return {
          model: bestRoute.model,
          provider: bestRoute.provider,
          reason: 'learned_performance',
          confidence: bestRoute.confidence,
          estimatedCost: perf.avgCost,
          estimatedLatency: perf.avgLatency,
          successRate: perf.successRate
        };
      }
    }

    // Default routing
    return {
      model: options.defaultModel || 'anthropic/claude-3.5-sonnet',
      provider: options.defaultProvider || 'openrouter',
      reason: 'default',
      confidence: 0
    };
  }

  /**
   * Get the optimal model for a specific task type.
   */
  getOptimalModel(taskType) {
    const models = [];

    // Get all models that have been tried for this task
    const taskPerf = this.taskPerformance.get(taskType);
    if (taskPerf) {
      for (const [model, perf] of taskPerf) {
        models.push({
          model,
          ...perf,
          score: this._calculateModelScore(perf)
        });
      }
    }

    // Sort by score
    models.sort((a, b) => b.score - a.score);

    // Add distilled models
    const distilled = this._findDistilledModel(taskType);
    if (distilled) {
      models.unshift({
        model: distilled.name,
        provider: 'local',
        successRate: distilled.successRate,
        avgLatency: distilled.avgLatency,
        avgCost: 0,
        score: distilled.successRate * 100,
        distilled: true
      });
    }

    return {
      taskType,
      recommended: models[0] || null,
      alternatives: models.slice(1, 5),
      totalModelsEvaluated: models.length
    };
  }

  /**
   * Export training data for model distillation.
   */
  async exportTrainingData(taskType = null, format = 'jsonl') {
    let data = this.trainingData.filter(d => d.success && d.quality >= this.config.qualityThreshold);
    
    if (taskType) {
      data = data.filter(d => d.taskType === taskType);
    }

    const formatted = data.map(d => ({
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: d.prompt },
        { role: 'assistant', content: d.response }
      ]
    }));

    const exportPath = path.join(this.config.storagePath, `training_${taskType || 'all'}_${Date.now()}.jsonl`);
    
    if (format === 'jsonl') {
      await fs.writeFile(exportPath, formatted.map(d => JSON.stringify(d)).join('\n'));
    } else {
      await fs.writeFile(exportPath, JSON.stringify(formatted, null, 2));
    }

    this.emit('training_data_exported', { path: exportPath, samples: formatted.length, taskType });
    return { path: exportPath, samples: formatted.length };
  }

  /**
   * Register a distilled model.
   */
  registerDistilledModel(modelInfo) {
    const model = {
      name: modelInfo.name,
      taskTypes: modelInfo.taskTypes || ['general'],
      baseModel: modelInfo.baseModel,
      trainingSamples: modelInfo.trainingSamples || 0,
      successRate: modelInfo.successRate || 0,
      avgLatency: modelInfo.avgLatency || 0,
      createdAt: Date.now(),
      version: modelInfo.version || 1,
      path: modelInfo.path || null
    };

    this.distilledModels.set(model.name, model);

    // Update routing for task types
    for (const taskType of model.taskTypes) {
      if (!this.routingTable.has(taskType)) {
        this.routingTable.set(taskType, {
          model: model.name,
          provider: 'local',
          confidence: model.successRate
        });
      }
    }

    this.emit('distilled_model_registered', model);
    return model;
  }

  /**
   * Get performance analytics.
   */
  getAnalytics() {
    const analytics = {
      totalInteractions: this.trainingData.length,
      successfulInteractions: this.trainingData.filter(d => d.success).length,
      taskTypes: {},
      models: {},
      costTracker: { ...this.costTracker },
      distilledModels: this.distilledModels.size,
      routingEntries: this.routingTable.size
    };

    // Aggregate by task type
    for (const [taskType, modelPerf] of this.taskPerformance) {
      analytics.taskTypes[taskType] = {
        totalInteractions: 0,
        models: {}
      };
      for (const [model, perf] of modelPerf) {
        analytics.taskTypes[taskType].models[model] = perf;
        analytics.taskTypes[taskType].totalInteractions += perf.totalInteractions;
      }
    }

    // Aggregate by model
    const modelTotals = new Map();
    for (const entry of this.trainingData) {
      if (!modelTotals.has(entry.model)) {
        modelTotals.set(entry.model, { interactions: 0, successes: 0, totalCost: 0 });
      }
      const m = modelTotals.get(entry.model);
      m.interactions++;
      if (entry.success) m.successes++;
      m.totalCost += entry.cost || 0;
    }
    analytics.models = Object.fromEntries(modelTotals);

    return analytics;
  }

  /**
   * Generate a distillation report.
   */
  getDistillationReport() {
    const report = {
      readyForDistillation: [],
      recommendations: [],
      savings: {
        estimatedMonthlySavings: 0,
        currentMonthlyCost: 0,
        potentialWithDistillation: 0
      }
    };

    // Find task types with enough data for distillation
    for (const [taskType, modelPerf] of this.taskPerformance) {
      let totalSamples = 0;
      for (const [, perf] of modelPerf) {
        totalSamples += perf.totalInteractions;
      }

      if (totalSamples >= this.config.minSamplesForTraining) {
        report.readyForDistillation.push({
          taskType,
          samples: totalSamples,
          bestModel: this.routingTable.get(taskType)?.model || 'unknown'
        });
      }
    }

    // Generate recommendations
    if (report.readyForDistillation.length > 0) {
      report.recommendations.push(
        `${report.readyForDistillation.length} task types have enough data for distillation`
      );
    }

    const localEligible = this.trainingData.filter(d => d.quality >= this.config.qualityThreshold);
    if (localEligible.length > 500) {
      report.recommendations.push(
        `${localEligible.length} high-quality samples available for local model training`
      );
    }

    return report;
  }

  /**
   * Get model comparison for a task.
   */
  compareModels(taskType) {
    const taskPerf = this.taskPerformance.get(taskType);
    if (!taskPerf) {
      return { taskType, models: [], message: 'No data for this task type' };
    }

    const comparison = [];
    for (const [model, perf] of taskPerf) {
      comparison.push({
        model,
        interactions: perf.totalInteractions,
        successRate: `${(perf.successRate * 100).toFixed(1)}%`,
        avgLatency: `${perf.avgLatency.toFixed(0)}ms`,
        avgCost: `$${perf.avgCost.toFixed(4)}`,
        score: this._calculateModelScore(perf).toFixed(2)
      });
    }

    return {
      taskType,
      models: comparison.sort((a, b) => b.score - a.score)
    };
  }

  // ==================== PRIVATE METHODS ====================

  _updatePerformance(entry) {
    if (!this.taskPerformance.has(entry.taskType)) {
      this.taskPerformance.set(entry.taskType, new Map());
    }

    const taskPerf = this.taskPerformance.get(entry.taskType);
    if (!taskPerf.has(entry.model)) {
      taskPerf.set(entry.model, {
        totalInteractions: 0,
        successes: 0,
        totalLatency: 0,
        totalCost: 0,
        successRate: 0,
        avgLatency: 0,
        avgCost: 0,
        qualitySum: 0,
        avgQuality: 0
      });
    }

    const perf = taskPerf.get(entry.model);
    perf.totalInteractions++;
    if (entry.success) perf.successes++;
    perf.totalLatency += entry.latency;
    perf.totalCost += entry.cost || 0;
    perf.qualitySum += entry.quality;
    
    perf.successRate = perf.successes / perf.totalInteractions;
    perf.avgLatency = perf.totalLatency / perf.totalInteractions;
    perf.avgCost = perf.totalCost / perf.totalInteractions;
    perf.avgQuality = perf.qualitySum / perf.totalInteractions;
  }

  _updateRouting(entry) {
    const current = this.routingTable.get(entry.taskType);
    const taskPerf = this.taskPerformance.get(entry.taskType);
    
    if (!taskPerf) return;

    let bestModel = null;
    let bestScore = -1;

    for (const [model, perf] of taskPerf) {
      const score = this._calculateModelScore(perf);
      if (score > bestScore) {
        bestScore = score;
        bestModel = model;
      }
    }

    if (bestModel && (!current || current.model !== bestModel)) {
      this.routingTable.set(entry.taskType, {
        model: bestModel,
        provider: entry.provider,
        confidence: bestScore
      });
      this.emit('routing_updated', { taskType: entry.taskType, model: bestModel, score: bestScore });
    }
  }

  _calculateModelScore(perf) {
    // Weighted score: success rate (40%) + quality (30%) + speed (15%) + cost (15%)
    const successScore = perf.successRate * 40;
    const qualityScore = (perf.avgQuality || 0.5) * 30;
    const speedScore = Math.max(0, (1 - perf.avgLatency / 10000)) * 15;
    const costScore = Math.max(0, (1 - perf.avgCost / 0.1)) * 15;
    return successScore + qualityScore + speedScore + costScore;
  }

  _findDistilledModel(taskType) {
    for (const [name, model] of this.distilledModels) {
      if (model.taskTypes.includes(taskType) && model.successRate >= this.config.qualityThreshold) {
        return model;
      }
    }
    return null;
  }

  _findAlternative(taskType, constraints) {
    const taskPerf = this.taskPerformance.get(taskType);
    if (!taskPerf) return this.routeTask(taskType);

    for (const [model, perf] of taskPerf) {
      if (constraints.maxCost && perf.avgCost > constraints.maxCost) continue;
      if (constraints.maxLatency && perf.avgLatency > constraints.maxLatency) continue;
      return {
        model,
        provider: 'unknown',
        reason: 'constraint_match',
        estimatedCost: perf.avgCost,
        estimatedLatency: perf.avgLatency
      };
    }

    return this.routeTask(taskType);
  }

  _estimateQuality(interaction) {
    if (interaction.userFeedback === 'good') return 0.9;
    if (interaction.userFeedback === 'bad') return 0.2;
    if (interaction.success === false) return 0.1;
    return 0.6; // Neutral
  }

  _generateId() {
    return `inter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async _loadState() {
    try {
      const statePath = path.join(this.config.storagePath, 'state.json');
      const data = JSON.parse(await fs.readFile(statePath, 'utf8'));
      if (data.trainingData) this.trainingData = data.trainingData;
      if (data.distilledModels) {
        for (const [k, v] of Object.entries(data.distilledModels)) {
          this.distilledModels.set(k, v);
        }
      }
      if (data.routingTable) {
        for (const [k, v] of Object.entries(data.routingTable)) {
          this.routingTable.set(k, v);
        }
      }
      if (data.costTracker) this.costTracker = data.costTracker;
    } catch (e) {}
  }

  async saveState() {
    try {
      const statePath = path.join(this.config.storagePath, 'state.json');
      const state = {
        trainingData: this.trainingData.slice(-5000),
        distilledModels: Object.fromEntries(this.distilledModels),
        routingTable: Object.fromEntries(this.routingTable),
        costTracker: this.costTracker,
        lastSaved: Date.now()
      };
      await fs.writeFile(statePath, JSON.stringify(state, null, 2));
    } catch (e) {}
  }
}

module.exports = { ModelDistillation };
