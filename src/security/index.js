'use strict';

// ═══════════════════════════════════════════════════════════════
//  ULTRA SECURITY MODULE — Defense in Depth 🛡️🔐
// ═══════════════════════════════════════════════════════════════

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');

class SecurityModule {
  constructor(config) {
    this.config = config || {};
    this.dataDir = path.join(os.homedir(), '.opendesktop', 'security');
    this._ensureDataDir();

    // Permission system
    this.permissions = new Map();
    this.roles = new Map();
    this._loadDefaultRoles();

    // Command filtering
    this.whitelist = new Set(this.config.allowedCommands || []);
    this.blacklist = new Set([
      'rm -rf /', 'rm -rf ~', 'mkfs', 'dd if=', 'wget', 'curl',
      ':(){:|:&};:', 'chmod -R 777', '> /dev/sda', 'shutdown', 'reboot',
      'halt', 'poweroff', 'init 0', 'kill -9 1', 'mv /* /dev/null'
    ]);

    // Rate limiting
    this.rateLimits = new Map();
    this.defaultRateLimit = { maxRequests: 100, windowMs: 60000 };

    // Audit log
    this.auditLog = [];
    this._loadAuditLog();

    // Anomaly detection
    this.usagePatterns = new Map();
    this.anomalyThresholds = {
      requestSpike: 3,      // 3x normal rate
      unusualTime: { start: 2, end: 5 }, // 2am-5am
      failedAttempts: 5,
      dataExfilSize: 1024 * 1024 // 1MB
    };

    // Sandbox
    this.sandboxEnabled = false;
    this.sandboxViolations = [];

    // Auto-lock
    this.locked = false;
    this.lastActivity = Date.now();
    this.lockTimeout = this.config.lockTimeout || 15 * 60 * 1000; // 15 min
    this._startLockTimer();

    // Encryption key
    this._encryptionKey = null;
  }

  _ensureDataDir() {
    try { fs.mkdirSync(this.dataDir, { recursive: true }); } catch {}
  }

  // ─── ENCRYPTION (AES-256-GCM) ───

  _getEncryptionKey() {
    if (this._encryptionKey) return this._encryptionKey;

    const keyFile = path.join(this.dataDir, '.encryption-key');
    try {
      if (fs.existsSync(keyFile)) {
        this._encryptionKey = Buffer.from(fs.readFileSync(keyFile, 'utf8'), 'hex');
      } else {
        this._encryptionKey = crypto.randomBytes(32);
        fs.writeFileSync(keyFile, this._encryptionKey.toString('hex'), { mode: 0o600 });
      }
    } catch {
      this._encryptionKey = crypto.randomBytes(32);
    }
    return this._encryptionKey;
  }

  encrypt(plaintext, associatedData) {
    const key = this._getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    if (associatedData) {
      cipher.setAAD(Buffer.from(associatedData, 'utf8'));
    }

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      algorithm: 'aes-256-gcm',
      aad: associatedData || null
    };
  }

  decrypt(ciphertext) {
    const key = this._getEncryptionKey();
    const iv = Buffer.from(ciphertext.iv, 'hex');
    const authTag = Buffer.from(ciphertext.authTag, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);

    decipher.setAuthTag(authTag);
    if (ciphertext.aad) {
      decipher.setAAD(Buffer.from(ciphertext.aad, 'utf8'));
    }

    let decrypted = decipher.update(ciphertext.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  encryptFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const encrypted = this.encrypt(content, filePath);
    fs.writeFileSync(filePath + '.enc', JSON.stringify(encrypted));
    return { original: filePath, encrypted: filePath + '.enc' };
  }

  decryptFile(encryptedPath) {
    const data = JSON.parse(fs.readFileSync(encryptedPath, 'utf8'));
    return this.decrypt(data);
  }

  // ─── INPUT SANITIZATION ───

  sanitize(input, options = {}) {
    if (typeof input !== 'string') {
      return { sanitized: '', threats: ['non-string-input'], blocked: true };
    }

    const threats = [];
    let sanitized = input;

    // SQL Injection patterns
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC|EXECUTE)\b.*\b(FROM|INTO|TABLE|WHERE|SET)\b)/i,
      /(--|\/\*|\*\/|;.*\b(DROP|DELETE|UPDATE)\b)/i,
      /('\s*(OR|AND)\s*'[^']*'\s*=\s*')/i,
      /(0x[0-9a-f]+)/i
    ];
    for (const pattern of sqlPatterns) {
      if (pattern.test(input)) {
        threats.push('sql-injection');
        sanitized = sanitized.replace(pattern, '[BLOCKED]');
      }
    }

    // XSS patterns
    const xssPatterns = [
      /<script[\s\S]*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /data:text\/html/gi,
      /<iframe[\s\S]*?>/gi,
      /<object[\s\S]*?>/gi,
      /<embed[\s\S]*?>/gi,
      /<form[\s\S]*?>/gi
    ];
    for (const pattern of xssPatterns) {
      if (pattern.test(sanitized)) {
        threats.push('xss');
        sanitized = sanitized.replace(pattern, '[BLOCKED]');
      }
    }

    // Command injection
    const cmdPatterns = [
      /[;&|`$]/,
      /\$\(/,
      /\$\{/,
      /\.\.\//,
      /\/etc\/passwd/,
      /\/etc\/shadow/,
      /\\x[0-9a-f]{2}/i
    ];
    for (const pattern of cmdPatterns) {
      if (pattern.test(sanitized)) {
        threats.push('command-injection');
      }
    }

    // Path traversal
    if (sanitized.includes('../') || sanitized.includes('..\\')) {
      threats.push('path-traversal');
    }

    // Null bytes
    if (sanitized.includes('\0') || sanitized.includes('%00')) {
      threats.push('null-byte');
      sanitized = sanitized.replace(/\0/g, '').replace(/%00/g, '');
    }

    // HTML encode dangerous chars
    if (options.htmlEncode) {
      sanitized = sanitized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    }

    // Trim to max length
    const maxLen = options.maxLength || 10000;
    if (sanitized.length > maxLen) {
      sanitized = sanitized.substring(0, maxLen);
      threats.push('truncated');
    }

    const blocked = threats.some(t => ['sql-injection', 'xss', 'command-injection'].includes(t));

    if (blocked) {
      this.audit('sanitization-blocked', { input: input.substring(0, 200), threats });
    }

    return { sanitized, threats, blocked, originalLength: input.length };
  }

  // ─── COMMAND VALIDATION ───

  validateCommand(command) {
    const normalized = command.trim().toLowerCase();

    // Check blacklist
    for (const blocked of this.blacklist) {
      if (normalized.includes(blocked.toLowerCase())) {
        this.audit('command-blocked', { command, reason: `Blacklisted: ${blocked}` });
        return { allowed: false, reason: `Blocked: matches blacklist entry '${blocked}'` };
      }
    }

    // Check whitelist (if configured)
    if (this.whitelist.size > 0) {
      const baseCmd = normalized.split(/\s+/)[0];
      if (!this.whitelist.has(baseCmd) && !this.whitelist.has(normalized)) {
        this.audit('command-blocked', { command, reason: 'Not in whitelist' });
        return { allowed: false, reason: 'Command not in whitelist' };
      }
    }

    // Pattern-based checks
    const dangerousPatterns = [
      { pattern: /\brm\s+.*(-[rfv]*\s+)*(\/|~|\*)/, reason: 'Recursive/universal delete' },
      { pattern: /\bchmod\s+.*777/, reason: 'Overly permissive permissions' },
      { pattern: />\s*\/dev\//, reason: 'Writing to device files' },
      { pattern: /\bnc\s+.*-[elp]/, reason: 'Netcat listener' },
      { pattern: /\bbash\s+-i\s+>&?\s*\/dev\/tcp/, reason: 'Reverse shell attempt' },
      { pattern: /\bcurl\b.*\|\s*(ba)?sh/, reason: 'Pipe to shell (curl|sh)' },
      { pattern: /\bwget\b.*\|\s*(ba)?sh/, reason: 'Pipe to shell (wget|sh)' },
      { pattern: /\b(python|node|ruby|perl)\s+-[ec]\s+/, reason: 'Inline code execution' }
    ];

    for (const { pattern, reason } of dangerousPatterns) {
      if (pattern.test(command)) {
        this.audit('command-blocked', { command, reason });
        return { allowed: false, reason };
      }
    }

    this.audit('command-allowed', { command });
    return { allowed: true };
  }

  // ─── RATE LIMITING ───

  checkRateLimit(identifier, options = {}) {
    const { maxRequests = this.defaultRateLimit.maxRequests, windowMs = this.defaultRateLimit.windowMs } = options;
    const now = Date.now();

    if (!this.rateLimits.has(identifier)) {
      this.rateLimits.set(identifier, { requests: [], blocked: false });
    }

    const limiter = this.rateLimits.get(identifier);

    // Remove expired entries
    limiter.requests = limiter.requests.filter(ts => now - ts < windowMs);

    if (limiter.requests.length >= maxRequests) {
      limiter.blocked = true;
      const retryAfter = Math.ceil((limiter.requests[0] + windowMs - now) / 1000);
      this.audit('rate-limit-exceeded', { identifier, count: limiter.requests.length, max: maxRequests });
      return {
        allowed: false,
        remaining: 0,
        retryAfter,
        total: maxRequests
      };
    }

    limiter.requests.push(now);
    limiter.blocked = false;

    return {
      allowed: true,
      remaining: maxRequests - limiter.requests.length,
      retryAfter: 0,
      total: maxRequests
    };
  }

  // ─── PERMISSION SYSTEM ───

  _loadDefaultRoles() {
    this.roles.set('admin', {
      permissions: ['*'],
      description: 'Full access to all features'
    });
    this.roles.set('user', {
      permissions: [
        'chat', 'search', 'automation.create', 'automation.read',
        'device.read', 'device.control', 'memory.read', 'memory.write',
        'code.execute.safe', 'research'
      ],
      description: 'Standard user access'
    });
    this.roles.set('viewer', {
      permissions: ['chat', 'search', 'device.read', 'memory.read'],
      description: 'Read-only access'
    });
    this.roles.set('restricted', {
      permissions: ['chat'],
      description: 'Minimal access, chat only'
    });
  }

  assignRole(userId, role) {
    if (!this.roles.has(role)) throw new Error(`Unknown role: ${role}`);
    this.permissions.set(userId, { role, assignedAt: new Date().toISOString() });
    this.audit('role-assigned', { userId, role });
    return { userId, role };
  }

  checkPermission(userId, permission) {
    const userPerm = this.permissions.get(userId);
    if (!userPerm) {
      // Default to 'user' role if not explicitly set
      const defaultRole = this.roles.get('user');
      return defaultRole.permissions.includes('*') || defaultRole.permissions.includes(permission);
    }

    const role = this.roles.get(userPerm.role);
    if (!role) return false;

    if (role.permissions.includes('*')) return true;

    // Check exact match or parent permission
    return role.permissions.some(p => {
      if (p === permission) return true;
      // Check wildcard: 'device.*' matches 'device.control'
      if (p.endsWith('.*')) {
        return permission.startsWith(p.slice(0, -2));
      }
      return false;
    });
  }

  addPermission(roleName, permission) {
    const role = this.roles.get(roleName);
    if (!role) throw new Error(`Unknown role: ${roleName}`);
    if (!role.permissions.includes(permission)) {
      role.permissions.push(permission);
    }
    this.audit('permission-added', { roleName, permission });
    return role;
  }

  createRole(name, permissions, description) {
    this.roles.set(name, { permissions, description: description || '' });
    this.audit('role-created', { name, permissions });
    return { name, permissions };
  }

  // ─── AUDIT LOGGING ───

  audit(action, details = {}) {
    const entry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      action,
      details,
      timestamp: new Date().toISOString(),
      pid: process.pid,
      locked: this.locked
    };

    this.auditLog.push(entry);

    // Persist periodically
    if (this.auditLog.length % 50 === 0) {
      this._saveAuditLog();
    }

    // Trim old entries
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-5000);
    }

    return entry;
  }

  _loadAuditLog() {
    try {
      const file = path.join(this.dataDir, 'audit-log.json');
      if (fs.existsSync(file)) {
        this.auditLog = JSON.parse(fs.readFileSync(file, 'utf8'));
      }
    } catch {}
  }

  _saveAuditLog() {
    try {
      const file = path.join(this.dataDir, 'audit-log.json');
      fs.writeFileSync(file, JSON.stringify(this.auditLog.slice(-5000), null, 2));
    } catch {}
  }

  getAuditLog(options = {}) {
    let entries = [...this.auditLog];
    if (options.action) entries = entries.filter(e => e.action === options.action);
    if (options.since) entries = entries.filter(e => new Date(e.timestamp) >= new Date(options.since));
    if (options.limit) entries = entries.slice(-options.limit);
    return entries;
  }

  // ─── SANDBOX MODE ───

  sandbox(enable) {
    this.sandboxEnabled = enable !== false;
    this.audit('sandbox-toggled', { enabled: this.sandboxEnabled });
    return { sandboxed: this.sandboxEnabled };
  }

  sandboxCheck(action, context = {}) {
    if (!this.sandboxEnabled) return { allowed: true };

    const restricted = [
      'file.write.system', 'file.delete', 'process.spawn', 'network.external',
      'device.control', 'memory.write.system', 'config.modify'
    ];

    if (restricted.includes(action)) {
      this.sandboxViolations.push({
        action, context,
        timestamp: new Date().toISOString()
      });
      this.audit('sandbox-violation', { action, context });
      return { allowed: false, reason: `Sandboxed: '${action}' is restricted` };
    }

    return { allowed: true };
  }

  getSandboxViolations() {
    return this.sandboxViolations;
  }

  // ─── ANOMALY DETECTION ───

  trackUsage(userId, action) {
    const key = `${userId}:${action}`;
    if (!this.usagePatterns.has(key)) {
      this.usagePatterns.set(key, { count: 0, timestamps: [], lastSeen: 0 });
    }
    const pattern = this.usagePatterns.get(key);
    pattern.count++;
    pattern.timestamps.push(Date.now());
    pattern.lastSeen = Date.now();

    // Keep last 100 timestamps
    if (pattern.timestamps.length > 100) {
      pattern.timestamps = pattern.timestamps.slice(-100);
    }
  }

  detectAnomaly(userId, action) {
    const key = `${userId}:${action}`;
    const pattern = this.usagePatterns.get(key);
    const anomalies = [];

    if (!pattern) return { anomalies: [], normal: true };

    // Check for request spike
    const recentWindow = 60000; // 1 minute
    const now = Date.now();
    const recentCount = pattern.timestamps.filter(ts => now - ts < recentWindow).length;
    const avgPerMinute = pattern.count / Math.max(1, (now - (pattern.timestamps[0] || now)) / recentWindow);

    if (recentCount > avgPerMinute * this.anomalyThresholds.requestSpike && avgPerMinute > 1) {
      anomalies.push({
        type: 'request-spike',
        severity: 'high',
        detail: `${recentCount} requests in last minute vs avg ${avgPerMinute.toFixed(1)}/min`
      });
    }

    // Check for unusual hours
    const hour = new Date().getHours();
    const { start, end } = this.anomalyThresholds.unusualTime;
    if (hour >= start && hour < end) {
      anomalies.push({
        type: 'unusual-time',
        severity: 'medium',
        detail: `Activity at ${hour}:00 (unusual hours: ${start}:00-${end}:00)`
      });
    }

    // Rapid-fire detection
    if (pattern.timestamps.length >= 3) {
      const last3 = pattern.timestamps.slice(-3);
      const intervals = [last3[1] - last3[0], last3[2] - last3[1]];
      if (intervals.every(i => i < 100)) { // Less than 100ms between requests
        anomalies.push({
          type: 'rapid-fire',
          severity: 'high',
          detail: 'Three requests within 100ms — possible bot/attack'
        });
      }
    }

    if (anomalies.length > 0) {
      this.audit('anomaly-detected', { userId, action, anomalies });
    }

    return { anomalies, normal: anomalies.length === 0 };
  }

  // ─── AUTO-LOCK ───

  _startLockTimer() {
    this._lockInterval = setInterval(() => {
      if (!this.locked && Date.now() - this.lastActivity > this.lockTimeout) {
        this.lock();
      }
    }, 30000); // Check every 30 seconds
  }

  lock() {
    this.locked = true;
    this.audit('system-locked', { reason: 'inactivity' });
    this.emit && this.emit('locked');
    return { locked: true };
  }

  unlock(credential) {
    // In production, verify against stored credential
    this.locked = false;
    this.lastActivity = Date.now();
    this.audit('system-unlocked');
    this.emit && this.emit('unlocked');
    return { locked: false };
  }

  touch() {
    this.lastActivity = Date.now();
  }

  getLockStatus() {
    return {
      locked: this.locked,
      lastActivity: new Date(this.lastActivity).toISOString(),
      timeoutMs: this.lockTimeout,
      timeUntilLock: Math.max(0, this.lockTimeout - (Date.now() - this.lastActivity))
    };
  }

  // ─── CREDENTIAL STORAGE ───

  storeCredential(name, value) {
    const encrypted = this.encrypt(value, `credential:${name}`);
    const file = path.join(this.dataDir, 'credentials.json');
    let creds = {};
    try { creds = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
    creds[name] = encrypted;
    fs.writeFileSync(file, JSON.stringify(creds, null, 2), { mode: 0o600 });
    this.audit('credential-stored', { name });
    return { stored: true, name };
  }

  getCredential(name) {
    const file = path.join(this.dataDir, 'credentials.json');
    let creds = {};
    try { creds = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
    if (!creds[name]) return null;
    this.audit('credential-accessed', { name });
    return this.decrypt(creds[name]);
  }

  deleteCredential(name) {
    const file = path.join(this.dataDir, 'credentials.json');
    let creds = {};
    try { creds = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
    delete creds[name];
    fs.writeFileSync(file, JSON.stringify(creds, null, 2), { mode: 0o600 });
    this.audit('credential-deleted', { name });
    return { deleted: true };
  }

  // ─── HASHING ───

  hash(data, algorithm = 'sha256') {
    return crypto.createHash(algorithm).update(data).digest('hex');
  }

  hashPassword(password, salt) {
    if (!salt) salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return { hash, salt, iterations: 100000, algorithm: 'pbkdf2-sha512' };
  }

  verifyPassword(password, stored) {
    const result = this.hashPassword(password, stored.salt);
    return result.hash === stored.hash;
  }

  // ─── REPORTS ───

  getSecurityReport() {
    const now = Date.now();
    const last24h = this.auditLog.filter(e => now - new Date(e.timestamp).getTime() < 86400000);
    const blocked = last24h.filter(e => e.action.includes('blocked'));
    const violations = last24h.filter(e => e.action.includes('violation') || e.action.includes('anomaly'));

    return {
      totalAuditEntries: this.auditLog.length,
      last24h: {
        total: last24h.length,
        blocked: blocked.length,
        violations: violations.length,
        topActions: this._topActions(last24h)
      },
      sandbox: {
        enabled: this.sandboxEnabled,
        violations: this.sandboxViolations.length
      },
      lock: this.getLockStatus(),
      rateLimiters: this.rateLimits.size,
      roles: [...this.roles.keys()],
      timestamp: new Date().toISOString()
    };
  }

  _topActions(entries) {
    const counts = {};
    for (const e of entries) {
      counts[e.action] = (counts[e.action] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([action, count]) => ({ action, count }));
  }

  // ─── CLEANUP ───

  destroy() {
    if (this._lockInterval) clearInterval(this._lockInterval);
    this._saveAuditLog();
    this.rateLimits.clear();
  }
}

// Make it an EventEmitter
const { EventEmitter } = require('events');
Object.assign(SecurityModule.prototype, EventEmitter.prototype);

module.exports = SecurityModule;
