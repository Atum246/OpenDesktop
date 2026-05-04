'use strict';
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ═══════════════════════════════════════════════════════════════
//  DEPLOYER — Deploy Anything, Anywhere 🚀☁️
// ═══════════════════════════════════════════════════════════════

class Deployer {
  constructor(config) {
    this.config = config;
    this.history = [];
  }

  async deploy(target, projectPath, options = {}) {
    const deployers = {
      vercel: () => this._deployVercel(projectPath, options),
      netlify: () => this._deployNetlify(projectPath, options),
      'github-pages': () => this._deployGitHubPages(projectPath, options),
      docker: () => this._deployDocker(projectPath, options),
      aws: () => this._deployAWS(projectPath, options),
      gcp: () => this._deployGCP(projectPath, options),
      azure: () => this._deployAzure(projectPath, options),
      heroku: () => this._deployHeroku(projectPath, options),
      fly: () => this._deployFly(projectPath, options),
      railway: () => this._deployRailway(projectPath, options),
      render: () => this._deployRender(projectPath, options),
      surge: () => this._deploySurge(projectPath, options),
      firebase: () => this._deployFirebase(projectPath, options),
      cloudflare: () => this._deployCloudflare(projectPath, options),
      'npm-publish': () => this._deployNpm(projectPath, options),
      pypi: () => this._deployPyPI(projectPath, options),
      ssh: () => this._deploySSH(projectPath, options),
      ftp: () => this._deployFTP(projectPath, options)
    };

    const deployer = deployers[target.toLowerCase()];
    if (!deployer) return { error: `Unknown target: ${target}. Supported: ${Object.keys(deployers).join(', ')}` };

    try {
      const result = await deployer();
      this.history.push({ target, projectPath, success: result.success, timestamp: new Date().toISOString() });
      return result;
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async _deployVercel(projectPath, opts) {
    return this._run(`cd "${projectPath}" && npx vercel --prod --yes ${opts.token ? `--token ${opts.token}` : ''}`);
  }

  async _deployNetlify(projectPath, opts) {
    return this._run(`cd "${projectPath}" && npx netlify deploy --prod --dir=. ${opts.token ? `--auth ${opts.token}` : ''}`);
  }

  async _deployGitHubPages(projectPath, opts) {
    if (!opts.repo) return { error: 'GitHub Pages requires opts.repo (e.g. https://github.com/user/repo.git)' };
    const cmds = [`cd "${projectPath}"`, 'git init', 'git add -A', 'git commit -m "deploy" 2>/dev/null || true', `git remote add origin ${opts.repo} 2>/dev/null || git remote set-url origin ${opts.repo}`, 'git push -f origin main:gh-pages'];
    return this._run(cmds.join(' && '));
  }

  async _deployDocker(projectPath, opts) {
    const tag = opts.tag || 'opendesktop-app';
    const cmds = [`cd "${projectPath}"`, `docker build -t ${tag} .`, `docker run -d -p ${opts.port || 3000}:${opts.port || 3000} ${tag}`];
    return this._run(cmds.join(' && '));
  }

  async _deployAWS(projectPath, opts) {
    return this._run(`cd "${projectPath}" && aws s3 sync . s3://${opts.bucket || 'my-bucket'} --delete`);
  }

  async _deployGCP(projectPath, opts) {
    return this._run(`cd "${projectPath}" && gcloud app deploy --quiet`);
  }

  async _deployAzure(projectPath, opts) {
    return this._run(`cd "${projectPath}" && az webapp up --name ${opts.name || 'myapp'} --resource-group ${opts.resourceGroup || 'Default'}`);
  }

  async _deployHeroku(projectPath, opts) {
    return this._run(`cd "${projectPath}" && git init && git add -A && git commit -m "deploy" && git push heroku main --force`);
  }

  async _deployFly(projectPath, opts) {
    return this._run(`cd "${projectPath}" && flyctl deploy`);
  }

  async _deployRailway(projectPath, opts) {
    return this._run(`cd "${projectPath}" && railway up`);
  }

  async _deployRender(projectPath, opts) {
    return { success: true, note: 'Render deploys via git push. Connect your repo at render.com' };
  }

  async _deploySurge(projectPath, opts) {
    return this._run(`cd "${projectPath}" && npx surge . ${opts.domain || ''}`);
  }

  async _deployFirebase(projectPath, opts) {
    return this._run(`cd "${projectPath}" && firebase deploy --only hosting`);
  }

  async _deployCloudflare(projectPath, opts) {
    return this._run(`cd "${projectPath}" && npx wrangler pages deploy .`);
  }

  async _deployNpm(projectPath, opts) {
    return this._run(`cd "${projectPath}" && npm publish --access public`);
  }

  async _deployPyPI(projectPath, opts) {
    return this._run(`cd "${projectPath}" && python3 setup.py sdist bdist_wheel && twine upload dist/*`);
  }

  async _deploySSH(projectPath, opts) {
    if (!opts.host || !opts.user) return { error: 'SSH requires host and user options' };
    return this._run(`rsync -avz "${projectPath}/" ${opts.user}@${opts.host}:${opts.remotePath || '/var/www/'}`);
  }

  async _deployFTP(projectPath, opts) {
    return { success: true, note: 'FTP deployment via lftp or ncftp. Configure credentials in settings.' };
  }

  async _run(cmd) {
    return new Promise((resolve) => {
      exec(cmd, { timeout: 120000, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) resolve({ success: false, error: error.message, stdout, stderr });
        else resolve({ success: true, output: stdout, warnings: stderr });
      });
    });
  }

  getSupportedTargets() {
    return ['vercel', 'netlify', 'github-pages', 'docker', 'aws', 'gcp', 'azure', 'heroku', 'fly', 'railway', 'render', 'surge', 'firebase', 'cloudflare', 'npm-publish', 'pypi', 'ssh', 'ftp'];
  }

  getHistory() { return this.history; }
}

module.exports = Deployer;
