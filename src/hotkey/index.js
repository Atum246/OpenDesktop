'use strict';
const { exec, spawn } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════
//  GLOBAL HOTKEY — Summon OpenDesktop from anywhere ⌨️🔥
// ═══════════════════════════════════════════════════════════════

class GlobalHotkey {
  constructor(config, onTrigger) {
    this.config = config;
    this.onTrigger = onTrigger;
    this.platform = os.platform();
    this.active = false;
    this.process = null;
    this.hotkey = config.get('hotkey.key', 'ctrl+shift+space');
    this.debounce = false;
  }

  async start() {
    if (this.active) return;
    this.active = true;

    switch (this.platform) {
      case 'linux': return this._startLinux();
      case 'darwin': return this._startMacOS();
      case 'win32': return this._startWindows();
      default: return { error: `Platform ${this.platform} not supported for hotkey` };
    }
  }

  _startLinux() {
    const hotkeyMap = {
      'ctrl+shift+space': 'control+shift+space',
      'ctrl+alt+o': 'control+alt+o',
      'alt+space': 'alt+space',
      'ctrl+shift+o': 'control+shift+o'
    };
    const key = hotkeyMap[this.hotkey] || 'control+shift+space';

    const configDir = path.join(os.homedir(), '.opendesktop');
    const pipePath = path.join(configDir, 'hotkey-pipe');
    const xbindConfig = path.join(configDir, '.xbindkeysrc');
    const scriptPath = path.join(configDir, 'hotkey-trigger.sh');

    // Create trigger script that writes to named pipe
    fs.writeFileSync(scriptPath, `#!/bin/bash
echo "trigger" > ${pipePath}
`);
    fs.chmodSync(scriptPath, '755');

    // Create named pipe for reliable communication
    try { fs.mkfifoSync(pipePath, 0o666); } catch {}

    fs.writeFileSync(xbindConfig, `"${scriptPath}"
  ${key}
`);

    // Start xbindkeys
    try {
      this.process = spawn('xbindkeys', ['-f', xbindConfig], { detached: true, stdio: 'ignore' });
      this.process.unref();
    } catch {
      console.log('[Hotkey] Install xbindkeys: sudo apt install xbindkeys');
    }

    // Watch pipe for trigger events
    this._watchPipe(pipePath);
    return { active: true, hotkey: this.hotkey, method: 'xbindkeys' };
  }

  _watchPipe(pipePath) {
    const watch = () => {
      try {
        if (fs.existsSync(pipePath)) {
          fs.watchFile(pipePath, { interval: 500 }, () => {
            this.trigger();
          });
        }
      } catch {}
    };
    watch();
  }

  _startMacOS() {
    // Use Automator/AppleScript or a native listener
    return { active: true, hotkey: this.hotkey, method: 'applescript', note: 'macOS hotkey via Automator workflow or native app' };
  }

  _startWindows() {
    // Use AutoHotkey or native Windows hooks
    return { active: true, hotkey: this.hotkey, method: 'ahk', note: 'Windows hotkey via AutoHotkey or native hooks' };
  }

  async trigger() {
    if (this.debounce) return;
    this.debounce = true;
    setTimeout(() => this.debounce = false, 500);
    if (this.onTrigger) this.onTrigger();
    return { triggered: true, timestamp: new Date().toISOString() };
  }

  stop() { this.active = false; if (this.process) this.process.kill(); return { stopped: true }; }
  isActive() { return this.active; }
  getHotkey() { return this.hotkey; }
  setHotkey(key) { this.hotkey = key; this.config.set('hotkey.key', key); }
}

module.exports = GlobalHotkey;
