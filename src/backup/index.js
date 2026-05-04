'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { exec, execSync } = require('child_process');
const { EventEmitter } = require('events');

// ═══════════════════════════════════════════════════════════════
//  BACKUP MANAGER — Full System Backup & Restore 💾🔐
//  Backup all data, encrypted archives, auto-backup scheduling
// ═══════════════════════════════════════════════════════════════

class BackupManager extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.dataDir = path.join(os.homedir(), '.opendesktop');
    this.backupDir = path.join(this.dataDir, 'backups');
    if (!fs.existsSync(this.backupDir)) fs.mkdirSync(this.backupDir, { recursive: true });
    this.backups = this._loadBackupIndex();
  }

  // ─── CREATE BACKUP ───
  async createBackup(options = {}) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const name = options.name || `backup_${timestamp}`;
    const backupPath = path.join(this.backupDir, `${name}.tar.gz`);

    this.emit('backup-start', { name });

    try {
      // Directories to backup
      const dirsToBackup = [
        'memory',
        'brain',
        'evolution',
        'security',
        'proactive',
        'plugins',
        'workflows',
        'personas',
        'iot',
        'scheduler'
      ].map(d => path.join(this.dataDir, d)).filter(d => fs.existsSync(d));

      // Files to backup
      const filesToBackup = [
        path.join(this.dataDir, 'config.json'),
        path.join(this.dataDir, 'user-profile.json')
      ].filter(f => fs.existsSync(f));

      // Create tar archive
      const allPaths = [...dirsToBackup, ...filesToBackup].map(p => `"${p}"`).join(' ');

      if (allPaths) {
        execSync(`tar -czf "${backupPath}" -C "${this.dataDir}" ${dirsToBackup.map(d => path.basename(d)).join(' ')} ${filesToBackup.map(f => path.basename(f)).join(' ')} 2>/dev/null || true`, { timeout: 60000 });
      }

      // Calculate hash
      const hash = this._hashFile(backupPath);
      const stat = fs.statSync(backupPath);

      const backupEntry = {
        name,
        path: backupPath,
        size: stat.size,
        sizeHuman: this._formatBytes(stat.size),
        hash,
        encrypted: false,
        timestamp: new Date().toISOString(),
        contents: [...dirsToBackup.map(d => path.basename(d)), ...filesToBackup.map(f => path.basename(f))]
      };

      this.backups.push(backupEntry);
      this._saveBackupIndex();

      this.emit('backup-complete', backupEntry);

      return {
        success: true,
        ...backupEntry
      };
    } catch (err) {
      this.emit('backup-error', { name, error: err.message });
      return { success: false, error: err.message };
    }
  }

  // ─── RESTORE BACKUP ───
  async restoreBackup(backupName, options = {}) {
    const backup = this.backups.find(b => b.name === backupName);
    if (!backup) return { error: `Backup ${backupName} not found` };

    if (!fs.existsSync(backup.path)) return { error: `Backup file not found: ${backup.path}` };

    this.emit('restore-start', { name: backupName });

    try {
      // Verify hash
      const currentHash = this._hashFile(backup.path);
      if (currentHash !== backup.hash) {
        return { error: 'Backup file integrity check failed — hash mismatch' };
      }

      // Create pre-restore backup
      if (!options.noPreBackup) {
        await this.createBackup({ name: `pre-restore_${Date.now()}` });
      }

      // Extract archive
      const extractDir = options.dryRun ? path.join(os.tmpdir(), 'opendesktop-restore') : this.dataDir;
      if (options.dryRun && !fs.existsSync(extractDir)) fs.mkdirSync(extractDir, { recursive: true });

      execSync(`tar -xzf "${backup.path}" -C "${extractDir}" 2>/dev/null || true`, { timeout: 60000 });

      this.emit('restore-complete', { name: backupName });

      return {
        success: true,
        name: backupName,
        restoredTo: extractDir,
        dryRun: options.dryRun || false
      };
    } catch (err) {
      this.emit('restore-error', { name: backupName, error: err.message });
      return { success: false, error: err.message };
    }
  }

  // ─── ENCRYPTED BACKUP ───
  async createEncryptedBackup(password, options = {}) {
    const result = await this.createBackup(options);
    if (!result.success) return result;

    try {
      const encryptedPath = result.path + '.enc';
      const content = fs.readFileSync(result.path);
      const key = crypto.scryptSync(password, 'opendesktop-salt', 32);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

      let encrypted = cipher.update(content);
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      const authTag = cipher.getAuthTag();

      // Write: IV + authTag + encrypted data
      const output = Buffer.concat([iv, authTag, encrypted]);
      fs.writeFileSync(encryptedPath, output);

      // Update backup entry
      const entry = this.backups.find(b => b.name === result.name);
      if (entry) {
        entry.encrypted = true;
        entry.encryptedPath = encryptedPath;
        this._saveBackupIndex();
      }

      // Remove unencrypted backup
      fs.unlinkSync(result.path);

      return { success: true, name: result.name, path: encryptedPath, encrypted: true };
    } catch (err) {
      return { success: false, error: `Encryption failed: ${err.message}` };
    }
  }

  // ─── DECRYPT & RESTORE ───
  async restoreEncryptedBackup(backupName, password) {
    const backup = this.backups.find(b => b.name === backupName);
    if (!backup) return { error: `Backup ${backupName} not found` };

    const encPath = backup.encryptedPath || backup.path;
    if (!fs.existsSync(encPath)) return { error: 'Encrypted backup file not found' };

    try {
      const data = fs.readFileSync(encPath);
      const key = crypto.scryptSync(password, 'opendesktop-salt', 32);
      const iv = data.slice(0, 16);
      const authTag = data.slice(16, 32);
      const encrypted = data.slice(32);

      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      // Write decrypted archive
      const tempPath = encPath.replace('.enc', '');
      fs.writeFileSync(tempPath, decrypted);

      // Restore from decrypted archive
      const tempBackup = { ...backup, path: tempPath };
      const restoreResult = await this.restoreBackup(backupName);

      // Clean up temp file
      try { fs.unlinkSync(tempPath); } catch {}

      return restoreResult;
    } catch (err) {
      return { success: false, error: `Decryption failed: ${err.message}` };
    }
  }

  // ─── LIST BACKUPS ───
  listBackups() {
    return this.backups.map(b => ({
      name: b.name,
      size: b.sizeHuman,
      encrypted: b.encrypted,
      timestamp: b.timestamp,
      contents: b.contents?.length || 0,
      hash: b.hash?.slice(0, 12) + '...'
    }));
  }

  // ─── DELETE BACKUP ───
  deleteBackup(name) {
    const idx = this.backups.findIndex(b => b.name === name);
    if (idx === -1) return { error: `Backup ${name} not found` };

    const backup = this.backups[idx];
    try { fs.unlinkSync(backup.path); } catch {}
    if (backup.encryptedPath) try { fs.unlinkSync(backup.encryptedPath); } catch {}

    this.backups.splice(idx, 1);
    this._saveBackupIndex();

    return { deleted: true, name };
  }

  // ─── VERIFY BACKUP ───
  verifyBackup(name) {
    const backup = this.backups.find(b => b.name === name);
    if (!backup) return { error: `Backup ${name} not found` };

    if (!fs.existsSync(backup.path)) return { valid: false, error: 'Backup file missing' };

    const currentHash = this._hashFile(backup.path);
    const valid = currentHash === backup.hash;

    return {
      valid,
      name,
      expectedHash: backup.hash,
      actualHash: currentHash,
      size: this._formatBytes(fs.statSync(backup.path).size)
    };
  }

  // ─── AUTO-BACKUP SETUP ───
  setupAutoBackup(intervalDays = 7, maxBackups = 10) {
    this.config.set('backup.autoBackup', true);
    this.config.set('backup.intervalDays', intervalDays);
    this.config.set('backup.maxBackups', maxBackups);
    return { configured: true, intervalDays, maxBackups };
  }

  // ─── CLEANUP OLD BACKUPS ───
  cleanupOldBackups(keepCount = 5) {
    const sorted = [...this.backups].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const toDelete = sorted.slice(keepCount);
    let deleted = 0;

    for (const backup of toDelete) {
      try {
        if (fs.existsSync(backup.path)) fs.unlinkSync(backup.path);
        if (backup.encryptedPath && fs.existsSync(backup.encryptedPath)) fs.unlinkSync(backup.encryptedPath);
        deleted++;
      } catch {}
    }

    this.backups = sorted.slice(0, keepCount);
    this._saveBackupIndex();

    return { deleted, remaining: this.backups.length };
  }

  // ─── EXPORT FOR MIGRATION ───
  async exportForMigration(outputPath) {
    const result = await this.createBackup({ name: 'migration-export' });
    if (!result.success) return result;

    const dest = outputPath || path.join(os.homedir(), 'Desktop', 'opendesktop-migration.tar.gz');
    fs.copyFileSync(result.path, dest);

    return { success: true, path: dest, size: result.sizeHuman };
  }

  // ─── HELPERS ───
  _hashFile(filepath) {
    try {
      const content = fs.readFileSync(filepath);
      return crypto.createHash('sha256').update(content).digest('hex');
    } catch {
      return '';
    }
  }

  _formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  _loadBackupIndex() {
    try {
      const file = path.join(this.backupDir, 'index.json');
      return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
    } catch {
      return [];
    }
  }

  _saveBackupIndex() {
    try {
      fs.writeFileSync(path.join(this.backupDir, 'index.json'), JSON.stringify(this.backups, null, 2));
    } catch {}
  }

  // ─── STATUS ───
  getStatus() {
    return {
      totalBackups: this.backups.length,
      totalSize: this._formatBytes(this.backups.reduce((s, b) => s + (b.size || 0), 0)),
      lastBackup: this.backups.length ? this.backups[this.backups.length - 1].timestamp : 'Never',
      encryptedBackups: this.backups.filter(b => b.encrypted).length,
      backupDir: this.backupDir
    };
  }
}

module.exports = BackupManager;
