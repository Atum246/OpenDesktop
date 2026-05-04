'use strict';

const { Worker } = require('worker_threads');
const os = require('os');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════
//  AGENT ORCHESTRATOR — Hive Mind Intelligence 🤖🧠🤝
// ═══════════════════════════════════════════════════════════════

class AgentOrchestrator {
  constructor(config, provider, memory) {
    this.config = config;
    this.provider = provider;
    this.memory = memory;
    this.agents = new Map();
    this.teams = new Map();
    this.sharedMemory = new Map();
    this.taskQueue = [];
    this.results = new Map();
    this.agentCounter = 0;
    this.taskCounter = 0;
    this.maxConcurrentAgents = 50;
    this.specializations = {
      researcher: { skills: ['web-search', 'analysis', 'summarization'], systemPrompt: 'You are a research specialist. Find, analyze, and synthesize information from multiple sources.' },
      coder: { skills: ['code-generation', 'debugging', 'refactoring'], systemPrompt: 'You are a coding specialist. Write clean, efficient, well-tested code.' },
      tester: { skills: ['testing', 'validation', 'quality-assurance'], systemPrompt: 'You are a testing specialist. Find bugs, write tests, ensure quality.' },
      deployer: { skills: ['deployment', 'devops', 'infrastructure'], systemPrompt: 'You are a deployment specialist. Ship code reliably and efficiently.' },
      analyst: { skills: ['data-analysis', 'pattern-recognition', 'insights'], systemPrompt: 'You are an analysis specialist. Find patterns, extract insights, make recommendations.' },
      designer: { skills: ['ui-design', 'ux', 'visual'], systemPrompt: 'You are a design specialist. Create beautiful, functional interfaces.' },
      security: { skills: ['security-audit', 'vulnerability-detection', 'hardening'], systemPrompt: 'You are a security specialist. Find and fix security vulnerabilities.' },
      optimizer: { skills: ['performance', 'optimization', 'profiling'], systemPrompt: 'You are an optimization specialist. Make things faster and more efficient.' }
    };
  }

  // ─── TASK DECOMPOSITION ───
  async decomposeTask(task, options = {}) {
    const response = await this.provider.chat(
      `Break down this task into subtasks for a team of AI agents to work on in parallel.

Task: "${task}"

For each subtask, return JSON array with:
- id: unique identifier
- description: what to do
- specialization: one of [researcher, coder, tester, deployer, analyst, designer, security, optimizer]
- priority: 1-5 (5 highest)
- dependencies: array of subtask ids that must complete first
- estimatedComplexity: low/medium/high

Return ONLY the JSON array, no explanations.`,
      { maxTokens: 4096 }
    );

    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      const subtasks = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      return { task, subtasks, decomposedAt: new Date().toISOString() };
    } catch {
      // Fallback: create single task
      return {
        task,
        subtasks: [{ id: 'task_1', description: task, specialization: 'coder', priority: 5, dependencies: [], estimatedComplexity: 'high' }],
        decomposedAt: new Date().toISOString()
      };
    }
  }

  // ─── SPAWN TEAM ───
  async spawnTeam(task, options = {}) {
    const decomposition = await this.decomposeTask(task, options);
    const teamId = `team_${++this.taskCounter}_${Date.now().toString(36)}`;
    const agents = [];

    // Sort by priority and dependencies
    const sorted = decomposition.subtasks.sort((a, b) => b.priority - a.priority);

    for (const subtask of sorted) {
      if (this.agents.size >= this.maxConcurrentAgents) {
        await this._waitForSlot();
      }

      const agent = await this.spawnAgent(subtask.description, {
        specialization: subtask.specialization,
        teamId,
        priority: subtask.priority,
        dependencies: subtask.dependencies,
        maxIterations: options.maxIterations || 15,
        ...options
      });

      agents.push(agent);
    }

    const team = {
      id: teamId,
      task,
      agents: agents.map(a => a.id),
      status: 'running',
      created: new Date().toISOString(),
      results: new Map()
    };

    this.teams.set(teamId, team);
    this.memory.addEvent({ type: 'team-spawned', teamId, task, agentCount: agents.length });

    return { teamId, agents, task, subtaskCount: sorted.length };
  }

  // ─── SPAWN SINGLE AGENT ───
  async spawnAgent(task, options = {}) {
    const agentId = `agent_${++this.agentCounter}_${Date.now().toString(36)}`;
    const specialization = options.specialization || 'coder';
    const spec = this.specializations[specialization] || this.specializations.coder;

    const agent = {
      id: agentId,
      name: options.name || `${specialization.charAt(0).toUpperCase() + specialization.slice(1)}-${this.agentCounter}`,
      task,
      specialization,
      status: 'spawning',
      spawnedAt: new Date().toISOString(),
      teamId: options.teamId || null,
      priority: options.priority || 3,
      dependencies: options.dependencies || [],
      maxIterations: options.maxIterations || 10,
      currentIteration: 0,
      results: [],
      memory: [],
      tools: spec.skills,
      model: options.model || this.provider.model,
      personality: options.personality || spec.systemPrompt
    };

    this.agents.set(agentId, agent);
    this._runAgent(agentId);

    return { id: agentId, name: agent.name, specialization, task, status: 'spawning' };
  }

  // ─── RUN AGENT ───
  async _runAgent(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    // Wait for dependencies
    for (const depId of agent.dependencies) {
      const dep = this.agents.get(depId);
      if (dep && dep.status !== 'completed') {
        await new Promise(resolve => {
          const check = setInterval(() => {
            if (dep.status === 'completed' || dep.status === 'error' || dep.status === 'killed') {
              clearInterval(check);
              resolve();
            }
          }, 1000);
        });
      }
    }

    agent.status = 'running';
    let consecutiveErrors = 0;

    try {
      while (agent.currentIteration < agent.maxIterations && agent.status === 'running') {
        agent.currentIteration++;

        const depResults = agent.dependencies
          .map(id => this.results.get(id))
          .filter(Boolean)
          .map(r => `Previous result from dependency: ${JSON.stringify(r).slice(0, 500)}`)
          .join('\n');

        const sharedContext = this._getSharedContext(agent.teamId);

        const systemPrompt = `${agent.personality}

Task: ${agent.task}
Specialization: ${agent.specialization}
Iteration: ${agent.currentIteration}/${agent.maxIterations}
Available tools/skills: ${agent.tools.join(', ')}
${depResults ? '\nDependency results:\n' + depResults : ''}
${sharedContext ? '\nShared team knowledge:\n' + sharedContext : ''}
Previous results: ${JSON.stringify(agent.results.slice(-3)).slice(0, 500)}

Be focused, efficient, and provide actionable results.
If the task is COMPLETE, include "TASK_COMPLETE" in your response and summarize what was accomplished.
If you need information, describe what you need.
If you're stuck, describe the blocker clearly.`;

        try {
          const response = await this.provider.chat(
            `Continue working on your task. Iteration ${agent.currentIteration}. ${agent.results.length ? 'Build on previous results.' : 'Starting fresh.'}`,
            { systemPrompt, model: agent.model, maxTokens: 3000 }
          );

          consecutiveErrors = 0;
          agent.results.push({
            iteration: agent.currentIteration,
            result: response,
            timestamp: new Date().toISOString()
          });

          // Share knowledge with team
          if (agent.teamId) {
            this._shareKnowledge(agent.teamId, agentId, response);
          }

          if (response.includes('TASK_COMPLETE')) {
            agent.status = 'completed';
            break;
          }
        } catch (err) {
          consecutiveErrors++;
          if (consecutiveErrors >= 3) {
            agent.status = 'error';
            agent.error = `Consecutive errors: ${err.message}`;
            break;
          }
        }

        await new Promise(r => setTimeout(r, 500));
      }

      if (agent.status === 'running') agent.status = 'max-iterations';
    } catch (err) {
      agent.status = 'error';
      agent.error = err.message;
    }

    agent.completedAt = new Date().toISOString();
    this.results.set(agentId, {
      agentId,
      name: agent.name,
      specialization: agent.specialization,
      status: agent.status,
      results: agent.results,
      iterations: agent.currentIteration,
      task: agent.task
    });

    this.memory.addEvent({
      type: 'agent-completed',
      agentId,
      status: agent.status,
      iterations: agent.currentIteration,
      specialization: agent.specialization
    });

    // Check if team is complete
    if (agent.teamId) {
      this._checkTeamCompletion(agent.teamId);
    }
  }

  // ─── ORCHESTRATE — High-level task execution ───
  async orchestrate(task, options = {}) {
    const startTime = Date.now();

    // Analyze task complexity
    const complexity = this._analyzeComplexity(task);

    if (complexity === 'simple') {
      // Single agent for simple tasks
      const agent = await this.spawnAgent(task, options);
      return this._waitForAgent(agent.id, startTime);
    }

    // Team for complex tasks
    const team = await this.spawnTeam(task, options);
    return this._waitForTeam(team.teamId, startTime);
  }

  // ─── WAIT FOR AGENT ───
  async _waitForAgent(agentId, startTime) {
    return new Promise((resolve) => {
      const check = setInterval(() => {
        const agent = this.agents.get(agentId);
        if (!agent || agent.status !== 'running') {
          clearInterval(check);
          const result = this.results.get(agentId);
          resolve({
            success: agent?.status === 'completed',
            agentId,
            status: agent?.status,
            result: result?.results?.slice(-1)?.[0]?.result,
            iterations: agent?.currentIteration,
            duration: Date.now() - startTime
          });
        }
      }, 2000);
    });
  }

  // ─── WAIT FOR TEAM ───
  async _waitForTeam(teamId, startTime) {
    return new Promise((resolve) => {
      const check = setInterval(() => {
        const team = this.teams.get(teamId);
        if (!team || team.status !== 'running') {
          clearInterval(check);

          const agentResults = team.agents.map(id => this.results.get(id)).filter(Boolean);
          const allComplete = agentResults.every(r => r.status === 'completed' || r.status === 'error');

          // Aggregate results
          const aggregated = this._aggregateResults(agentResults);

          resolve({
            success: agentResults.some(r => r.status === 'completed'),
            teamId,
            agentCount: team.agents.length,
            results: aggregated,
            duration: Date.now() - startTime
          });
        }
      }, 3000);
    });
  }

  // ─── AGGREGATE RESULTS ───
  _aggregateResults(results) {
    return results.map(r => ({
      agent: r.name,
      specialization: r.specialization,
      status: r.status,
      summary: r.results?.slice(-1)?.[0]?.result?.slice(0, 500),
      iterations: r.iterations
    }));
  }

  // ─── SHARED MEMORY ───
  _shareKnowledge(teamId, agentId, knowledge) {
    const key = `${teamId}_knowledge`;
    if (!this.sharedMemory.has(key)) this.sharedMemory.set(key, []);
    this.sharedMemory.get(key).push({
      agentId,
      knowledge: knowledge.slice(0, 500),
      timestamp: new Date().toISOString()
    });
  }

  _getSharedContext(teamId) {
    const knowledge = this.sharedMemory.get(`${teamId}_knowledge`) || [];
    return knowledge.slice(-5).map(k => `[${k.agentId}]: ${k.knowledge}`).join('\n');
  }

  // ─── TEAM COMPLETION CHECK ───
  _checkTeamCompletion(teamId) {
    const team = this.teams.get(teamId);
    if (!team) return;

    const statuses = team.agents.map(id => this.agents.get(id)?.status);
    const allDone = statuses.every(s => s === 'completed' || s === 'error' || s === 'killed' || s === 'max-iterations');

    if (allDone) {
      team.status = 'completed';
      team.completedAt = new Date().toISOString();
      this.memory.addEvent({ type: 'team-completed', teamId, status: 'completed' });
    }
  }

  // ─── COMPLEXITY ANALYSIS ───
  _analyzeComplexity(task) {
    const words = task.split(/\s+/).length;
    const hasMultipleParts = /and|then|also|after|before/i.test(task);
    const hasCode = /code|build|create|develop|implement|fix/i.test(task);
    const hasResearch = /research|find|search|analyze|investigate/i.test(task);

    if (words < 10 && !hasMultipleParts) return 'simple';
    if (words > 30 || (hasCode && hasResearch)) return 'complex';
    return 'medium';
  }

  // ─── WAIT FOR FREE SLOT ───
  async _waitForSlot() {
    return new Promise((resolve) => {
      const check = setInterval(() => {
        const running = [...this.agents.values()].filter(a => a.status === 'running').length;
        if (running < this.maxConcurrentAgents) {
          clearInterval(check);
          resolve();
        }
      }, 2000);
    });
  }

  // ─── MANAGEMENT ───
  listAgents() {
    return [...this.agents.values()].map(a => ({
      id: a.id, name: a.name, task: a.task, specialization: a.specialization,
      status: a.status, iterations: a.currentIteration, teamId: a.teamId
    }));
  }

  getActiveAgents() {
    return [...this.agents.values()].filter(a => a.status === 'running');
  }

  listTeams() {
    return [...this.teams.values()].map(t => ({
      id: t.id, task: t.task, status: t.status,
      agentCount: t.agents.length,
      created: t.created, completedAt: t.completedAt
    }));
  }

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

  getProgress() {
    const agents = [...this.agents.values()];
    return {
      total: agents.length,
      running: agents.filter(a => a.status === 'running').length,
      completed: agents.filter(a => a.status === 'completed').length,
      error: agents.filter(a => a.status === 'error').length,
      killed: agents.filter(a => a.status === 'killed').length,
      teams: this.teams.size
    };
  }

  getResults(agentId) { return this.results.get(agentId); }
  getAllResults() { return [...this.results.values()]; }
}

module.exports = AgentOrchestrator;
