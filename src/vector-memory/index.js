'use strict';

class VectorMemory {
  constructor(config) {
    this.config = config || {};
    this.vectors = new Map();
    this.nextId = 1;
  }

  add(text, metadata = {}) {
    const id = `vec_${this.nextId++}`;
    const embedding = this._embed(text);
    this.vectors.set(id, { id, text, embedding, metadata, timestamp: Date.now() });
    return { id, added: true };
  }

  search(query, limit = 10) {
    const queryEmbedding = this._embed(query);
    const results = [];
    for (const [id, entry] of this.vectors) {
      const score = this._cosineSimilarity(queryEmbedding, entry.embedding);
      results.push({ id, text: entry.text, score, metadata: entry.metadata });
    }
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  remove(id) {
    return { removed: this.vectors.delete(id) };
  }

  getStatus() {
    return { totalVectors: this.vectors.size, nextId: this.nextId };
  }

  _embed(text) {
    const words = text.toLowerCase().split(/\W+/).filter(Boolean);
    const vec = new Array(64).fill(0);
    for (const word of words) {
      let hash = 0;
      for (let i = 0; i < word.length; i++) {
        hash = ((hash << 5) - hash + word.charCodeAt(i)) | 0;
      }
      vec[Math.abs(hash) % 64] += 1;
    }
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
    return vec.map(v => v / norm);
  }

  _cosineSimilarity(a, b) {
    let dot = 0;
    for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
    return dot;
  }
}

module.exports = VectorMemory;
