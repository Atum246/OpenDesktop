'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');

// ═══════════════════════════════════════════════════════════════
//  VISUAL UNDERSTANDING ENGINE — Sees Like a Human 👁️🧠
//  UI detection, click-by-description, screen diffing, visual memory
// ═══════════════════════════════════════════════════════════════

class VisualUnderstanding {
  constructor(config, provider, vision) {
    this.config = config;
    this.provider = provider;
    this.vision = vision;
    this.visualMemory = new Map(); // screenshot hash -> analysis
    this.uiElements = new Map();   // element description -> coordinates
    this.screenHistory = [];       // Previous screenshots for diffing
    this.maxHistory = 10;
    this.dataDir = path.join(os.homedir(), '.opendesktop', 'visual');
    if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
  }

  // ─── ANALYZE WITH STRUCTURED OUTPUT ───
  async analyzeStructured(screenshotPath, question) {
    const analysis = await this.vision.analyzeScreen(screenshotPath,
      `${question}\n\nRespond in this exact JSON format:
{
  "summary": "brief description",
  "elements": [
    {"type": "button|text|input|link|menu|icon|image", "text": "visible text", "x": estimated_x, "y": estimated_y, "description": "what it looks like"}
  ],
  "actions": ["possible actions the user can take"],
  "state": "what state the UI is in"
}`
    );

    try {
      const jsonMatch = analysis.analysis?.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: analysis.analysis, elements: [], raw: analysis.analysis };
    } catch {
      return { summary: analysis.analysis, elements: [], raw: analysis.analysis };
    }
  }

  // ─── FIND ELEMENT BY DESCRIPTION ───
  async findElement(description, screenshotPath) {
    const imgPath = screenshotPath || this.vision.lastScreenshot;
    if (!imgPath) return { error: 'No screenshot available' };

    const result = await this.vision.analyzeScreen(imgPath,
      `Find this UI element: "${description}"
Return ONLY a JSON object:
{"found": true, "x": pixel_x, "y": pixel_y, "confidence": 0.0-1.0, "element": "description of what you found"}
If not found: {"found": false}`
    );

    try {
      const coords = JSON.parse(result.analysis?.match(/\{[\s\S]*\}/)?.[0] || '{}');
      if (coords.found) {
        this.uiElements.set(description, coords);
      }
      return coords;
    } catch {
      return { found: false, raw: result.analysis };
    }
  }

  // ─── CLICK BY DESCRIPTION ───
  async clickElement(description, automation) {
    const element = await this.findElement(description);
    if (!element.found) return { error: `Could not find: ${description}`, element };

    if (automation) {
      await automation.mouseClick(element.x, element.y);
      return { clicked: true, x: element.x, y: element.y, element: description };
    }
    return { ...element, note: 'Automation not available, coordinates provided' };
  }

  // ─── TYPE AT ELEMENT ───
  async typeAtElement(description, text, automation) {
    const clickResult = await this.clickElement(description, automation);
    if (clickResult.error) return clickResult;

    // Small delay after click
    await new Promise(r => setTimeout(r, 200));

    if (automation) {
      await automation.typeText(text);
      return { typed: true, text, at: description };
    }
    return { ...clickResult, text, note: 'Coordinates provided, type manually' };
  }

  // ─── SCREEN DIFFING ───
  async diffScreens(screenshot1, screenshot2) {
    const analysis = await this.provider.chat(
      `Compare these two screenshots and describe what changed.

Screenshot 1: ${screenshot1}
Screenshot 2: ${screenshot2}

Describe:
1. What appeared (new elements)
2. What disappeared (removed elements)
3. What moved
4. What changed (text, color, state)
5. Overall summary of changes`,
      { maxTokens: 1000 }
    );

    return { changes: analysis, screenshot1, screenshot2, timestamp: new Date().toISOString() };
  }

  // ─── CONTINUOUS SCREEN MONITORING ───
  async startMonitoring(intervalMs, callback) {
    let lastAnalysis = null;

    const monitor = setInterval(async () => {
      try {
        const shot = await this.vision.takeScreenshot();
        if (shot.error) return;

        // Add to history
        this.screenHistory.push({ path: shot.path, timestamp: Date.now() });
        if (this.screenHistory.length > this.maxHistory) {
          const old = this.screenHistory.shift();
          // Clean up old screenshots
          try { fs.unlinkSync(old.path); } catch {}
        }

        // Quick analysis
        const analysis = await this.analyzeStructured(shot.path, 'Briefly describe what is on screen. Focus on the main content and any interactive elements.');

        // Detect changes from last analysis
        let changes = null;
        if (lastAnalysis) {
          changes = this._detectChanges(lastAnalysis, analysis);
        }

        lastAnalysis = analysis;

        if (callback) {
          callback({
            screenshot: shot.path,
            analysis,
            changes,
            timestamp: new Date().toISOString()
          });
        }
      } catch {}
    }, intervalMs || 5000);

    return { monitoring: true, interval: intervalMs || 5000, stop: () => clearInterval(monitor) };
  }

  _detectChanges(prev, current) {
    const changes = [];

    // Check for new elements
    const prevTexts = new Set((prev.elements || []).map(e => e.text?.toLowerCase()));
    for (const elem of (current.elements || [])) {
      if (elem.text && !prevTexts.has(elem.text.toLowerCase())) {
        changes.push({ type: 'appeared', element: elem });
      }
    }

    // Check for removed elements
    const currTexts = new Set((current.elements || []).map(e => e.text?.toLowerCase()));
    for (const elem of (prev.elements || [])) {
      if (elem.text && !currTexts.has(elem.text.toLowerCase())) {
        changes.push({ type: 'disappeared', element: elem });
      }
    }

    // Check for state changes
    if (prev.state !== current.state) {
      changes.push({ type: 'state-change', from: prev.state, to: current.state });
    }

    return changes;
  }

  // ─── READ TEXT FROM SCREEN ───
  async readScreen(screenshotPath) {
    const result = await this.vision.analyzeScreen(screenshotPath,
      'Extract ALL visible text from this screenshot. Organize by region. Include text from buttons, menus, headers, body text, labels, and any other visible text. Be thorough.'
    );
    return result.analysis;
  }

  // ─── UNDERSTAND UI STRUCTURE ───
  async understandUI(screenshotPath) {
    const result = await this.analyzeStructured(screenshotPath,
      'Analyze this UI in detail. Identify: 1) The application/page type, 2) All interactive elements with their positions, 3) The current state/context, 4) Available actions, 5) Navigation structure'
    );
    return result;
  }

  // ─── VISUAL MEMORY ───
  rememberScreen(screenshotPath, context) {
    const hash = this._hashFile(screenshotPath);
    this.visualMemory.set(hash, {
      path: screenshotPath,
      context,
      timestamp: Date.now(),
      accessed: 0
    });
  }

  recallScreen(context) {
    const results = [];
    for (const [hash, entry] of this.visualMemory) {
      if (entry.context.toLowerCase().includes(context.toLowerCase())) {
        results.push({ ...entry, hash, relevance: 1 });
      }
    }
    return results.sort((a, b) => b.timestamp - a.timestamp);
  }

  _hashFile(filepath) {
    try {
      const crypto = require('crypto');
      const content = fs.readFileSync(filepath);
      return crypto.createHash('md5').update(content).digest('hex').slice(0, 12);
    } catch {
      return Date.now().toString(36);
    }
  }

  // ─── STATUS ───
  getStatus() {
    return {
      lastScreenshot: this.vision.lastScreenshot,
      visualMemorySize: this.visualMemory.size,
      uiElementsTracked: this.uiElements.size,
      screenHistorySize: this.screenHistory.length
    };
  }
}

module.exports = VisualUnderstanding;
