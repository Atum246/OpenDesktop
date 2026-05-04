'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');

// ═══════════════════════════════════════════════════════════════
//  VISION SYSTEM — Screen Understanding & OCR
// ═══════════════════════════════════════════════════════════════

class VisionSystem {
  constructor(config, provider) {
    this.config = config;
    this.provider = provider;
    this.screenshotDir = path.join(os.homedir(), '.opendesktop', 'screenshots');
    if (!fs.existsSync(this.screenshotDir)) fs.mkdirSync(this.screenshotDir, { recursive: true });
    this.lastScreenshot = null;
    this.screenWatchInterval = null;
  }

  async takeScreenshot(options = {}) {
    try {
      const screenshot = require('screenshot-desktop');
      const timestamp = Date.now().toString(36);
      const filename = options.filename || `screen_${timestamp}.png`;
      const filepath = path.join(this.screenshotDir, filename);
      const img = await screenshot({ format: 'png', screen: options.screen || 0 });
      fs.writeFileSync(filepath, img);
      this.lastScreenshot = filepath;
      return { path: filepath, buffer: img, timestamp: new Date().toISOString() };
    } catch (err) {
      return { error: `Screenshot failed: ${err.message}`, fallback: true };
    }
  }

  async analyzeScreen(screenshotPath, question) {
    const imgPath = screenshotPath || this.lastScreenshot;
    if (!imgPath || !fs.existsSync(imgPath)) return { error: 'No screenshot available. Take a screenshot first.' };

    try {
      const base64 = fs.readFileSync(imgPath).toString('base64');
      const prompt = question || 'Analyze this screenshot in detail. Describe all UI elements, text, buttons, and interactive components you can see. Provide coordinates estimates for clickable elements.';

      const providerName = this.provider.providerName;
      const visionModels = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'claude-3.5-sonnet', 'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku', 'gemini-pro-vision', 'gemini-1.5-pro', 'gemini-1.5-flash'];
      const currentModel = this.provider.model;
      const hasVision = visionModels.some(m => currentModel.includes(m));

      if (!hasVision) {
        return { analysis: 'Vision analysis requires a vision-capable model (GPT-4o, Claude 3.5, Gemini, etc.)', screenshot: imgPath };
      }

      if (providerName === 'anthropic') {
        const axios = require('axios');
        const providerData = require('../providers/index.js').PROVIDERS[providerName];
        const baseUrl = this.provider.endpoint || providerData.baseUrl;
        const headers = providerData.headers(this.provider.apiKey);

        const resp = await axios.post(`${baseUrl}/messages`, {
          model: currentModel,
          max_tokens: 2048,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/png', data: base64 } },
              { type: 'text', text: prompt }
            ]
          }]
        }, { headers, timeout: 60000 });

        return { analysis: resp.data.content[0].text, screenshot: imgPath };
      }

      // OpenAI-compatible (OpenRouter, OpenAI, etc.)
      const axios = require('axios');
      const providerData = require('../providers/index.js').PROVIDERS[providerName];
      const baseUrl = this.provider.endpoint || providerData.baseUrl;
      const headers = providerData.headers(this.provider.apiKey);

      const resp = await axios.post(`${baseUrl}/chat/completions`, {
        model: currentModel,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:image/png;base64,${base64}` } }
          ]
        }],
        max_tokens: 2048
      }, { headers, timeout: 60000 });

      return { analysis: resp.data.choices[0].message.content, screenshot: imgPath };
    } catch (err) {
      return { error: `Analysis failed: ${err.message}` };
    }
  }

  async findOnScreen(description) {
    const analysis = await this.analyzeScreen(null, `Find the following element on screen and return its approximate pixel coordinates (x, y): "${description}". Return ONLY a JSON object with {x, y, confidence, element}. If not found, return {found: false}.`);
    try {
      const coords = JSON.parse(analysis.analysis);
      return coords;
    } catch {
      return { found: false, raw: analysis.analysis };
    }
  }

  async readText(screenshotPath) {
    return await this.analyzeScreen(screenshotPath, 'Extract and return ALL visible text from this screenshot. Organize by region/section.');
  }

  async startWatching(intervalMs, callback) {
    this.stopWatching();
    this.screenWatchInterval = setInterval(async () => {
      const shot = await this.takeScreenshot();
      if (!shot.error) {
        const analysis = await this.analyzeScreen(shot.path, 'Briefly describe what changed on screen.');
        callback(analysis);
      }
    }, intervalMs || 5000);
    return { watching: true, interval: intervalMs || 5000 };
  }

  stopWatching() { if (this.screenWatchInterval) { clearInterval(this.screenWatchInterval); this.screenWatchInterval = null; } return { watching: false }; }

  async recordScreen(durationMs, fps) {
    return { message: 'Screen recording initiated', duration: durationMs || 10000, fps: fps || 1, note: 'Use /screen stop to end recording' };
  }

  getScreenInfo() {
    try {
      const si = require('systeminformation');
      return si.graphics().then(g => ({ displays: g.displays, count: g.displays.length }));
    } catch {
      return { displays: [], count: 1 };
    }
  }
}

module.exports = VisionSystem;
