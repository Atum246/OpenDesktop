/**
 * Workflow Recording & Replay
 * 
 * Record workflows once, replay them intelligently. Not just scripts —
 * adaptive workflows that handle variations. Shareable, version-controlled.
 */

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

class WorkflowRecorder extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      storagePath: config.storagePath || path.join(process.env.HOME || '~', '.opendesktop', 'workflows'),
      maxSteps: config.maxSteps || 500,
      ...config
    };

    this.workflows = new Map();
    this.activeRecording = null;
    this.replayHistory = [];
  }

  async initialize(screenState, automation) {
    this.screenState = screenState;
    this.automation = automation;

    try {
      await fs.mkdir(this.config.storagePath, { recursive: true });
      await this._loadWorkflows();
    } catch (e) {}

    this.emit('initialized');
    return this;
  }

  /**
   * Start recording a workflow.
   */
  startRecording(name, options = {}) {
    if (this.activeRecording) {
      return { success: false, error: 'Already recording', active: this.activeRecording.name };
    }

    this.activeRecording = {
      name,
      description: options.description || '',
      startTime: Date.now(),
      steps: [],
      tags: options.tags || [],
      version: 1,
      metadata: {
        author: options.author || 'user',
        project: options.project || null,
        category: options.category || 'general'
      }
    };

    this.emit('recording_started', { name });
    return { success: true, name };
  }

  /**
   * Record a step in the active recording.
   */
  recordStep(step) {
    if (!this.activeRecording) {
      return { success: false, error: 'No active recording' };
    }

    const recordedStep = {
      id: this._generateId(),
      index: this.activeRecording.steps.length,
      timestamp: Date.now(),
      relativeTime: Date.now() - this.activeRecording.startTime,
      action: step.action,         // 'click', 'type', 'key', 'wait', 'screenshot', 'command', 'navigate'
      target: step.target,         // Element description, URL, command
      value: step.value,           // Text to type, key to press
      options: step.options || {}, // Additional options
      screenshot: step.screenshot || null, // Screenshot hash for verification
      adaptive: step.adaptive !== false,   // Can this step adapt?
      optional: step.optional || false,    // Can this step be skipped?
      condition: step.condition || null,   // When to execute this step
      fallback: step.fallback || null      // What to do if step fails
    };

    this.activeRecording.steps.push(recordedStep);

    if (this.activeRecording.steps.length > this.config.maxSteps) {
      return { success: false, error: 'Maximum steps reached' };
    }

    this.emit('step_recorded', recordedStep);
    return { success: true, step: recordedStep };
  }

  /**
   * Stop recording and save the workflow.
   */
  stopRecording() {
    if (!this.activeRecording) {
      return { success: false, error: 'No active recording' };
    }

    const workflow = {
      ...this.activeRecording,
      endTime: Date.now(),
      duration: Date.now() - this.activeRecording.startTime,
      totalSteps: this.activeRecording.steps.length
    };

    this.workflows.set(workflow.name, workflow);
    this.activeRecording = null;

    this._saveWorkflow(workflow);
    this.emit('recording_stopped', workflow);

    return { success: true, workflow };
  }

  /**
   * Replay a workflow.
   */
  async replayWorkflow(name, options = {}) {
    const workflow = this.workflows.get(name);
    if (!workflow) {
      return { success: false, error: `Workflow '${name}' not found` };
    }

    const {
      speed = 1.0,
      skipErrors = false,
      dryRun = false,
      variables = {},
      startFromStep = 0,
      endAtStep = null
    } = options;

    const replay = {
      workflowName: name,
      startTime: Date.now(),
      steps: [],
      status: 'running',
      variables: { ...variables }
    };

    this.emit('replay_started', { name, totalSteps: workflow.steps.length });

    const endStep = endAtStep !== null ? endAtStep : workflow.steps.length - 1;

    for (let i = startFromStep; i <= endStep; i++) {
      const step = workflow.steps[i];

      // Check condition
      if (step.condition && !this._evaluateCondition(step.condition, replay.variables)) {
        replay.steps.push({ step: i, action: step.action, result: 'skipped_condition' });
        continue;
      }

      // Interpolate variables in target and value
      const interpolatedTarget = this._interpolate(step.target, replay.variables);
      const interpolatedValue = this._interpolate(step.value, replay.variables);

      this.emit('replay_step', {
        step: i + 1,
        total: workflow.steps.length,
        action: step.action,
        target: interpolatedTarget
      });

      if (dryRun) {
        replay.steps.push({ step: i, action: step.action, target: interpolatedTarget, result: 'dry_run' });
        continue;
      }

      try {
        let result;
        const stepStart = Date.now();

        switch (step.action) {
          case 'click':
            if (this.screenState) {
              result = await this.screenState.clickElement(interpolatedTarget);
            } else if (this.automation) {
              result = await this.automation.mouse.click(step.options.x, step.options.y);
            }
            break;

          case 'type':
            if (this.screenState) {
              result = await this.screenState.typeAtElement(interpolatedTarget, interpolatedValue);
            } else if (this.automation) {
              result = await this.automation.keyboard.type(interpolatedValue);
            }
            break;

          case 'key':
            if (this.automation) {
              result = await this.automation.keyboard.press(interpolatedValue);
            }
            break;

          case 'wait':
            await this._delay((step.value || 1000) / speed);
            result = { success: true };
            break;

          case 'screenshot':
            if (this.screenState) {
              result = await this.screenState.captureState();
            }
            break;

          case 'command':
            result = await this._executeCommand(interpolatedTarget);
            break;

          case 'navigate':
            if (this.automation && this.automation.browser) {
              result = await this.automation.browser.navigate(interpolatedTarget);
            }
            break;

          case 'set_variable':
            replay.variables[step.target] = interpolatedValue;
            result = { success: true, variable: step.target };
            break;

          case 'assert':
            result = await this._assert(interpolatedTarget, interpolatedValue, replay.variables);
            break;

          default:
            result = { success: false, error: `Unknown action: ${step.action}` };
        }

        replay.steps.push({
          step: i,
          action: step.action,
          target: interpolatedTarget,
          result: result?.success ? 'success' : 'failed',
          details: result,
          duration: Date.now() - stepStart
        });

        // Adaptive delay
        await this._delay(300 / speed);

      } catch (err) {
        replay.steps.push({
          step: i,
          action: step.action,
          target: interpolatedTarget,
          result: 'error',
          error: err.message
        });

        if (step.fallback) {
          // Execute fallback
          try {
            await this._executeFallback(step.fallback, replay.variables);
            replay.steps.push({ step: i, result: 'fallback_success' });
          } catch (fallbackErr) {
            replay.steps.push({ step: i, result: 'fallback_failed', error: fallbackErr.message });
          }
        }

        if (!skipErrors && !step.optional) {
          replay.status = 'failed';
          replay.error = err.message;
          break;
        }
      }
    }

    replay.endTime = Date.now();
    replay.duration = replay.endTime - replay.startTime;
    if (replay.status === 'running') replay.status = 'completed';

    this.replayHistory.push(replay);
    this.emit('replay_complete', replay);

    return {
      success: replay.status === 'completed',
      replay: {
        workflow: name,
        status: replay.status,
        stepsExecuted: replay.steps.length,
        duration: replay.duration,
        variables: replay.variables
      }
    };
  }

  /**
   * Share a workflow to a file.
   */
  async exportWorkflow(name) {
    const workflow = this.workflows.get(name);
    if (!workflow) {
      return { success: false, error: `Workflow '${name}' not found` };
    }

    const exportPath = path.join(this.config.storagePath, `${name}.workflow.json`);
    const exportData = {
      version: '1.0',
      exportedAt: Date.now(),
      workflow: {
        ...workflow,
        steps: workflow.steps.map(s => ({
          ...s,
          screenshot: null // Don't export screenshots
        }))
      }
    };

    await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2));
    this.emit('workflow_exported', { name, path: exportPath });

    return { success: true, path: exportPath };
  }

  /**
   * Import a workflow from a file.
   */
  async importWorkflow(filePath) {
    try {
      const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
      if (!data.workflow || !data.workflow.name) {
        return { success: false, error: 'Invalid workflow file' };
      }

      this.workflows.set(data.workflow.name, data.workflow);
      await this._saveWorkflow(data.workflow);

      this.emit('workflow_imported', { name: data.workflow.name });
      return { success: true, workflow: data.workflow };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * List all workflows.
   */
  listWorkflows() {
    return Array.from(this.workflows.values()).map(w => ({
      name: w.name,
      description: w.description,
      steps: w.totalSteps || w.steps.length,
      duration: w.duration,
      tags: w.tags,
      version: w.version,
      createdAt: w.startTime,
      category: w.metadata?.category
    }));
  }

  /**
   * Delete a workflow.
   */
  async deleteWorkflow(name) {
    if (!this.workflows.has(name)) {
      return { success: false, error: `Workflow '${name}' not found` };
    }

    this.workflows.delete(name);

    try {
      await fs.unlink(path.join(this.config.storagePath, `${name}.json`));
    } catch (e) {}

    this.emit('workflow_deleted', { name });
    return { success: true };
  }

  /**
   * Clone and modify a workflow.
   */
  cloneWorkflow(originalName, newName, modifications = {}) {
    const original = this.workflows.get(originalName);
    if (!original) {
      return { success: false, error: `Workflow '${originalName}' not found` };
    }

    const cloned = {
      ...original,
      name: newName,
      description: modifications.description || `Cloned from ${originalName}`,
      version: 1,
      startTime: Date.now(),
      metadata: {
        ...original.metadata,
        clonedFrom: originalName,
        ...modifications.metadata
      }
    };

    // Apply step modifications
    if (modifications.steps) {
      cloned.steps = modifications.steps;
    }

    this.workflows.set(newName, cloned);
    this._saveWorkflow(cloned);

    this.emit('workflow_cloned', { original: originalName, clone: newName });
    return { success: true, workflow: cloned };
  }

  /**
   * Get replay history.
   */
  getReplayHistory(workflowName = null) {
    let history = this.replayHistory;
    if (workflowName) {
      history = history.filter(r => r.workflowName === workflowName);
    }
    return history.slice(-20).map(r => ({
      workflow: r.workflowName,
      status: r.status,
      stepsExecuted: r.steps.length,
      duration: r.duration,
      timestamp: r.startTime
    }));
  }

  /**
   * Get recording status.
   */
  getStatus() {
    return {
      isRecording: !!this.activeRecording,
      activeRecording: this.activeRecording ? {
        name: this.activeRecording.name,
        steps: this.activeRecording.steps.length,
        duration: Date.now() - this.activeRecording.startTime
      } : null,
      totalWorkflows: this.workflows.size,
      totalReplays: this.replayHistory.length
    };
  }

  // ==================== PRIVATE METHODS ====================

  _interpolate(template, variables) {
    if (!template || typeof template !== 'string') return template;
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? variables[key] : match;
    });
  }

  _evaluateCondition(condition, variables) {
    if (typeof condition === 'function') {
      return condition(variables);
    }
    if (typeof condition === 'string') {
      // Simple variable check: "variableName === 'value'"
      try {
        const fn = new Function(...Object.keys(variables), `return ${condition}`);
        return fn(...Object.values(variables));
      } catch (e) {
        return true;
      }
    }
    return true;
  }

  async _executeCommand(command) {
    const { exec } = require('child_process');
    return new Promise((resolve, reject) => {
      exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
        if (error) reject(error);
        else resolve({ success: true, stdout, stderr });
      });
    });
  }

  async _executeFallback(fallback, variables) {
    if (typeof fallback === 'function') {
      await fallback(variables);
    } else if (fallback.action) {
      // Execute fallback as a step
      const interpolated = this._interpolate(fallback.target, variables);
      switch (fallback.action) {
        case 'wait':
          await this._delay(fallback.value || 1000);
          break;
        case 'click':
          if (this.screenState) await this.screenState.clickElement(interpolated);
          break;
        case 'retry':
          // Handled by caller
          break;
      }
    }
  }

  async _assert(target, expected, variables) {
    // Simple assertion — check if something exists on screen
    if (this.screenState) {
      const result = await this.screenState.findElement(target);
      if (result.found) {
        return { success: true, assertion: 'element_found' };
      }
    }
    return { success: false, assertion: 'element_not_found', target };
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  _generateId() {
    return `step_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  async _loadWorkflows() {
    try {
      const files = await fs.readdir(this.config.storagePath);
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const data = JSON.parse(await fs.readFile(path.join(this.config.storagePath, file), 'utf8'));
            if (data.name) {
              this.workflows.set(data.name, data);
            }
          } catch (e) {}
        }
      }
    } catch (e) {}
  }

  async _saveWorkflow(workflow) {
    try {
      const filePath = path.join(this.config.storagePath, `${workflow.name}.json`);
      await fs.writeFile(filePath, JSON.stringify(workflow, null, 2));
    } catch (e) {}
  }
}

module.exports = { WorkflowRecorder };
