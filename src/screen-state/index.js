/**
 * Screen-as-State Machine
 * 
 * Watches the screen in real-time, understands UI state, and maintains
 * a rolling "world model" of the desktop. Enables visual workflow replay
 * and state-based automation.
 */

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

class ScreenStateMachine extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      captureInterval: config.captureInterval || 2000,
      maxHistory: config.maxHistory || 100,
      diffThreshold: config.diffThreshold || 0.05,
      statePath: config.statePath || path.join(process.env.HOME || '~', '.opendesktop', 'screen-state'),
      ...config
    };

    this.currentState = null;
    this.stateHistory = [];
    this.stateGraph = new Map();    // stateId -> { transitions: Map, metadata }
    this.elementCache = new Map();  // element fingerprint -> element info
    this.isWatching = false;
    this.captureTimer = null;
    this.workflowRecordings = new Map();
  }

  async initialize(visionSystem, automationSystem) {
    this.vision = visionSystem;
    this.automation = automationSystem;

    try {
      await fs.mkdir(this.config.statePath, { recursive: true });
    } catch (e) {}

    this.emit('initialized');
    return this;
  }

  /**
   * Capture current screen and compute state.
   */
  async captureState() {
    const screenshot = await this._takeScreenshot();
    const elements = await this._detectElements(screenshot);
    const textContent = await this._extractText(screenshot);
    const appInfo = await this._getActiveApp();

    const state = {
      id: this._generateStateId(),
      timestamp: Date.now(),
      app: appInfo,
      elements: elements.map(el => ({
        id: el.id,
        type: el.type,
        text: el.text,
        bounds: el.bounds,
        fingerprint: this._fingerprintElement(el),
        interactable: el.interactable,
        state: el.state // enabled, focused, selected, etc.
      })),
      textContent: textContent.substring(0, 2000),
      screenshotHash: this._hashScreenshot(screenshot),
      transition: null
    };

    // Compute transition from previous state
    if (this.currentState) {
      state.transition = this._computeTransition(this.currentState, state);
    }

    // Update state graph
    this._updateStateGraph(state);

    // Store
    this.currentState = state;
    this.stateHistory.push(state);
    if (this.stateHistory.length > this.config.maxHistory) {
      this.stateHistory = this.stateHistory.slice(-this.config.maxHistory / 2);
    }

    // Cache elements
    for (const el of state.elements) {
      this.elementCache.set(el.fingerprint, {
        ...el,
        lastSeen: state.timestamp,
        stateId: state.id
      });
    }

    // Check active recordings
    this._checkRecordings(state);

    this.emit('state_captured', state);
    return state;
  }

  /**
   * Start continuous screen watching.
   */
  async startWatching() {
    if (this.isWatching) return;
    this.isWatching = true;

    this.captureTimer = setInterval(async () => {
      try {
        await this.captureState();
      } catch (err) {
        this.emit('capture_error', err);
      }
    }, this.config.captureInterval);

    // Initial capture
    await this.captureState();
    this.emit('watching_started');
  }

  /**
   * Stop watching.
   */
  stopWatching() {
    this.isWatching = false;
    if (this.captureTimer) {
      clearInterval(this.captureTimer);
      this.captureTimer = null;
    }
    this.emit('watching_stopped');
  }

  /**
   * Find a UI element by natural language description.
   */
  async findElement(description) {
    if (!this.currentState) {
      await this.captureState();
    }

    const descLower = description.toLowerCase();
    const candidates = this.currentState.elements
      .map(el => ({
        ...el,
        matchScore: this._scoreElementMatch(el, descLower)
      }))
      .filter(el => el.matchScore > 0.3)
      .sort((a, b) => b.matchScore - a.matchScore);

    if (candidates.length === 0) {
      // Try OCR-based search
      const ocrResults = await this._searchByOCR(description);
      return ocrResults;
    }

    return {
      found: true,
      element: candidates[0],
      alternatives: candidates.slice(1, 5),
      confidence: candidates[0].matchScore
    };
  }

  /**
   * Click an element by description.
   */
  async clickElement(description) {
    const result = await this.findElement(description);
    if (!result.found) {
      return { success: false, error: 'Element not found', description };
    }

    const el = result.element;
    const centerX = el.bounds.x + el.bounds.width / 2;
    const centerY = el.bounds.y + el.bounds.height / 2;

    if (this.automation) {
      await this.automation.mouse.click(centerX, centerY);
    }

    this.emit('element_clicked', { element: el, description });
    
    // Capture state after click
    await this._delay(500);
    const newState = await this.captureState();

    return {
      success: true,
      element: el,
      clickedAt: { x: centerX, y: centerY },
      newState: newState.id
    };
  }

  /**
   * Type text at an element found by description.
   */
  async typeAtElement(description, text) {
    const result = await this.findElement(description);
    if (!result.found) {
      return { success: false, error: 'Element not found' };
    }

    // Click to focus
    await this.clickElement(description);
    await this._delay(200);

    if (this.automation) {
      await this.automation.keyboard.type(text);
    }

    this.emit('text_typed', { element: result.element, text });
    return { success: true, element: result.element, text };
  }

  /**
   * Record a workflow from current screen interactions.
   */
  startRecording(name) {
    const recording = {
      name,
      startTime: Date.now(),
      steps: [],
      startState: this.currentState?.id
    };
    this.workflowRecordings.set(name, recording);
    this.emit('recording_started', { name });
    return recording;
  }

  /**
   * Stop recording and save workflow.
   */
  stopRecording(name) {
    const recording = this.workflowRecordings.get(name);
    if (!recording) return null;

    recording.endTime = Date.now();
    recording.duration = recording.endTime - recording.startTime;
    recording.endState = this.currentState?.id;
    this.workflowRecordings.delete(name);

    this.emit('recording_stopped', recording);
    return recording;
  }

  /**
   * Replay a recorded workflow.
   */
  async replayWorkflow(workflow, options = {}) {
    const { speed = 1.0, skipErrors = false, dryRun = false } = options;
    
    this.emit('replay_started', { workflow: workflow.name, steps: workflow.steps.length });

    const results = [];
    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i];
      
      this.emit('replay_step', { step: i + 1, total: workflow.steps.length, action: step.action });

      if (dryRun) {
        results.push({ step: i, action: step.action, result: 'dry_run' });
        continue;
      }

      try {
        let result;
        switch (step.action) {
          case 'click':
            result = await this.clickElement(step.target);
            break;
          case 'type':
            result = await this.typeAtElement(step.target, step.text);
            break;
          case 'wait':
            await this._delay(step.duration || 1000);
            result = { success: true };
            break;
          case 'screenshot':
            result = await this.captureState();
            break;
          default:
            result = { success: false, error: `Unknown action: ${step.action}` };
        }
        results.push({ step: i, action: step.action, result });

        // Adaptive delay based on speed
        await this._delay(500 / speed);
      } catch (err) {
        if (skipErrors) {
          results.push({ step: i, action: step.action, error: err.message });
        } else {
          this.emit('replay_error', { step: i, error: err });
          return { success: false, error: err.message, completedSteps: i, results };
        }
      }
    }

    this.emit('replay_complete', { workflow: workflow.name, results });
    return { success: true, results };
  }

  /**
   * Compare two screenshots and detect changes.
   */
  async diffStates(stateA, stateB) {
    const changes = {
      appChanged: stateA.app?.name !== stateB.app?.name,
      newElements: [],
      removedElements: [],
      movedElements: [],
      textChanges: [],
      significantChange: false
    };

    // Compare elements
    const aElements = new Map(stateA.elements.map(el => [el.fingerprint, el]));
    const bElements = new Map(stateB.elements.map(el => [el.fingerprint, el]));

    for (const [fp, el] of bElements) {
      if (!aElements.has(fp)) {
        changes.newElements.push(el);
      } else {
        const oldEl = aElements.get(fp);
        if (oldEl.bounds.x !== el.bounds.x || oldEl.bounds.y !== el.bounds.y) {
          changes.movedElements.push({ from: oldEl, to: el });
        }
        if (oldEl.state !== el.state) {
          changes.textChanges.push({ element: el, oldState: oldEl.state, newState: el.state });
        }
      }
    }

    for (const [fp, el] of aElements) {
      if (!bElements.has(fp)) {
        changes.removedElements.push(el);
      }
    }

    // Check text content changes
    if (stateA.textContent !== stateB.textContent) {
      changes.textChanges.push({
        type: 'content',
        oldLength: stateA.textContent.length,
        newLength: stateB.textContent.length
      });
    }

    changes.significantChange = 
      changes.appChanged ||
      changes.newElements.length > 3 ||
      changes.removedElements.length > 3 ||
      changes.textChanges.length > 5;

    return changes;
  }

  /**
   * Get the current world model.
   */
  getWorldModel() {
    return {
      currentState: this.currentState,
      historyLength: this.stateHistory.length,
      stateGraphSize: this.stateGraph.size,
      elementCacheSize: this.elementCache.size,
      activeRecordings: Array.from(this.workflowRecordings.keys()),
      isWatching: this.isWatching
    };
  }

  /**
   * Get state transition statistics.
   */
  getTransitionStats() {
    const stats = {
      totalStates: this.stateGraph.size,
      totalTransitions: 0,
      mostVisitedStates: [],
      commonTransitions: []
    };

    const stateVisits = [];
    const transitionCounts = [];

    for (const [stateId, stateData] of this.stateGraph) {
      stateVisits.push({ stateId, visits: stateData.visits || 1 });
      stats.totalTransitions += stateData.transitions.size;

      for (const [targetId, count] of stateData.transitions) {
        transitionCounts.push({ from: stateId, to: targetId, count });
      }
    }

    stats.mostVisitedStates = stateVisits
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 10);

    stats.commonTransitions = transitionCounts
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return stats;
  }

  // ==================== PRIVATE METHODS ====================

  async _takeScreenshot() {
    // In production, this uses the actual screenshot system
    if (this.vision && this.vision.takeScreenshot) {
      return await this.vision.takeScreenshot();
    }
    return { width: 1920, height: 1080, data: 'placeholder' };
  }

  async _detectElements(screenshot) {
    if (this.vision && this.vision.detectElements) {
      return await this.vision.detectElements(screenshot);
    }
    return [];
  }

  async _extractText(screenshot) {
    if (this.vision && this.vision.performOCR) {
      return await this.vision.performOCR(screenshot);
    }
    return '';
  }

  async _getActiveApp() {
    try {
      const si = require('systeminformation');
      const procs = await si.processes();
      const active = procs.list.find(p => p.name && p.cpu > 0);
      return active ? { name: active.name, pid: active.pid } : null;
    } catch (e) {
      return null;
    }
  }

  _fingerprintElement(el) {
    const key = `${el.type}:${el.text}:${el.bounds?.x}:${el.bounds?.y}:${el.bounds?.width}:${el.bounds?.height}`;
    return this._simpleHash(key);
  }

  _hashScreenshot(screenshot) {
    return this._simpleHash(JSON.stringify(screenshot));
  }

  _simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  _scoreElementMatch(el, description) {
    let score = 0;
    const elText = (el.text || '').toLowerCase();
    const elType = (el.type || '').toLowerCase();

    // Direct text match
    if (elText.includes(description)) score += 0.8;
    if (description.includes(elText)) score += 0.6;

    // Type match
    const typeKeywords = {
      'button': ['button', 'btn', 'click', 'submit', 'ok', 'cancel', 'save'],
      'input': ['input', 'field', 'text', 'type', 'enter', 'search', 'box'],
      'link': ['link', 'href', 'url', 'navigate'],
      'checkbox': ['check', 'toggle', 'switch', 'box'],
      'dropdown': ['select', 'dropdown', 'menu', 'choose'],
      'icon': ['icon', 'symbol', 'image']
    };

    for (const [type, keywords] of Object.entries(typeKeywords)) {
      if (elType === type && keywords.some(kw => description.includes(kw))) {
        score += 0.4;
      }
    }

    // Fuzzy text match
    const descWords = description.split(/\s+/);
    for (const word of descWords) {
      if (elText.includes(word)) score += 0.2;
    }

    return Math.min(score, 1);
  }

  async _searchByOCR(description) {
    if (!this.currentState) return { found: false };

    const text = this.currentState.textContent || '';
    const descLower = description.toLowerCase();
    
    if (text.toLowerCase().includes(descLower)) {
      // Text exists on screen but no element matched
      return {
        found: true,
        method: 'ocr',
        matchedText: description,
        confidence: 0.5,
        note: 'Found via OCR, approximate position only'
      };
    }

    return { found: false };
  }

  _computeTransition(fromState, toState) {
    return {
      fromId: fromState.id,
      toId: toState.id,
      appChanged: fromState.app?.name !== toState.app?.name,
      elementDelta: toState.elements.length - fromState.elements.length,
      textChanged: fromState.textContent !== toState.textContent,
      duration: toState.timestamp - fromState.timestamp
    };
  }

  _updateStateGraph(state) {
    const stateKey = `${state.app?.name || 'unknown'}:${state.elements.length}`;
    
    if (!this.stateGraph.has(stateKey)) {
      this.stateGraph.set(stateKey, {
        visits: 0,
        transitions: new Map(),
        firstSeen: state.timestamp,
        metadata: { app: state.app?.name, elementCount: state.elements.length }
      });
    }

    const stateData = this.stateGraph.get(stateKey);
    stateData.visits++;
    stateData.lastSeen = state.timestamp;

    // Record transition
    if (this.currentState) {
      const prevKey = `${this.currentState.app?.name || 'unknown'}:${this.currentState.elements.length}`;
      if (prevKey !== stateKey) {
        const transCount = stateData.transitions.get(prevKey) || 0;
        stateData.transitions.set(prevKey, transCount + 1);
      }
    }
  }

  _checkRecordings(state) {
    for (const [name, recording] of this.workflowRecordings) {
      // Detect meaningful actions in state changes
      if (this.currentState && state.transition) {
        if (state.transition.appChanged) {
          recording.steps.push({
            action: 'app_switch',
            target: state.app?.name,
            timestamp: Date.now()
          });
        }
        if (state.transition.elementDelta !== 0) {
          recording.steps.push({
            action: 'state_change',
            delta: state.transition.elementDelta,
            timestamp: Date.now()
          });
        }
      }
    }
  }

  _generateStateId() {
    return `state_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async shutdown() {
    this.stopWatching();
    this.emit('shutdown');
  }
}

module.exports = { ScreenStateMachine };
