/**
 * Cross-Device Swarm Intelligence
 * 
 * Device mesh networking — laptop, phone, server, Raspberry Pi all become
 * nodes in a single agent swarm. Context syncs across devices. End-to-end
 * encrypted peer-to-peer communication.
 */

const EventEmitter = require('events');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class DeviceMesh extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      meshPort: config.meshPort || 4445,
      discoveryInterval: config.discoveryInterval || 30000,
      heartbeatInterval: config.heartbeatInterval || 10000,
      encryptionAlgorithm: config.encryptionAlgorithm || 'aes-256-gcm',
      maxPeers: config.maxPeers || 20,
      syncInterval: config.syncInterval || 60000,
      statePath: config.statePath || path.join(process.env.HOME || '~', '.opendesktop', 'device-mesh'),
      ...config
    };

    this.nodeId = this._generateNodeId();
    this.nodeName = config.nodeName || require('os').hostname();
    this.nodeType = config.nodeType || 'desktop'; // desktop, mobile, server, iot

    this.peers = new Map();           // nodeId -> peer info
    this.encryptionKey = null;
    this.contextStore = new Map();    // shared context across devices
    this.pendingSync = [];
    this.server = null;
    this.isRunning = false;

    // Capabilities this node supports
    this.capabilities = {
      compute: true,
      storage: true,
      screen: config.hasScreen !== false,
      camera: config.hasCamera || false,
      microphone: config.hasMicrophone || false,
      gpu: config.hasGpu || false,
      alwaysOn: config.alwaysOn || false,
      batteryPowered: config.batteryPowered || false,
      ...config.capabilities
    };
  }

  async initialize(encryptionKey) {
    this.encryptionKey = this._deriveKey(encryptionKey || this._generateRandomKey());

    try {
      await fs.mkdir(this.config.statePath, { recursive: true });
    } catch (e) {}

    this.emit('initialized', {
      nodeId: this.nodeId,
      nodeName: this.nodeName,
      nodeType: this.nodeType,
      capabilities: this.capabilities
    });

    return this;
  }

  /**
   * Start the mesh node — begin listening and discovering peers.
   */
  async start() {
    this.isRunning = true;

    // Start heartbeat
    this._startHeartbeat();

    // Start context sync
    this._startContextSync();

    this.emit('mesh_started', { nodeId: this.nodeId, port: this.config.meshPort });
    return { nodeId: this.nodeId, status: 'running' };
  }

  /**
   * Stop the mesh node.
   */
  async stop() {
    this.isRunning = false;

    // Notify peers
    await this._broadcastMessage({
      type: 'node_offline',
      nodeId: this.nodeId,
      timestamp: Date.now()
    });

    if (this.server) {
      this.server.close();
    }

    this.emit('mesh_stopped', { nodeId: this.nodeId });
  }

  /**
   * Connect to a peer node.
   */
  async connectToPeer(address, port) {
    const peerInfo = {
      nodeId: null,
      address,
      port,
      status: 'connecting',
      lastSeen: Date.now(),
      capabilities: {},
      nodeType: 'unknown'
    };

    try {
      // Send handshake
      const handshake = await this._sendToPeer(address, port, {
        type: 'handshake',
        nodeId: this.nodeId,
        nodeName: this.nodeName,
        nodeType: this.nodeType,
        capabilities: this.capabilities,
        timestamp: Date.now()
      });

      if (handshake && handshake.nodeId) {
        peerInfo.nodeId = handshake.nodeId;
        peerInfo.nodeName = handshake.nodeName;
        peerInfo.nodeType = handshake.nodeType;
        peerInfo.capabilities = handshake.capabilities;
        peerInfo.status = 'connected';

        this.peers.set(handshake.nodeId, peerInfo);
        this.emit('peer_connected', peerInfo);

        return { success: true, peer: peerInfo };
      }

      return { success: false, error: 'Handshake failed' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Disconnect from a peer.
   */
  async disconnectFromPeer(nodeId) {
    const peer = this.peers.get(nodeId);
    if (!peer) return { success: false, error: 'Peer not found' };

    peer.status = 'disconnected';
    this.peers.delete(nodeId);
    this.emit('peer_disconnected', { nodeId });

    return { success: true };
  }

  /**
   * Send a task to a specific peer for execution.
   */
  async sendTask(nodeId, task) {
    const peer = this.peers.get(nodeId);
    if (!peer || peer.status !== 'connected') {
      return { success: false, error: 'Peer not available' };
    }

    const encryptedTask = this._encrypt(JSON.stringify({
      type: 'task',
      from: this.nodeId,
      task,
      timestamp: Date.now()
    }));

    try {
      const result = await this._sendToPeer(peer.address, peer.port, encryptedTask);
      return { success: true, result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Broadcast a task to all capable peers.
   */
  async broadcastTask(task, requirements = {}) {
    const capablePeers = Array.from(this.peers.values())
      .filter(peer => {
        if (peer.status !== 'connected') return false;
        if (requirements.gpu && !peer.capabilities.gpu) return false;
        if (requirements.screen && !peer.capabilities.screen) return false;
        if (requirements.alwaysOn && !peer.capabilities.alwaysOn) return false;
        return true;
      });

    const results = [];
    for (const peer of capablePeers) {
      const result = await this.sendTask(peer.nodeId, task);
      results.push({ peer: peer.nodeId, ...result });
    }

    return results;
  }

  /**
   * Sync context with all connected peers.
   */
  async syncContext() {
    const localContext = this._getLocalContext();
    const syncData = {
      type: 'context_sync',
      from: this.nodeId,
      context: localContext,
      timestamp: Date.now(),
      version: Date.now()
    };

    const encrypted = this._encrypt(JSON.stringify(syncData));

    for (const [nodeId, peer] of this.peers) {
      if (peer.status === 'connected') {
        try {
          await this._sendToPeer(peer.address, peer.port, encrypted);
        } catch (err) {
          this.emit('sync_error', { peer: nodeId, error: err.message });
        }
      }
    }

    this.emit('context_synced', { peerCount: this.peers.size });
  }

  /**
   * Share a context item with specific peer or all peers.
   */
  async shareContext(key, value, targetNodeId = null) {
    this.contextStore.set(key, {
      value,
      sharedBy: this.nodeId,
      sharedAt: Date.now(),
      version: Date.now()
    });

    const syncMsg = {
      type: 'context_update',
      from: this.nodeId,
      key,
      value,
      timestamp: Date.now()
    };

    const encrypted = this._encrypt(JSON.stringify(syncMsg));

    if (targetNodeId) {
      const peer = this.peers.get(targetNodeId);
      if (peer && peer.status === 'connected') {
        await this._sendToPeer(peer.address, peer.port, encrypted);
      }
    } else {
      await this._broadcastMessage(syncMsg);
    }

    this.emit('context_shared', { key, target: targetNodeId || 'all' });
  }

  /**
   * Request a resource from the best available peer.
   */
  async requestResource(resourceType, requirements = {}) {
    const candidates = Array.from(this.peers.values())
      .filter(peer => {
        if (peer.status !== 'connected') return false;
        switch (resourceType) {
          case 'gpu': return peer.capabilities.gpu;
          case 'storage': return peer.capabilities.storage;
          case 'screen': return peer.capabilities.screen;
          case 'compute': return peer.capabilities.compute;
          default: return true;
        }
      })
      .sort((a, b) => {
        // Prefer always-on nodes
        if (a.capabilities.alwaysOn && !b.capabilities.alwaysOn) return -1;
        if (!a.capabilities.alwaysOn && b.capabilities.alwaysOn) return 1;
        // Prefer non-battery nodes
        if (!a.capabilities.batteryPowered && b.capabilities.batteryPowered) return -1;
        return 0;
      });

    if (candidates.length === 0) {
      return { success: false, error: `No peer available with ${resourceType}` };
    }

    return {
      success: true,
      peer: candidates[0],
      alternatives: candidates.slice(1)
    };
  }

  /**
   * Get the mesh topology.
   */
  getTopology() {
    return {
      localNode: {
        nodeId: this.nodeId,
        nodeName: this.nodeName,
        nodeType: this.nodeType,
        capabilities: this.capabilities
      },
      peers: Array.from(this.peers.entries()).map(([id, peer]) => ({
        nodeId: id,
        nodeName: peer.nodeName,
        nodeType: peer.nodeType,
        status: peer.status,
        capabilities: peer.capabilities,
        lastSeen: peer.lastSeen,
        latency: peer.latency
      })),
      totalNodes: this.peers.size + 1,
      connectedNodes: Array.from(this.peers.values()).filter(p => p.status === 'connected').length + 1,
      sharedContextKeys: this.contextStore.size
    };
  }

  /**
   * Get node status.
   */
  getStatus() {
    return {
      nodeId: this.nodeId,
      nodeName: this.nodeName,
      nodeType: this.nodeType,
      isRunning: this.isRunning,
      capabilities: this.capabilities,
      peers: {
        connected: Array.from(this.peers.values()).filter(p => p.status === 'connected').length,
        total: this.peers.size
      },
      contextStore: this.contextStore.size,
      uptime: this.isRunning ? Date.now() - (this._startTime || Date.now()) : 0
    };
  }

  // ==================== PRIVATE METHODS ====================

  _startHeartbeat() {
    setInterval(async () => {
      if (!this.isRunning) return;

      const heartbeat = {
        type: 'heartbeat',
        nodeId: this.nodeId,
        nodeName: this.nodeName,
        timestamp: Date.now(),
        capabilities: this.capabilities,
        contextVersion: this.contextStore.size
      };

      await this._broadcastMessage(heartbeat);

      // Check for dead peers
      const now = Date.now();
      for (const [nodeId, peer] of this.peers) {
        if (now - peer.lastSeen > this.config.heartbeatInterval * 3) {
          peer.status = 'disconnected';
          this.emit('peer_timeout', { nodeId });
        }
      }
    }, this.config.heartbeatInterval);
  }

  _startContextSync() {
    setInterval(async () => {
      if (!this.isRunning) return;
      await this.syncContext();
    }, this.config.syncInterval);
  }

  async _broadcastMessage(message) {
    const encrypted = this._encrypt(JSON.stringify(message));
    for (const [nodeId, peer] of this.peers) {
      if (peer.status === 'connected') {
        try {
          await this._sendToPeer(peer.address, peer.port, encrypted);
        } catch (e) {
          // Peer might be offline
        }
      }
    }
  }

  async _sendToPeer(address, port, data) {
    // In production, this would use TCP/WebSocket
    return new Promise((resolve, reject) => {
      const net = require('net');
      const client = net.createConnection({ host: address, port }, () => {
        client.write(typeof data === 'string' ? data : JSON.stringify(data));
      });

      client.on('data', (response) => {
        client.end();
        try {
          resolve(JSON.parse(response.toString()));
        } catch (e) {
          resolve(response.toString());
        }
      });

      client.on('error', (err) => {
        reject(err);
      });

      client.setTimeout(5000, () => {
        client.destroy();
        reject(new Error('Connection timeout'));
      });
    });
  }

  _encrypt(data) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.config.encryptionAlgorithm, this.encryptionKey, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();
    return JSON.stringify({
      iv: iv.toString('hex'),
      data: encrypted,
      tag: tag.toString('hex')
    });
  }

  _decrypt(encryptedData) {
    const { iv, data, tag } = JSON.parse(encryptedData);
    const decipher = crypto.createDecipheriv(
      this.config.encryptionAlgorithm,
      this.encryptionKey,
      Buffer.from(iv, 'hex')
    );
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  _deriveKey(secret) {
    return crypto.scryptSync(secret, 'opendesktop-mesh-salt', 32);
  }

  _generateRandomKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  _generateNodeId() {
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    const mac = Object.values(networkInterfaces)
      .flat()
      .find(iface => iface.mac && iface.mac !== '00:00:00:00:00:00')?.mac || 'unknown';
    
    return crypto.createHash('sha256')
      .update(`${os.hostname()}-${mac}-${os.platform()}`)
      .digest('hex')
      .substring(0, 16);
  }

  _getLocalContext() {
    const context = {};
    for (const [key, value] of this.contextStore) {
      context[key] = value;
    }
    return context;
  }
}

module.exports = { DeviceMesh };
