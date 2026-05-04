'use strict';

class ModelRouter {
  constructor(config) {
    this.config = config || {};
    this.routes = new Map([
      ['code', { model: 'gpt-4', reason: 'Code generation best with GPT-4' }],
      ['chat', { model: 'gpt-3.5-turbo', reason: 'Fast responses for chat' }],
      ['analysis', { model: 'claude-3-opus', reason: 'Deep analysis tasks' }],
      ['creative', { model: 'gpt-4', reason: 'Creative writing and brainstorming' }],
      ['research', { model: 'perplexity', reason: 'Research with web access' }],
      ['math', { model: 'gpt-4', reason: 'Mathematical reasoning' }],
      ['translation', { model: 'gpt-3.5-turbo', reason: 'Fast translation' }],
      ['vision', { model: 'gpt-4-vision', reason: 'Image understanding' }],
    ]);
  }

  route(taskDescription) {
    const desc = taskDescription.toLowerCase();
    let bestMatch = { model: 'gpt-4', category: 'default', reason: 'Default routing' };
    let bestScore = 0;

    for (const [category, route] of this.routes) {
      const keywords = {
        code: ['code', 'program', 'function', 'debug', 'script', 'api'],
        chat: ['chat', 'talk', 'conversation', 'message'],
        analysis: ['analyze', 'analysis', 'data', 'report', 'review'],
        creative: ['write', 'story', 'poem', 'creative', 'brainstorm'],
        research: ['research', 'search', 'find', 'information', 'study'],
        math: ['math', 'calculate', 'equation', 'number', 'formula'],
        translation: ['translate', 'language', 'french', 'spanish', 'chinese'],
        vision: ['image', 'picture', 'photo', 'visual', 'see'],
      };

      const words = keywords[category] || [];
      let score = 0;
      for (const word of words) {
        if (desc.includes(word)) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        bestMatch = { model: route.model, category, reason: route.reason };
      }
    }

    return { ...bestMatch, confidence: Math.min(bestScore * 25, 100), timestamp: Date.now() };
  }

  getStatus() {
    return { totalRoutes: this.routes.size, categories: [...this.routes.keys()] };
  }

  addRoute(category, model, reason) {
    this.routes.set(category, { model, reason });
    return { added: true, category };
  }
}

module.exports = ModelRouter;
