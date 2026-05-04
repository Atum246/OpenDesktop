'use strict';
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { EventEmitter } = require('events');

// ═══════════════════════════════════════════════════════════════
//  UNIVERSAL API GATEWAY — Connect Anything 🌐🔌
//  REST API, WebSocket events, webhooks, GraphQL, OAuth2
// ═══════════════════════════════════════════════════════════════

class APIGateway extends EventEmitter {
  constructor(config, engine) {
    super();
    this.config = config;
    this.engine = engine;
    this.server = null;
    this.wsServer = null;
    this.port = config.get('api.port', 4444);
    this.host = config.get('api.host', '0.0.0.0');
    this.apiKeys = new Set(config.get('api.keys', []));
    this.webhooks = new Map();
    this.routes = new Map();
    this.wsClients = new Set();
    this.rateLimiter = new Map();
    this.running = false;
    this.requestLog = [];

    this._registerDefaultRoutes();
  }

  // ─── START SERVER ───
  start() {
    if (this.running) return { error: 'Already running' };

    this.server = http.createServer((req, res) => this._handleRequest(req, res));

    // WebSocket upgrade
    this.server.on('upgrade', (req, socket, head) => {
      this._handleWebSocketUpgrade(req, socket, head);
    });

    this.server.listen(this.port, this.host, () => {
      this.running = true;
      this.emit('started', { port: this.port, host: this.host });
    });

    return { started: true, port: this.port, host: this.host };
  }

  stop() {
    if (this.server) {
      this.server.close();
      this.running = false;
      this.emit('stopped');
    }
    return { stopped: true };
  }

  // ─── ROUTE REGISTRATION ───
  addRoute(method, path, handler, options = {}) {
    const key = `${method.toUpperCase()}:${path}`;
    this.routes.set(key, { method: method.toUpperCase(), path, handler, auth: options.auth !== false, rateLimit: options.rateLimit || 100 });
    return { added: true, route: key };
  }

  _registerDefaultRoutes() {
    // Health check
    this.addRoute('GET', '/health', () => ({ status: 'ok', version: '1.0.0', uptime: process.uptime() }), { auth: false });

    // System status
    this.addRoute('GET', '/api/status', () => {
      const stats = this.engine?.memory?.getStats() || {};
      return {
        aiName: this.engine?.aiName,
        provider: this.engine?.provider?.providerName,
        model: this.engine?.provider?.model,
        memory: stats,
        uptime: process.uptime(),
        platform: os.platform(),
        hostname: os.hostname()
      };
    });

    // Chat endpoint
    this.addRoute('POST', '/api/chat', async (body) => {
      if (!body.message) return { error: 'message required' };
      const response = await this.engine?.provider?.chat(body.message, body.options || {});
      return { response, timestamp: new Date().toISOString() };
    });

    // Memory query
    this.addRoute('GET', '/api/memory/search', (params) => {
      const query = params.q || params.query;
      if (!query) return { error: 'q parameter required' };
      return this.engine?.memory?.search(query) || [];
    });

    // Memory stats
    this.addRoute('GET', '/api/memory/stats', () => {
      return this.engine?.memory?.getStats() || {};
    });

    // Execute command
    this.addRoute('POST', '/api/exec', async (body) => {
      if (!body.command) return { error: 'command required' };
      return await this.engine?.automation?.runCommand(body.command) || { error: 'Engine not available' };
    });

    // Web search
    this.addRoute('GET', '/api/search', async (params) => {
      const query = params.q || params.query;
      if (!query) return { error: 'q parameter required' };
      return await this.engine?.webSearch?.search(query) || { error: 'Search not available' };
    });

    // IoT devices
    this.addRoute('GET', '/api/iot/devices', () => {
      return this.engine?.iot?.listDevices() || [];
    });

    // IoT control
    this.addRoute('POST', '/api/iot/control', async (body) => {
      if (!body.deviceId || !body.command) return { error: 'deviceId and command required' };
      return await this.engine?.iot?.control(body.deviceId, body.command, body.params) || { error: 'IoT not available' };
    });

    // Agents
    this.addRoute('GET', '/api/agents', () => {
      return this.engine?.orchestrator?.listAgents() || [];
    });

    // Spawn agent
    this.addRoute('POST', '/api/agents/spawn', async (body) => {
      if (!body.task) return { error: 'task required' };
      return await this.engine?.orchestrator?.spawnAgent(body.task, body.options) || { error: 'Orchestrator not available' };
    });

    // System info
    this.addRoute('GET', '/api/system', async () => {
      return await this.engine?.automation?.getSystemInfo() || { error: 'Automation not available' };
    });

    // Security report
    this.addRoute('GET', '/api/security/report', () => {
      return this.engine?.security?.getSecurityReport() || {};
    });
  }

  // ─── HTTP REQUEST HANDLER ───
  async _handleRequest(req, res) {
    const startTime = Date.now();
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;
    const method = req.method;

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

    if (method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Rate limiting
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (!this._checkRateLimit(clientIp)) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Rate limit exceeded', retryAfter: 60 }));
      return;
    }

    // Auth check
    const route = this._findRoute(method, pathname);
    if (route?.auth && !this._authenticate(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized. Provide X-API-Key header or Authorization: Bearer <key>' }));
      return;
    }

    try {
      // Parse body for POST/PUT
      let body = {};
      if (method === 'POST' || method === 'PUT') {
        body = await this._parseBody(req);
      }

      // Parse query params
      const params = Object.fromEntries(url.searchParams);

      // Execute handler
      let result;
      if (route) {
        result = await route.handler({ ...params, ...body }, req);
      } else {
        // Try to match dynamic routes
        result = await this._matchDynamicRoute(method, pathname, { ...params, ...body });
      }

      if (result === undefined) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found', path: pathname }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      }

      // Log request
      this.requestLog.push({
        method, path: pathname, status: 200,
        duration: Date.now() - startTime,
        ip: clientIp,
        timestamp: new Date().toISOString()
      });

    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  }

  _findRoute(method, pathname) {
    return this.routes.get(`${method}:${pathname}`);
  }

  async _matchDynamicRoute(method, pathname, params) {
    // Try pattern matching
    for (const [key, route] of this.routes) {
      const [routeMethod, routePath] = key.split(':');
      if (routeMethod !== method) continue;

      const routeParts = routePath.split('/');
      const pathParts = pathname.split('/');
      if (routeParts.length !== pathParts.length) continue;

      const matchParams = {};
      let matches = true;
      for (let i = 0; i < routeParts.length; i++) {
        if (routeParts[i].startsWith(':')) {
          matchParams[routeParts[i].slice(1)] = pathParts[i];
        } else if (routeParts[i] !== pathParts[i]) {
          matches = false;
          break;
        }
      }

      if (matches) {
        return await route.handler({ ...params, ...matchParams });
      }
    }
    return undefined;
  }

  // ─── WEBSOCKET ───
  _handleWebSocketUpgrade(req, socket, head) {
    // Simple WebSocket handshake
    const key = req.headers['sec-websocket-key'];
    const accept = require('crypto')
      .createHash('sha1')
      .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
      .digest('base64');

    socket.write([
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${accept}`,
      '', ''
    ].join('\r\n'));

    this.wsClients.add(socket);
    this.emit('ws-connected', { clients: this.wsClients.size });

    socket.on('close', () => {
      this.wsClients.delete(socket);
      this.emit('ws-disconnected', { clients: this.wsClients.size });
    });

    socket.on('data', (data) => {
      try {
        const message = this._decodeWSFrame(data);
        if (message) {
          this.emit('ws-message', message);
          // Echo back for now
          this._sendWSFrame(socket, JSON.stringify({ echo: message, timestamp: Date.now() }));
        }
      } catch {}
    });
  }

  broadcast(event, data) {
    const message = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
    for (const client of this.wsClients) {
      try { this._sendWSFrame(client, message); } catch {}
    }
    return { broadcast: true, clients: this.wsClients.size };
  }

  _decodeWSFrame(buffer) {
    if (buffer.length < 2) return null;
    const opcode = buffer[0] & 0x0F;
    if (opcode !== 1) return null; // Only text frames

    let offset = 2;
    let payloadLength = buffer[1] & 0x7F;

    if (payloadLength === 126) {
      payloadLength = buffer.readUInt16BE(2);
      offset = 4;
    } else if (payloadLength === 127) {
      payloadLength = Number(buffer.readBigUInt64BE(2));
      offset = 10;
    }

    const maskKey = buffer.slice(offset, offset + 4);
    offset += 4;
    const payload = buffer.slice(offset, offset + payloadLength);

    for (let i = 0; i < payload.length; i++) {
      payload[i] ^= maskKey[i % 4];
    }

    return payload.toString('utf8');
  }

  _sendWSFrame(socket, data) {
    const payload = Buffer.from(data);
    let header;

    if (payload.length < 126) {
      header = Buffer.alloc(2);
      header[0] = 0x81;
      header[1] = payload.length;
    } else if (payload.length < 65536) {
      header = Buffer.alloc(4);
      header[0] = 0x81;
      header[1] = 126;
      header.writeUInt16BE(payload.length, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x81;
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(payload.length), 2);
    }

    socket.write(Buffer.concat([header, payload]));
  }

  // ─── WEBHOOKS ───
  registerWebhook(name, url, events = ['*']) {
    this.webhooks.set(name, { url, events, created: Date.now(), triggered: 0 });
    return { registered: true, name, url };
  }

  async triggerWebhooks(event, data) {
    const results = [];
    for (const [name, webhook] of this.webhooks) {
      if (webhook.events.includes('*') || webhook.events.includes(event)) {
        try {
          const payload = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
          const url = new URL(webhook.url);
          const lib = url.protocol === 'https:' ? https : http;

          await new Promise((resolve, reject) => {
            const req = lib.request({
              hostname: url.hostname,
              port: url.port,
              path: url.pathname,
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
              timeout: 10000
            }, resolve);
            req.on('error', reject);
            req.write(payload);
            req.end();
          });

          webhook.triggered++;
          results.push({ name, status: 'sent' });
        } catch (err) {
          results.push({ name, status: 'error', error: err.message });
        }
      }
    }
    return results;
  }

  // ─── AUTH ───
  _authenticate(req) {
    if (this.apiKeys.size === 0) return true; // No keys = open access

    const apiKey = req.headers['x-api-key'];
    if (apiKey && this.apiKeys.has(apiKey)) return true;

    const auth = req.headers['authorization'];
    if (auth?.startsWith('Bearer ') && this.apiKeys.has(auth.slice(7))) return true;

    return false;
  }

  addApiKey(key) {
    this.apiKeys.add(key);
    return { added: true };
  }

  removeApiKey(key) {
    this.apiKeys.delete(key);
    return { removed: true };
  }

  // ─── RATE LIMITING ───
  _checkRateLimit(ip) {
    const now = Date.now();
    const window = 60000; // 1 minute
    const maxRequests = 100;

    if (!this.rateLimiter.has(ip)) {
      this.rateLimiter.set(ip, []);
    }

    const requests = this.rateLimiter.get(ip).filter(t => now - t < window);
    this.rateLimiter.set(ip, requests);

    if (requests.length >= maxRequests) return false;
    requests.push(now);
    return true;
  }

  // ─── BODY PARSER ───
  _parseBody(req) {
    return new Promise((resolve) => {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try { resolve(JSON.parse(body)); } catch { resolve({}); }
      });
    });
  }

  // ─── STATUS ───
  getStatus() {
    return {
      running: this.running,
      port: this.port,
      host: this.host,
      routes: this.routes.size,
      wsClients: this.wsClients.size,
      webhooks: this.webhooks.size,
      apiKeys: this.apiKeys.size,
      totalRequests: this.requestLog.length
    };
  }

  getRequestLog(limit = 20) {
    return this.requestLog.slice(-limit);
  }
}

module.exports = APIGateway;
