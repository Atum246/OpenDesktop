'use strict';

// ═══════════════════════════════════════════════════════════════
//  MESSAGING INTEGRATIONS — ALL Platforms 💬🌐
//  Telegram, Discord, WhatsApp, Slack, Signal, iMessage, IRC,
//  Matrix, Line, Viber, Teams, Twitch, Email, SMS
// ═══════════════════════════════════════════════════════════════

class MessagingHub {
  constructor(config, engine) {
    this.config = config;
    this.engine = engine;
    this.platforms = {};
    this.active = false;
    this.messageLog = [];
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
          case 'signal': await this._initSignal(); break;
          case 'imessage': await this._initIMessage(); break;
          case 'irc': await this._initIRC(); break;
          case 'matrix': await this._initMatrix(); break;
          case 'line': await this._initLine(); break;
          case 'viber': await this._initViber(); break;
          case 'teams': await this._initTeams(); break;
          case 'twitch': await this._initTwitch(); break;
          case 'email': await this._initEmail(); break;
          case 'sms': await this._initSMS(); break;
          case 'mattermost': await this._initMattermost(); break;
          case 'rocketchat': await this._initRocketChat(); break;
          case 'element': await this._initElement(); break;
          case 'guilded': await this._initGuilded(); break;
          case 'revolt': await this._initRevolt(); break;
          case 'session': await this._initSession(); break;
        }
      } catch (err) { console.log(`[Messaging] Failed to init ${p}: ${err.message}`); }
    }
    this.active = Object.keys(this.platforms).length > 0;
    return { active: this.active, platforms: Object.keys(this.platforms) };
  }

  // ═══ TELEGRAM ═══
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
    let consecutiveErrors = 0;
    const maxErrors = 10;

    const poll = async () => {
      try {
        const resp = await axios.get(`https://api.telegram.org/bot${token}/getUpdates`, {
          params: { offset, timeout: 30 }, timeout: 60000
        });
        consecutiveErrors = 0;
        for (const update of resp.data.result) {
          offset = update.update_id + 1;
          if (update.message?.text) {
            try {
              const response = await this.engine.chat(update.message.text);
              await this._sendTelegram(token, update.message.chat.id, response);
              this._logMessage('telegram', 'in', update.message.text);
              this._logMessage('telegram', 'out', response);
            } catch (err) { console.log(`[Telegram] Error: ${err.message}`); }
          }
        }
      } catch (err) {
        consecutiveErrors++;
        if (consecutiveErrors >= maxErrors) return;
      }
      if (this.platforms.telegram?.active) setTimeout(poll, consecutiveErrors > 0 ? 5000 : 1000);
    };
    poll();
  }

  async _sendTelegram(token, chatId, text) {
    const axios = require('axios');
    try {
      await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: chatId, text, parse_mode: 'Markdown'
      });
    } catch {
      await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: chatId, text
      });
    }
  }

  // ═══ DISCORD ═══
  async _initDiscord() {
    const token = this.config.get('messaging.discord.token');
    if (!token) return;
    try {
      // Try discord.js
      const { Client, GatewayIntentBits } = require('discord.js');
      const client = new Client({
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages]
      });

      client.on('messageCreate', async (message) => {
        if (message.author.bot) return;
        try {
          const response = await this.engine.chat(message.content);
          // Split long messages (Discord 2000 char limit)
          const chunks = response.match(/.{1,1900}/gs) || [response];
          for (const chunk of chunks) {
            await message.reply(chunk);
          }
          this._logMessage('discord', 'in', message.content);
          this._logMessage('discord', 'out', response);
        } catch (err) { console.log(`[Discord] Error: ${err.message}`); }
      });

      await client.login(token);
      this.platforms.discord = { token, client, active: true };
    } catch (err) {
      this.platforms.discord = { token, active: false, note: 'Install discord.js: npm install discord.js' };
    }
  }

  // ═══ WHATSAPP ═══
  async _initWhatsApp() {
    try {
      const { Client, LocalAuth } = require('whatsapp-web.js');
      const client = new Client({ authStrategy: new LocalAuth() });

      client.on('message', async (msg) => {
        try {
          const response = await this.engine.chat(msg.body);
          await msg.reply(response);
          this._logMessage('whatsapp', 'in', msg.body);
          this._logMessage('whatsapp', 'out', response);
        } catch (err) { console.log(`[WhatsApp] Error: ${err.message}`); }
      });

      client.initialize();
      this.platforms.whatsapp = { client, active: true };
    } catch (err) {
      this.platforms.whatsapp = { active: false, note: 'Install whatsapp-web.js: npm install whatsapp-web.js' };
    }
  }

  // ═══ SLACK ═══
  async _initSlack() {
    const token = this.config.get('messaging.slack.token');
    const appToken = this.config.get('messaging.slack.appToken');
    if (!token) return;

    try {
      const { WebClient } = require('@slack/web-api');
      const web = new WebClient(token);

      // Socket Mode for real-time
      if (appToken) {
        const { SocketModeClient } = require('@slack/socket-mode');
        const socket = new SocketModeClient({ appToken });
        socket.on('message', async ({ event }) => {
          if (event.bot_id) return;
          try {
            const response = await this.engine.chat(event.text);
            await web.chat.postMessage({ channel: event.channel, text: response });
            this._logMessage('slack', 'in', event.text);
            this._logMessage('slack', 'out', response);
          } catch (err) { console.log(`[Slack] Error: ${err.message}`); }
        });
        await socket.start();
      }

      this.platforms.slack = { token, web, active: true };
    } catch (err) {
      this.platforms.slack = { token, active: false, note: 'Install @slack/web-api and @slack/socket-mode' };
    }
  }

  // ═══ SIGNAL ═══
  async _initSignal() {
    const number = this.config.get('messaging.signal.number');
    if (!number) return;
    this.platforms.signal = {
      number, active: false,
      note: 'Signal requires signal-cli. Install: https://github.com/AsamK/signal-cli. Then configure in settings.'
    };
  }

  // ═══ iMESSAGE ═══
  async _initIMessage() {
    if (process.platform !== 'darwin') {
      this.platforms.imessage = { active: false, note: 'iMessage only available on macOS' };
      return;
    }
    this.platforms.imessage = { active: true, note: 'iMessage via AppleScript on macOS' };
  }

  // ═══ IRC ═══
  async _initIRC() {
    const server = this.config.get('messaging.irc.server', 'irc.libera.chat');
    const channels = this.config.get('messaging.irc.channels', ['#opendesktop']);
    const nick = this.config.get('messaging.irc.nick', 'OpenDesktop-Bot');

    try {
      const net = require('net');
      const client = net.createConnection({ host: server, port: 6667 }, () => {
        client.write(`NICK ${nick}\r\n`);
        client.write(`USER ${nick} 0 * :OpenDesktop AI Bot\r\n`);
        channels.forEach(ch => client.write(`JOIN ${ch}\r\n`));
      });

      let buffer = '';
      client.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\r\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (line.includes('PRIVMSG')) {
            const match = line.match(/:(\S+)!\S+ PRIVMSG (\S+) :(.+)/);
            if (match) {
              const [, from, channel, text] = match;
              if (from !== nick) {
                this._handleIRCMessage(client, nick, channel, from, text);
              }
            }
          }
          // PING/PONG
          if (line.startsWith('PING')) {
            client.write(`PONG ${line.slice(5)}\r\n`);
          }
        }
      });

      this.platforms.irc = { server, channels, nick, client, active: true };
    } catch (err) {
      this.platforms.irc = { active: false, note: `IRC init failed: ${err.message}` };
    }
  }

  async _handleIRCMessage(client, nick, channel, from, text) {
    try {
      const response = await this.engine.chat(text);
      const lines = response.split('\n').slice(0, 5); // IRC line limit
      for (const line of lines) {
        if (line.trim()) {
          client.write(`PRIVMSG ${channel} :${from}: ${line.trim()}\r\n`);
        }
      }
      this._logMessage('irc', 'in', `${from}: ${text}`);
      this._logMessage('irc', 'out', response);
    } catch {}
  }

  // ═══ MATRIX ═══
  async _initMatrix() {
    const homeserver = this.config.get('messaging.matrix.homeserver', 'https://matrix.org');
    const accessToken = this.config.get('messaging.matrix.accessToken');
    const userId = this.config.get('messaging.matrix.userId');
    if (!accessToken) return;

    try {
      const axios = require('axios');
      this.platforms.matrix = { homeserver, userId, accessToken, active: true };

      // Poll for messages
      let syncToken = '';
      const poll = async () => {
        try {
          const resp = await axios.get(`${homeserver}/_matrix/client/v3/sync`, {
            params: { since: syncToken, timeout: 30000 },
            headers: { 'Authorization': `Bearer ${accessToken}` },
            timeout: 60000
          });
          syncToken = resp.data.next_batch;

          const rooms = resp.data.rooms?.join || {};
          for (const [roomId, room] of Object.entries(rooms)) {
            for (const event of room.timeline?.events || []) {
              if (event.type === 'm.room.message' && event.sender !== userId) {
                const text = event.content?.body;
                if (text) {
                  const response = await this.engine.chat(text);
                  await axios.post(`${homeserver}/_matrix/client/v3/rooms/${roomId}/send/m.room.message`, {
                    msgtype: 'm.text', body: response
                  }, { headers: { 'Authorization': `Bearer ${accessToken}` } });
                  this._logMessage('matrix', 'in', text);
                  this._logMessage('matrix', 'out', response);
                }
              }
            }
          }
        } catch {}
        if (this.platforms.matrix?.active) setTimeout(poll, 1000);
      };
      poll();
    } catch (err) {
      this.platforms.matrix = { active: false, note: `Matrix init failed: ${err.message}` };
    }
  }

  // ═══ LINE ═══
  async _initLine() {
    const channelAccessToken = this.config.get('messaging.line.channelAccessToken');
    if (!channelAccessToken) return;
    this.platforms.line = {
      channelAccessToken, active: false,
      note: 'LINE requires a webhook server. Configure Channel Access Token and set up webhook at developers.line.biz'
    };
  }

  // ═══ VIBER ═══
  async _initViber() {
    const authToken = this.config.get('messaging.viber.authToken');
    if (!authToken) return;
    this.platforms.viber = {
      authToken, active: false,
      note: 'Viber requires a webhook server. Configure Auth Token in settings.'
    };
  }

  // ═══ TEAMS ═══
  async _initTeams() {
    const token = this.config.get('messaging.teams.token');
    if (!token) return;
    this.platforms.teams = {
      token, active: false,
      note: 'MS Teams requires Bot Framework. Configure App ID and Password in settings.'
    };
  }

  // ═══ TWITCH ═══
  async _initTwitch() {
    const oauth = this.config.get('messaging.twitch.oauth');
    const channels = this.config.get('messaging.twitch.channels', []);
    if (!oauth) return;

    try {
      const net = require('net');
      const client = net.createConnection({ host: 'irc.chat.twitch.tv', port: 6667 }, () => {
        client.write(`PASS ${oauth}\r\n`);
        client.write(`NICK opendesktop\r\n`);
        channels.forEach(ch => client.write(`JOIN #${ch}\r\n`));
      });

      let buffer = '';
      client.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\r\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (line.includes('PRIVMSG')) {
            const match = line.match(/:(\S+)!\S+ PRIVMSG #(\S+) :(.+)/);
            if (match) {
              const [, from, channel, text] = match;
              this._handleTwitchMessage(client, channel, from, text);
            }
          }
          if (line.startsWith('PING')) client.write(`PONG ${line.slice(5)}\r\n`);
        }
      });

      this.platforms.twitch = { oauth, channels, client, active: true };
    } catch (err) {
      this.platforms.twitch = { active: false, note: `Twitch init failed: ${err.message}` };
    }
  }

  async _handleTwitchMessage(client, channel, from, text) {
    try {
      this._logMessage('twitch', 'in', `${from}: ${text}`);
      // Only respond to commands or mentions
      if (text.startsWith('!od ') || text.startsWith('!ask ')) {
        const query = text.replace(/^!(od|ask)\s+/, '');
        const response = await this.engine.chat(query);
        const shortResponse = response.slice(0, 400); // Twitch char limit
        client.write(`PRIVMSG #${channel} :@${from} ${shortResponse}\r\n`);
        this._logMessage('twitch', 'out', shortResponse);
      }
    } catch {}
  }

  // ═══ EMAIL ═══
  async _initEmail() {
    const imap = this.config.get('messaging.email.imap');
    const smtp = this.config.get('messaging.email.smtp');
    if (!imap || !smtp) return;
    this.platforms.email = {
      imap, smtp, active: false,
      note: 'Email integration requires IMAP/SMTP credentials. Configure in settings.'
    };
  }

  // ═══ SMS (via Twilio) ═══
  async _initSMS() {
    const accountSid = this.config.get('messaging.sms.twilioAccountSid');
    const authToken = this.config.get('messaging.sms.twilioAuthToken');
    if (!accountSid || !authToken) return;
    this.platforms.sms = {
      accountSid, authToken, active: false,
      note: 'SMS via Twilio. Configure Account SID and Auth Token in settings.'
    };
  }

  // ═══ MATTERMOST ═══
  async _initMattermost() {
    const url = this.config.get('messaging.mattermost.url');
    const token = this.config.get('messaging.mattermost.token');
    if (!url || !token) return;
    try {
      const axios = require('axios');
      const resp = await axios.get(`${url}/api/v4/users/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      this.platforms.mattermost = { url, token, userId: resp.data.id, active: true };
    } catch (err) {
      this.platforms.mattermost = { active: false, note: `Mattermost init failed: ${err.message}` };
    }
  }

  // ═══ ROCKET.CHAT ═══
  async _initRocketChat() {
    const url = this.config.get('messaging.rocketchat.url');
    const token = this.config.get('messaging.rocketchat.token');
    const userId = this.config.get('messaging.rocketchat.userId');
    if (!url || !token) return;
    this.platforms.rocketchat = { url, token, userId, active: true };
  }

  // ═══ ELEMENT (Matrix client) ═══
  async _initElement() {
    // Element uses Matrix protocol
    await this._initMatrix();
    this.platforms.element = this.platforms.matrix || { active: false, note: 'Element uses Matrix protocol' };
  }

  // ═══ GUILDED ═══
  async _initGuilded() {
    const token = this.config.get('messaging.guilded.token');
    if (!token) return;
    this.platforms.guilded = { token, active: false, note: 'Guilded API integration. Configure token in settings.' };
  }

  // ═══ REVOLT ═══
  async _initRevolt() {
    const token = this.config.get('messaging.revolt.token');
    if (!token) return;
    this.platforms.revolt = { token, active: false, note: 'Revolt API integration. Configure token in settings.' };
  }

  // ═══ SESSION ═══
  async _initSession() {
    this.platforms.session = { active: false, note: 'Session requires the Session desktop app. Integration via file monitoring.' };
  }

  // ═══ SEND MESSAGE ═══
  async sendMessage(platform, target, message) {
    switch (platform) {
      case 'telegram':
        return this._sendTelegram(this.platforms.telegram.token, target, message);
      case 'discord':
        if (this.platforms.discord?.client) {
          const channel = await this.platforms.discord.client.channels.fetch(target);
          const chunks = message.match(/.{1,1900}/gs) || [message];
          for (const chunk of chunks) await channel.send(chunk);
        }
        break;
      case 'slack':
        if (this.platforms.slack?.web) {
          await this.platforms.slack.web.chat.postMessage({ channel: target, text: message });
        }
        break;
      case 'matrix':
        if (this.platforms.matrix) {
          const axios = require('axios');
          await axios.post(`${this.platforms.matrix.homeserver}/_matrix/client/v3/rooms/${target}/send/m.room.message`, {
            msgtype: 'm.text', body: message
          }, { headers: { 'Authorization': `Bearer ${this.platforms.matrix.accessToken}` } });
        }
        break;
      default:
        return { error: `Platform ${platform} not configured or not supported for sending` };
    }
    this._logMessage(platform, 'out', message);
    return { sent: true, platform, target };
  }

  // ═══ BROADCAST ═══
  async broadcast(message, platforms = null) {
    const targets = platforms || Object.keys(this.platforms);
    const results = [];
    for (const platform of targets) {
      try {
        const result = await this.sendMessage(platform, null, message);
        results.push({ platform, ...result });
      } catch (err) {
        results.push({ platform, error: err.message });
      }
    }
    return results;
  }

  // ═══ MESSAGE LOG ═══
  _logMessage(platform, direction, content) {
    this.messageLog.push({
      platform, direction,
      content: content?.slice(0, 500),
      timestamp: Date.now()
    });
    if (this.messageLog.length > 1000) this.messageLog = this.messageLog.slice(-500);
  }

  getMessageLog(platform, limit = 20) {
    let log = this.messageLog;
    if (platform) log = log.filter(m => m.platform === platform);
    return log.slice(-limit);
  }

  // ═══ GET ALL SUPPORTED PLATFORMS ═══
  getSupportedPlatforms() {
    return [
      { id: 'telegram', name: 'Telegram', icon: '📨', requires: 'Bot Token (from @BotFather)' },
      { id: 'discord', name: 'Discord', icon: '🎮', requires: 'Bot Token + discord.js' },
      { id: 'whatsapp', name: 'WhatsApp', icon: '💚', requires: 'whatsapp-web.js + QR scan' },
      { id: 'slack', name: 'Slack', icon: '💼', requires: 'Bot Token + App Token' },
      { id: 'signal', name: 'Signal', icon: '🔵', requires: 'signal-cli' },
      { id: 'imessage', name: 'iMessage', icon: '🍎', requires: 'macOS only' },
      { id: 'irc', name: 'IRC', icon: '📡', requires: 'Server + Channel' },
      { id: 'matrix', name: 'Matrix', icon: '🔮', requires: 'Homeserver + Access Token' },
      { id: 'line', name: 'LINE', icon: '🟢', requires: 'Channel Access Token' },
      { id: 'viber', name: 'Viber', icon: '💜', requires: 'Auth Token' },
      { id: 'teams', name: 'MS Teams', icon: '🟦', requires: 'Bot Framework App' },
      { id: 'twitch', name: 'Twitch', icon: '🟣', requires: 'OAuth Token' },
      { id: 'email', name: 'Email', icon: '📧', requires: 'IMAP + SMTP credentials' },
      { id: 'sms', name: 'SMS', icon: '📱', requires: 'Twilio Account SID + Auth' },
      { id: 'mattermost', name: 'Mattermost', icon: '🟠', requires: 'Server URL + Token' },
      { id: 'rocketchat', name: 'Rocket.Chat', icon: '🚀', requires: 'Server URL + Token' },
      { id: 'element', name: 'Element', icon: '🟢', requires: 'Matrix credentials' },
      { id: 'guilded', name: 'Guilded', icon: '⚔️', requires: 'API Token' },
      { id: 'revolt', name: 'Revolt', icon: '🏴', requires: 'API Token' },
      { id: 'session', name: 'Session', icon: '🛡️', requires: 'Session desktop app' }
    ];
  }

  // ═══ STATUS ═══
  getStatus() {
    return {
      active: this.active,
      platforms: Object.entries(this.platforms).map(([k, v]) => ({
        name: k, active: v.active, note: v.note
      })),
      totalMessages: this.messageLog.length,
      supportedPlatforms: this.getSupportedPlatforms().length
    };
  }
}

module.exports = MessagingHub;
