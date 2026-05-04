'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');

// ═══════════════════════════════════════════════════════════════
//  WORKFLOW BUILDER — Automate Anything 🔧📋
// ═══════════════════════════════════════════════════════════════

class WorkflowBuilder {
  constructor(config, automation, provider) {
    this.config = config;
    this.automation = automation;
    this.provider = provider;
    this.workflowsDir = path.join(os.homedir(), '.opendesktop', 'workflows');
    if (!fs.existsSync(this.workflowsDir)) fs.mkdirSync(this.workflowsDir, { recursive: true });
    this.workflows = this._loadAll();
    this.running = new Map();
  }

  _loadAll() {
    const workflows = new Map();
    const files = fs.readdirSync(this.workflowsDir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const wf = JSON.parse(fs.readFileSync(path.join(this.workflowsDir, file), 'utf8'));
        workflows.set(wf.name, wf);
      } catch {}
    }
    return workflows;
  }

  async createWorkflow(name, steps, options = {}) {
    const workflow = {
      name,
      description: options.description || '',
      version: '1.0.0',
      steps: steps.map((step, i) => ({
        id: `step_${i}`,
        order: i,
        type: step.type || 'command',
        action: step.action,
        params: step.params || {},
        condition: step.condition || null,
        onError: step.onError || 'stop',
        retry: step.retry || 0,
        timeout: step.timeout || 30000
      })),
      triggers: options.triggers || [],
      schedule: options.schedule || null,
      variables: options.variables || {},
      created: new Date().toISOString(),
      runs: 0,
      lastRun: null
    };

    this.workflows.set(name, workflow);
    fs.writeFileSync(path.join(this.workflowsDir, `${name}.json`), JSON.stringify(workflow, null, 2));
    return { created: true, workflow };
  }

  async runWorkflow(name, input = {}) {
    const workflow = this.workflows.get(name);
    if (!workflow) return { error: `Workflow ${name} not found` };

    const runId = Date.now().toString(36);
    const results = [];
    const context = { ...workflow.variables, ...input, _runId: runId, _startTime: Date.now() };

    this.running.set(runId, { name, status: 'running', startedAt: new Date().toISOString() });

    for (const step of workflow.steps) {
      // Check condition
      if (step.condition) {
        const shouldRun = this._evaluateCondition(step.condition, context);
        if (!shouldRun) { results.push({ step: step.id, skipped: true, reason: 'condition not met' }); continue; }
      }

      let retries = 0;
      let stepResult;

      while (retries <= step.retry) {
        try {
          stepResult = await this._executeStep(step, context);
          if (stepResult.success) break;
          retries++;
        } catch (err) {
          stepResult = { success: false, error: err.message };
          retries++;
        }
      }

      results.push({ step: step.id, ...stepResult });

      if (!stepResult.success && step.onError === 'stop') break;
      if (stepResult.output) context[`step_${step.id}_output`] = stepResult.output;
    }

    workflow.runs++;
    workflow.lastRun = new Date().toISOString();
    this.running.delete(runId);

    return { runId, workflow: name, results, duration: Date.now() - context._startTime, success: results.every(r => r.success || r.skipped) };
  }

  async _executeStep(step, context) {
    switch (step.type) {
      case 'command':
        return this.automation.runCommand(this._interpolate(step.action, context));
      case 'open':
        return this.automation.openApp(this._interpolate(step.action, context));
      case 'browse':
        return this.automation.openBrowser(this._interpolate(step.action, context));
      case 'type':
        return this.automation.typeText(this._interpolate(step.action, context));
      case 'file-read':
        return this.automation.readFile(this._interpolate(step.action, context));
      case 'file-write':
        return this.automation.writeFile(this._interpolate(step.params.path, context), this._interpolate(step.params.content, context));
      case 'wait':
        await new Promise(r => setTimeout(r, step.params.duration || 1000));
        return { success: true };
      case 'ai':
        const response = await this.provider.chat(this._interpolate(step.action, context));
        return { success: true, output: response };
      case 'notify':
        return this.automation.notify('OpenDesktop Workflow', this._interpolate(step.action, context));
      default:
        return { success: false, error: `Unknown step type: ${step.type}` };
    }
  }

  _interpolate(template, context) {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => context[key] || '');
  }

  _evaluateCondition(condition, context) {
    try {
      const interpolated = this._interpolate(condition, context);
      // Safe evaluation — only allow simple comparisons against context keys
      const safeExpr = interpolated.replace(/[^a-zA-Z0-9\s_<>=!&|+\-*/.()"']/g, '');
      // Simple expression evaluator for common patterns
      const boolOps = { '==': (a, b) => a == b, '===': (a, b) => a === b, '!=': (a, b) => a != b, '!==': (a, b) => a !== b, '>': (a, b) => a > b, '<': (a, b) => a < b, '>=': (a, b) => a >= b, '<=': (a, b) => a <= b };
      for (const [op, fn] of Object.entries(boolOps)) {
        const parts = safeExpr.split(op);
        if (parts.length === 2) {
          const left = context[parts[0].trim()] ?? parts[0].trim();
          const right = context[parts[1].trim()] ?? parts[1].trim();
          return fn(left, right);
        }
      }
      // Fallback: check if the expression is truthy in context
      return !!context[interpolated.trim()];
    } catch { return true; }
  }

  listWorkflows() { return [...this.workflows.values()].map(w => ({ name: w.name, description: w.description, steps: w.steps.length, runs: w.runs, lastRun: w.lastRun })); }
  getWorkflow(name) { return this.workflows.get(name); }
  deleteWorkflow(name) { this.workflows.delete(name); fs.unlinkSync(path.join(this.workflowsDir, `${name}.json`)); return { deleted: true }; }

  // Create workflow from natural language
  async generateWorkflow(description) {
    const response = await this.provider.chat(`Create a workflow from this description. Return ONLY a JSON array of steps with {type, action, params, condition}:\n\n${description}`);
    try {
      const steps = JSON.parse(response.match(/\[[\s\S]*\]/)?.[0] || '[]');
      const name = `workflow_${Date.now().toString(36)}`;
      return this.createWorkflow(name, steps, { description });
    } catch {
      return { error: 'Could not parse workflow from AI response', raw: response };
    }
  }

  getRunning() { return [...this.running.entries()].map(([id, wf]) => ({ runId: id, ...wf })); }
}

module.exports = WorkflowBuilder;
