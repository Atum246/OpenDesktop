'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec, execSync, spawn } = require('child_process');
const http = require('http');
const https = require('https');
const { URL } = require('url');
const { EventEmitter } = require('events');

// ═══════════════════════════════════════════════════════════════
//  BROWSER & DOWNLOAD ENGINE — Go Online, Get Anything 🌐📥
//  Browser automation, downloads, scraping, file fetching
// ═══════════════════════════════════════════════════════════════

class BrowserEngine extends EventEmitter {
  constructor(config, provider) {
    super();
    this.config = config;
    this.provider = provider;
    this.downloadDir = path.join(os.homedir(), '.opendesktop', 'downloads');
    if (!fs.existsSync(this.downloadDir)) fs.mkdirSync(this.downloadDir, { recursive: true });
    this.downloads = [];
    this.browserProcess = null;
    this.cookies = new Map();
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];
  }

  // ═══ OPEN BROWSER ═══

  async openBrowser(url, options = {}) {
    const platform = os.platform();
    const browser = options.browser || 'default';

    const browsers = {
      chrome: { darwin: 'google-chrome', linux: 'google-chrome', win32: 'chrome' },
      firefox: { darwin: 'firefox', linux: 'firefox', win32: 'firefox' },
      edge: { darwin: 'microsoft-edge', linux: 'microsoft-edge', win32: 'msedge' },
      brave: { darwin: 'brave-browser', linux: 'brave-browser', win32: 'brave' },
      default: null
    };

    let cmd;
    if (browser === 'default') {
      if (platform === 'darwin') cmd = `open "${url}"`;
      else if (platform === 'win32') cmd = `start "" "${url}"`;
      else cmd = `xdg-open "${url}" 2>/dev/null || sensible-browser "${url}"`;
    } else {
      const browserCmd = browsers[browser]?.[platform];
      if (browserCmd) cmd = `${browserCmd} "${url}"`;
      else return { error: `Browser ${browser} not found on ${platform}` };
    }

    try {
      exec(cmd, { timeout: 10000 });
      return { opened: true, url, browser };
    } catch (err) {
      return { error: err.message };
    }
  }

  // ═══ DOWNLOAD FILES ═══

  async download(url, options = {}) {
    const filename = options.filename || this._guessFilename(url);
    const outputPath = path.join(options.outputDir || this.downloadDir, filename);

    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const lib = parsedUrl.protocol === 'https:' ? https : http;

      const reqOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
          'User-Agent': this.userAgents[0],
          ...options.headers
        },
        timeout: options.timeout || 120000
      };

      const req = lib.request(reqOptions, (res) => {
        // Follow redirects
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          const redirectUrl = res.headers.location.startsWith('http') ? res.headers.location : new URL(res.headers.location, url).href;
          return this.download(redirectUrl, { ...options, filename }).then(resolve).catch(reject);
        }

        if (res.statusCode !== 200) {
          return resolve({ success: false, error: `HTTP ${res.statusCode}`, status: res.statusCode });
        }

        const totalSize = parseInt(res.headers['content-length']) || 0;
        let downloaded = 0;
        const startTime = Date.now();

        const fileStream = fs.createWriteStream(outputPath);

        res.on('data', (chunk) => {
          downloaded += chunk.length;
          fileStream.write(chunk);

          // Emit progress
          if (totalSize > 0) {
            const progress = Math.round((downloaded / totalSize) * 100);
            this.emit('download-progress', { url, filename, progress, downloaded, totalSize });
          }
        });

        res.on('end', () => {
          fileStream.end(() => {
            const duration = Date.now() - startTime;

            const result = {
              success: true,
              url,
              path: outputPath,
              filename,
              size: downloaded,
              duration,
              speed: Math.round(downloaded / (duration / 1000))
            };

            this.downloads.push({ ...result, timestamp: Date.now() });
            this.emit('download-complete', result);
            resolve(result);
          });
        });

        res.on('error', (err) => {
          fileStream.destroy();
          try { fs.unlinkSync(outputPath); } catch {}
          reject(err);
        });
      });

      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Download timed out')); });
      req.end();
    });
  }

  // ═══ DOWNLOAD WITH PROGRESS ═══

  async downloadWithProgress(url, options = {}) {
    const ora = require('ora');
    const filename = options.filename || this._guessFilename(url);
    const spinner = ora({ text: `📥 Downloading ${filename}...`, spinner: 'dots2', color: 'cyan' }).start();

    this.on('download-progress', (p) => {
      if (p.progress) {
        const bar = '█'.repeat(Math.floor(p.progress / 5)) + '░'.repeat(20 - Math.floor(p.progress / 5));
        spinner.text = `📥 ${filename} [${bar}] ${p.progress}% (${this._formatBytes(p.downloaded)}/${this._formatBytes(p.totalSize)})`;
      }
    });

    try {
      const result = await this.download(url, options);
      spinner.stop();
      return result;
    } catch (err) {
      spinner.stop();
      return { success: false, error: err.message };
    }
  }

  // ═══ BULK DOWNLOAD ═══

  async downloadAll(urls, options = {}) {
    const results = [];
    const concurrency = options.concurrency || 3;

    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(url => this.download(typeof url === 'string' ? url : url.url, typeof url === 'string' ? options : { ...options, ...url }))
      );
      results.push(...batchResults);
    }

    return {
      total: urls.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  // ═══ FIND DOWNLOAD LINKS ═══

  async findDownloadLinks(url, options = {}) {
    try {
      const axios = require('axios');
      const resp = await axios.get(url, {
        headers: { 'User-Agent': this.userAgents[0] },
        timeout: 15000
      });

      const html = resp.data;
      const links = [];

      // Find direct download links
      const patterns = [
        /href=["']([^"']*\.zip[^"']*)/gi,
        /href=["']([^"']*\.tar\.gz[^"']*)/gi,
        /href=["']([^"']*\.exe[^"']*)/gi,
        /href=["']([^"']*\.msi[^"']*)/gi,
        /href=["']([^"']*\.dmg[^"']*)/gi,
        /href=["']([^"']*\.pkg[^"']*)/gi,
        /href=["']([^"']*\.deb[^"']*)/gi,
        /href=["']([^"']*\.rpm[^"']*)/gi,
        /href=["']([^"']*\.AppImage[^"']*)/gi,
        /href=["']([^"']*\.iso[^"']*)/gi,
        /href=["']([^"']*\.apk[^"']*)/gi,
        /href=["']([^"']*\.pdf[^"']*)/gi,
        /href=["']([^"']*\.mp[34][^"']*)/gi,
        /href=["']([^"']*\.wav[^"']*)/gi,
        /href=["']([^"']*\.avi[^"']*)/gi,
        /href=["']([^"']*\.mkv[^"']*)/gi,
        /href=["']([^"']*\.mov[^"']*)/gi,
        /href=["']([^"']*\.torrent[^"']*)/gi,
        /href=["']([^"']*\.svg[^"']*)/gi,
        /href=["']([^"']*\.png[^"']*)/gi,
        /href=["']([^"']*\.jpg[^"']*)/gi,
        /href=["']([^"']*\.gif[^"']*)/gi,
        /href=["']([^"']*\.webp[^"']*)/gi,
        /href=["']([^"']*\.css[^"']*)/gi,
        /href=["']([^"']*\.js[^"']*)/gi,
        /href=["']([^"']*\.woff2?[^"']*)/gi,
        /href=["']([^"']*\.ttf[^"']*)/gi,
        /href=["']([^"']*\.json[^"']*)/gi,
        /href=["']([^"']*\.xml[^"']*)/gi,
        /href=["']([^"']*\.csv[^"']*)/gi
      ];

      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(html)) !== null) {
          let link = match[1];
          try {
            link = new URL(link, url).href;
          } catch {}
          if (!links.includes(link)) links.push(link);
        }
      }

      // Also find GitHub release assets
      const githubPattern = /https:\/\/github\.com\/[^"']+\/releases\/download\/[^"']+/gi;
      let ghMatch;
      while ((ghMatch = githubPattern.exec(html)) !== null) {
        if (!links.includes(ghMatch[0])) links.push(ghMatch[0]);
      }

      // Filter by extension if requested
      let filtered = links;
      if (options.extensions) {
        filtered = links.filter(l => options.extensions.some(ext => l.toLowerCase().endsWith(ext)));
      }

      return { url, links: filtered, total: filtered.length };
    } catch (err) {
      return { error: err.message };
    }
  }

  // ═══ SCRAPE WITH DEPTH ═══

  async scrapeDeep(url, options = {}) {
    const maxDepth = options.depth || 2;
    const maxPages = options.maxPages || 20;
    const visited = new Set();
    const results = [];

    const scrape = async (currentUrl, depth) => {
      if (depth > maxDepth || visited.size >= maxPages || visited.has(currentUrl)) return;
      visited.add(currentUrl);

      try {
        const axios = require('axios');
        const resp = await axios.get(currentUrl, {
          headers: { 'User-Agent': this.userAgents[0] },
          timeout: 10000,
          maxRedirects: 5
        });

        const html = resp.data;
        const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || '';
        const text = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2000);

        results.push({ url: currentUrl, title, text, depth, status: resp.status });

        // Find links for next depth
        if (depth < maxDepth) {
          const linkPattern = /href=["'](https?:\/\/[^"']+)/gi;
          let match;
          const links = [];
          while ((match = linkPattern.exec(html)) !== null) {
            try {
              const linkUrl = new URL(match[1], currentUrl).href;
              if (linkUrl.startsWith('http') && !visited.has(linkUrl)) links.push(linkUrl);
            } catch {}
          }

          // Follow top links
          for (const link of links.slice(0, options.maxLinksPerLevel || 5)) {
            await scrape(link, depth + 1);
          }
        }
      } catch {}
    };

    await scrape(url, 0);
    return { startUrl: url, pagesScraped: results.length, results };
  }

  // ═══ SCREENSHOT PAGE ═══

  async screenshotPage(url, options = {}) {
    const outputFile = options.output || path.join(this.downloadDir, `screenshot_${Date.now()}.png`);

    try {
      // Try puppeteer
      const puppeteer = require('puppeteer');
      const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
      const page = await browser.newPage();
      await page.setViewport({ width: options.width || 1920, height: options.height || 1080 });
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      if (options.fullPage) {
        await page.screenshot({ path: outputFile, fullPage: true });
      } else {
        await page.screenshot({ path: outputFile });
      }

      await browser.close();
      return { success: true, path: outputFile, url };
    } catch {
      // Fallback to wkhtmltoimage
      try {
        execSync(`wkhtmltoimage "${url}" "${outputFile}"`, { timeout: 30000 });
        return { success: true, path: outputFile, url, method: 'wkhtmltoimage' };
      } catch {
        return { error: 'Install puppeteer (npm install puppeteer) or wkhtmltoimage for screenshots' };
      }
    }
  }

  // ═══ SEARCH & FIND ═══

  async searchAndFind(query, options = {}) {
    // Multi-source search to find anything
    const results = { web: [], github: [], npm: [], downloads: [], wikipedia: [] };

    try {
      const axios = require('axios');

      // DuckDuckGo
      try {
        const ddg = await axios.get(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
          headers: { 'User-Agent': this.userAgents[0] }, timeout: 10000
        });
        const linkPattern = /class="result__a"[^>]*href="([^"]+)"/gi;
        let match;
        while ((match = linkPattern.exec(ddg.data)) !== null && results.web.length < 10) {
          let url = match[1];
          const uddg = url.match(/uddg=([^&]+)/);
          if (uddg) url = decodeURIComponent(uddg[1]);
          results.web.push(url);
        }
      } catch {}

      // GitHub
      try {
        const gh = await axios.get(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=5`, {
          headers: { 'User-Agent': 'OpenDesktop' }, timeout: 10000
        });
        results.github = (gh.data.items || []).map(r => ({
          name: r.full_name,
          url: r.html_url,
          description: r.description,
          stars: r.stargazers_count,
          language: r.language
        }));
      } catch {}

      // npm
      try {
        const npmResp = await axios.get(`https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=5`, { timeout: 10000 });
        results.npm = (npmResp.data.objects || []).map(o => ({
          name: o.package.name,
          version: o.package.version,
          description: o.package.description,
          url: `https://www.npmjs.com/package/${o.package.name}`
        }));
      } catch {}

      // Find download links from top web results
      for (const url of results.web.slice(0, 3)) {
        try {
          const dlLinks = await this.findDownloadLinks(url);
          if (dlLinks.links?.length) results.downloads.push(...dlLinks.links);
        } catch {}
      }

      // Wikipedia
      try {
        const wiki = await axios.get(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=3&format=json`, { timeout: 10000 });
        results.wikipedia = (wiki.data.query?.search || []).map(w => ({
          title: w.title,
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(w.title.replace(/ /g, '_'))}`
        }));
      } catch {}

    } catch {}

    return { query, results, totalResults: Object.values(results).reduce((s, r) => s + r.length, 0) };
  }

  // ═══ BROWSER AUTOMATION (via Puppeteer if available) ═══

  async automate(url, actions) {
    try {
      const puppeteer = require('puppeteer');
      const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      const results = [];

      for (const action of actions) {
        try {
          switch (action.type) {
            case 'click':
              await page.click(action.selector);
              results.push({ action: 'click', selector: action.selector, success: true });
              break;
            case 'type':
              await page.type(action.selector, action.text);
              results.push({ action: 'type', selector: action.selector, success: true });
              break;
            case 'wait':
              await page.waitForSelector(action.selector, { timeout: action.timeout || 10000 });
              results.push({ action: 'wait', selector: action.selector, success: true });
              break;
            case 'screenshot':
              const imgPath = path.join(this.downloadDir, `auto_${Date.now()}.png`);
              await page.screenshot({ path: imgPath, fullPage: action.fullPage });
              results.push({ action: 'screenshot', path: imgPath, success: true });
              break;
            case 'extract':
              const extracted = await page.evaluate((sel) => {
                const els = document.querySelectorAll(sel);
                return Array.from(els).map(el => el.textContent?.trim());
              }, action.selector);
              results.push({ action: 'extract', selector: action.selector, data: extracted, success: true });
              break;
            case 'eval':
              const evalResult = await page.evaluate(action.code);
              results.push({ action: 'eval', result: evalResult, success: true });
              break;
            case 'scroll':
              await page.evaluate((y) => window.scrollBy(0, y), action.amount || 500);
              results.push({ action: 'scroll', success: true });
              break;
            case 'navigate':
              await page.goto(action.url, { waitUntil: 'networkidle2', timeout: 30000 });
              results.push({ action: 'navigate', url: action.url, success: true });
              break;
            case 'download':
              const client = await page.target().createCDPSession();
              await client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: this.downloadDir });
              await page.click(action.selector);
              results.push({ action: 'download', selector: action.selector, success: true, dir: this.downloadDir });
              break;
          }
        } catch (err) {
          results.push({ action: action.type, error: err.message, success: false });
        }
      }

      await browser.close();
      return { success: true, url, actions: results };
    } catch (err) {
      return { error: 'Install puppeteer for browser automation: npm install puppeteer', details: err.message };
    }
  }

  // ═══ FIND ANYTHING — The "I don't say I can't" engine ═══

  async findHowTo(goal, options = {}) {
    // This method NEVER returns "I can't". It always finds a way.

    const strategies = [];

    // Strategy 1: Web search
    strategies.push(this.searchAndFind(goal));

    // Strategy 2: GitHub search
    strategies.push((async () => {
      try {
        const axios = require('axios');
        const resp = await axios.get(`https://api.github.com/search/code?q=${encodeURIComponent(goal)}&per_page=5`, {
          headers: { 'User-Agent': 'OpenDesktop', 'Accept': 'application/vnd.github.v3+json' },
          timeout: 10000
        });
        return { source: 'github-code', results: (resp.data.items || []).map(i => ({ file: i.name, repo: i.repository?.full_name, url: i.html_url })) };
      } catch { return { source: 'github-code', results: [] }; }
    })());

    // Strategy 3: StackOverflow
    strategies.push((async () => {
      try {
        const axios = require('axios');
        const resp = await axios.get(`https://api.stackexchange.com/2.3/search/advanced?q=${encodeURIComponent(goal)}&order=desc&sort=relevance&site=stackoverflow&pagesize=5&filter=withbody`, { timeout: 10000 });
        return { source: 'stackoverflow', results: (resp.data.items || []).map(i => ({ title: i.title, url: i.link, score: i.score, answers: i.answer_count })) };
      } catch { return { source: 'stackoverflow', results: [] }; }
    })());

    // Strategy 4: npm packages
    strategies.push((async () => {
      try {
        const axios = require('axios');
        const resp = await axios.get(`https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(goal)}&size=5`, { timeout: 10000 });
        return { source: 'npm', results: (resp.data.objects || []).map(o => ({ name: o.package.name, desc: o.package.description })) };
      } catch { return { source: 'npm', results: [] }; }
    })());

    // Strategy 5: AI analysis — find ways using intelligence
    strategies.push((async () => {
      try {
        const analysis = await this.provider.chat(
          `I need to accomplish: "${goal}"

Find ALL possible ways to achieve this. For each way:
1. Method name and description
2. Step-by-step instructions
3. Tools/libraries needed
4. Difficulty level (1-10)
5. Time estimate
6. Success probability

Be creative. Think of unconventional approaches. Include:
- Existing tools/libraries that do this
- APIs that provide this
- Command-line tools
- Browser-based approaches
- Manual methods
- Workarounds and hacks

NEVER say "I can't" or "it's not possible". Always find a way.
Return as a numbered list from easiest to hardest.`,
          { maxTokens: 3000 }
        );
        return { source: 'ai-analysis', result: analysis };
      } catch { return { source: 'ai-analysis', result: 'Analysis failed' }; }
    })());

    const allResults = await Promise.allSettled(strategies);
    const settledResults = allResults.map(r => r.status === 'fulfilled' ? r.value : { source: 'error', results: [], error: r.reason?.message });

    return {
      goal,
      timestamp: new Date().toISOString(),
      strategies: settledResults,
      totalResults: settledResults.reduce((s, r) => s + (r.results?.length || 0), 0),
      conclusion: `Found ${settledResults.length} strategies to accomplish: "${goal}"`
    };
  }

  // ═══ HELPERS ═══

  _guessFilename(url) {
    try {
      const pathname = new URL(url).pathname;
      const basename = path.basename(pathname);
      return basename || `download_${Date.now()}`;
    } catch {
      return `download_${Date.now()}`;
    }
  }

  _formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  getDownloads(limit = 20) {
    return this.downloads.slice(-limit);
  }

  getStatus() {
    return {
      downloadDir: this.downloadDir,
      totalDownloads: this.downloads.length,
      totalSize: this.downloads.reduce((s, d) => s + (d.size || 0), 0)
    };
  }
}

module.exports = BrowserEngine;
