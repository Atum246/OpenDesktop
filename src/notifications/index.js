'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { EventEmitter } = require('events');

// ═══════════════════════════════════════════════════════════════
//  NOTIFICATION CENTER — Smart Notifications 🔔📱
//  Desktop notifications, history, channels, priority, grouping
// ═══════════════════════════════════════════════════════════════

class NotificationCenter extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.notifications = [];
    this.channels = new Map();
    this.maxHistory = 500;
    this.dataDir = path.join(os.homedir(), '.opendesktop', 'notifications');
    if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
    this._loadHistory();
    this._setupDefaultChannels();
  }

  // ─── SETUP DEFAULT CHANNELS ───
  _setupDefaultChannels() {
    this.addChannel('system', { icon: '🖥️', priority: 'high', sound: true });
    this.addChannel('security', { icon: '🔒', priority: 'critical', sound: true });
    this.addChannel('agents', { icon: '🤖', priority: 'medium', sound: false });
    this.addChannel('tasks', { icon: '📋', priority: 'medium', sound: true });
    this.addChannel('updates', { icon: '🔄', priority: 'low', sound: false });
    this.addChannel('social', { icon: '📱', priority: 'low', sound: false });
    this.addChannel('iot', { icon: '🏠', priority: 'medium', sound: false });
    this.addChannel('errors', { icon: '❌', priority: 'high', sound: true });
  }

  // ─── ADD CHANNEL ───
  addChannel(name, options = {}) {
    this.channels.set(name, {
      name,
      icon: options.icon || '📢',
      priority: options.priority || 'medium', // critical, high, medium, low
      sound: options.sound || false,
      enabled: options.enabled !== false,
      muted: false,
      created: new Date().toISOString()
    });
    return { added: true, channel: name };
  }

  // ─── SEND NOTIFICATION ───
  notify(channel, title, body, options = {}) {
    const ch = this.channels.get(channel);
    if (ch && !ch.enabled) return { sent: false, reason: 'Channel disabled' };
    if (ch && ch.muted) return { sent: false, reason: 'Channel muted' };

    const notification = {
      id: `notif_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 4)}`,
      channel,
      icon: ch?.icon || '📢',
      title,
      body,
      priority: options.priority || ch?.priority || 'medium',
      sound: options.sound ?? ch?.sound ?? false,
      read: false,
      dismissed: false,
      sticky: options.sticky || false,
      actions: options.actions || [],
      metadata: options.metadata || {},
      timestamp: Date.now()
    };

    this.notifications.push(notification);
    if (this.notifications.length > this.maxHistory) {
      this.notifications = this.notifications.slice(-this.maxHistory / 2);
    }

    // Try desktop notification
    this._sendDesktop(notification);

    this.emit('notification', notification);
    this._saveHistory();

    return { sent: true, id: notification.id };
  }

  // ─── QUICK NOTIFIERS ───
  success(title, body, options = {}) {
    return this.notify('system', `✅ ${title}`, body, { ...options, priority: 'medium' });
  }

  warning(title, body, options = {}) {
    return this.notify('system', `⚠️ ${title}`, body, { ...options, priority: 'high' });
  }

  error(title, body, options = {}) {
    return this.notify('errors', `❌ ${title}`, body, { ...options, priority: 'high' });
  }

  info(title, body, options = {}) {
    return this.notify('system', `ℹ️ ${title}`, body, { ...options, priority: 'low' });
  }

  critical(title, body, options = {}) {
    return this.notify('security', `🚨 ${title}`, body, { ...options, priority: 'critical', sound: true });
  }

  // ─── DESKTOP NOTIFICATION ───
  _sendDesktop(notification) {
    try {
      const platform = os.platform();

      if (platform === 'darwin') {
        const script = `display notification "${notification.body.replace(/"/g, '\\"')}" with title "${notification.title.replace(/"/g, '\\"')}"`;
        require('child_process').exec(`osascript -e '${script}'`, { timeout: 5000 });
      } else if (platform === 'linux') {
        const urgency = notification.priority === 'critical' ? 'critical' : notification.priority === 'high' ? 'normal' : 'low';
        require('child_process').exec(`notify-send -u ${urgency} "${notification.title}" "${notification.body}" 2>/dev/null`, { timeout: 5000 });
      } else if (platform === 'win32') {
        // Windows toast notification via PowerShell
        const psScript = `
          [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
          $template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
          $template.GetElementsByTagName('text')[0].AppendChild($template.CreateTextNode('${notification.title}'))
          $template.GetElementsByTagName('text')[1].AppendChild($template.CreateTextNode('${notification.body}'))
          $toast = [Windows.UI.Notifications.ToastNotification]::new($template)
          [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('OpenDesktop').Show($toast)
        `;
        require('child_process').exec(`powershell -Command "${psScript.replace(/\n/g, ' ')}"`, { timeout: 5000 });
      }
    } catch {}
  }

  // ─── GET NOTIFICATIONS ───
  getUnread() {
    return this.notifications.filter(n => !n.read && !n.dismissed);
  }

  getRecent(limit = 20) {
    return this.notifications.slice(-limit).reverse();
  }

  getByChannel(channel, limit = 20) {
    return this.notifications.filter(n => n.channel === channel).slice(-limit).reverse();
  }

  getByPriority(priority, limit = 20) {
    return this.notifications.filter(n => n.priority === priority).slice(-limit).reverse();
  }

  // ─── MARK AS READ ───
  markRead(id) {
    const notif = this.notifications.find(n => n.id === id);
    if (notif) notif.read = true;
    return { marked: true };
  }

  markAllRead() {
    let count = 0;
    for (const n of this.notifications) {
      if (!n.read) { n.read = true; count++; }
    }
    return { marked: count };
  }

  // ─── DISMISS ───
  dismiss(id) {
    const notif = this.notifications.find(n => n.id === id);
    if (notif) notif.dismissed = true;
    return { dismissed: true };
  }

  dismissAll() {
    let count = 0;
    for (const n of this.notifications) {
      if (!n.dismissed) { n.dismissed = true; count++; }
    }
    return { dismissed: count };
  }

  // ─── CHANNEL MANAGEMENT ───
  muteChannel(name) {
    const ch = this.channels.get(name);
    if (ch) { ch.muted = true; return { muted: true, channel: name }; }
    return { error: `Channel ${name} not found` };
  }

  unmuteChannel(name) {
    const ch = this.channels.get(name);
    if (ch) { ch.muted = false; return { unmuted: true, channel: name }; }
    return { error: `Channel ${name} not found` };
  }

  enableChannel(name) {
    const ch = this.channels.get(name);
    if (ch) { ch.enabled = true; return { enabled: true, channel: name }; }
    return { error: `Channel ${name} not found` };
  }

  disableChannel(name) {
    const ch = this.channels.get(name);
    if (ch) { ch.enabled = false; return { disabled: true, channel: name }; }
    return { error: `Channel ${name} not found` };
  }

  listChannels() {
    return [...this.channels.values()];
  }

  // ─── CLEAR HISTORY ───
  clearHistory() {
    this.notifications = [];
    this._saveHistory();
    return { cleared: true };
  }

  // ─── SEARCH ───
  search(query) {
    const q = query.toLowerCase();
    return this.notifications.filter(n =>
      n.title.toLowerCase().includes(q) ||
      n.body.toLowerCase().includes(q) ||
      n.channel.toLowerCase().includes(q)
    ).slice(-20);
  }

  // ─── PERSISTENCE ───
  _saveHistory() {
    try {
      fs.writeFileSync(path.join(this.dataDir, 'history.json'), JSON.stringify(this.notifications.slice(-200), null, 2));
    } catch {}
  }

  _loadHistory() {
    try {
      const file = path.join(this.dataDir, 'history.json');
      if (fs.existsSync(file)) this.notifications = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {}
  }

  // ─── STATUS ───
  getStatus() {
    return {
      total: this.notifications.length,
      unread: this.notifications.filter(n => !n.read).length,
      channels: this.channels.size,
      activeChannels: [...this.channels.values()].filter(c => c.enabled && !c.muted).length
    };
  }
}

module.exports = NotificationCenter;
