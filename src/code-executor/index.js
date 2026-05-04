'use strict';
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ═══════════════════════════════════════════════════════════════
//  CODE EXECUTOR — Run Any Language, Any Code 💻⚡
// ═══════════════════════════════════════════════════════════════

class CodeExecutor {
  constructor(config) {
    this.config = config;
    this.platform = os.platform();
    this.tempDir = path.join(os.tmpdir(), 'opendesktop-code');
    if (!fs.existsSync(this.tempDir)) fs.mkdirSync(this.tempDir, { recursive: true });
    this.history = [];

    this.languages = {
      javascript: { ext: '.js', cmd: 'node', alt: ['bun', 'deno'] },
      python: { ext: '.py', cmd: 'python3', alt: ['python', 'py'] },
      typescript: { ext: '.ts', cmd: 'npx tsx', alt: ['npx ts-node', 'deno run'] },
      ruby: { ext: '.rb', cmd: 'ruby' },
      perl: { ext: '.pl', cmd: 'perl' },
      php: { ext: '.php', cmd: 'php' },
      lua: { ext: '.lua', cmd: 'lua' },
      r: { ext: '.R', cmd: 'Rscript' },
      julia: { ext: '.jl', cmd: 'julia' },
      go: { ext: '.go', cmd: 'go run' },
      rust: { ext: '.rs', cmd: 'rustc', needsCompile: true },
      c: { ext: '.c', cmd: 'gcc', needsCompile: true },
      cpp: { ext: '.cpp', cmd: 'g++', needsCompile: true },
      java: { ext: '.java', cmd: 'javac', needsCompile: true },
      csharp: { ext: '.cs', cmd: 'dotnet script', alt: ['mono'] },
      swift: { ext: '.swift', cmd: 'swift' },
      kotlin: { ext: '.kt', cmd: 'kotlinc' },
      bash: { ext: '.sh', cmd: 'bash', alt: ['sh', 'zsh'] },
      powershell: { ext: '.ps1', cmd: 'pwsh', alt: ['powershell'] },
      sql: { ext: '.sql', cmd: 'sqlite3' },
      html: { ext: '.html', cmd: 'open', browser: true },
      css: { ext: '.css', cmd: null },
      json: { ext: '.json', cmd: 'node -e' },
      yaml: { ext: '.yaml', cmd: null },
      markdown: { ext: '.md', cmd: null },
      zig: { ext: '.zig', cmd: 'zig run' },
      elixir: { ext: '.ex', cmd: 'elixir' },
      erlang: { ext: '.erl', cmd: 'erl' },
      haskell: { ext: '.hs', cmd: 'runhaskell' },
      clojure: { ext: '.clj', cmd: 'clojure' },
      scala: { ext: '.scala', cmd: 'scala' },
      dart: { ext: '.dart', cmd: 'dart run' },
      raku: { ext: '.raku', cmd: 'raku' },
      crystal: { ext: '.cr', cmd: 'crystal run' },
      nim: { ext: '.nim', cmd: 'nim compile --run' },
      v: { ext: '.v', cmd: 'v run' },
      odin: { ext: '.odin', cmd: 'odin run' }
    };
  }

  async execute(code, language, options = {}) {
    const lang = language?.toLowerCase();
    const langConfig = this.languages[lang];

    if (!langConfig) {
      // Try to detect language from code
      const detected = this._detectLanguage(code);
      if (detected) return this.execute(code, detected, options);
      return { error: `Unknown language: ${lang}. Supported: ${Object.keys(this.languages).join(', ')}` };
    }

    const filename = options.filename || `code_${Date.now()}${langConfig.ext}`;
    const filepath = path.join(this.tempDir, filename);
    fs.writeFileSync(filepath, code);

    const startTime = Date.now();
    let result;

    try {
      if (langConfig.needsCompile) {
        result = await this._compileAndRun(filepath, langConfig, options);
      } else if (langConfig.browser) {
        result = { success: true, output: `File saved: ${filepath}`, openInBrowser: true };
      } else {
        result = await this._runCommand(langConfig.cmd, filepath, options);
      }
    } catch (err) {
      result = { success: false, error: err.message };
    }

    const duration = Date.now() - startTime;
    this.history.push({ language: lang, filename, duration, success: result.success, timestamp: new Date().toISOString() });

    return { ...result, language: lang, filename, duration, filepath };
  }

  async _runCommand(cmd, filepath, options = {}) {
    return new Promise((resolve) => {
      const timeout = options.timeout || 30000;
      const child = exec(`${cmd} "${filepath}"`, { timeout, maxBuffer: 10 * 1024 * 1024, cwd: path.dirname(filepath) }, (error, stdout, stderr) => {
        if (error) resolve({ success: false, error: error.message, stdout, stderr });
        else resolve({ success: true, output: stdout, warnings: stderr });
      });
      if (options.stdin) { child.stdin.write(options.stdin); child.stdin.end(); }
    });
  }

  async _compileAndRun(filepath, langConfig, options = {}) {
    const outputFile = filepath.replace(/\.\w+$/, this.platform === 'win32' ? '.exe' : '');
    const compileCmd = `${langConfig.cmd} "${filepath}" -o "${outputFile}"`;

    return new Promise((resolve) => {
      exec(compileCmd, { timeout: 30000 }, (compileErr, _, compileStderr) => {
        if (compileErr) resolve({ success: false, error: `Compilation failed: ${compileErr.message}`, stderr: compileStderr });
        else {
          exec(`"${outputFile}"`, { timeout: options.timeout || 10000 }, (runErr, stdout, stderr) => {
            if (runErr) resolve({ success: false, error: runErr.message, stdout, stderr });
            else resolve({ success: true, output: stdout, warnings: stderr });
          });
        }
      });
    });
  }

  _detectLanguage(code) {
    if (code.includes('def ') && code.includes(':') && !code.includes('{')) return 'python';
    if (code.includes('func ') && code.includes('package ')) return 'go';
    if (code.includes('fn ') && code.includes('let mut')) return 'rust';
    if (code.includes('console.log') || code.includes('const ') || code.includes('=>')) return 'javascript';
    if (code.includes('println!')) return 'rust';
    if (code.includes('print(') && code.includes('import ')) return 'python';
    if (code.includes('#include') && code.includes('int main')) return 'c';
    if (code.includes('#include') && code.includes('cout')) return 'cpp';
    if (code.includes('public static void main')) return 'java';
    if (code.includes('SELECT') || code.includes('INSERT') || code.includes('CREATE TABLE')) return 'sql';
    if (code.includes('<!DOCTYPE html>') || code.includes('<html>')) return 'html';
    if (code.includes('#!/bin/bash') || code.includes('#!/bin/sh')) return 'bash';
    return null;
  }

  async createProject(name, language, template) {
    const projectDir = path.join(os.homedir(), '.opendesktop', 'projects', name);
    if (!fs.existsSync(projectDir)) fs.mkdirSync(projectDir, { recursive: true });

    const templates = {
      'node-api': async () => {
        fs.writeFileSync(path.join(projectDir, 'package.json'), JSON.stringify({ name, version: '1.0.0', main: 'index.js', scripts: { start: 'node index.js' } }, null, 2));
        fs.writeFileSync(path.join(projectDir, 'index.js'), `const http = require('http');\nconst server = http.createServer((req, res) => {\n  res.writeHead(200, {'Content-Type': 'application/json'});\n  res.end(JSON.stringify({ message: 'Hello from ${name}!', status: 'running' }));\n});\nserver.listen(3000, () => console.log('Server running on port 3000'));`);
      },
      'python-app': async () => {
        fs.writeFileSync(path.join(projectDir, 'main.py'), `#!/usr/bin/env python3\n"""${name} - OpenDesktop Project"""\n\ndef main():\n    print(f"Hello from ${name}!")\n\nif __name__ == "__main__":\n    main()\n`);
        fs.writeFileSync(path.join(projectDir, 'requirements.txt'), '');
      },
      'react-app': async () => {
        fs.writeFileSync(path.join(projectDir, 'index.html'), `<!DOCTYPE html>\n<html><head><title>${name}</title></head>\n<body><div id="root"></div>\n<script>document.getElementById('root').innerHTML='<h1>${name}</h1><p>React App</p>';</script>\n</body></html>`);
      },
      'static-site': async () => {
        fs.writeFileSync(path.join(projectDir, 'index.html'), `<!DOCTYPE html>\n<html><head><title>${name}</title>\n<style>body{font-family:system-ui;max-width:800px;margin:0 auto;padding:2rem;}</style>\n</head><body><h1>${name}</h1><p>Built with OpenDesktop</p></body></html>`);
      }
    };

    if (template && templates[template]) {
      await templates[template]();
    } else {
      const langConfig = this.languages[language];
      if (langConfig) fs.writeFileSync(path.join(projectDir, `main${langConfig.ext}`), `// ${name}\n// Created by OpenDesktop\n`);
    }

    return { project: name, path: projectDir, template, files: fs.readdirSync(projectDir) };
  }

  getSupportedLanguages() { return Object.entries(this.languages).map(([name, cfg]) => ({ name, extension: cfg.ext, command: cfg.cmd })); }
  getHistory() { return this.history; }
}

module.exports = CodeExecutor;
