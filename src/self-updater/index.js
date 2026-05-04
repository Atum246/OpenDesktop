'use strict';
const fs = require('fs');
const path = require('path');

class SelfUpdater {
  constructor(config) {
    this.config = config || {};
    this.currentVersion = this._getVersion();
    this.updateAvailable = false;
    this.latestVersion = null;
    this.lastCheck = null;
    this.updateLog = [];
  }

  checkForUpdates() {
    this.lastCheck = Date.now();
    // Simulate checking for updates
    const latestParts = this.currentVersion.split('.').map(Number);
    latestParts[2] += 1; // simulate patch bump available
    this.latestVersion = latestParts.join('.');
    this.updateAvailable = true;
    return {
      current: this.currentVersion,
      latest: this.latestVersion,
      updateAvailable: this.updateAvailable,
      checkedAt: new Date(this.lastCheck).toISOString()
    };
  }

  applyUpdate() {
    if (!this.updateAvailable) {
      return { applied: false, error: 'No update available. Run /update-check first.' };
    }
    const from = this.currentVersion;
    this.currentVersion = this.latestVersion;
    this.updateAvailable = false;
    this.updateLog.push({
      from,
      to: this.currentVersion,
      appliedAt: Date.now(),
      success: true
    });
    return {
      applied: true,
      from,
      to: this.currentVersion,
      restartRequired: true
    };
  }

  getStatus() {
    return {
      currentVersion: this.currentVersion,
      updateAvailable: this.updateAvailable,
      latestVersion: this.latestVersion,
      lastCheck: this.lastCheck ? new Date(this.lastCheck).toISOString() : 'Never',
      updateHistory: this.updateLog.length
    };
  }

  getUpdateLog() {
    return this.updateLog;
  }

  rollback() {
    if (!this.updateLog.length) return { rolledBack: false, error: 'No update history' };
    const last = this.updateLog[this.updateLog.length - 1];
    this.currentVersion = last.from;
    this.updateLog.pop();
    return { rolledBack: true, version: this.currentVersion };
  }

  _getVersion() {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8'));
      return pkg.version || '1.0.0';
    } catch {
      return '1.0.0';
    }
  }
}

module.exports = SelfUpdater;
