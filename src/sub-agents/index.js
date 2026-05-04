'use strict';
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os = require('os');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════
//  SUB-AGENT SPAWNER — Spin Out AI Agents 🤖🤝🤖
// ═══════════════════════════════════════════════════════════════

class SubAgentSpawner {
  constructor(config, provider, memory) {
    this.config = config;
    this.provider = provider;
    this.memory = memory;
    this.agents = new Map();
    this.agentCounter = 0;
    this.taskQueue = [];
    this.results = new Map();
  }

  async spawnAgent(task, options = {}) {
    const agentId = `agent_${++this.agentCounter}_${Date.now().toString(36)}`;
    const agent = {
      id: agentId,
      name: options.name || `Agent-${this.agentCounter}`,
      task,
      status: 'spawning',
      spawnedAt: new Date().toISOString(),
      memory: [],
      skills: options.skills || [],
      model: options.model || this.provider.model,
      personality: options.personality || 'efficient and focused',
      maxIterations: options.maxIterations || 10,
      currentIteration: 0,
      results: [],
      parentId: options.parentId || null
    };

    this.agents.set(agentId, agent);
    this.memory.addEvent({ type: 'sub-agent-spawned', agentId, task, name: agent.name });

    // Start agent execution
    this._runAgent(agentId);

    return { spawned: true, agentId, name: agent.name, task };
  }

  async _runAgent(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    agent.status = 'running';

    try {
      while (agent.currentIteration < agent.maxIterations && agent.status === 'running') {
        agent.currentIteration++;

        const systemPrompt = `You are ${agent.name}, a specialized AI sub-agent. Your task: ${agent.task}
Personality: ${agent.personality}
Iteration: ${agent.currentIteration}/${agent.maxIterations}
Previous results: ${JSON.stringify(agent.results.slice(-3))}

Be focused, efficient, and provide actionable results. If the task is complete, say "TASK_COMPLETE" and summarize what was accomplished.`;

        const response = await this.provider.chat(
          `Continue working on your task. Current iteration ${agent.currentIteration}. ${agent.results.length ? 'Previous result: ' + agent.results[agent.results.length - 1]?.summary : 'Starting fresh.'}`,
          { systemPrompt, model: agent.model, maxTokens: 2048 }
        );

        agent.results.push({ iteration: agent.currentIteration, result: response, timestamp: new Date().toISOString() });
        agent.memory.push({ role: 'assistant', content: response });

        if (response.includes('TASK_COMPLETE')) {
          agent.status = 'completed';
          break;
        }

        // Brief pause between iterations
        await new Promise(r => setTimeout(r, 1000));
      }

      if (agent.status === 'running') agent.status = 'max-iterations';
    } catch (err) {
      agent.status = 'error';
      agent.error = err.message;
    }

    agent.completedAt = new Date().toISOString();
    this.results.set(agentId, agent);
    this.memory.addEvent({ type: 'sub-agent-completed', agentId, status: agent.status, iterations: agent.currentIteration });
  }

  async spawnParallel(tasks, options = {}) {
    const results = [];
    for (const task of tasks) {
      const result = await this.spawnAgent(task, { ...options, parentId: options.parentId });
      results.push(result);
    }
    return { spawned: results.length, agents: results };
  }

  async spawnWorker(code, data) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(code, { workerData: data });
      worker.on('message', resolve);
      worker.on('error', reject);
      worker.on('exit', (code) => { if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`)); });
    });
  }

  getAgent(agentId) { return this.agents.get(agentId); }
  listAgents() { return [...this.agents.values()].map(a => ({ id: a.id, name: a.name, task: a.task, status: a.status, iterations: a.currentIteration })); }
  getActiveAgents() { return [...this.agents.values()].filter(a => a.status === 'running'); }
  getCompletedAgents() { return [...this.agents.values()].filter(a => a.status === 'completed'); }

  async killAgent(agentId) {
    const agent = this.agents.get(agentId);
    if (agent) { agent.status = 'killed'; agent.completedAt = new Date().toISOString(); }
    return { killed: true, agentId };
  }

  async killAll() {
    for (const [id, agent] of this.agents) {
      if (agent.status === 'running') { agent.status = 'killed'; agent.completedAt = new Date().toISOString(); }
    }
    return { killed: true };
  }

  getResults(agentId) { return this.results.get(agentId); }
  getAllResults() { return [...this.results.values()]; }

  // Collaborative agents — spawn a team
  async spawnTeam(teamSize, task, options = {}) {
    const agents = [];
    const roles = ['researcher', 'analyzer', 'executor', 'reviewer', 'optimizer'];
    for (let i = 0; i < teamSize; i++) {
      const role = roles[i % roles.length];
      const agent = await this.spawnAgent(`${task} — Role: ${role}`, {
        ...options,
        name: `${role.charAt(0).toUpperCase() + role.slice(1)}-Agent`,
        personality: `You are the ${role} of the team. Focus only on ${role}-related tasks.`
      });
      agents.push(agent);
    }
    return { team: true, size: teamSize, agents };
  }
}

module.exports = SubAgentSpawner;
