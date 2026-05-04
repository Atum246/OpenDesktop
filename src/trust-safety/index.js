'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

// ═══════════════════════════════════════════════════════════════
//  TRUST & SAFETY LAYER — You Can Actually Trust It 🛡️✅
//  Action preview, rollback, permissions, audit trail, sandbox
// ═══════════════════════════════════════════════════════════════

class TrustSafety {
  constructor(config, security) {
    this.config = config;
    this.security = security;
    this.dataDir = path.join(os.homedir(), '.opendesktop', 'trust');
    if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });

    this.mode = 'safe'; // 'safe', 'supervised', 'full'
    this.actionQueue = []; // Actions pending approval
    this.rollbackStack = []; // Undoable actions
    this.maxRollback = 100;
    this.auditTrail = [];
    this.sandboxEnabled = false;
    this.sandboxDir = path.join(this.dataDir, 'sandbox');
    if (!fs.existsSync(this.sandboxDir)) fs.mkdirSync(this.sandboxDir, { recursive: true });

    this._loadState();
  }

  // ═══ ACTION PREVIEW ═══

  async previewAction(action, context = {}) {
    const preview = {
      id: `preview_${Date.now().toString(36)}`,
      action,
      type: this._classifyAction(action),
      risk: this._assessRisk(action),
      reversible: this._isReversible(action),
      description: this._describeAction(action, context),
      estimatedDuration: this._estimateDuration(action),
      sideEffects: this._identifySideEffects(action),
      alternatives: this._suggestAlternatives(action),
      timestamp: Date.now()
    };

    this._audit('action-preview', preview);
    return preview;
  }

  // ═══ ACTION APPROVAL ═══

  async requestApproval(action, context = {}) {
    const preview = await this.previewAction(action, context);

    if (this.mode === 'full') {
      return { approved: true, preview, reason: 'Full control mode' };
    }

    if (preview.risk === 'low') {
      return { approved: true, preview, reason: 'Low risk action' };
    }

    if (preview.risk === 'critical') {
      return { approved: false, preview, reason: 'Critical risk — requires manual approval in supervised mode' };
    }

    // In safe mode, medium+ risk requires approval
    if (this.mode === 'safe' && preview.risk !== 'low') {
      this.actionQueue.push({ preview, context, requestedAt: Date.now() });
      return { approved: false, preview, reason: `Pending approval (${this.mode} mode)`, queuePosition: this.actionQueue.length };
    }

    return { approved: true, preview, reason: 'Within risk tolerance' };
  }

  approveAction(previewId) {
    const idx = this.actionQueue.findIndex(a => a.preview.id === previewId);
    if (idx === -1) return { error: 'Action not found in queue' };

    const action = this.actionQueue.splice(idx, 1)[0];
    this._audit('action-approved', { previewId, action: action.preview.action });
    return { approved: true, action };
  }

  denyAction(previewId) {
    const idx = this.actionQueue.findIndex(a => a.preview.id === previewId);
    if (idx === -1) return { error: 'Action not found in queue' };

    const action = this.actionQueue.splice(idx, 1)[0];
    this._audit('action-denied', { previewId, action: action.preview.action });
    return { denied: true, action };
  }

  getPendingApprovals() {
    return this.actionQueue;
  }

  // ═══ ROLLBACK SYSTEM ═══

  recordRollback(action, undoData) {
    const entry = {
      id: `rollback_${Date.now().toString(36)}`,
      action,
      undoData,
      timestamp: Date.now(),
      undone: false
    };

    this.rollbackStack.push(entry);
    if (this.rollbackStack.length > this.maxRollback) {
      this.rollbackStack.shift();
    }

    this._audit('rollback-recorded', { id: entry.id, action: action.type || action.description });
    return entry.id;
  }

  async rollback(rollbackId) {
    const entry = this.rollbackStack.find(r => r.id === rollbackId);
    if (!entry) return { error: 'Rollback entry not found' };
    if (entry.undone) return { error: 'Already rolled back' };

    try {
      await this._executeRollback(entry);
      entry.undone = true;
      entry.undoneAt = Date.now();
      this._audit('rollback-executed', { id: rollbackId, action: entry.action.type });
      return { rolledBack: true, id: rollbackId };
    } catch (err) {
      return { error: `Rollback failed: ${err.message}` };
    }
  }

  async _executeRollback(entry) {
    const { undoData } = entry;
    if (!undoData) return;

    switch (undoData.type) {
      case 'file-write':
        if (undoData.backupPath && fs.existsSync(undoData.backupPath)) {
          fs.copyFileSync(undoData.backupPath, undoData.originalPath);
        }
        break;
      case 'file-delete':
        if (undoData.content) {
          fs.writeFileSync(undoData.path, undoData.content);
        }
        break;
      case 'command':
        if (undoData.undoCommand) {
          const { exec } = require('child_process');
          await new Promise((resolve, reject) => {
            exec(undoData.undoCommand, { timeout: 30000 }, (err) => err ? reject(err) : resolve());
          });
        }
        break;
    }
  }

  getRollbackStack() {
    return this.rollbackStack.filter(r => !r.undone).reverse();
  }

  // ═══ PERMISSION TIERS ═══

  setMode(mode) {
    if (!['safe', 'supervised', 'full'].includes(mode)) {
      return { error: 'Invalid mode. Use: safe, supervised, full' };
    }
    this.mode = mode;
    this._audit('mode-changed', { mode });
    this._saveState();
    return { mode, description: this._modeDescription(mode) };
  }

  _modeDescription(mode) {
    const descriptions = {
      safe: '🛡️ Safe Mode — Read-only by default, destructive actions blocked, approval required for risky operations',
      supervised: '👁️ Supervised Mode — Most actions allowed, critical operations need approval',
      full: '⚡ Full Control — All actions allowed without approval (use with caution)'
    };
    return descriptions[mode];
  }

  getMode() {
    return {
      mode: this.mode,
      description: this._modeDescription(this.mode),
      pendingApprovals: this.actionQueue.length,
      rollbacksAvailable: this.rollbackStack.filter(r => !r.undone).length
    };
  }

  // ═══ SANDBOX ═══

  enableSandbox() {
    this.sandboxEnabled = true;
    this._audit('sandbox-enabled');
    return { sandboxed: true, sandboxDir: this.sandboxDir };
  }

  disableSandbox() {
    this.sandboxEnabled = false;
    this._audit('sandbox-disabled');
    return { sandboxed: false };
  }

  sandboxPath(originalPath) {
    if (!this.sandboxEnabled) return originalPath;
    const relative = path.relative(process.cwd(), originalPath);
    return path.join(this.sandboxDir, relative);
  }

  // ═══ RISK ASSESSMENT ═══

  _classifyAction(action) {
    const desc = (action.description || action.type || action.command || '').toLowerCase();

    if (/read|list|get|view|show|check|status|info|search|find/.test(desc)) return 'read';
    if (/write|create|update|edit|modify|save|set|add/.test(desc)) return 'write';
    if (/delete|remove|drop|clear|purge|destroy|kill/.test(desc)) return 'destructive';
    if (/install|deploy|publish|push|send|execute|run/.test(desc)) return 'execute';
    if (/network|http|fetch|request|download|upload|api/.test(desc)) return 'network';
    return 'unknown';
  }

  _assessRisk(action) {
    const type = this._classifyAction(action);
    const desc = (action.description || action.type || action.command || '').toLowerCase();

    // Critical risk
    if (/rm\s+-rf|drop\s+table|format|mkfs|dd\s+if|shutdown|reboot/.test(desc)) return 'critical';
    if (/delete.*system|remove.*root|kill.*-9\s+1/.test(desc)) return 'critical';

    // High risk
    if (type === 'destructive') return 'high';
    if (/install|deploy|publish|chmod|chown|passwd/.test(desc)) return 'high';
    if (/sudo|admin|root/.test(desc)) return 'high';

    // Medium risk
    if (type === 'write' || type === 'execute' || type === 'network') return 'medium';

    // Low risk
    if (type === 'read') return 'low';

    return 'medium'; // Default to medium for unknown
  }

  _isReversible(action) {
    const desc = (action.description || action.type || action.command || '').toLowerCase();
    if (/read|list|get|view|show|check|search/.test(desc)) return true; // Reads are always "reversible"
    if (/delete|remove|drop|format|mkfs/.test(desc)) return false;
    if (/write|create|update|edit/.test(desc)) return true; // Can be rolled back with backup
    return true;
  }

  _describeAction(action, context) {
    const type = action.type || action.description || 'unknown action';
    const target = action.target || action.path || action.command || '';
    return `${type}${target ? ` on ${target}` : ''}`;
  }

  _estimateDuration(action) {
    const type = this._classifyAction(action);
    const estimates = { read: '<1s', write: '<5s', destructive: '<5s', execute: '5-60s', network: '1-30s' };
    return estimates[type] || 'unknown';
  }

  _identifySideEffects(action) {
    const effects = [];
    const desc = (action.description || action.type || action.command || '').toLowerCase();

    if (/write|create|edit|modify/.test(desc)) effects.push('File system modification');
    if (/delete|remove/.test(desc)) effects.push('Data deletion (may be permanent)');
    if (/install|deploy/.test(desc)) effects.push('System configuration change');
    if (/network|http|fetch|send/.test(desc)) effects.push('External network request');
    if (/execute|run|exec/.test(desc)) effects.push('Code/command execution');

    return effects;
  }

  _suggestAlternatives(action) {
    const alternatives = [];
    const desc = (action.description || action.type || action.command || '').toLowerCase();

    if (/delete|remove/.test(desc)) alternatives.push('Move to trash instead of permanent delete');
    if (/write|overwrite/.test(desc)) alternatives.push('Create backup before modifying');
    if (/execute|run/.test(desc)) alternatives.push('Run in sandbox first');
    if (/install/.test(desc)) alternatives.push('Check if already installed');

    return alternatives;
  }

  // ═══ AUDIT TRAIL ═══

  _audit(action, details = {}) {
    const entry = {
      id: `audit_${Date.now().toString(36)}`,
      action,
      details,
      mode: this.mode,
      sandboxed: this.sandboxEnabled,
      timestamp: new Date().toISOString(),
      pid: process.pid
    };

    this.auditTrail.push(entry);
    if (this.auditTrail.length > 5000) this.auditTrail = this.auditTrail.slice(-2500);

    // Also log to security module if available
    if (this.security) {
      this.security.audit(action, details);
    }

    return entry;
  }

  getAuditTrail(options = {}) {
    let entries = [...this.auditTrail];
    if (options.action) entries = entries.filter(e => e.action === options.action);
    if (options.since) entries = entries.filter(e => new Date(e.timestamp) >= new Date(options.since));
    if (options.limit) entries = entries.slice(-options.limit);
    return entries;
  }

  // ═══ SAFE EXECUTION WRAPPER ═══

  async safeExecute(action, executor, options = {}) {
    // Preview
    const preview = await this.previewAction(action);
    if (preview.risk === 'critical' && this.mode !== 'full') {
      return { blocked: true, reason: 'Critical risk blocked', preview };
    }

    // Backup if destructive
    let backupId = null;
    if (preview.type === 'write' || preview.type === 'destructive') {
      if (action.path && fs.existsSync(action.path)) {
        const backupPath = path.join(this.dataDir, 'backups', `${Date.now()}_${path.basename(action.path)}`);
        const backupDir = path.dirname(backupPath);
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
        fs.copyFileSync(action.path, backupPath);
        backupId = this.recordRollback(action, {
          type: 'file-write',
          originalPath: action.path,
          backupPath
        });
      }
    }

    // Execute
    const startTime = Date.now();
    try {
      const result = await executor();
      this._audit('action-executed', {
        action: action.type || action.description,
        duration: Date.now() - startTime,
        success: true,
        backupId
      });
      return { success: true, result, backupId, duration: Date.now() - startTime };
    } catch (err) {
      this._audit('action-failed', {
        action: action.type || action.description,
        error: err.message,
        duration: Date.now() - startTime,
        backupId
      });
      return { success: false, error: err.message, backupId };
    }
  }

  // ═══ STATE ═══
  _saveState() {
    try {
      fs.writeFileSync(path.join(this.dataDir, 'state.json'), JSON.stringify({
        mode: this.mode,
        sandboxEnabled: this.sandboxEnabled,
        auditTrail: this.auditTrail.slice(-500),
        rollbackCount: this.rollbackStack.length
      }, null, 2));
    } catch {}
  }

  _loadState() {
    try {
      const file = path.join(this.dataDir, 'state.json');
      if (fs.existsSync(file)) {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        this.mode = data.mode || 'safe';
        this.sandboxEnabled = data.sandboxEnabled || false;
        this.auditTrail = data.auditTrail || [];
      }
    } catch {}
  }

  // ═══ STATUS ═══
  getStatus() {
    return {
      mode: this.mode,
      sandboxEnabled: this.sandboxEnabled,
      pendingApprovals: this.actionQueue.length,
      rollbacksAvailable: this.rollbackStack.filter(r => !r.undone).length,
      totalRollbacks: this.rollbackStack.length,
      auditEntries: this.auditTrail.length
    };
  }
}

module.exports = TrustSafety;
