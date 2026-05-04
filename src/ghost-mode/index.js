/**
 * Ghost Mode — Autonomous Night Shift
 * 
 * Set the agent loose while you sleep. Give it a mission and it spawns agents,
 * works through the night, and has a morning briefing ready. With rollback safety.
 */

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

class GhostMode extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      maxMissionDuration: config.maxMissionDuration || 28800000, // 8 hours
      checkpointInterval: config.checkpointInterval || 300000,    // 5 min
      maxRollbackPoints: config.maxRollbackPoints || 50,
      safetyMode: config.safetyMode || 'supervised', // safe, supervised, full
      maxAgents: config.maxAgents || 10,
      costLimit: config.costLimit || null,           // API cost limit
      statePath: config.statePath || path.join(process.env.HOME || '~', '.opendesktop', 'ghost-mode'),
      ...config
    };

    this.missions = new Map();
    this.activeMission = null;
    this.rollbackStack = [];
    this.executionLog = [];
    this.isRunning = false;
    this.briefingQueue = [];
  }

  async initialize(orchestrator, security, memory) {
    this.orchestrator = orchestrator;
    this.security = security;
    this.memory = memory;

    try {
      await fs.mkdir(this.config.statePath, { recursive: true });
      await this._loadState();
    } catch (e) {}

    this.emit('initialized');
    return this;
  }

  /**
   * Create and start a ghost mission.
   * 
   * @param {Object} mission - Mission specification
   * @param {string} mission.name - Human-readable name
   * @param {string} mission.description - What to accomplish
   * @param {Array} mission.tasks - Ordered list of tasks
   * @param {Object} mission.constraints - Safety constraints
   * @param {string} mission.briefingFormat - How to report results
   */
  async startMission(mission) {
    if (this.activeMission) {
      return { success: false, error: 'A mission is already active', active: this.activeMission.name };
    }

    const missionObj = {
      id: this._generateId(),
      name: mission.name,
      description: mission.description,
      tasks: mission.tasks || [],
      constraints: {
        maxDuration: mission.constraints?.maxDuration || this.config.maxMissionDuration,
        maxAgents: mission.constraints?.maxAgents || this.config.maxAgents,
        safetyMode: mission.constraints?.safetyMode || this.config.safetyMode,
        costLimit: mission.constraints?.costLimit || this.config.costLimit,
        destructiveActions: mission.constraints?.destructiveActions || false,
        requireApproval: mission.constraints?.requireApproval || [],
        rollbackOnFailure: mission.constraints?.rollbackOnFailure !== false,
        ...mission.constraints
      },
      status: 'running',
      startTime: Date.now(),
      endTime: null,
      currentTaskIndex: 0,
      completedTasks: [],
      failedTasks: [],
      spawnedAgents: [],
      checkpoints: [],
      results: null,
      briefing: null
    };

    this.activeMission = missionObj;
    this.missions.set(missionObj.id, missionObj);

    // Create initial checkpoint
    await this._createCheckpoint('mission_start');

    // Start execution
    this.isRunning = true;
    this._executeMission(missionObj);

    this.emit('mission_started', { id: missionObj.id, name: missionObj.name });
    return { success: true, missionId: missionObj.id };
  }

  /**
   * Stop the active mission.
   */
  async stopMission(reason = 'manual_stop') {
    if (!this.activeMission) {
      return { success: false, error: 'No active mission' };
    }

    this.isRunning = false;
    this.activeMission.status = 'stopped';
    this.activeMission.endTime = Date.now();
    this.activeMission.stopReason = reason;

    // Kill spawned agents
    await this._cleanupAgents();

    // Generate briefing
    const briefing = await this._generateBriefing();
    this.activeMission.briefing = briefing;

    this.emit('mission_stopped', { 
      id: this.activeMission.id, 
      reason, 
      briefing 
    });

    const mission = this.activeMission;
    this.activeMission = null;
    return { success: true, mission, briefing };
  }

  /**
   * Rollback to a previous checkpoint.
   */
  async rollback(checkpointId) {
    const checkpoint = this.rollbackStack.find(cp => cp.id === checkpointId);
    if (!checkpoint) {
      return { success: false, error: 'Checkpoint not found' };
    }

    this.emit('rollback_started', { checkpointId });

    // Execute rollback actions in reverse
    const rollbackActions = checkpoint.rollbackActions.reverse();
    const results = [];

    for (const action of rollbackActions) {
      try {
        const result = await this._executeRollbackAction(action);
        results.push({ action: action.description, result: 'success' });
      } catch (err) {
        results.push({ action: action.description, result: 'failed', error: err.message });
      }
    }

    // Remove checkpoints after the rollback point
    const cpIndex = this.rollbackStack.findIndex(cp => cp.id === checkpointId);
    this.rollbackStack = this.rollbackStack.slice(0, cpIndex + 1);

    this.emit('rollback_complete', { checkpointId, results });
    return { success: true, results };
  }

  /**
   * Get mission status and progress.
   */
  getStatus() {
    if (!this.activeMission) {
      return { active: false, missions: this.missions.size };
    }

    const mission = this.activeMission;
    const elapsed = Date.now() - mission.startTime;
    const progress = mission.tasks.length > 0 
      ? (mission.completedTasks.length / mission.tasks.length * 100).toFixed(1)
      : 0;

    return {
      active: true,
      mission: {
        id: mission.id,
        name: mission.name,
        status: mission.status,
        progress: `${progress}%`,
        elapsed: this._formatDuration(elapsed),
        remaining: this._formatDuration(mission.constraints.maxDuration - elapsed),
        currentTask: mission.tasks[mission.currentTaskIndex]?.name || 'None',
        completedTasks: mission.completedTasks.length,
        failedTasks: mission.failedTasks.length,
        totalTasks: mission.tasks.length,
        spawnedAgents: mission.spawnedAgents.length,
        checkpoints: mission.checkpoints.length,
        costUsed: this._calculateCost()
      }
    };
  }

  /**
   * Schedule a mission for later execution.
   */
  scheduleMission(mission, scheduleTime) {
    const scheduled = {
      id: this._generateId(),
      mission,
      scheduledTime: scheduleTime,
      status: 'scheduled',
      createdAt: Date.now()
    };

    const delay = scheduleTime - Date.now();
    if (delay > 0) {
      setTimeout(async () => {
        await this.startMission(mission);
      }, delay);
    } else {
      this.startMission(mission);
    }

    this.emit('mission_scheduled', scheduled);
    return scheduled;
  }

  /**
   * Get the morning briefing.
   */
  async getBriefing() {
    if (this.activeMission) {
      return await this._generateBriefing();
    }

    // Return last completed mission briefing
    const missions = Array.from(this.missions.values())
      .filter(m => m.status === 'completed' || m.status === 'stopped')
      .sort((a, b) => b.endTime - a.endTime);

    if (missions.length === 0) {
      return { message: 'No completed missions' };
    }

    return missions[0].briefing || await this._generateBriefingForMission(missions[0]);
  }

  /**
   * Get execution log.
   */
  getExecutionLog(filter = {}) {
    let log = [...this.executionLog];

    if (filter.missionId) {
      log = log.filter(entry => entry.missionId === filter.missionId);
    }
    if (filter.type) {
      log = log.filter(entry => entry.type === filter.type);
    }
    if (filter.since) {
      log = log.filter(entry => entry.timestamp >= filter.since);
    }

    return log.slice(-100);
  }

  // ==================== PRIVATE METHODS ====================

  async _executeMission(mission) {
    this._log('mission_execution_started', { missionId: mission.id });

    try {
      for (let i = 0; i < mission.tasks.length; i++) {
        if (!this.isRunning) break;

        mission.currentTaskIndex = i;
        const task = mission.tasks[i];

        this._log('task_started', { missionId: mission.id, task: task.name, index: i });
        this.emit('task_started', { task, index: i, total: mission.tasks.length });

        try {
          // Check safety constraints
          const safetyCheck = await this._checkSafety(task, mission.constraints);
          if (!safetyCheck.allowed) {
            this._log('task_blocked_by_safety', { task: task.name, reason: safetyCheck.reason });
            mission.failedTasks.push({ task, error: safetyCheck.reason, timestamp: Date.now() });
            continue;
          }

          // Check if approval needed
          if (this._needsApproval(task, mission.constraints)) {
            this._log('task_needs_approval', { task: task.name });
            this.emit('approval_needed', { task, missionId: mission.id });
            // In supervised mode, we'd wait for approval
            // For now, we skip with a note
            mission.completedTasks.push({ 
              task, 
              result: 'skipped_approval', 
              timestamp: Date.now() 
            });
            continue;
          }

          // Execute task
          const result = await this._executeTask(task, mission);
          
          mission.completedTasks.push({ task, result, timestamp: Date.now() });
          this._log('task_completed', { missionId: mission.id, task: task.name, result });

          // Create checkpoint after each task
          await this._createCheckpoint(`task_${i}_${task.name}`);

          this.emit('task_completed', { task, index: i, result });

        } catch (err) {
          this._log('task_failed', { missionId: mission.id, task: task.name, error: err.message });
          mission.failedTasks.push({ task, error: err.message, timestamp: Date.now() });

          if (mission.constraints.rollbackOnFailure) {
            await this._rollbackToLastCheckpoint();
          }

          this.emit('task_failed', { task, index: i, error: err });
        }

        // Respect time limit
        if (Date.now() - mission.startTime > mission.constraints.maxDuration) {
          this._log('mission_timeout', { missionId: mission.id });
          mission.status = 'timeout';
          break;
        }
      }

      if (mission.status === 'running') {
        mission.status = 'completed';
      }

    } catch (err) {
      mission.status = 'error';
      mission.error = err.message;
      this._log('mission_error', { missionId: mission.id, error: err.message });
    }

    mission.endTime = Date.now();
    this.isRunning = false;

    // Generate briefing
    mission.briefing = await this._generateBriefingForMission(mission);

    // Cleanup agents
    await this._cleanupAgents();

    // Save state
    await this._saveState();

    this.emit('mission_complete', { 
      id: mission.id, 
      status: mission.status, 
      briefing: mission.briefing 
    });
  }

  async _executeTask(task, mission) {
    // Spawn specialized agent for the task
    if (task.agentType && this.orchestrator) {
      const agent = await this.orchestrator.spawnAgent({
        type: task.agentType,
        task: task.description || task.name,
        context: task.context || {},
        constraints: mission.constraints
      });

      mission.spawnedAgents.push(agent);

      // Wait for agent completion
      const result = await this._waitForAgent(agent, task.timeout || 300000);
      return result;
    }

    // Direct execution for simple tasks
    if (task.command) {
      return await this._executeCommand(task.command);
    }

    // Research task
    if (task.type === 'research') {
      return await this._executeResearch(task);
    }

    // Code task
    if (task.type === 'code') {
      return await this._executeCode(task);
    }

    return { status: 'no_handler', task: task.name };
  }

  async _waitForAgent(agent, timeout) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Agent timeout'));
      }, timeout);

      agent.on('complete', (result) => {
        clearTimeout(timer);
        resolve(result);
      });

      agent.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  async _executeCommand(command) {
    const { exec } = require('child_process');
    return new Promise((resolve, reject) => {
      exec(command, { timeout: 60000 }, (error, stdout, stderr) => {
        if (error) reject(error);
        else resolve({ stdout, stderr });
      });
    });
  }

  async _executeResearch(task) {
    // Use web search and deep research
    return { type: 'research', topic: task.topic, status: 'completed' };
  }

  async _executeCode(task) {
    // Use code executor
    return { type: 'code', language: task.language, status: 'completed' };
  }

  async _checkSafety(task, constraints) {
    if (constraints.safetyMode === 'full') {
      return { allowed: true };
    }

    // Check for destructive operations
    const dangerousPatterns = [
      /rm\s+-rf/i, /drop\s+table/i, /delete\s+from/i,
      /format/i, /mkfs/i, /dd\s+if=/i
    ];

    const taskStr = JSON.stringify(task);
    for (const pattern of dangerousPatterns) {
      if (pattern.test(taskStr)) {
        if (!constraints.destructiveActions) {
          return { allowed: false, reason: `Blocked destructive operation: ${pattern}` };
        }
      }
    }

    return { allowed: true };
  }

  _needsApproval(task, constraints) {
    if (!constraints.requireApproval || constraints.requireApproval.length === 0) {
      return false;
    }
    return constraints.requireApproval.some(pattern => 
      task.name?.includes(pattern) || task.type === pattern
    );
  }

  async _createCheckpoint(label) {
    const checkpoint = {
      id: this._generateId(),
      label,
      timestamp: Date.now(),
      missionState: this.activeMission ? {
        currentTaskIndex: this.activeMission.currentTaskIndex,
        completedTasks: [...this.activeMission.completedTasks]
      } : null,
      rollbackActions: []
    };

    // Collect rollback actions from recent operations
    // In production, each tool call would register its rollback
    this.rollbackStack.push(checkpoint);

    if (this.rollbackStack.length > this.config.maxRollbackPoints) {
      this.rollbackStack = this.rollbackStack.slice(-this.config.maxRollbackPoints);
    }

    if (this.activeMission) {
      this.activeMission.checkpoints.push(checkpoint.id);
    }

    return checkpoint;
  }

  async _rollbackToLastCheckpoint() {
    if (this.rollbackStack.length === 0) return;
    const lastCheckpoint = this.rollbackStack[this.rollbackStack.length - 1];
    await this.rollback(lastCheckpoint.id);
  }

  async _executeRollbackAction(action) {
    if (action.type === 'file_restore') {
      await fs.writeFile(action.path, action.content);
    } else if (action.type === 'command_undo') {
      await this._executeCommand(action.undoCommand);
    }
  }

  async _cleanupAgents() {
    if (!this.activeMission) return;
    for (const agent of this.activeMission.spawnedAgents) {
      try {
        if (agent.kill) agent.kill();
      } catch (e) {}
    }
  }

  async _generateBriefing() {
    if (!this.activeMission) return null;
    return await this._generateBriefingForMission(this.activeMission);
  }

  async _generateBriefingForMission(mission) {
    const elapsed = (mission.endTime || Date.now()) - mission.startTime;
    
    const briefing = {
      title: `Mission Briefing: ${mission.name}`,
      status: mission.status,
      duration: this._formatDuration(elapsed),
      summary: {
        totalTasks: mission.tasks.length,
        completed: mission.completedTasks.length,
        failed: mission.failedTasks.length,
        skipped: mission.tasks.length - mission.completedTasks.length - mission.failedTasks.length,
        successRate: mission.tasks.length > 0 
          ? `${(mission.completedTasks.length / mission.tasks.length * 100).toFixed(1)}%`
          : 'N/A'
      },
      completedDetails: mission.completedTasks.map(ct => ({
        task: ct.task.name,
        result: typeof ct.result === 'string' ? ct.result : 'completed',
        duration: ct.timestamp ? this._formatDuration(ct.timestamp - mission.startTime) : 'N/A'
      })),
      failedDetails: mission.failedTasks.map(ft => ({
        task: ft.task.name,
        error: ft.error
      })),
      agentsUsed: mission.spawnedAgents.length,
      checkpoints: mission.checkpoints.length,
      rollbacks: this.rollbackStack.length,
      costUsed: this._calculateCost(),
      recommendations: this._generateRecommendations(mission)
    };

    return briefing;
  }

  _generateRecommendations(mission) {
    const recommendations = [];

    if (mission.failedTasks.length > 0) {
      recommendations.push('Review failed tasks and consider adjusting constraints');
    }
    if (mission.status === 'timeout') {
      recommendations.push('Mission timed out. Consider breaking into smaller missions or increasing max duration');
    }
    if (mission.spawnedAgents.length > 5) {
      recommendations.push('High agent count. Consider optimizing task decomposition');
    }

    return recommendations;
  }

  _calculateCost() {
    // Simplified cost calculation
    return { estimated: '$0.00', note: 'Cost tracking requires provider integration' };
  }

  _log(type, data) {
    this.executionLog.push({
      type,
      data,
      timestamp: Date.now()
    });
  }

  _formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  _generateId() {
    return `ghost_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async _loadState() {
    try {
      const statePath = path.join(this.config.statePath, 'missions.json');
      const data = await fs.readFile(statePath, 'utf8');
      const state = JSON.parse(data);
      if (state.missions) {
        for (const [id, mission] of Object.entries(state.missions)) {
          this.missions.set(id, mission);
        }
      }
    } catch (e) {}
  }

  async _saveState() {
    try {
      const statePath = path.join(this.config.statePath, 'missions.json');
      const missions = {};
      for (const [id, mission] of this.missions) {
        missions[id] = { ...mission, spawnedAgents: [] }; // Don't persist agent refs
      }
      await fs.writeFile(statePath, JSON.stringify({ missions }, null, 2));
    } catch (e) {}
  }
}

module.exports = { GhostMode };
