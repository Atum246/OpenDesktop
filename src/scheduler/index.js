'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { EventEmitter } = require('events');

// ═══════════════════════════════════════════════════════════════
//  TASK SCHEDULER — Cron-like Scheduling for OpenDesktop ⏰📋
//  Schedule tasks, recurring jobs, time-based automation
// ═══════════════════════════════════════════════════════════════

class TaskScheduler extends EventEmitter {
  constructor(config, automation, provider) {
    super();
    this.config = config;
    this.automation = automation;
    this.provider = provider;
    this.jobs = new Map();
    this.jobCounter = 0;
    this.running = false;
    this.dataDir = path.join(os.homedir(), '.opendesktop', 'scheduler');
    if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
    this._loadJobs();
  }

  // ─── START SCHEDULER ───
  start() {
    if (this.running) return;
    this.running = true;
    this._interval = setInterval(() => this._tick(), 1000); // Check every second
    this.emit('started');
    return { started: true, jobs: this.jobs.size };
  }

  stop() {
    this.running = false;
    if (this._interval) clearInterval(this._interval);
    this.emit('stopped');
    return { stopped: true };
  }

  // ─── ADD JOB ───
  addJob(options = {}) {
    const id = `job_${++this.jobCounter}_${Date.now().toString(36)}`;
    const job = {
      id,
      name: options.name || `Job-${this.jobCounter}`,
      type: options.type || 'once', // 'once', 'interval', 'cron', 'daily', 'weekly', 'monthly'
      action: options.action, // { type: 'command'|'chat'|'function', value: '...' }
      schedule: options.schedule || {}, // { interval: 60000, cron: '0 9 * * *', time: '09:00', day: 'monday' }
      enabled: options.enabled !== false,
      lastRun: null,
      nextRun: this._calculateNextRun(options.type, options.schedule),
      runCount: 0,
      maxRuns: options.maxRuns || Infinity,
      timeout: options.timeout || 60000,
      onError: options.onError || 'retry', // 'retry', 'skip', 'stop'
      retryCount: options.retryCount || 3,
      metadata: options.metadata || {},
      created: new Date().toISOString()
    };

    this.jobs.set(id, job);
    this._saveJobs();
    this.emit('job-added', job);
    return { id, name: job.name, nextRun: job.nextRun };
  }

  // ─── REMOVE JOB ───
  removeJob(id) {
    const job = this.jobs.get(id);
    if (!job) return { error: `Job ${id} not found` };
    this.jobs.delete(id);
    this._saveJobs();
    this.emit('job-removed', job);
    return { removed: true, id, name: job.name };
  }

  // ─── ENABLE/DISABLE JOB ───
  enableJob(id) {
    const job = this.jobs.get(id);
    if (!job) return { error: `Job ${id} not found` };
    job.enabled = true;
    job.nextRun = this._calculateNextRun(job.type, job.schedule);
    this._saveJobs();
    return { enabled: true, id, name: job.name };
  }

  disableJob(id) {
    const job = this.jobs.get(id);
    if (!job) return { error: `Job ${id} not found` };
    job.enabled = false;
    this._saveJobs();
    return { disabled: true, id, name: job.name };
  }

  // ─── RUN JOB NOW ───
  async runJob(id) {
    const job = this.jobs.get(id);
    if (!job) return { error: `Job ${id} not found` };
    return this._executeJob(job);
  }

  // ─── TICK — Check and run due jobs ───
  async _tick() {
    if (!this.running) return;
    const now = Date.now();

    for (const [id, job] of this.jobs) {
      if (!job.enabled) continue;
      if (job.nextRun && job.nextRun <= now) {
        if (job.runCount >= job.maxRuns) {
          job.enabled = false;
          this.emit('job-max-runs', job);
          continue;
        }
        await this._executeJob(job);
      }
    }
  }

  // ─── EXECUTE JOB ───
  async _executeJob(job) {
    const startTime = Date.now();
    job.lastRun = startTime;
    job.runCount++;

    this.emit('job-start', { id: job.id, name: job.name, run: job.runCount });

    let result;
    let retries = 0;
    const maxRetries = job.onError === 'retry' ? job.retryCount : 0;

    while (retries <= maxRetries) {
      try {
        result = await this._runAction(job.action, job.timeout);
        break;
      } catch (err) {
        retries++;
        if (retries > maxRetries) {
          result = { success: false, error: err.message };
          this.emit('job-error', { id: job.id, name: job.name, error: err.message });
          if (job.onError === 'stop') {
            job.enabled = false;
          }
        }
      }
    }

    const duration = Date.now() - startTime;

    // Calculate next run
    job.nextRun = this._calculateNextRun(job.type, job.schedule);

    // Log execution
    const logEntry = {
      jobId: job.id,
      name: job.name,
      run: job.runCount,
      success: result?.success !== false,
      duration,
      timestamp: new Date().toISOString(),
      error: result?.error
    };

    this._logExecution(logEntry);
    this._saveJobs();

    this.emit('job-complete', { ...logEntry, result });

    return { ...logEntry, result };
  }

  // ─── RUN ACTION ───
  async _runAction(action, timeout) {
    if (!action) return { success: false, error: 'No action defined' };

    switch (action.type) {
      case 'command':
        return await this.automation.runCommand(action.value, { timeout });
      case 'chat':
        if (this.provider) {
          const response = await this.provider.chat(action.value, { maxTokens: 1024 });
          return { success: true, response };
        }
        return { success: false, error: 'Provider not available' };
      case 'notify':
        return await this.automation.notify(action.title || 'OpenDesktop', action.value);
      case 'function':
        if (typeof action.value === 'function') {
          const result = await action.value();
          return { success: true, result };
        }
        return { success: false, error: 'Invalid function' };
      default:
        return { success: false, error: `Unknown action type: ${action.type}` };
    }
  }

  // ─── CALCULATE NEXT RUN ───
  _calculateNextRun(type, schedule) {
    const now = Date.now();
    if (!schedule) return now + 1000;

    switch (type) {
      case 'once':
        if (schedule.at) return new Date(schedule.at).getTime();
        if (schedule.delay) return now + schedule.delay;
        return now + 1000; // Run in 1 second

      case 'interval':
        return now + (schedule.interval || 60000);

      case 'daily': {
        const [hours, minutes] = (schedule.time || '09:00').split(':').map(Number);
        const next = new Date();
        next.setHours(hours, minutes, 0, 0);
        if (next.getTime() <= now) next.setDate(next.getDate() + 1);
        return next.getTime();
      }

      case 'weekly': {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const targetDay = days.indexOf((schedule.day || 'monday').toLowerCase());
        const [wh, wm] = (schedule.time || '09:00').split(':').map(Number);
        const next = new Date();
        next.setHours(wh, wm, 0, 0);
        const currentDay = next.getDay();
        let daysUntil = targetDay - currentDay;
        if (daysUntil < 0 || (daysUntil === 0 && next.getTime() <= now)) daysUntil += 7;
        next.setDate(next.getDate() + daysUntil);
        return next.getTime();
      }

      case 'monthly': {
        const targetDate = schedule.date || 1;
        const [mh, mm] = (schedule.time || '09:00').split(':').map(Number);
        const next = new Date();
        next.setDate(targetDate);
        next.setHours(mh, mm, 0, 0);
        if (next.getTime() <= now) next.setMonth(next.getMonth() + 1);
        return next.getTime();
      }

      case 'cron':
        return this._parseCronNext(schedule.cron || '0 * * * *');

      default:
        return now + 60000;
    }
  }

  // ─── CRON PARSER (simplified) ───
  _parseCronNext(cronExpr) {
    // Simplified cron parser: minute hour day month weekday
    const parts = cronExpr.split(' ');
    if (parts.length < 5) return Date.now() + 60000;

    const now = new Date();
    const next = new Date(now);
    next.setSeconds(0, 0);

    const [min, hour, day, month, weekday] = parts;

    // Simple next-run calculation
    if (min !== '*') next.setMinutes(parseInt(min));
    if (hour !== '*') next.setHours(parseInt(hour));

    if (next.getTime() <= now.getTime()) {
      next.setDate(next.getDate() + 1);
    }

    return next.getTime();
  }

  // ─── LOG EXECUTION ───
  _logExecution(entry) {
    const logFile = path.join(this.dataDir, 'execution-log.json');
    let log = [];
    try { log = JSON.parse(fs.readFileSync(logFile, 'utf8')); } catch {}
    log.push(entry);
    if (log.length > 1000) log = log.slice(-500);
    fs.writeFileSync(logFile, JSON.stringify(log, null, 2));
  }

  // ─── SAVE/LOAD JOBS ───
  _saveJobs() {
    try {
      const data = [...this.jobs.values()].map(j => ({
        ...j,
        action: j.action?.type === 'function' ? { type: 'function', value: '[Function]' } : j.action
      }));
      fs.writeFileSync(path.join(this.dataDir, 'jobs.json'), JSON.stringify(data, null, 2));
    } catch {}
  }

  _loadJobs() {
    try {
      const file = path.join(this.dataDir, 'jobs.json');
      if (fs.existsSync(file)) {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        for (const j of data) {
          this.jobs.set(j.id, j);
          this.jobCounter = Math.max(this.jobCounter, parseInt(j.id.split('_')[1]) || 0);
        }
      }
    } catch {}
  }

  // ─── QUICK SCHEDULE HELPERS ───
  scheduleIn(name, delayMs, action) {
    return this.addJob({ name, type: 'once', schedule: { delay: delayMs }, action });
  }

  scheduleEvery(name, intervalMs, action) {
    return this.addJob({ name, type: 'interval', schedule: { interval: intervalMs }, action });
  }

  scheduleDaily(name, time, action) {
    return this.addJob({ name, type: 'daily', schedule: { time }, action });
  }

  scheduleWeekly(name, day, time, action) {
    return this.addJob({ name, type: 'weekly', schedule: { day, time }, action });
  }

  scheduleCron(name, cronExpr, action) {
    return this.addJob({ name, type: 'cron', schedule: { cron: cronExpr }, action });
  }

  // ─── LIST JOBS ───
  listJobs() {
    return [...this.jobs.values()].map(j => ({
      id: j.id,
      name: j.name,
      type: j.type,
      enabled: j.enabled,
      lastRun: j.lastRun ? new Date(j.lastRun).toISOString() : 'Never',
      nextRun: j.nextRun ? new Date(j.nextRun).toISOString() : 'N/A',
      runCount: j.runCount
    }));
  }

  getJob(id) { return this.jobs.get(id); }

  // ─── STATUS ───
  getStatus() {
    const jobs = [...this.jobs.values()];
    return {
      running: this.running,
      totalJobs: jobs.length,
      enabledJobs: jobs.filter(j => j.enabled).length,
      disabledJobs: jobs.filter(j => !j.enabled).length,
      nextJob: jobs.filter(j => j.enabled && j.nextRun).sort((a, b) => a.nextRun - b.nextRun)[0]?.name || 'None'
    };
  }
}

module.exports = TaskScheduler;
