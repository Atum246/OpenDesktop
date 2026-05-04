'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');

// ═══════════════════════════════════════════════════════════════
//  PERSISTENT CONTEXTUAL BRAIN — Weighted Knowledge Graph 🧠🔗
//  Remembers what matters, forgets what doesn't, connects everything
// ═══════════════════════════════════════════════════════════════

class ContextualBrain {
  constructor(config, memory) {
    this.config = config;
    this.memory = memory;
    this.dataDir = path.join(os.homedir(), '.opendesktop', 'brain');
    if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });

    // Knowledge graph: nodes = facts/entities, edges = relationships
    this.nodes = new Map(); // id -> { id, type, content, weight, lastAccessed, accessCount, created, tags, embedding }
    this.edges = new Map(); // id -> [{ from, to, relation, weight, created }]
    this.index = new Map(); // keyword -> Set of node ids (inverted index)
    this.contextWindow = []; // Recent context for active conversation
    this.maxContextWindow = 20;
    this.decayRate = 0.001; // Weight decay per hour
    this.minWeight = 0.01;  // Below this = forgotten

    this._loadGraph();
  }

  // ─── ADD KNOWLEDGE ───
  addNode(type, content, metadata = {}) {
    const id = `node_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 4)}`;
    const node = {
      id,
      type, // 'fact', 'preference', 'event', 'entity', 'concept', 'project', 'person', 'skill'
      content,
      weight: metadata.weight || 1.0,
      lastAccessed: Date.now(),
      accessCount: 0,
      created: Date.now(),
      tags: metadata.tags || [],
      source: metadata.source || 'interaction',
      context: metadata.context || '',
      embedding: null, // For future vector similarity
      metadata: metadata.extra || {}
    };

    this.nodes.set(id, node);
    this._indexNode(id, node);
    this._saveGraph();

    // Connect to related existing nodes
    this._autoRelate(node);

    return id;
  }

  // ─── ADD RELATIONSHIP ───
  addEdge(fromId, toId, relation, weight = 1.0) {
    if (!this.edges.has(fromId)) this.edges.set(fromId, []);
    this.edges.get(fromId).push({
      from: fromId,
      to: toId,
      relation, // 'related_to', 'part_of', 'caused_by', 'depends_on', 'similar_to', 'contradicts', 'evolved_from'
      weight,
      created: Date.now()
    });

    // Bidirectional for symmetric relations
    if (['related_to', 'similar_to'].includes(relation)) {
      if (!this.edges.has(toId)) this.edges.set(toId, []);
      this.edges.get(toId).push({ from: toId, to: fromId, relation, weight, created: Date.now() });
    }

    this._saveGraph();
  }

  // ─── QUERY THE BRAIN ───
  query(queryText, options = {}) {
    const limit = options.limit || 10;
    const minWeight = options.minWeight || 0.1;
    const typeFilter = options.types || null;

    // Tokenize query
    const queryTerms = this._tokenize(queryText);

    // Find matching nodes via inverted index
    const candidateScores = new Map();
    for (const term of queryTerms) {
      const nodeIds = this.index.get(term) || new Set();
      for (const id of nodeIds) {
        const node = this.nodes.get(id);
        if (!node) continue;
        if (typeFilter && !typeFilter.includes(node.type)) continue;
        if (node.weight < minWeight) continue;

        const currentScore = candidateScores.get(id) || 0;
        // Score = term match + weight + recency + access frequency
        const recency = Math.max(0, 1 - (Date.now() - node.lastAccessed) / (7 * 24 * 60 * 60 * 1000));
        const frequency = Math.min(1, node.accessCount / 50);
        candidateScores.set(id, currentScore + node.weight + recency * 0.5 + frequency * 0.3);
      }
    }

    // Also traverse edges for related nodes
    for (const [id] of candidateScores) {
      const edges = this.edges.get(id) || [];
      for (const edge of edges) {
        const relatedNode = this.nodes.get(edge.to);
        if (!relatedNode || relatedNode.weight < minWeight) continue;
        const existing = candidateScores.get(edge.to) || 0;
        candidateScores.set(edge.to, existing + edge.weight * 0.5);
      }
    }

    // Sort by score and return top results
    const results = [...candidateScores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id, score]) => {
        const node = this.nodes.get(id);
        // Boost access count (it was just accessed)
        node.accessCount++;
        node.lastAccessed = Date.now();
        return { ...node, score, edges: this.edges.get(id) || [] };
      });

    return results;
  }

  // ─── GET CONTEXTUAL SUMMARY ───
  getContextSummary(maxTokens = 2000) {
    // Get most important/recent nodes
    const sorted = [...this.nodes.values()]
      .sort((a, b) => {
        const scoreA = a.weight + a.accessCount * 0.1 + (Date.now() - a.lastAccessed < 3600000 ? 2 : 0);
        const scoreB = b.weight + b.accessCount * 0.1 + (Date.now() - b.lastAccessed < 3600000 ? 2 : 0);
        return scoreB - scoreA;
      })
      .slice(0, 50);

    const parts = [];
    let charCount = 0;

    for (const node of sorted) {
      const entry = `[${node.type}] ${node.content}`;
      if (charCount + entry.length > maxTokens * 4) break;
      parts.push(entry);
      charCount += entry.length;
    }

    return parts.join('\n');
  }

  // ─── LEARN FROM INTERACTION ───
  learnFromConversation(userMessage, assistantResponse, context = {}) {
    // Extract entities and facts from the conversation
    const entities = this._extractEntities(userMessage);
    const facts = this._extractFacts(userMessage, assistantResponse);

    // Add user message as event
    this.addNode('event', `User said: ${userMessage.slice(0, 200)}`, {
      tags: ['conversation', 'user'],
      weight: 0.5,
      source: 'conversation'
    });

    // Add extracted facts
    for (const fact of facts) {
      this.addNode('fact', fact, { tags: ['extracted'], weight: 0.8 });
    }

    // Add extracted entities
    for (const entity of entities) {
      this.addNode('entity', entity.text, { tags: [entity.type], weight: 0.6 });
    }

    // Add to context window
    this.contextWindow.push({ user: userMessage, assistant: assistantResponse, timestamp: Date.now() });
    if (this.contextWindow.length > this.maxContextWindow) {
      this.contextWindow.shift();
    }
  }

  // ─── LEARN PREFERENCE ───
  learnPreference(key, value, confidence = 1.0) {
    // Check if we already have this preference
    const existing = this.query(key, { types: ['preference'], limit: 1 });
    if (existing.length > 0 && existing[0].content.includes(key)) {
      // Update existing
      const node = this.nodes.get(existing[0].id);
      node.content = `${key}: ${value}`;
      node.weight = Math.min(1.0, node.weight + 0.1);
      node.lastAccessed = Date.now();
    } else {
      this.addNode('preference', `${key}: ${value}`, {
        tags: ['preference', key.toLowerCase()],
        weight: confidence
      });
    }
  }

  // ─── DECAY — Forget unimportant things ───
  decay() {
    const now = Date.now();
    let forgotten = 0;

    for (const [id, node] of this.nodes) {
      const hoursSinceAccess = (now - node.lastAccessed) / (1000 * 60 * 60);
      node.weight *= Math.pow(1 - this.decayRate, hoursSinceAccess);

      if (node.weight < this.minWeight) {
        // Don't forget preferences or high-access nodes
        if (node.type !== 'preference' && node.accessCount < 5) {
          this.nodes.delete(id);
          forgotten++;
        }
      }
    }

    this._saveGraph();
    return { forgotten, remaining: this.nodes.size };
  }

  // ─── GET RELATED NODES ───
  getRelated(nodeId, depth = 1) {
    const visited = new Set();
    const result = [];

    const traverse = (id, d) => {
      if (d > depth || visited.has(id)) return;
      visited.add(id);
      const edges = this.edges.get(id) || [];
      for (const edge of edges) {
        const node = this.nodes.get(edge.to);
        if (node && !visited.has(edge.to)) {
          result.push({ ...node, relation: edge.relation, relationWeight: edge.weight });
          traverse(edge.to, d + 1);
        }
      }
    };

    traverse(nodeId, 0);
    return result.sort((a, b) => b.relationWeight - a.relationWeight);
  }

  // ─── CONSOLIDATE — Merge duplicate/similar nodes ───
  consolidate() {
    const contentMap = new Map();
    let merged = 0;

    for (const [id, node] of this.nodes) {
      const key = node.content.toLowerCase().trim().slice(0, 100);
      if (contentMap.has(key)) {
        const existing = contentMap.get(key);
        // Merge: keep the one with higher weight, combine access counts
        const keep = existing.weight > node.weight ? existing : node;
        const remove = keep === existing ? node : existing;
        keep.weight = Math.min(1.0, keep.weight + remove.weight * 0.3);
        keep.accessCount += remove.accessCount;
        keep.tags = [...new Set([...keep.tags, ...remove.tags])];
        this.nodes.delete(remove.id);
        merged++;
      } else {
        contentMap.set(key, node);
      }
    }

    this._saveGraph();
    return { merged, remaining: this.nodes.size };
  }

  // ─── SEARCH BY TIME RANGE ───
  getByTimeRange(start, end) {
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    return [...this.nodes.values()]
      .filter(n => n.created >= startTime && n.created <= endTime)
      .sort((a, b) => b.created - a.created);
  }

  // ─── GET STATS ───
  getStats() {
    const types = {};
    for (const node of this.nodes.values()) {
      types[node.type] = (types[node.type] || 0) + 1;
    }
    let totalEdges = 0;
    for (const edges of this.edges.values()) totalEdges += edges.length;

    return {
      totalNodes: this.nodes.size,
      totalEdges,
      types,
      indexSize: this.index.size,
      contextWindowSize: this.contextWindow.length,
      avgWeight: [...this.nodes.values()].reduce((s, n) => s + n.weight, 0) / Math.max(1, this.nodes.size)
    };
  }

  // ─── EXPORT / IMPORT ───
  export() {
    return {
      nodes: [...this.nodes.values()],
      edges: [...this.edges.values()].flat(),
      contextWindow: this.contextWindow,
      exportedAt: new Date().toISOString()
    };
  }

  import(data) {
    if (data.nodes) for (const n of data.nodes) this.nodes.set(n.id, n);
    if (data.edges) for (const e of data.edges) {
      if (!this.edges.has(e.from)) this.edges.set(e.from, []);
      this.edges.get(e.from).push(e);
    }
    this._rebuildIndex();
    this._saveGraph();
    return { imported: true, nodes: this.nodes.size };
  }

  // ─── PRIVATE HELPERS ───
  _tokenize(text) {
    return text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !this._stopWords.has(w));
  }

  _indexNode(id, node) {
    const tokens = this._tokenize(node.content + ' ' + node.tags.join(' '));
    for (const token of tokens) {
      if (!this.index.has(token)) this.index.set(token, new Set());
      this.index.get(token).add(id);
    }
  }

  _rebuildIndex() {
    this.index.clear();
    for (const [id, node] of this.nodes) this._indexNode(id, node);
  }

  _autoRelate(node) {
    // Find potentially related existing nodes
    const tokens = this._tokenize(node.content);
    const related = new Set();

    for (const token of tokens) {
      const ids = this.index.get(token) || new Set();
      for (const id of ids) {
        if (id !== node.id) related.add(id);
      }
    }

    // Create edges for top matches
    const candidates = [...related].slice(0, 5);
    for (const relId of candidates) {
      const relNode = this.nodes.get(relId);
      if (!relNode) continue;
      // Only relate if they share enough tokens
      const relTokens = this._tokenize(relNode.content);
      const overlap = tokens.filter(t => relTokens.includes(t)).length;
      if (overlap >= 2) {
        this.addEdge(node.id, relId, 'related_to', Math.min(1, overlap * 0.2));
      }
    }
  }

  _extractEntities(text) {
    const entities = [];
    // Simple entity extraction
    const patterns = [
      { regex: /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\b/g, type: 'person' },
      { regex: /\b(https?:\/\/[^\s]+)\b/g, type: 'url' },
      { regex: /\b([\w.-]+@[\w.-]+\.\w+)\b/g, type: 'email' },
      { regex: /\b(\d{4}-\d{2}-\d{2})\b/g, type: 'date' },
      { regex: /\b([A-Z][a-z]+(?:JS|Py|DB|API|SDK|CLI|GUI|AI|ML))\b/g, type: 'technology' }
    ];

    for (const { regex, type } of patterns) {
      let match;
      while ((match = regex.exec(text)) !== null) {
        if (match[1].length > 2) entities.push({ text: match[1], type });
      }
    }
    return entities;
  }

  _extractFacts(userMsg, assistantMsg) {
    const facts = [];
    // Extract statements of preference
    const prefPatterns = [
      /i (?:like|love|prefer|want|need|hate|dislike) (.+?)(?:\.|$)/gi,
      /my (\w+) is (.+?)(?:\.|$)/gi,
      /i'm working on (.+?)(?:\.|$)/gi,
      /i use (.+?)(?:\.|$)/gi
    ];

    for (const pattern of prefPatterns) {
      let match;
      while ((match = pattern.exec(userMsg)) !== null) {
        facts.push(match[0].trim());
      }
    }
    return facts;
  }

  _loadGraph() {
    try {
      const nodesFile = path.join(this.dataDir, 'nodes.json');
      const edgesFile = path.join(this.dataDir, 'edges.json');

      if (fs.existsSync(nodesFile)) {
        const nodes = JSON.parse(fs.readFileSync(nodesFile, 'utf8'));
        for (const n of nodes) this.nodes.set(n.id, n);
      }
      if (fs.existsSync(edgesFile)) {
        const edges = JSON.parse(fs.readFileSync(edgesFile, 'utf8'));
        for (const e of edges) {
          if (!this.edges.has(e.from)) this.edges.set(e.from, []);
          this.edges.get(e.from).push(e);
        }
      }
      this._rebuildIndex();
    } catch {}
  }

  _saveGraph() {
    try {
      fs.writeFileSync(path.join(this.dataDir, 'nodes.json'), JSON.stringify([...this.nodes.values()], null, 2));
      fs.writeFileSync(path.join(this.dataDir, 'edges.json'), JSON.stringify([...this.edges.values()].flat(), null, 2));
    } catch {}
  }

  get _stopWords() {
    return new Set(['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in', 'with', 'to', 'for', 'of', 'not', 'no', 'can', 'had', 'has', 'was', 'were', 'are', 'been', 'be', 'have', 'from', 'that', 'this', 'they', 'them', 'their', 'there', 'these', 'those', 'it', 'its', 'you', 'your', 'we', 'our', 'he', 'she', 'him', 'her', 'his', 'how', 'what', 'when', 'where', 'who', 'why', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'than', 'too', 'very', 'just', 'about', 'above', 'after', 'again', 'also', 'am', 'any', 'because', 'before', 'being', 'between', 'did', 'does', 'doing', 'down', 'during', 'each', 'further', 'get', 'got', 'if', 'into', 'let', 'like', 'make', 'many', 'me', 'might', 'much', 'must', 'my', 'now', 'only', 'org', 'out', 'over', 'own', 're', 'same', 'shall', 'should', 'so', 'still', 'take', 'then', 'through', 'under', 'until', 'up', 'very', 'way', 'well', 'while', 'will', 'would']);
  }
}

module.exports = ContextualBrain;
