'use strict';

class MobileAPI {
  constructor(config) {
    this.config = config || {};
    this.devices = new Map();
    this.sessions = new Map();
    this.pushTokens = new Map();
    this.isRunning = false;
  }

  start() {
    this.isRunning = true;
    return { started: true, port: this.config.get('mobile.port', 3001) };
  }

  stop() {
    this.isRunning = false;
    return { stopped: true };
  }

  registerDevice(deviceInfo) {
    const id = `dev_${Date.now()}`;
    const device = {
      id,
      name: deviceInfo.name || 'Unknown Device',
      platform: deviceInfo.platform || 'unknown',
      pushToken: deviceInfo.pushToken || null,
      registeredAt: Date.now(),
      lastSeen: Date.now()
    };
    this.devices.set(id, device);
    if (device.pushToken) this.pushTokens.set(id, device.pushToken);
    return { registered: true, deviceId: id };
  }

  unregisterDevice(id) {
    this.devices.delete(id);
    this.pushTokens.delete(id);
    return { unregistered: true };
  }

  createSession(deviceId) {
    const sessionId = `sess_${Date.now()}`;
    this.sessions.set(sessionId, { deviceId, createdAt: Date.now(), active: true });
    return { sessionId, created: true };
  }

  getStatus() {
    return {
      running: this.isRunning,
      registeredDevices: this.devices.size,
      activeSessions: [...this.sessions.values()].filter(s => s.active).length,
      pushTokens: this.pushTokens.size
    };
  }

  listDevices() {
    return [...this.devices.values()];
  }

  pushNotification(deviceId, message) {
    if (!this.devices.has(deviceId)) return { sent: false, error: 'Device not found' };
    return { sent: true, deviceId, message, timestamp: Date.now() };
  }
}

module.exports = MobileAPI;
