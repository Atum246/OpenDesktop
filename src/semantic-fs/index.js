/**
 * Semantic File System
 * 
 * Not just search by name — a semantic index of everything on disk.
 * "Find that contract from last month about the API integration."
 * Your filesystem becomes a knowledge base.
 */

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class SemanticFS extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      indexPath: config.indexPath || path.join(process.env.HOME || '~', '.opendesktop', 'semantic-fs'),
      maxFileSize: config.maxFileSize || 10485760, // 10MB
      supportedExtensions: config.supportedExtensions || [
        '.txt', '.md', '.json', '.js', '.ts', '.py', '.rs', '.go', '.java',
        '.pdf', '.doc', '.docx', '.html', '.xml', '.csv', '.yaml', '.yml',
        '.sh', '.bash', '.zsh', '.fish', '.toml', '.ini', '.cfg', '.conf'
      ],
      excludePatterns: config.excludePatterns || [
        'node_modules', '.git', '__pycache__', '.cache', 'dist', 'build',
        '.DS_Store', 'Thumbs.db', '*.pyc', '*.o', '*.so', '*.dylib'
      ],
      rescanInterval: config.rescanInterval || 3600000, // 1 hour
      ...config
    };

    this.fileIndex = new Map();      // path -> file metadata + embeddings
    this.conceptIndex = new Map();   // concept -> [file paths]
    this.tagIndex = new Map();       // tag -> [file paths]
    this.recentFiles = [];           // recently accessed files
    this.scanProgress = null;
    this.isScanning = false;
  }

  async initialize() {
    try {
      await fs.mkdir(this.config.indexPath, { recursive: true });
      await this._loadIndex();
    } catch (e) {}

    this.emit('initialized');
    return this;
  }

  /**
   * Scan a directory and build the semantic index.
   */
  async scanDirectory(dirPath, options = {}) {
    if (this.isScanning) {
      return { success: false, error: 'Scan already in progress', progress: this.scanProgress };
    }

    this.isScanning = true;
    this.scanProgress = {
      startTime: Date.now(),
      directoriesScanned: 0,
      filesIndexed: 0,
      filesSkipped: 0,
      errors: 0,
      currentPath: dirPath
    };

    this.emit('scan_started', { path: dirPath });

    try {
      await this._scanRecursive(dirPath, options.depth || 10);
      this.scanProgress.endTime = Date.now();
      this.scanProgress.duration = this.scanProgress.endTime - this.scanProgress.startTime;
      this.isScanning = false;

      await this._saveIndex();
      this.emit('scan_complete', this.scanProgress);

      return { success: true, ...this.scanProgress };
    } catch (err) {
      this.isScanning = false;
      this.scanProgress.error = err.message;
      this.emit('scan_error', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Search files by natural language query.
   */
  async search(query, options = {}) {
    const { maxResults = 20, minRelevance = 0.3, fileTypes = null, dateRange = null } = options;

    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
    const results = [];

    // Search through index
    for (const [filePath, fileData] of this.fileIndex) {
      // Apply filters
      if (fileTypes && !fileTypes.some(ext => filePath.endsWith(ext))) continue;
      if (dateRange) {
        if (dateRange.after && fileData.lastModified < dateRange.after) continue;
        if (dateRange.before && fileData.lastModified > dateRange.before) continue;
      }

      let relevance = 0;

      // Filename match
      const fileName = path.basename(filePath).toLowerCase();
      for (const word of queryWords) {
        if (fileName.includes(word)) relevance += 0.3;
      }

      // Content match (if we have content summary)
      if (fileData.summary) {
        const summaryLower = fileData.summary.toLowerCase();
        for (const word of queryWords) {
          if (summaryLower.includes(word)) relevance += 0.2;
        }
      }

      // Tag match
      if (fileData.tags) {
        for (const tag of fileData.tags) {
          if (queryLower.includes(tag.toLowerCase())) relevance += 0.4;
        }
      }

      // Concept match
      if (fileData.concepts) {
        for (const concept of fileData.concepts) {
          if (queryLower.includes(concept.toLowerCase())) relevance += 0.3;
        }
      }

      // Semantic match (keyword-based)
      if (fileData.keywords) {
        for (const keyword of fileData.keywords) {
          if (queryWords.includes(keyword.toLowerCase())) relevance += 0.15;
        }
      }

      // Recency boost
      const age = Date.now() - (fileData.lastAccessed || fileData.lastModified);
      const recencyBoost = Math.max(0, 1 - age / (30 * 24 * 3600000)) * 0.1;
      relevance += recencyBoost;

      if (relevance >= minRelevance) {
        results.push({
          path: filePath,
          name: path.basename(filePath),
          relevance: Math.min(relevance, 1),
          size: fileData.size,
          lastModified: fileData.lastModified,
          type: fileData.type,
          summary: fileData.summary?.substring(0, 200),
          tags: fileData.tags,
          concepts: fileData.concepts
        });
      }
    }

    // Sort by relevance
    results.sort((a, b) => b.relevance - a.relevance);

    return {
      query,
      totalResults: Math.min(results.length, maxResults),
      totalFilesSearched: this.fileIndex.size,
      results: results.slice(0, maxResults)
    };
  }

  /**
   * Find files related to a given file.
   */
  async findRelated(filePath, maxResults = 10) {
    const fileData = this.fileIndex.get(filePath);
    if (!fileData) {
      return { success: false, error: 'File not indexed' };
    }

    const related = [];

    for (const [otherPath, otherData] of this.fileIndex) {
      if (otherPath === filePath) continue;

      let similarity = 0;

      // Same directory
      if (path.dirname(filePath) === path.dirname(otherPath)) {
        similarity += 0.2;
      }

      // Same type
      if (fileData.type === otherData.type) {
        similarity += 0.1;
      }

      // Common tags
      if (fileData.tags && otherData.tags) {
        const commonTags = fileData.tags.filter(t => otherData.tags.includes(t));
        similarity += commonTags.length * 0.15;
      }

      // Common concepts
      if (fileData.concepts && otherData.concepts) {
        const commonConcepts = fileData.concepts.filter(c => otherData.concepts.includes(c));
        similarity += commonConcepts.length * 0.2;
      }

      // Common keywords
      if (fileData.keywords && otherData.keywords) {
        const commonKeywords = fileData.keywords.filter(k => otherData.keywords.includes(k));
        similarity += commonKeywords.length * 0.05;
      }

      // Similar name
      const nameA = path.basename(filePath, path.extname(filePath)).toLowerCase();
      const nameB = path.basename(otherPath, path.extname(otherPath)).toLowerCase();
      if (nameA.includes(nameB) || nameB.includes(nameA)) {
        similarity += 0.3;
      }

      if (similarity > 0.3) {
        related.push({
          path: otherPath,
          name: path.basename(otherPath),
          similarity: Math.min(similarity, 1),
          type: otherData.type,
          tags: otherData.tags
        });
      }
    }

    return {
      file: filePath,
      related: related
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, maxResults)
    };
  }

  /**
   * Tag a file with semantic labels.
   */
  async tagFile(filePath, tags) {
    const fileData = this.fileIndex.get(filePath);
    if (!fileData) {
      return { success: false, error: 'File not indexed' };
    }

    fileData.tags = [...new Set([...(fileData.tags || []), ...tags])];

    // Update tag index
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, []);
      }
      const tagFiles = this.tagIndex.get(tag);
      if (!tagFiles.includes(filePath)) {
        tagFiles.push(filePath);
      }
    }

    this.emit('file_tagged', { path: filePath, tags });
    return { success: true, tags: fileData.tags };
  }

  /**
   * Get file suggestions based on context.
   */
  async getSuggestions(context = {}) {
    const suggestions = [];
    const { currentFile, recentActivity, project, taskType } = context;

    // Suggest based on current file
    if (currentFile) {
      const related = await this.findRelated(currentFile, 5);
      suggestions.push(...related.related.map(r => ({
        ...r,
        reason: 'related_to_current'
      })));
    }

    // Suggest based on recent activity
    if (recentActivity && recentActivity.length > 0) {
      const recentFiles = recentActivity.slice(-5);
      for (const recent of recentFiles) {
        const related = await this.findRelated(recent, 3);
        suggestions.push(...related.related.map(r => ({
          ...r,
          reason: 'related_to_recent'
        })));
      }
    }

    // Suggest based on project
    if (project) {
      const projectFiles = Array.from(this.fileIndex.entries())
        .filter(([p]) => p.includes(project))
        .sort((a, b) => (b[1].lastAccessed || 0) - (a[1].lastAccessed || 0))
        .slice(0, 5)
        .map(([p, d]) => ({
          path: p,
          name: path.basename(p),
          type: d.type,
          reason: 'same_project'
        }));
      suggestions.push(...projectFiles);
    }

    // Suggest recently accessed files
    suggestions.push(...this.recentFiles.slice(0, 5).map(f => ({
      path: f.path,
      name: path.basename(f.path),
      type: f.type,
      reason: 'recently_accessed'
    })));

    // Deduplicate
    const seen = new Set();
    const unique = suggestions.filter(s => {
      if (seen.has(s.path)) return false;
      seen.add(s.path);
      return true;
    });

    return unique.slice(0, 15);
  }

  /**
   * Record a file access for the suggestion engine.
   */
  recordAccess(filePath) {
    const fileData = this.fileIndex.get(filePath);
    if (fileData) {
      fileData.lastAccessed = Date.now();
      fileData.accessCount = (fileData.accessCount || 0) + 1;
    }

    this.recentFiles.unshift({
      path: filePath,
      type: fileData?.type,
      timestamp: Date.now()
    });

    if (this.recentFiles.length > 100) {
      this.recentFiles = this.recentFiles.slice(0, 50);
    }
  }

  /**
   * Get index statistics.
   */
  getStats() {
    const stats = {
      totalFiles: this.fileIndex.size,
      totalTags: this.tagIndex.size,
      totalConcepts: this.conceptIndex.size,
      recentFiles: this.recentFiles.length,
      isScanning: this.isScanning,
      scanProgress: this.scanProgress,
      byType: {},
      byExtension: {},
      totalSize: 0
    };

    for (const [, fileData] of this.fileIndex) {
      stats.totalSize += fileData.size || 0;
      const ext = fileData.extension || 'unknown';
      stats.byExtension[ext] = (stats.byExtension[ext] || 0) + 1;
      const type = fileData.type || 'unknown';
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    }

    return stats;
  }

  /**
   * Get all tags.
   */
  getTags() {
    const tags = [];
    for (const [tag, files] of this.tagIndex) {
      tags.push({ tag, fileCount: files.length });
    }
    return tags.sort((a, b) => b.fileCount - a.fileCount);
  }

  // ==================== PRIVATE METHODS ====================

  async _scanRecursive(dirPath, depth) {
    if (depth <= 0) return;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      this.scanProgress.directoriesScanned++;

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        // Check exclude patterns
        if (this._shouldExclude(entry.name)) continue;

        if (entry.isDirectory()) {
          await this._scanRecursive(fullPath, depth - 1);
        } else if (entry.isFile()) {
          await this._indexFile(fullPath);
        }
      }
    } catch (err) {
      this.scanProgress.errors++;
    }
  }

  async _indexFile(filePath) {
    try {
      const ext = path.extname(filePath).toLowerCase();
      if (!this.config.supportedExtensions.includes(ext)) {
        this.scanProgress.filesSkipped++;
        return;
      }

      const stat = await fs.stat(filePath);
      if (stat.size > this.config.maxFileSize) {
        this.scanProgress.filesSkipped++;
        return;
      }

      // Read content for text files
      let content = null;
      let summary = null;
      let keywords = [];
      let concepts = [];

      if (this._isTextFile(ext)) {
        try {
          content = await fs.readFile(filePath, 'utf8');
          summary = this._extractSummary(content);
          keywords = this._extractKeywords(content);
          concepts = this._extractConcepts(content, filePath);
        } catch (e) {
          // Binary or unreadable
        }
      }

      const fileData = {
        size: stat.size,
        lastModified: stat.mtimeMs,
        lastAccessed: stat.atimeMs,
        extension: ext,
        type: this._classifyFile(ext, filePath),
        summary: summary?.substring(0, 500),
        keywords: keywords.slice(0, 50),
        concepts: concepts.slice(0, 20),
        tags: this._autoTag(filePath, ext, content),
        contentHash: content ? crypto.createHash('md5').update(content).digest('hex') : null,
        indexed: Date.now()
      };

      this.fileIndex.set(filePath, fileData);
      this.scanProgress.filesIndexed++;

      // Update concept index
      for (const concept of concepts) {
        if (!this.conceptIndex.has(concept)) {
          this.conceptIndex.set(concept, []);
        }
        const conceptFiles = this.conceptIndex.get(concept);
        if (!conceptFiles.includes(filePath)) {
          conceptFiles.push(filePath);
        }
      }

    } catch (err) {
      this.scanProgress.errors++;
    }
  }

  _shouldExclude(name) {
    return this.config.excludePatterns.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(name);
      }
      return name === pattern || name.startsWith(pattern);
    });
  }

  _isTextFile(ext) {
    const textExts = ['.txt', '.md', '.json', '.js', '.ts', '.py', '.rs', '.go', '.java',
      '.html', '.xml', '.csv', '.yaml', '.yml', '.sh', '.bash', '.toml', '.ini', '.cfg', '.conf',
      '.css', '.scss', '.less', '.jsx', '.tsx', '.vue', '.svelte', '.rb', '.php', '.c', '.cpp', '.h'];
    return textExts.includes(ext);
  }

  _extractSummary(content) {
    // Get first meaningful lines
    const lines = content.split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0 && !l.startsWith('#') && !l.startsWith('//') && !l.startsWith('/*'));
    return lines.slice(0, 5).join(' ').substring(0, 300);
  }

  _extractKeywords(content) {
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3);

    const freq = new Map();
    for (const word of words) {
      freq.set(word, (freq.get(word) || 0) + 1);
    }

    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([word]) => word);
  }

  _extractConcepts(content, filePath) {
    const concepts = [];
    const contentLower = content.toLowerCase();

    // Detect programming concepts
    if (contentLower.includes('class ')) concepts.push('object-oriented');
    if (contentLower.includes('async ') || contentLower.includes('await ')) concepts.push('async');
    if (contentLower.includes('import ') || contentLower.includes('require(')) concepts.push('modular');
    if (contentLower.includes('test') || contentLower.includes('describe(')) concepts.push('testing');
    if (contentLower.includes('api') || contentLower.includes('endpoint')) concepts.push('api');
    if (contentLower.includes('database') || contentLower.includes('query')) concepts.push('database');
    if (contentLower.includes('auth') || contentLower.includes('token')) concepts.push('authentication');
    if (contentLower.includes('config') || contentLower.includes('settings')) concepts.push('configuration');

    // Detect by file path
    if (filePath.includes('test')) concepts.push('testing');
    if (filePath.includes('config')) concepts.push('configuration');
    if (filePath.includes('doc')) concepts.push('documentation');
    if (filePath.includes('src')) concepts.push('source-code');

    return [...new Set(concepts)];
  }

  _autoTag(filePath, ext, content) {
    const tags = [];

    // By extension
    const extTags = {
      '.js': 'javascript', '.ts': 'typescript', '.py': 'python',
      '.rs': 'rust', '.go': 'go', '.java': 'java',
      '.md': 'documentation', '.txt': 'text', '.json': 'data',
      '.yaml': 'config', '.yml': 'config', '.toml': 'config',
      '.html': 'web', '.css': 'web', '.jsx': 'react', '.tsx': 'react',
      '.sh': 'shell', '.bash': 'shell'
    };
    if (extTags[ext]) tags.push(extTags[ext]);

    // By path
    if (filePath.includes('test')) tags.push('test');
    if (filePath.includes('docs')) tags.push('documentation');
    if (filePath.includes('config')) tags.push('config');

    return tags;
  }

  _classifyFile(ext, filePath) {
    const name = path.basename(filePath).toLowerCase();
    
    if (name.includes('readme')) return 'documentation';
    if (name.includes('license')) return 'legal';
    if (name.includes('config') || name.includes('.env')) return 'configuration';
    if (name.includes('test') || name.includes('spec')) return 'test';
    if (name.includes('package.json') || name.includes('cargo.toml')) return 'manifest';
    
    const codeExts = ['.js', '.ts', '.py', '.rs', '.go', '.java', '.c', '.cpp', '.rb', '.php'];
    if (codeExts.includes(ext)) return 'source-code';
    
    const docExts = ['.md', '.txt', '.rst', '.adoc'];
    if (docExts.includes(ext)) return 'documentation';
    
    const dataExts = ['.json', '.yaml', '.yml', '.toml', '.xml', '.csv'];
    if (dataExts.includes(ext)) return 'data';
    
    return 'other';
  }

  async _loadIndex() {
    try {
      const indexPath = path.join(this.config.indexPath, 'index.json');
      const data = JSON.parse(await fs.readFile(indexPath, 'utf8'));
      if (data.files) {
        for (const [path, fileData] of Object.entries(data.files)) {
          this.fileIndex.set(path, fileData);
        }
      }
      if (data.tags) {
        for (const [tag, files] of Object.entries(data.tags)) {
          this.tagIndex.set(tag, files);
        }
      }
    } catch (e) {}
  }

  async _saveIndex() {
    try {
      const indexPath = path.join(this.config.indexPath, 'index.json');
      const index = {
        files: Object.fromEntries(this.fileIndex),
        tags: Object.fromEntries(this.tagIndex),
        lastSaved: Date.now()
      };
      await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
    } catch (e) {}
  }
}

module.exports = { SemanticFS };
