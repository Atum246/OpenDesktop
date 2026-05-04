'use strict';

// ═══════════════════════════════════════════════════════════════
//  REAL WEB SEARCH ENGINE — Free, No API Keys Required 🔍🌐
// ═══════════════════════════════════════════════════════════════

const https = require('https');
const http = require('http');
const { URL } = require('url');

class WebSearchEngine {
  constructor(config) {
    this.config = config || {};
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 min
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    this.requestCount = 0;
    this.errors = [];
  }

  // ─── HTTP HELPERS ───

  _httpGet(url, options = {}) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const lib = parsedUrl.protocol === 'https:' ? https : http;
      const reqOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json, text/html, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          ...options.headers
        },
        timeout: options.timeout || 10000
      };

      const req = lib.request(reqOptions, (res) => {
        // Follow redirects
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          return this._httpGet(res.headers.location, options).then(resolve).catch(reject);
        }

        let data = '';
        res.setEncoding('utf8');
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          this.requestCount++;
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
      req.end();
    });
  }

  _getCached(key) {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.ts < this.cacheTTL) return entry.data;
    this.cache.delete(key);
    return null;
  }

  _setCache(key, data) {
    if (this.cache.size > 500) {
      const oldest = [...this.cache.entries()].sort((a, b) => a[1].ts - b[1].ts);
      oldest.slice(0, 100).forEach(([k]) => this.cache.delete(k));
    }
    this.cache.set(key, { data, ts: Date.now() });
  }

  // ─── DUCKDUCKGO INSTANT ANSWER ───

  async _ddgInstant(query) {
    try {
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
      const res = await this._httpGet(url);
      const data = JSON.parse(res.body);
      const results = [];

      if (data.AbstractText) {
        results.push({
          title: data.Heading || query,
          snippet: data.AbstractText,
          url: data.AbstractURL || '',
          source: 'DuckDuckGo Instant Answer',
          type: 'instant'
        });
      }

      if (data.RelatedTopics) {
        for (const topic of data.RelatedTopics.slice(0, 8)) {
          if (topic.Text) {
            results.push({
              title: topic.Text.split(' - ')[0]?.substring(0, 80) || '',
              snippet: topic.Text,
              url: topic.FirstURL || '',
              source: 'DuckDuckGo',
              type: 'related'
            });
          }
          // Handle sub-topics
          if (topic.Topics) {
            for (const sub of topic.Topics.slice(0, 3)) {
              if (sub.Text) {
                results.push({
                  title: sub.Text.split(' - ')[0]?.substring(0, 80) || '',
                  snippet: sub.Text,
                  url: sub.FirstURL || '',
                  source: 'DuckDuckGo',
                  type: 'related'
                });
              }
            }
          }
        }
      }

      if (data.AbstractSource) {
        results.push({
          title: `${data.AbstractSource}: ${data.Heading}`,
          snippet: data.AbstractText || '',
          url: data.AbstractURL || '',
          source: data.AbstractSource,
          type: 'source'
        });
      }

      return results;
    } catch (err) {
      this.errors.push({ method: 'ddgInstant', error: err.message, ts: Date.now() });
      return [];
    }
  }

  // ─── DUCKDUCKGO HTML SCRAPING ───

  async _ddgHtmlSearch(query, options = {}) {
    try {
      const safeSearch = options.safeSearch !== false ? 1 : -1;
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kp=${safeSearch}`;
      const res = await this._httpGet(url);
      const html = res.body;
      const results = [];

      // Parse result blocks
      const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
      let match;
      while ((match = resultRegex.exec(html)) !== null && results.length < (options.limit || 10)) {
        const href = match[1];
        const title = match[2].replace(/<[^>]+>/g, '').trim();
        const snippet = match[3].replace(/<[^>]+>/g, '').trim();

        // Decode DuckDuckGo redirect URLs
        let cleanUrl = href;
        const uddgMatch = href.match(/uddg=([^&]+)/);
        if (uddgMatch) cleanUrl = decodeURIComponent(uddgMatch[1]);

        if (title && cleanUrl) {
          results.push({
            title,
            snippet,
            url: cleanUrl,
            source: 'DuckDuckGo',
            type: 'web'
          });
        }
      }

      return results;
    } catch (err) {
      this.errors.push({ method: 'ddgHtmlSearch', error: err.message, ts: Date.now() });
      return [];
    }
  }

  // ─── WIKIPEDIA API ───

  async _wikipediaSearch(query, options = {}) {
    try {
      const limit = options.limit || 5;
      const lang = options.lang || 'en';

      // Search for articles
      const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=${limit}&format=json`;
      const res = await this._httpGet(searchUrl);
      const data = JSON.parse(res.body);
      const results = [];

      if (data.query && data.query.search) {
        for (const item of data.query.search) {
          const snippet = item.snippet.replace(/<[^>]+>/g, '').trim();
          results.push({
            title: item.title,
            snippet,
            url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
            source: 'Wikipedia',
            type: 'encyclopedia',
            wordcount: item.wordcount,
            timestamp: item.timestamp
          });
        }
      }

      // Get summary for top result
      if (results.length > 0) {
        try {
          const summaryUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(results[0].title.replace(/ /g, '_'))}`;
          const summaryRes = await this._httpGet(summaryUrl);
          const summary = JSON.parse(summaryRes.body);
          if (summary.extract) {
            results[0].summary = summary.extract;
            results[0].thumbnail = summary.thumbnail?.source || '';
            results[0].description = summary.description || '';
          }
        } catch (_) { /* summary fetch is optional */ }
      }

      return results;
    } catch (err) {
      this.errors.push({ method: 'wikipediaSearch', error: err.message, ts: Date.now() });
      return [];
    }
  }

  // ─── STACKOVERFLOW API ───

  async _stackoverflowSearch(query, options = {}) {
    try {
      const limit = options.limit || 5;
      const sort = options.sort || 'relevance'; // relevance, votes, creation, activity
      const url = `https://api.stackexchange.com/2.3/search/advanced?q=${encodeURIComponent(query)}&order=desc&sort=${sort}&site=stackoverflow&pagesize=${limit}&filter=withbody`;
      const res = await this._httpGet(url);
      const data = JSON.parse(res.body);
      const results = [];

      if (data.items) {
        for (const item of data.items) {
          results.push({
            title: item.title,
            snippet: (item.body || '').replace(/<[^>]+>/g, '').substring(0, 300).trim(),
            url: item.link,
            source: 'StackOverflow',
            type: 'qa',
            score: item.score,
            answerCount: item.answer_count,
            isAccepted: item.is_answered,
            tags: item.tags || [],
            viewCount: item.view_count,
            creationDate: new Date(item.creation_date * 1000).toISOString()
          });
        }
      }

      return results;
    } catch (err) {
      this.errors.push({ method: 'stackoverflowSearch', error: err.message, ts: Date.now() });
      return [];
    }
  }

  // ─── GITHUB API ───

  async _githubSearch(query, options = {}) {
    try {
      const limit = options.limit || 5;
      const type = options.type || 'repositories'; // repositories, code, issues, users
      const sort = options.sort || 'best-match'; // stars, forks, updated, best-match
      const url = `https://api.github.com/search/${type}?q=${encodeURIComponent(query)}&per_page=${limit}&sort=${sort}`;
      const res = await this._httpGet(url, {
        headers: { 'Accept': 'application/vnd.github.v3+json' }
      });
      const data = JSON.parse(res.body);
      const results = [];

      if (data.items) {
        for (const item of data.items) {
          if (type === 'repositories') {
            results.push({
              title: item.full_name,
              snippet: item.description || '',
              url: item.html_url,
              source: 'GitHub',
              type: 'repository',
              stars: item.stargazers_count,
              forks: item.forks_count,
              language: item.language,
              openIssues: item.open_issues_count,
              lastUpdated: item.updated_at,
              topics: item.topics || [],
              license: item.license?.name || ''
            });
          } else if (type === 'code') {
            results.push({
              title: item.name,
              snippet: (item.text_matches?.[0]?.fragment || '').substring(0, 300),
              url: item.html_url,
              source: 'GitHub',
              type: 'code',
              repository: item.repository?.full_name || '',
              path: item.path
            });
          } else {
            results.push({
              title: item.title || item.login || item.name || '',
              snippet: (item.body || item.description || '').substring(0, 300),
              url: item.html_url,
              source: 'GitHub',
              type: type.slice(0, -1) // Remove trailing 's'
            });
          }
        }
      }

      return results;
    } catch (err) {
      this.errors.push({ method: 'githubSearch', error: err.message, ts: Date.now() });
      return [];
    }
  }

  // ─── NPM REGISTRY API ───

  async _npmSearch(query, options = {}) {
    try {
      const limit = options.limit || 5;
      const url = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=${limit}`;
      const res = await this._httpGet(url);
      const data = JSON.parse(res.body);
      const results = [];

      if (data.objects) {
        for (const obj of data.objects) {
          const pkg = obj.package;
          results.push({
            title: `${pkg.name}@${pkg.version}`,
            snippet: pkg.description || '',
            url: `https://www.npmjs.com/package/${pkg.name}`,
            source: 'npm',
            type: 'package',
            version: pkg.version,
            author: pkg.author?.name || pkg.publisher?.username || '',
            keywords: pkg.keywords || [],
            date: pkg.date,
            score: {
              final: obj.score?.final || 0,
              quality: obj.score?.detail?.quality || 0,
              popularity: obj.score?.detail?.popularity || 0,
              maintenance: obj.score?.detail?.maintenance || 0
            },
            links: pkg.links || {}
          });
        }
      }

      return results;
    } catch (err) {
      this.errors.push({ method: 'npmSearch', error: err.message, ts: Date.now() });
      return [];
    }
  }

  // ─── MAIN SEARCH ───

  async search(query, options = {}) {
    const cacheKey = `search:${query}:${JSON.stringify(options)}`;
    const cached = this._getCached(cacheKey);
    if (cached) return cached;

    const startTime = Date.now();
    const sources = options.sources || ['ddg', 'wikipedia'];
    const limit = options.limit || 10;

    const promises = [];
    if (sources.includes('ddg')) {
      promises.push(this._ddgInstant(query).catch(() => []));
      promises.push(this._ddgHtmlSearch(query, { limit }).catch(() => []));
    }
    if (sources.includes('wikipedia')) promises.push(this._wikipediaSearch(query, { limit: Math.min(limit, 5) }).catch(() => []));
    if (sources.includes('stackoverflow')) promises.push(this._stackoverflowSearch(query, { limit: Math.min(limit, 5) }).catch(() => []));
    if (sources.includes('github')) promises.push(this._githubSearch(query, { limit: Math.min(limit, 5) }).catch(() => []));
    if (sources.includes('npm')) promises.push(this._npmSearch(query, { limit: Math.min(limit, 5) }).catch(() => []));

    const allResults = (await Promise.all(promises)).flat();

    // Deduplicate by URL
    const seen = new Set();
    const unique = [];
    for (const r of allResults) {
      const key = r.url || r.title;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(r);
      }
    }

    const result = {
      query,
      results: unique.slice(0, limit),
      totalResults: unique.length,
      sources: sources,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };

    this._setCache(cacheKey, result);
    return result;
  }

  // ─── DEEP SEARCH ───

  async deepSearch(query, options = {}) {
    const cacheKey = `deep:${query}`;
    const cached = this._getCached(cacheKey);
    if (cached) return cached;

    // Phase 1: Initial broad search
    const initial = await this.search(query, {
      sources: ['ddg', 'wikipedia', 'stackoverflow', 'github'],
      limit: 15
    });

    // Phase 2: Extract key terms and search again
    const keyTerms = this._extractKeyTerms(query, initial.results);
    const subSearches = keyTerms.slice(0, 3).map(term =>
      this.search(term, { sources: ['ddg', 'wikipedia'], limit: 5 })
    );
    const subResults = await Promise.all(subSearches);

    // Phase 3: Scrape top results for deeper content
    const topUrls = initial.results
      .filter(r => r.url && r.type !== 'package')
      .slice(0, 3)
      .map(r => r.url);

    const scrapePromises = topUrls.map(url =>
      this.scrapeUrl(url).catch(() => ({ url, content: '', error: 'scrape failed' }))
    );
    const scraped = await Promise.all(scrapePromises);

    const result = {
      query,
      primaryResults: initial.results,
      relatedSearches: keyTerms,
      expandedResults: subResults.flatMap(s => s.results),
      deepContent: scraped.map(s => ({
        url: s.url,
        excerpt: (s.content || '').substring(0, 1000)
      })),
      totalSources: new Set([
        ...initial.results.map(r => r.url),
        ...scraped.map(s => s.url)
      ]).size,
      timestamp: new Date().toISOString()
    };

    this._setCache(cacheKey, result);
    return result;
  }

  // ─── SCRAPE URL ───

  async scrapeUrl(url, options = {}) {
    const cacheKey = `scrape:${url}`;
    const cached = this._getCached(cacheKey);
    if (cached) return cached;

    try {
      const res = await this._httpGet(url, { timeout: options.timeout || 15000 });
      const html = res.body;
      const contentType = res.headers['content-type'] || '';

      const result = {
        url,
        status: res.status,
        contentType,
        title: this._extractTag(html, 'title'),
        description: this._extractMeta(html, 'description'),
        content: '',
        links: [],
        images: [],
        headings: []
      };

      if (contentType.includes('json')) {
        try {
          result.content = JSON.stringify(JSON.parse(html), null, 2).substring(0, 5000);
        } catch {
          result.content = html.substring(0, 5000);
        }
      } else {
        // Extract text content
        result.content = this._extractText(html);
        result.headings = this._extractHeadings(html);
        result.links = this._extractLinks(html, url);
        result.images = this._extractImages(html, url);
      }

      this._setCache(cacheKey, result);
      return result;
    } catch (err) {
      return { url, error: err.message, content: '', links: [], images: [], headings: [] };
    }
  }

  // ─── EXTRACT CONTENT ───

  async extractContent(url, options = {}) {
    const scraped = await this.scrapeUrl(url, options);
    return {
      url: scraped.url,
      title: scraped.title,
      description: scraped.description,
      text: scraped.content,
      headings: scraped.headings,
      links: scraped.links?.slice(0, 20) || [],
      imageCount: scraped.images?.length || 0
    };
  }

  // ─── SUMMARIZE ───

  async summarize(urlOrText, options = {}) {
    let text;
    let title = '';
    let source = '';

    if (urlOrText.startsWith('http://') || urlOrText.startsWith('https://')) {
      const scraped = await this.scrapeUrl(urlOrText);
      text = scraped.content;
      title = scraped.title || '';
      source = urlOrText;
    } else {
      text = urlOrText;
      source = 'direct input';
    }

    if (!text || text.trim().length < 50) {
      return { summary: 'Content too short to summarize.', title, source };
    }

    // Extractive summarization - pick most informative sentences
    const sentences = text
      .replace(/\s+/g, ' ')
      .split(/(?<=[.!?])\s+/)
      .filter(s => s.length > 20 && s.length < 500);

    const scored = sentences.map((sentence, idx) => {
      let score = 0;
      // Position score (first/last sentences are important)
      if (idx < 3) score += 3;
      if (idx >= sentences.length - 2) score += 1;
      // Length score (medium sentences preferred)
      if (sentence.length > 50 && sentence.length < 200) score += 2;
      // Keyword density
      const words = sentence.toLowerCase().split(/\s+/);
      if (words.length > 8) score += 1;
      // Contains numbers (often factual)
      if (/\d+/.test(sentence)) score += 1;
      // Capitalized words (proper nouns, important terms)
      const caps = (sentence.match(/[A-Z][a-z]+/g) || []).length;
      score += Math.min(caps * 0.5, 3);
      return { sentence, score, idx };
    });

    scored.sort((a, b) => b.score - a.score);
    const summaryLength = options.sentences || 5;
    const topSentences = scored
      .slice(0, summaryLength)
      .sort((a, b) => a.idx - b.idx) // Restore original order
      .map(s => s.sentence);

    return {
      title,
      source,
      summary: topSentences.join(' '),
      sentenceCount: topSentences.length,
      originalLength: text.length,
      compressionRatio: Math.round((topSentences.join(' ').length / text.length) * 100)
    };
  }

  // ─── SEARCH IMAGES ───

  async searchImages(query, options = {}) {
    try {
      const limit = options.limit || 10;
      const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&t=h_&iax=images&ia=images`;

      // DDG image search requires a token flow
      const tokenRes = await this._httpGet(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`);
      const tokenMatch = tokenRes.body.match(/vqd='([\d-]+)'/);
      const vqd = tokenMatch ? tokenMatch[1] : '';

      if (!vqd) {
        // Fallback: return Wikipedia commons images
        return this._wikipediaImages(query, limit);
      }

      const imgUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,,,&p=1`;
      const imgRes = await this._httpGet(imgUrl);
      const data = JSON.parse(imgRes.body);
      const results = [];

      if (data.results) {
        for (const img of data.results.slice(0, limit)) {
          results.push({
            title: img.title || '',
            url: img.image || '',
            thumbnail: img.thumbnail || '',
            source: img.url || '',
            width: img.width,
            height: img.height,
            size: img.size
          });
        }
      }

      return results;
    } catch (err) {
      this.errors.push({ method: 'searchImages', error: err.message, ts: Date.now() });
      return this._wikipediaImages(query, options.limit || 10);
    }
  }

  async _wikipediaImages(query, limit) {
    try {
      const url = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=${limit}&prop=pageimages&pipithumbnailwidth=300&format=json`;
      const res = await this._httpGet(url);
      const data = JSON.parse(res.body);
      const results = [];
      if (data.query?.pages) {
        for (const page of Object.values(data.query.pages)) {
          if (page.thumbnail) {
            results.push({
              title: page.title,
              url: page.thumbnail.source,
              thumbnail: page.thumbnail.source,
              source: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`,
              type: 'wikipedia'
            });
          }
        }
      }
      return results;
    } catch {
      return [];
    }
  }

  // ─── SEARCH NEWS ───

  async searchNews(query, options = {}) {
    try {
      const limit = options.limit || 10;
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
      const res = await this._httpGet(url);
      const xml = res.body;
      const results = [];

      // Simple XML parsing for RSS
      const items = xml.split('<item>').slice(1);
      for (const item of items.slice(0, limit)) {
        const title = this._extractTag(item, 'title');
        const link = this._extractTag(item, 'link');
        const pubDate = this._extractTag(item, 'pubDate');
        const source = this._extractTag(item, 'source');
        const description = this._extractTag(item, 'description');

        if (title) {
          results.push({
            title: title.replace(/<[^>]+>/g, '').trim(),
            url: link || '',
            snippet: (description || '').replace(/<[^>]+>/g, '').trim().substring(0, 300),
            publishedDate: pubDate || '',
            source: (source || 'Google News').replace(/<[^>]+>/g, '').trim(),
            type: 'news'
          });
        }
      }

      // Fallback: DDG news search
      if (results.length === 0) {
        return this._ddgNewsSearch(query, limit);
      }

      return results;
    } catch (err) {
      this.errors.push({ method: 'searchNews', error: err.message, ts: Date.now() });
      return this._ddgNewsSearch(query, options.limit || 10);
    }
  }

  async _ddgNewsSearch(query, limit) {
    try {
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query + ' news')}&df=d`;
      const res = await this._httpGet(url);
      const html = res.body;
      const results = [];
      const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
      let match;
      while ((match = resultRegex.exec(html)) !== null && results.length < limit) {
        let cleanUrl = match[1];
        const uddg = match[1].match(/uddg=([^&]+)/);
        if (uddg) cleanUrl = decodeURIComponent(uddg[1]);
        results.push({
          title: match[2].replace(/<[^>]+>/g, '').trim(),
          snippet: match[3].replace(/<[^>]+>/g, '').trim(),
          url: cleanUrl,
          source: 'DuckDuckGo News',
          type: 'news'
        });
      }
      return results;
    } catch {
      return [];
    }
  }

  // ─── HTML PARSING HELPERS ───

  _extractTag(html, tag) {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const match = html.match(regex);
    return match ? match[1].trim() : '';
  }

  _extractMeta(html, name) {
    const regex = new RegExp(`<meta[^>]*(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i');
    const match = html.match(regex);
    if (match) return match[1];
    // Try reversed attribute order
    const regex2 = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["']`, 'i');
    const match2 = html.match(regex2);
    return match2 ? match2[1] : '';
  }

  _extractText(html) {
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 10000);
  }

  _extractHeadings(html) {
    const headings = [];
    const regex = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
      const text = match[2].replace(/<[^>]+>/g, '').trim();
      if (text) headings.push({ level: parseInt(match[1]), text });
    }
    return headings;
  }

  _extractLinks(html, baseUrl) {
    const links = [];
    const regex = /<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    const seen = new Set();
    while ((match = regex.exec(html)) !== null && links.length < 50) {
      let href = match[1];
      const text = match[2].replace(/<[^>]+>/g, '').trim();
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) continue;
      try {
        href = new URL(href, baseUrl).href;
      } catch { continue; }
      if (!seen.has(href) && text) {
        seen.add(href);
        links.push({ url: href, text: text.substring(0, 100) });
      }
    }
    return links;
  }

  _extractImages(html, baseUrl) {
    const images = [];
    const regex = /<img[^>]*src=["']([^"']*)["'][^>]*(?:alt=["']([^"']*)["'])?[^>]*>/gi;
    let match;
    const seen = new Set();
    while ((match = regex.exec(html)) !== null && images.length < 30) {
      let src = match[1];
      const alt = match[2] || '';
      if (!src || src.startsWith('data:')) continue;
      try {
        src = new URL(src, baseUrl).href;
      } catch { continue; }
      if (!seen.has(src)) {
        seen.add(src);
        images.push({ url: src, alt });
      }
    }
    return images;
  }

  _extractKeyTerms(query, results) {
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const stopWords = new Set(['what', 'when', 'where', 'which', 'that', 'this', 'with', 'from', 'have', 'been', 'will', 'does', 'about', 'into', 'than', 'them', 'they', 'their', 'there', 'these', 'those', 'just', 'also', 'more', 'some', 'very', 'your']);
    const terms = new Set();

    // Extract from query
    words.filter(w => !stopWords.has(w)).forEach(w => terms.add(w));

    // Extract from result titles
    for (const r of results.slice(0, 5)) {
      if (r.title) {
        r.title.toLowerCase().split(/\s+/)
          .filter(w => w.length > 4 && !stopWords.has(w))
          .forEach(w => terms.add(w));
      }
    }

    // Generate compound queries
    const termArr = [...terms].slice(0, 6);
    const queries = [];
    for (let i = 0; i < termArr.length; i++) {
      for (let j = i + 1; j < termArr.length; j++) {
        queries.push(`${termArr[i]} ${termArr[j]}`);
      }
    }

    return queries.slice(0, 5);
  }

  // ─── UTILITY ───

  getStats() {
    return {
      requestCount: this.requestCount,
      cacheSize: this.cache.size,
      recentErrors: this.errors.slice(-10)
    };
  }

  clearCache() {
    this.cache.clear();
    return { cleared: true };
  }

  getCacheSize() { return this.cache.size; }
  getHistory() { return this.history; }
}

module.exports = WebSearchEngine;
