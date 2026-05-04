'use strict';

// ═══════════════════════════════════════════════════════════════
//  MESSAGING INTEGRATIONS — Telegram, Discord, WhatsApp, Slack
// ═══════════════════════════════════════════════════════════════

class MessagingHub {
  constructor(config, engine) {
    this.config = config;
    this.engine = engine;
    this.platforms = {};
    this.active = false;
  }

  async init() {
    const platforms = this.config.get('messaging.platforms', []);
    for (const p of platforms) {
      try {
        switch (p) {
          case 'telegram': await this._initTelegram(); break;
          case 'discord': await this._initDiscord(); break;
          case 'whatsapp': await this._initWhatsApp(); break;
          case 'slack': await this._initSlack(); break;
        }
      } catch (err) { console.log(`[Messaging] Failed to init ${p}: ${err.message}`); }
    }
    this.active = Object.keys(this.platforms).length > 0;
    return { active: this.active, platforms: Object.keys(this.platforms) };
  }

  async _initTelegram() {
    const token = this.config.get('messaging.telegram.token');
    if (!token) return;
    try {
      const axios = require('axios');
      const resp = await axios.get(`https://api.telegram.org/bot${token}/getMe`);
      this.platforms.telegram = { token, botName: resp.data.result.username, active: true };
      this._startTelegramPolling(token);
    } catch (err) { throw new Error(`Telegram init failed: ${err.message}`); }
  }

  async _startTelegramPolling(token) {
    const axios = require('axios');
    let offset = 0;
    const poll = async () => {
      try {
        const resp = await axios.get(`https://api.telegram.org/bot${token}/getUpdates`, { params: { offset, timeout: 30 } });
        for (const update of resp.data.result) {
          offset = update.update_id + 1;
          if (update.message?.text) {
            const response = await this.engine.chat(update.message.text);
            await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
              chat_id: update.message.chat.id, text: response, parse_mode: 'Markdown'
            });
          }
        }
      } catch {}
      setTimeout(poll, 1000);
    };
    poll();
  }

  async _initDiscord() {
    const token = this.config.get('messaging.discord.token');
    if (!token) return;
    this.platforms.discord = { token, active: true, note: 'Use discord.js for full bot functionality' };
  }

  async _initWhatsApp() {
    this.platforms.whatsapp = { active: false, note: 'WhatsApp integration via whatsapp-web.js — configure in settings' };
  }

  async _initSlack() {
    const token = this.config.get('messaging.slack.token');
    if (!token) return;
    this.platforms.slack = { token, active: true };
  }

  async sendMessage(platform, target, message) {
    const axios = require('axios');
    switch (platform) {
      case 'telegram':
        return axios.post(`https://api.telegram.org/bot${this.platforms.telegram.token}/sendMessage`, { chat_id: target, text: message, parse_mode: 'Markdown' });
      default:
        return { error: `Platform ${platform} not configured` };
    }
  }

  getStatus() { return { active: this.active, platforms: Object.entries(this.platforms).map(([k, v]) => ({ name: k, ...v })) }; }
}

module.exports = MessagingHub;
