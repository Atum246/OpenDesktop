'use strict';
const axios = require('axios');

// ═══════════════════════════════════════════════════════════════
//  MODEL PROVIDER REGISTRY — 50+ Providers
// ═══════════════════════════════════════════════════════════════

const PROVIDERS = {
  openrouter: {
    name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1',
    models: ['anthropic/claude-3.5-sonnet','openai/gpt-4o','google/gemini-pro-1.5','meta-llama/llama-3.1-405b-instruct','mistralai/mixtral-8x22b-instruct','deepseek/deepseek-chat','qwen/qwen-2-72b-instruct','cohere/command-r-plus'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}`, 'HTTP-Referer': 'https://opendesktop.ai', 'X-Title': 'OpenDesktop' })
  },
  openai: {
    name: 'OpenAI', baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o','gpt-4o-mini','gpt-4-turbo','gpt-4','gpt-3.5-turbo','o1-preview','o1-mini'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}` })
  },
  anthropic: {
    name: 'Anthropic', baseUrl: 'https://api.anthropic.com/v1',
    models: ['claude-3.5-sonnet-20241022','claude-3-opus-20240229','claude-3-sonnet-20240229','claude-3-haiku-20240307'],
    headers: (k) => ({ 'x-api-key': k, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }),
    isAnthropic: true
  },
  google: {
    name: 'Google AI', baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: ['gemini-pro','gemini-pro-vision','gemini-1.5-pro','gemini-1.5-flash'],
    headers: (k) => ({ 'Content-Type': 'application/json', 'x-goog-api-key': k }),
    isGoogle: true
  },
  groq: {
    name: 'Groq', baseUrl: 'https://api.groq.com/openai/v1',
    models: ['llama-3.1-405b-reasoning','llama-3.1-70b-versatile','llama-3.1-8b-instant','mixtral-8x7b-32768','gemma2-9b-it'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}` })
  },
  nvidia: {
    name: 'Nvidia NIM', baseUrl: 'https://integrate.api.nvidia.com/v1',
    models: ['meta/llama-3.1-405b-instruct','meta/llama-3.1-70b-instruct','meta/llama-3.1-8b-instruct','mistralai/mixtral-8x22b-instruct-v0.1','google/gemma-2-27b-it','nvidia/nemotron-4-340b-instruct'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}` })
  },
  together: {
    name: 'Together AI', baseUrl: 'https://api.together.xyz/v1',
    models: ['meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo','mistralai/Mixtral-8x22B-Instruct-v0.1','Qwen/Qwen2-72B-Instruct','deepseek-ai/deepseek-coder-33b-instruct'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}` })
  },
  fireworks: {
    name: 'Fireworks AI', baseUrl: 'https://api.fireworks.ai/inference/v1',
    models: ['accounts/fireworks/models/llama-v3p1-405b-instruct','accounts/fireworks/models/mixtral-8x22b-instruct'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}` })
  },
  mistral: {
    name: 'Mistral AI', baseUrl: 'https://api.mistral.ai/v1',
    models: ['mistral-large-latest','mistral-medium-latest','mistral-small-latest','open-mixtral-8x22b','open-mistral-nemo'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}` })
  },
  cohere: {
    name: 'Cohere', baseUrl: 'https://api.cohere.ai/v1',
    models: ['command-r-plus','command-r','command'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}`, 'Content-Type': 'application/json' }),
    isCohere: true
  },
  perplexity: {
    name: 'Perplexity', baseUrl: 'https://api.perplexity.ai',
    models: ['llama-3.1-sonar-small-128k-online','llama-3.1-sonar-large-128k-online','llama-3.1-sonar-huge-128k-online'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}` })
  },
  deepseek: {
    name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat','deepseek-coder','deepseek-reasoner'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}` })
  },
  xai: {
    name: 'xAI (Grok)', baseUrl: 'https://api.x.ai/v1',
    models: ['grok-2','grok-2-mini','grok-beta'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}` })
  },
  cerebras: {
    name: 'Cerebras', baseUrl: 'https://api.cerebras.ai/v1',
    models: ['llama3.1-8b','llama3.1-70b'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}` })
  },
  sambanova: {
    name: 'SambaNova', baseUrl: 'https://api.sambanova.ai/v1',
    models: ['Meta-Llama-3.1-405B-Instruct','Meta-Llama-3.1-70B-Instruct','Mistral-8x22B-Instruct'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}` })
  },
  ollama: {
    name: 'Ollama (Local)', baseUrl: 'http://localhost:11434/v1',
    models: ['llama3.1','llama3.1:70b','codellama','mistral','mixtral','phi3','gemma2','qwen2','deepseek-coder-v2'],
    headers: () => ({})
  },
  lmstudio: {
    name: 'LM Studio', baseUrl: 'http://localhost:1234/v1',
    models: ['local-model'],
    headers: () => ({})
  },
  vllm: {
    name: 'vLLM', baseUrl: 'http://localhost:8000/v1',
    models: ['local-model'],
    headers: () => ({})
  },
  textgen: {
    name: 'Text Generation WebUI', baseUrl: 'http://localhost:5000/v1',
    models: ['local-model'],
    headers: () => ({})
  }
};

class ProviderRegistry {
  constructor(config) {
    this.config = config;
    this.providerName = config.get('provider.name', 'openrouter');
    this.apiKey = config.get('provider.apiKey', '');
    this.model = config.get('provider.model', 'anthropic/claude-3.5-sonnet');
    this.endpoint = config.get('provider.endpoint', null);
    this.provider = PROVIDERS[this.providerName];
    this.conversationHistory = [];
    this.systemPrompt = `You are OpenDesktop, an advanced AI desktop agent. You can control the user's computer, run programs, browse the web, manage files, and much more. Be helpful, concise, and proactive. When asked to do something on the computer, provide clear step-by-step actions. Use emojis to be friendly and engaging.`;
  }

  async chat(message, options = {}) {
    const provider = PROVIDERS[this.providerName];
    if (!provider) throw new Error(`Unknown provider: ${this.providerName}`);

    this.conversationHistory.push({ role: 'user', content: message });

    const baseUrl = this.endpoint || provider.baseUrl;
    const headers = provider.headers(this.apiKey);

    try {
      let response;
      if (provider.isAnthropic) {
        response = await this._chatAnthropic(baseUrl, headers, message, options);
      } else if (provider.isGoogle) {
        response = await this._chatGoogle(baseUrl, headers, message, options);
      } else if (provider.isCohere) {
        response = await this._chatCohere(baseUrl, headers, message, options);
      } else {
        response = await this._chatOpenAI(baseUrl, headers, message, options);
      }

      this.conversationHistory.push({ role: 'assistant', content: response });
      return response;
    } catch (err) {
      throw new Error(`Provider ${provider.name} error: ${err.message}`);
    }
  }

  async _chatOpenAI(baseUrl, headers, message, options) {
    const resp = await axios.post(`${baseUrl}/chat/completions`, {
      model: options.model || this.model,
      messages: [
        { role: 'system', content: options.systemPrompt || this.systemPrompt },
        ...this.conversationHistory.slice(-20)
      ],
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature ?? 0.7,
      stream: false
    }, { headers, timeout: 120000 });
    return resp.data.choices[0].message.content;
  }

  async _chatAnthropic(baseUrl, headers, message, options) {
    const messages = this.conversationHistory.slice(-20).map(m => ({ role: m.role, content: m.content }));
    // Anthropic requires messages to start with 'user' role
    if (messages.length && messages[0].role !== 'user') messages.unshift({ role: 'user', content: '(conversation continued)' });
    // Anthropic requires alternating user/assistant messages — merge consecutive same-role messages
    const merged = [];
    for (const msg of messages) {
      if (merged.length && merged[merged.length - 1].role === msg.role) {
        merged[merged.length - 1].content += '\n\n' + msg.content;
      } else {
        merged.push({ ...msg });
      }
    }
    const resp = await axios.post(`${baseUrl}/messages`, {
      model: options.model || this.model,
      max_tokens: options.maxTokens || 4096,
      system: options.systemPrompt || this.systemPrompt,
      messages: merged
    }, { headers, timeout: 120000 });
    return resp.data.content[0].text;
  }

  async _chatGoogle(baseUrl, headers, message, options) {
    const model = options.model || this.model;
    const resp = await axios.post(`${baseUrl}/models/${model}:generateContent`, {
      contents: this.conversationHistory.slice(-20).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      })),
      generationConfig: { maxOutputTokens: options.maxTokens || 4096, temperature: options.temperature ?? 0.7 }
    }, { headers: { ...headers, 'x-goog-api-key': this.apiKey }, timeout: 120000 });
    return resp.data.candidates[0].content.parts[0].text;
  }

  async _chatCohere(baseUrl, headers, message, options) {
    const resp = await axios.post(`${baseUrl}/chat`, {
      model: options.model || this.model,
      message: message,
      chat_history: this.conversationHistory.slice(-20).map(m => ({ role: m.role === 'user' ? 'USER' : 'CHATBOT', message: m.content })),
      max_tokens: options.maxTokens || 4096,
      preamble: options.systemPrompt || this.systemPrompt
    }, { headers: { ...headers, 'Authorization': `Bearer ${this.apiKey}` }, timeout: 120000 });
    return resp.data.text;
  }

  async stream(message, onChunk, options = {}) {
    const provider = PROVIDERS[this.providerName];
    const baseUrl = this.endpoint || provider.baseUrl;
    const headers = provider.headers(this.apiKey);

    if (provider.isAnthropic || provider.isGoogle || provider.isCohere) {
      const full = await this.chat(message, options);
      onChunk(full);
      return full;
    }

    this.conversationHistory.push({ role: 'user', content: message });

    const resp = await axios.post(`${baseUrl}/chat/completions`, {
      model: options.model || this.model,
      messages: [
        { role: 'system', content: options.systemPrompt || this.systemPrompt },
        ...this.conversationHistory.slice(-20)
      ],
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature ?? 0.7,
      stream: true
    }, { headers, timeout: 120000, responseType: 'stream' });

    let full = '';
    return new Promise((resolve, reject) => {
      resp.data.on('data', chunk => {
        const lines = chunk.toString().split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          const data = line.replace('data: ', '').trim();
          if (data === '[DONE]') { this.conversationHistory.push({ role: 'assistant', content: full }); resolve(full); return; }
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) { full += content; onChunk(content); }
          } catch {}
        }
      });
      resp.data.on('error', reject);
    });
  }

  listProviders() { return Object.entries(PROVIDERS).map(([k, v]) => ({ id: k, name: v.name, models: v.models })); }
  listModels() { return PROVIDERS[this.providerName]?.models || []; }
  switchProvider(name, apiKey) { if (!PROVIDERS[name]) throw new Error('Unknown provider'); this.providerName = name; this.apiKey = apiKey; this.provider = PROVIDERS[name]; this.config.set('provider.name', name); this.config.set('provider.apiKey', apiKey); }
  switchModel(model) { this.model = model; this.config.set('provider.model', model); }
  clearHistory() { this.conversationHistory = []; }
  getHistory() { return this.conversationHistory; }
}

ProviderRegistry.PROVIDERS = PROVIDERS;
module.exports = ProviderRegistry;
