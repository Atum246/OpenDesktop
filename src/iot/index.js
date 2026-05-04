'use strict';

// ═══════════════════════════════════════════════════════════════
//  IoT DEVICE CONTROLLER — Smart Home Command Center 🏠🔌
// ═══════════════════════════════════════════════════════════════

const http = require('http');
const https = require('https');
const dgram = require('dgram');
const net = require('net');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { EventEmitter } = require('events');

class IoTController extends EventEmitter {
  constructor(config) {
    super();
    this.config = config || {};
    this.devices = new Map();
    this.automations = [];
    this.deviceProfiles = this._loadDefaultProfiles();
    this.mqttConnections = new Map();
    this.discoveredDevices = [];
    this.actionLog = [];
    this.dataDir = path.join(os.homedir(), '.opendesktop', 'iot');
    this._ensureDataDir();
    this._loadDevices();
  }

  _ensureDataDir() {
    try { fs.mkdirSync(this.dataDir, { recursive: true }); } catch {}
  }

  _loadDevices() {
    try {
      const file = path.join(this.dataDir, 'devices.json');
      if (fs.existsSync(file)) {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        for (const dev of data) this.devices.set(dev.id, dev);
      }
    } catch {}
  }

  _saveDevices() {
    try {
      const file = path.join(this.dataDir, 'devices.json');
      fs.writeFileSync(file, JSON.stringify([...this.devices.values()], null, 2));
    } catch {}
  }

  _loadDefaultProfiles() {
    return {
      'philips-hue': {
        name: 'Philips Hue',
        type: 'light',
        protocol: 'http',
        commands: {
          on: (ip, id) => ({ method: 'PUT', path: `/api/${id}/lights/*/state`, body: { on: true } }),
          off: (ip, id) => ({ method: 'PUT', path: `/api/${id}/lights/*/state`, body: { on: false } }),
          brightness: (ip, id, val) => ({ method: 'PUT', path: `/api/${id}/lights/*/state`, body: { bri: Math.round(val * 2.54) } }),
          color: (ip, id, r, g, b) => ({ method: 'PUT', path: `/api/${id}/lights/*/state`, body: this._rgbToHue(r, g, b) })
        },
        discovery: { type: 'upnp', ssdp: 'urn:schemas-upnp-org:device:basic:1' }
      },
      'lifx': {
        name: 'LIFX',
        type: 'light',
        protocol: 'http',
        commands: {
          on: () => ({ method: 'PUT', path: '/v1/lights/all/state', body: { power: 'on' } }),
          off: () => ({ method: 'PUT', path: '/v1/lights/all/state', body: { power: 'off' } }),
          brightness: (ip, id, val) => ({ method: 'PUT', path: '/v1/lights/all/state', body: { brightness: val / 100 } }),
          color: (ip, id, hue, sat) => ({ method: 'PUT', path: '/v1/lights/all/state', body: { color: `hue:${hue} saturation:${sat}` } })
        },
        discovery: { type: 'lan', port: 56700 }
      },
      'tasmota': {
        name: 'Tasmota',
        type: 'switch',
        protocol: 'http',
        commands: {
          on: () => ({ path: '/cm?cmnd=Power%20On' }),
          off: () => ({ path: '/cm?cmnd=Power%20Off' }),
          status: () => ({ path: '/cm?cmnd=Status' }),
          info: () => ({ path: '/cm?cmnd=Status%200' })
        },
        discovery: { type: 'mdns', service: '_http._tcp' }
      },
      'home-assistant': {
        name: 'Home Assistant',
        type: 'hub',
        protocol: 'http',
        commands: {
          on: (ip, token, entityId) => ({ method: 'POST', path: '/api/services/light/turn_on', body: { entity_id: entityId }, auth: token }),
          off: (ip, token, entityId) => ({ method: 'POST', path: '/api/services/light/turn_off', body: { entity_id: entityId }, auth: token }),
          getState: (ip, token, entityId) => ({ path: `/api/states/${entityId}`, auth: token }),
          callService: (ip, token, domain, service, data) => ({ method: 'POST', path: `/api/services/${domain}/${service}`, body: data, auth: token })
        },
        discovery: { type: 'mdns', service: '_home-assistant._tcp' }
      },
      'shelly': {
        name: 'Shelly',
        type: 'switch',
        protocol: 'http',
        commands: {
          on: () => ({ path: '/relay/0?turn=on' }),
          off: () => ({ path: '/relay/0?turn=off' }),
          status: () => ({ path: '/status' }),
          info: () => ({ path: '/shelly' })
        },
        discovery: { type: 'mdns', service: '_http._tcp' }
      },
      'generic-mqtt': {
        name: 'Generic MQTT Device',
        type: 'generic',
        protocol: 'mqtt',
        commands: {
          on: (ip, id, topic) => ({ topic: topic || `devices/${id}/set`, message: JSON.stringify({ state: 'ON' }) }),
          off: (ip, id, topic) => ({ topic: topic || `devices/${id}/set`, message: JSON.stringify({ state: 'OFF' }) }),
          set: (ip, id, topic, payload) => ({ topic: topic || `devices/${id}/set`, message: JSON.stringify(payload) })
        },
        discovery: { type: 'mqtt', topic: 'devices/+/status' }
      },
      'generic-http': {
        name: 'Generic HTTP Device',
        type: 'generic',
        protocol: 'http',
        commands: {
          on: (ip) => ({ path: '/on' }),
          off: (ip) => ({ path: '/off' }),
          status: (ip) => ({ path: '/status' }),
          set: (ip, id, param, value) => ({ path: `/set?${param}=${value}` })
        },
        discovery: { type: 'scan', ports: [80, 8080, 8888] }
      }
    };
  }

  // ─── HTTP HELPER ───

  _httpRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const parsed = new URL(url);
      const lib = parsed.protocol === 'https:' ? https : http;
      const reqOptions = {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        timeout: options.timeout || 5000
      };

      if (options.auth) {
        reqOptions.headers['Authorization'] = `Bearer ${options.auth}`;
      }

      const req = lib.request(reqOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data), raw: data });
          } catch {
            resolve({ status: res.statusCode, data: null, raw: data });
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });

      if (options.body) {
        req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
      }
      req.end();
    });
  }

  // ─── DEVICE DISCOVERY ───

  async discover(options = {}) {
    const timeout = options.timeout || 8000;
    const methods = options.methods || ['mdns', 'upnp', 'scan'];
    const found = [];

    const tasks = [];

    if (methods.includes('mdns')) {
      tasks.push(this._discoverMDNS().catch(() => []));
    }
    if (methods.includes('upnp')) {
      tasks.push(this._discoverUPNP().catch(() => []));
    }
    if (methods.includes('scan')) {
      tasks.push(this._discoverScan(options.subnet).catch(() => []));
    }

    const results = await Promise.all(tasks);
    const allDevices = results.flat();

    // Deduplicate by IP
    const seen = new Set();
    for (const dev of allDevices) {
      const key = dev.ip || dev.id;
      if (!seen.has(key)) {
        seen.add(key);
        found.push(dev);
      }
    }

    this.discoveredDevices = found;
    this.emit('discovered', found);

    return {
      devices: found,
      count: found.length,
      methods: methods,
      timestamp: new Date().toISOString()
    };
  }

  async _discoverMDNS() {
    // mDNS discovery using UDP multicast
    return new Promise((resolve) => {
      const devices = [];
      try {
        const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
        const mdnsAddr = '224.0.0.251';
        const mdnsPort = 5353;

        // Build mDNS query for _http._tcp.local
        const query = this._buildMDNSQuery('_http._tcp.local');

        socket.on('message', (msg, rinfo) => {
          try {
            const parsed = this._parseMDNSResponse(msg);
            if (parsed) {
              devices.push({
                id: `mdns-${rinfo.address}`,
                name: parsed.name || rinfo.address,
                ip: rinfo.address,
                port: parsed.port || 80,
                type: 'unknown',
                protocol: 'http',
                discoveryMethod: 'mdns',
                services: parsed.services || []
              });
            }
          } catch {}
        });

        socket.bind(mdnsPort, () => {
          socket.addMembership(mdnsAddr);
          socket.send(query, 0, query.length, mdnsPort, mdnsAddr);
        });

        setTimeout(() => {
          try { socket.close(); } catch {}
          resolve(devices);
        }, 5000);
      } catch {
        resolve(devices);
      }
    });
  }

  _buildMDNSQuery(service) {
    // Simplified mDNS query packet builder
    const parts = service.split('.');
    const buf = Buffer.alloc(512);
    let offset = 0;

    // Header: ID=0, flags=0, QDCOUNT=1
    buf.writeUInt16BE(0, 0); offset += 2;
    buf.writeUInt16BE(0, 2); offset += 2;
    buf.writeUInt16BE(1, 4); offset += 2;
    buf.writeUInt16BE(0, 6); offset += 2;
    buf.writeUInt16BE(0, 8); offset += 2;
    buf.writeUInt16BE(0, 10); offset += 2;

    // Question
    for (const part of parts) {
      buf.writeUInt8(part.length, offset++);
      buf.write(part, offset, 'ascii');
      offset += part.length;
    }
    buf.writeUInt8(0, offset++); // Root label
    buf.writeUInt16BE(12, offset); offset += 2; // PTR
    buf.writeUInt16BE(1, offset); offset += 2; // IN

    return buf.slice(0, offset);
  }

  _parseMDNSResponse(msg) {
    // Simplified mDNS response parser
    try {
      const answers = msg.readUInt16BE(6);
      if (answers === 0) return null;
      let offset = 12;
      // Skip questions
      const qdcount = msg.readUInt16BE(4);
      for (let i = 0; i < qdcount; i++) {
        while (msg[offset] !== 0 && offset < msg.length) {
          if ((msg[offset] & 0xC0) === 0xC0) { offset += 2; break; }
          offset += msg[offset] + 1;
        }
        if (msg[offset] === 0) offset++;
        offset += 4; // type + class
      }
      // Parse answer
      if (offset < msg.length) {
        while (msg[offset] !== 0 && offset < msg.length) {
          if ((msg[offset] & 0xC0) === 0xC0) { offset += 2; break; }
          offset += msg[offset] + 1;
        }
        return { name: 'mDNS Device', services: ['http'] };
      }
    } catch {}
    return null;
  }

  async _discoverUPNP() {
    return new Promise((resolve) => {
      const devices = [];
      try {
        const socket = dgram.createSocket('udp4');
        const ssdpAddr = '239.255.255.250';
        const ssdpPort = 1900;
        const searchTarget = 'ssdp:all';

        const msg = [
          'M-SEARCH * HTTP/1.1',
          `HOST: ${ssdpAddr}:${ssdpPort}`,
          'MAN: "ssdp:discover"',
          'MX: 3',
          `ST: ${searchTarget}`,
          '', ''
        ].join('\r\n');

        socket.on('message', (data, rinfo) => {
          const response = data.toString();
          const server = response.match(/SERVER:\s*(.*)/i)?.[1]?.trim() || '';
          const location = response.match(/LOCATION:\s*(.*)/i)?.[1]?.trim() || '';
          const st = response.match(/ST:\s*(.*)/i)?.[1]?.trim() || '';

          if (location) {
            devices.push({
              id: `upnp-${rinfo.address}-${rinfo.port}`,
              name: server || rinfo.address,
              ip: rinfo.address,
              port: rinfo.port,
              type: this._guessDeviceType(st, server),
              protocol: 'http',
              discoveryMethod: 'upnp',
              ssdp: { server, location, st }
            });
          }
        });

        socket.send(msg, 0, msg.length, ssdpPort, ssdpAddr);
        setTimeout(() => {
          try { socket.close(); } catch {}
          resolve(devices);
        }, 5000);
      } catch {
        resolve(devices);
      }
    });
  }

  async _discoverScan(subnet) {
    const devices = [];
    const baseIp = subnet || this._getLocalSubnet();
    const ports = [80, 443, 8080, 8888, 1883]; // HTTP, HTTPS, alt-HTTP, MQTT

    const scanHost = (ip, port) => new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(1500);
      socket.on('connect', () => {
        socket.destroy();
        resolve({ ip, port, open: true });
      });
      socket.on('timeout', () => { socket.destroy(); resolve(null); });
      socket.on('error', () => { socket.destroy(); resolve(null); });
      socket.connect(port, ip);
    });

    // Scan a /24 subnet
    const promises = [];
    for (let i = 1; i < 255; i++) {
      for (const port of ports) {
        promises.push(scanHost(`${baseIp}.${i}`, port));
      }
    }

    const results = await Promise.all(promises);
    for (const r of results) {
      if (r) {
        devices.push({
          id: `scan-${r.ip}-${r.port}`,
          name: `Device at ${r.ip}`,
          ip: r.ip,
          port: r.port,
          type: r.port === 1883 ? 'mqtt-broker' : 'http-device',
          protocol: r.port === 1883 ? 'mqtt' : 'http',
          discoveryMethod: 'scan'
        });
      }
    }

    return devices;
  }

  _getLocalSubnet() {
    const interfaces = os.networkInterfaces();
    for (const iface of Object.values(interfaces)) {
      for (const alias of iface) {
        if (alias.family === 'IPv4' && !alias.internal) {
          return alias.address.split('.').slice(0, 3).join('.');
        }
      }
    }
    return '192.168.1';
  }

  _guessDeviceType(st, server) {
    const s = (st + ' ' + server).toLowerCase();
    if (s.includes('light') || s.includes('hue') || s.includes('lifx')) return 'light';
    if (s.includes('thermostat') || s.includes('nest')) return 'thermostat';
    if (s.includes('plug') || s.includes('switch')) return 'switch';
    if (s.includes('speaker') || s.includes('sonos')) return 'speaker';
    if (s.includes('camera')) return 'camera';
    if (s.includes('hub') || s.includes('bridge')) return 'hub';
    return 'unknown';
  }

  // ─── DEVICE CONTROL ───

  async control(deviceId, command, params = {}) {
    const device = this.devices.get(deviceId);
    if (!device) {
      // Check discovered devices
      const discovered = this.discoveredDevices.find(d => d.id === deviceId);
      if (!discovered) throw new Error(`Device not found: ${deviceId}`);
      return this._sendCommand(discovered, command, params);
    }
    return this._sendCommand(device, command, params);
  }

  async _sendCommand(device, command, params = {}) {
    const profile = this.deviceProfiles[device.profile] || this.deviceProfiles['generic-http'];
    const cmdFunc = profile.commands[command];

    if (!cmdFunc) {
      throw new Error(`Unknown command '${command}' for device type '${profile.name}'`);
    }

    const cmd = cmdFunc(device.ip, device.credentials || device.id, params.topic || params.entityId, params.value);
    let result;

    if (profile.protocol === 'mqtt' && cmd.topic) {
      result = await this._mqttPublish(device, cmd.topic, cmd.message);
    } else {
      const url = `http://${device.ip}:${device.port || 80}${cmd.path || ''}`;
      result = await this._httpRequest(url, {
        method: cmd.method || 'GET',
        body: cmd.body,
        auth: cmd.auth
      });
    }

    const logEntry = {
      deviceId: device.id,
      command,
      params,
      result: result?.status || 'sent',
      timestamp: new Date().toISOString()
    };
    this.actionLog.push(logEntry);
    if (this.actionLog.length > 1000) this.actionLog = this.actionLog.slice(-500);

    this.emit('command', logEntry);
    return logEntry;
  }

  // ─── GET STATUS ───

  async getStatus(deviceId) {
    const device = this.devices.get(deviceId) || this.discoveredDevices.find(d => d.id === deviceId);
    if (!device) throw new Error(`Device not found: ${deviceId}`);

    try {
      const profile = this.deviceProfiles[device.profile] || this.deviceProfiles['generic-http'];
      const statusCmd = profile.commands.status || profile.commands.info;
      if (!statusCmd) return { deviceId, status: 'no-status-command' };

      const cmd = statusCmd(device.ip, device.credentials);
      const url = `http://${device.ip}:${device.port || 80}${cmd.path || '/status'}`;
      const result = await this._httpRequest(url, { method: cmd.method || 'GET', auth: cmd.auth });

      return {
        deviceId,
        status: result.data || result.raw,
        httpStatus: result.status,
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      return { deviceId, status: 'offline', error: err.message };
    }
  }

  // ─── AUTOMATIONS ───

  createAutomation(config) {
    const automation = {
      id: `auto-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name: config.name || 'Unnamed Automation',
      trigger: config.trigger, // { type: 'time'|'event'|'device', value: ... }
      conditions: config.conditions || [],
      actions: config.actions || [], // [{ deviceId, command, params }]
      enabled: config.enabled !== false,
      createdAt: new Date().toISOString(),
      lastRun: null,
      runCount: 0
    };

    this.automations.push(automation);
    this._saveAutomations();
    this.emit('automation-created', automation);

    // Set up trigger
    if (automation.trigger.type === 'time') {
      this._scheduleAutomation(automation);
    }

    return automation;
  }

  _scheduleAutomation(automation) {
    // Simple interval-based scheduling
    if (automation.trigger.interval) {
      const interval = setInterval(async () => {
        if (!automation.enabled) return;
        await this._runAutomation(automation);
      }, automation.trigger.interval);
      automation._interval = interval;
    }
  }

  async _runAutomation(automation) {
    const results = [];
    for (const action of automation.actions) {
      try {
        const result = await this.control(action.deviceId, action.command, action.params || {});
        results.push(result);
      } catch (err) {
        results.push({ error: err.message, deviceId: action.deviceId });
      }
    }
    automation.lastRun = new Date().toISOString();
    automation.runCount++;
    this.emit('automation-run', { id: automation.id, results });
    return results;
  }

  _saveAutomations() {
    try {
      const file = path.join(this.dataDir, 'automations.json');
      const data = this.automations.map(a => ({ ...a, _interval: undefined }));
      fs.writeFileSync(file, JSON.stringify(data, null, 2));
    } catch {}
  }

  // ─── DEVICE MANAGEMENT ───

  addDevice(config) {
    const device = {
      id: config.id || `dev-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name: config.name || 'Unnamed Device',
      ip: config.ip,
      port: config.port || 80,
      type: config.type || 'generic',
      profile: config.profile || 'generic-http',
      room: config.room || 'default',
      credentials: config.credentials || null,
      mqttTopic: config.mqttTopic || null,
      tags: config.tags || [],
      addedAt: new Date().toISOString(),
      lastSeen: null
    };

    this.devices.set(device.id, device);
    this._saveDevices();
    this.emit('device-added', device);
    return device;
  }

  removeDevice(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) throw new Error(`Device not found: ${deviceId}`);
    this.devices.delete(deviceId);
    this._saveDevices();
    this.emit('device-removed', device);
    return { removed: true, device };
  }

  listDevices(options = {}) {
    let devices = [...this.devices.values()];
    if (options.type) devices = devices.filter(d => d.type === options.type);
    if (options.room) devices = devices.filter(d => d.room === options.room);
    if (options.profile) devices = devices.filter(d => d.profile === options.profile);
    return {
      devices,
      count: devices.length,
      types: [...new Set(devices.map(d => d.type))],
      rooms: [...new Set(devices.map(d => d.room))]
    };
  }

  // ─── MQTT SUPPORT ───

  async connectMQTT(brokerUrl, options = {}) {
    // Lightweight MQTT client using raw TCP
    return new Promise((resolve, reject) => {
      try {
        const parsed = new URL(brokerUrl);
        const port = parseInt(parsed.port) || 1883;
        const client = new net.Socket();

        client.connect(port, parsed.hostname, () => {
          // Send CONNECT packet
          const connectPacket = this._buildMQTTConnect(options.clientId || `opendesktop-${Date.now()}`, options.username, options.password);
          client.write(connectPacket);
        });

        let connected = false;
        client.on('data', (data) => {
          if (!connected && data[0] === 0x20) { // CONNACK
            connected = true;
            const connId = parsed.hostname + ':' + port;
            this.mqttConnections.set(connId, { client, brokerUrl, subscriptions: [] });
            resolve({ connected: true, broker: connId });
          }
        });

        client.on('error', reject);
        client.on('close', () => {
          const connId = parsed.hostname + ':' + port;
          this.mqttConnections.delete(connId);
          this.emit('mqtt-disconnected', connId);
        });

        setTimeout(() => {
          if (!connected) {
            client.destroy();
            reject(new Error('MQTT connection timeout'));
          }
        }, 5000);
      } catch (err) {
        reject(err);
      }
    });
  }

  async _mqttPublish(device, topic, message) {
    // Try existing connection or create new
    const broker = device.mqttBroker || 'localhost:1883';
    let conn = this.mqttConnections.get(broker);

    if (!conn) {
      try {
        await this.connectMQTT(`mqtt://${broker}`);
        conn = this.mqttConnections.get(broker);
      } catch (err) {
        return { error: `MQTT publish failed: ${err.message}` };
      }
    }

    if (!conn) return { error: 'No MQTT connection available' };

    const packet = this._buildMQTTPublish(topic, message);
    conn.client.write(packet);
    return { published: true, topic, message };
  }

  _buildMQTTPublish(topic, message) {
    const topicBuf = Buffer.from(topic);
    const msgBuf = Buffer.from(typeof message === 'string' ? message : JSON.stringify(message));
    const remainingLen = 2 + topicBuf.length + msgBuf.length;
    const buf = Buffer.alloc(2 + remainingLen);
    buf[0] = 0x30;
    buf[1] = remainingLen;
    buf.writeUInt16BE(topicBuf.length, 2);
    topicBuf.copy(buf, 4);
    msgBuf.copy(buf, 4 + topicBuf.length);
    return buf;
  }

  _buildMQTTConnect(clientId, username, password) {
    const protocolName = Buffer.from('MQTT');
    const clientIdBuf = Buffer.from(clientId);
    let flags = 0x02; // Clean session
    let remainingLen = 2 + protocolName.length + 1 + 1 + 2 + 2 + clientIdBuf.length;

    let usernameBuf, passwordBuf;
    if (username) {
      flags |= 0x80;
      usernameBuf = Buffer.from(username);
      remainingLen += 2 + usernameBuf.length;
    }
    if (password) {
      flags |= 0x40;
      passwordBuf = Buffer.from(password);
      remainingLen += 2 + passwordBuf.length;
    }

    const buf = Buffer.alloc(2 + remainingLen);
    let offset = 0;
    buf[offset++] = 0x10; // CONNECT
    buf[offset++] = remainingLen;
    buf.writeUInt16BE(protocolName.length, offset); offset += 2;
    protocolName.copy(buf, offset); offset += protocolName.length;
    buf[offset++] = 4; // MQTT 3.1.1
    buf[offset++] = flags;
    buf.writeUInt16BE(60, offset); offset += 2; // Keepalive
    buf.writeUInt16BE(clientIdBuf.length, offset); offset += 2;
    clientIdBuf.copy(buf, offset); offset += clientIdBuf.length;

    if (usernameBuf) {
      buf.writeUInt16BE(usernameBuf.length, offset); offset += 2;
      usernameBuf.copy(buf, offset); offset += usernameBuf.length;
    }
    if (passwordBuf) {
      buf.writeUInt16BE(passwordBuf.length, offset); offset += 2;
      passwordBuf.copy(buf, offset); offset += passwordBuf.length;
    }

    return buf;
  }

  // ─── HOME ASSISTANT INTEGRATION ───

  async homeAssistantCommand(url, token, domain, service, entityId, data = {}) {
    if (!url || !token) throw new Error('Home Assistant URL and token required');

    const serviceUrl = `${url.replace(/\/$/, '')}/api/services/${domain}/${service}`;
    const result = await this._httpRequest(serviceUrl, {
      method: 'POST',
      body: { entity_id: entityId, ...data },
      auth: token,
      headers: { 'Authorization': `Bearer ${token}` }
    });

    return {
      success: result.status >= 200 && result.status < 300,
      status: result.status,
      data: result.data
    };
  }

  async homeAssistantGetStates(url, token) {
    if (!url || !token) throw new Error('Home Assistant URL and token required');
    const result = await this._httpRequest(`${url.replace(/\/$/, '')}/api/states`, {
      auth: token,
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return result.data || [];
  }

  // ─── HELPERS ───

  _rgbToHue(r, g, b) {
    // Convert RGB to Hue bridge format
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }

    return {
      hue: Math.round(h * 65535),
      sat: Math.round(s * 254),
      bri: Math.round(l * 254)
    };
  }

  getDeviceProfiles() {
    return Object.entries(this.deviceProfiles).map(([key, val]) => ({
      id: key,
      name: val.name,
      type: val.type,
      protocol: val.protocol,
      commands: Object.keys(val.commands)
    }));
  }

  getActionLog(limit = 50) {
    return this.actionLog.slice(-limit);
  }

  getAutomations() {
    return this.automations;
  }

  getStats() {
    return {
      devices: this.devices.size,
      discovered: this.discoveredDevices.length,
      automations: this.automations.length,
      mqttConnections: this.mqttConnections.size,
      actionsLogged: this.actionLog.length
    };
  }
}

module.exports = IoTController;
