'use strict';

const { exec, execSync } = require('child_process');
const os = require('os');
const fs = require('fs');

// ═══════════════════════════════════════════════════════════════
//  SMART PROGRAM INSTALLER — Install Anything on Any Platform 📦
// ═══════════════════════════════════════════════════════════════

class ProgramInstaller {
  constructor(config) {
    this.config = config;
    this.platform = os.platform();
    this.packageManager = this._detectPackageManager();
    this.history = [];
  }

  // ─── DETECT PACKAGE MANAGER ───
  _detectPackageManager() {
    const managers = {
      apt: { cmd: 'apt', search: 'apt search', install: 'apt install -y', uninstall: 'apt remove -y', update: 'apt update && apt upgrade -y', list: 'apt list --installed', platforms: ['linux'] },
      dnf: { cmd: 'dnf', search: 'dnf search', install: 'dnf install -y', uninstall: 'dnf remove -y', update: 'dnf upgrade -y', list: 'dnf list installed', platforms: ['linux'] },
      pacman: { cmd: 'pacman', search: 'pacman -Ss', install: 'pacman -S --noconfirm', uninstall: 'pacman -R --noconfirm', update: 'pacman -Syu --noconfirm', list: 'pacman -Q', platforms: ['linux'] },
      brew: { cmd: 'brew', search: 'brew search', install: 'brew install', uninstall: 'brew uninstall', update: 'brew update && brew upgrade', list: 'brew list', platforms: ['darwin'] },
      winget: { cmd: 'winget', search: 'winget search', install: 'winget install', uninstall: 'winget uninstall', update: 'winget upgrade --all', list: 'winget list', platforms: ['win32'] },
      snap: { cmd: 'snap', search: 'snap find', install: 'snap install', uninstall: 'snap remove', update: 'snap refresh', list: 'snap list', platforms: ['linux'] },
      flatpak: { cmd: 'flatpak', search: 'flatpak search', install: 'flatpak install -y', uninstall: 'flatpak uninstall -y', update: 'flatpak update -y', list: 'flatpak list', platforms: ['linux'] },
      npm: { cmd: 'npm', search: 'npm search', install: 'npm install -g', uninstall: 'npm uninstall -g', update: 'npm update -g', list: 'npm list -g --depth=0', platforms: ['darwin', 'linux', 'win32'] },
      pip: { cmd: 'pip3', search: 'pip3 search', install: 'pip3 install', uninstall: 'pip3 uninstall -y', update: 'pip3 install --upgrade', list: 'pip3 list', platforms: ['darwin', 'linux', 'win32'] },
      cargo: { cmd: 'cargo', search: 'cargo search', install: 'cargo install', uninstall: 'cargo uninstall', update: 'cargo install-update -a', list: 'cargo install --list', platforms: ['darwin', 'linux', 'win32'] }
    };

    const detected = [];
    for (const [name, mgr] of Object.entries(managers)) {
      if (mgr.platforms.includes(this.platform)) {
        try {
          execSync(`${mgr.cmd} --version`, { stdio: 'ignore', timeout: 5000 });
          detected.push(name);
        } catch {}
      }
    }

    return detected;
  }

  // ─── SEARCH FOR PROGRAMS ───
  async search(query, options = {}) {
    const results = [];
    const managers = options.managers || this.packageManager;

    for (const mgrName of managers) {
      const mgr = this._getManager(mgrName);
      if (!mgr) continue;

      try {
        const output = await this._exec(`${mgr.search} ${query}`, { timeout: 30000 });
        const parsed = this._parseSearchResults(output, mgrName);
        results.push(...parsed);
      } catch (err) {
        // Some managers fail on search, that's ok
      }
    }

    // Also search web for install instructions if no results
    if (!results.length) {
      results.push({
        name: query,
        source: 'web',
        suggestion: `Search the web for "${query} install ${this.platform}"`,
        installCommand: this._suggestInstallCommand(query)
      });
    }

    return results;
  }

  // ─── INSTALL PROGRAM ───
  async install(program, options = {}) {
    const manager = options.manager || this._findBestManager(program);
    const mgr = this._getManager(manager);

    if (!mgr) return { error: `Package manager '${manager}' not available` };

    // Security check
    const dangerous = ['rm', 'mkfs', 'dd', 'shutdown', 'reboot'];
    if (dangerous.some(d => program.includes(d))) {
      return { error: 'Potentially dangerous program blocked' };
    }

    const startTime = Date.now();
    try {
      const output = await this._exec(`${mgr.install} ${program}`, { timeout: options.timeout || 300000 });
      const duration = Date.now() - startTime;

      this.history.push({ action: 'install', program, manager, success: true, duration, timestamp: new Date().toISOString() });
      return { success: true, program, manager, output, duration };
    } catch (err) {
      this.history.push({ action: 'install', program, manager, success: false, error: err.message, timestamp: new Date().toISOString() });
      return { success: false, error: err.message, suggestion: this._suggestInstallCommand(program) };
    }
  }

  // ─── UNINSTALL PROGRAM ───
  async uninstall(program, options = {}) {
    const manager = options.manager || this._findInstalledManager(program);
    const mgr = this._getManager(manager);

    if (!mgr) return { error: `Package manager '${manager}' not available` };

    try {
      const output = await this._exec(`${mgr.uninstall} ${program}`, { timeout: 120000 });
      this.history.push({ action: 'uninstall', program, manager, success: true, timestamp: new Date().toISOString() });
      return { success: true, program, manager, output };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ─── UPDATE PROGRAMS ───
  async update(program, options = {}) {
    const manager = options.manager || this.packageManager[0];
    const mgr = this._getManager(manager);

    if (!mgr) return { error: `Package manager '${manager}' not available` };

    try {
      const cmd = program ? `${mgr.install} --upgrade ${program}` : mgr.update;
      const output = await this._exec(cmd, { timeout: 600000 });
      return { success: true, program: program || 'all', manager, output };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ─── LIST INSTALLED ───
  async listInstalled(manager) {
    const mgrName = manager || this.packageManager[0];
    const mgr = this._getManager(mgrName);
    if (!mgr) return [];

    try {
      const output = await this._exec(mgr.list, { timeout: 30000 });
      return this._parseInstalledList(output, mgrName);
    } catch {
      return [];
    }
  }

  // ─── SUGGEST ALTERNATIVES ───
  async getAlternatives(program) {
    const alternatives = {
      'photoshop': ['gimp', 'krita', 'inkscape'],
      'visual studio': ['vscode', 'codium', 'sublime-text'],
      'microsoft office': ['libreoffice', 'onlyoffice', 'google-docs'],
      'notepad++': ['sublime-text', 'atom', 'vscode'],
      'putty': ['openssh-client', 'mosh', 'kitty'],
      'git': ['git', 'tig', 'lazygit'],
      'docker': ['docker.io', 'podman', 'containerd'],
      'chrome': ['chromium', 'firefox', 'brave'],
      'slack': ['discord', 'mattermost', 'rocket-chat'],
      'zoom': ['jitsi-meet', 'teams', 'google-meet']
    };

    const lower = program.toLowerCase();
    for (const [key, alts] of Object.entries(alternatives)) {
      if (lower.includes(key) || key.includes(lower)) {
        return { program, alternatives: alts, suggestion: `Try: ${alts.join(', ')}` };
      }
    }

    // Search npm for alternatives
    try {
      const npmResults = await this._exec(`npm search ${program} --json`, { timeout: 15000 });
      const packages = JSON.parse(npmResults);
      return { program, alternatives: packages.slice(0, 5).map(p => p.name) };
    } catch {
      return { program, alternatives: [], suggestion: 'No known alternatives found. Try searching the web.' };
    }
  }

  // ─── GET PACKAGE MANAGER INFO ───
  getPackageManager() {
    return {
      detected: this.packageManager,
      platform: this.platform,
      primary: this.packageManager[0] || 'none',
      available: this.packageManager.map(m => ({
        name: m,
        ...this._getManager(m)
      }))
    };
  }

  // ─── HELPERS ───
  _getManager(name) {
    const managers = {
      apt: { search: 'apt search', install: 'sudo apt install -y', uninstall: 'sudo apt remove -y', update: 'sudo apt update && sudo apt upgrade -y', list: 'apt list --installed 2>/dev/null' },
      dnf: { search: 'dnf search', install: 'sudo dnf install -y', uninstall: 'sudo dnf remove -y', update: 'sudo dnf upgrade -y', list: 'dnf list installed' },
      pacman: { search: 'pacman -Ss', install: 'sudo pacman -S --noconfirm', uninstall: 'sudo pacman -R --noconfirm', update: 'sudo pacman -Syu --noconfirm', list: 'pacman -Q' },
      brew: { search: 'brew search', install: 'brew install', uninstall: 'brew uninstall', update: 'brew update && brew upgrade', list: 'brew list' },
      winget: { search: 'winget search', install: 'winget install --accept-package-agreements', uninstall: 'winget uninstall', update: 'winget upgrade --all', list: 'winget list' },
      snap: { search: 'snap find', install: 'sudo snap install', uninstall: 'sudo snap remove', update: 'sudo snap refresh', list: 'snap list' },
      flatpak: { search: 'flatpak search', install: 'flatpak install -y flathub', uninstall: 'flatpak uninstall -y', update: 'flatpak update -y', list: 'flatpak list' },
      npm: { search: 'npm search', install: 'npm install -g', uninstall: 'npm uninstall -g', update: 'npm update -g', list: 'npm list -g --depth=0' },
      pip: { search: 'pip3 search', install: 'pip3 install', uninstall: 'pip3 uninstall -y', update: 'pip3 install --upgrade', list: 'pip3 list' },
      cargo: { search: 'cargo search', install: 'cargo install', uninstall: 'cargo uninstall', update: 'cargo install-update -a', list: 'cargo install --list 2>/dev/null' }
    };
    return managers[name] || null;
  }

  _findBestManager(program) {
    // Check if it's a known npm package
    if (program.startsWith('@') || program.includes('/') || ['typescript', 'webpack', 'eslint', 'prettier', 'nodemon'].some(n => program.includes(n))) {
      return 'npm';
    }
    // Check if it's a Python package
    if (program.includes('python') || ['django', 'flask', 'pandas', 'numpy', 'requests'].some(n => program.includes(n))) {
      return 'pip';
    }
    // Default to system package manager
    return this.packageManager[0] || 'npm';
  }

  _findInstalledManager(program) {
    for (const mgr of this.packageManager) {
      try {
        const list = execSync(this._getManager(mgr)?.list || '', { encoding: 'utf8', timeout: 10000 });
        if (list.toLowerCase().includes(program.toLowerCase())) return mgr;
      } catch {}
    }
    return this.packageManager[0];
  }

  _parseSearchResults(output, manager) {
    const results = [];
    const lines = output.split('\n').filter(l => l.trim());

    for (const line of lines.slice(0, 20)) {
      const parts = line.split(/\s{2,}|\t/);
      if (parts.length >= 2) {
        results.push({
          name: parts[0].trim(),
          description: parts.slice(1).join(' ').trim().slice(0, 200),
          source: manager
        });
      }
    }
    return results;
  }

  _parseInstalledList(output, manager) {
    const results = [];
    const lines = output.split('\n').filter(l => l.trim());

    for (const line of lines) {
      const parts = line.split(/\s{2,}|\t/);
      if (parts.length >= 1 && parts[0].trim()) {
        results.push({
          name: parts[0].trim(),
          version: parts[1]?.trim() || '',
          source: manager
        });
      }
    }
    return results;
  }

  _suggestInstallCommand(program) {
    const pm = this.packageManager[0];
    const cmds = {
      apt: `sudo apt install ${program}`,
      dnf: `sudo dnf install ${program}`,
      pacman: `sudo pacman -S ${program}`,
      brew: `brew install ${program}`,
      winget: `winget install ${program}`,
      snap: `sudo snap install ${program}`,
      npm: `npm install -g ${program}`,
      pip: `pip3 install ${program}`
    };
    return cmds[pm] || `Install ${program} using your package manager`;
  }

  _exec(cmd, options = {}) {
    return new Promise((resolve, reject) => {
      exec(cmd, { timeout: options.timeout || 60000, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
        if (err) reject(err);
        else resolve(stdout);
      });
    });
  }

  getHistory() { return this.history; }
}

module.exports = ProgramInstaller;
