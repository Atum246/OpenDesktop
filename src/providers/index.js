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
  },

  // ═══ ADDITIONAL PROVIDERS ═══

  replicate: {
    name: 'Replicate', baseUrl: 'https://api.replicate.com/v1',
    models: ['meta/llama-3.1-405b-instruct', 'mistralai/mixtral-8x22b-instruct', 'meta/llama-3.1-70b-instruct'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}`, 'Content-Type': 'application/json' }),
    isReplicate: true
  },
  anyscale: {
    name: 'Anyscale', baseUrl: 'https://api.endpoints.anyscale.com/v1',
    models: ['meta-llama/Meta-Llama-3.1-405B-Instruct', 'meta-llama/Meta-Llama-3.1-70B-Instruct', 'mistralai/Mixtral-8x22B-Instruct-v0.1'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}` })
  },
  lepton: {
    name: 'Lepton AI', baseUrl: 'https://api.lepton.ai/api/v1',
    models: ['llama3.1-405b', 'llama3.1-70b', 'mixtral-8x22b'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}` })
  },
  writer: {
    name: 'Writer', baseUrl: 'https://api.writer.com/v1',
    models: ['palmyra-x-004', 'palmyra-x-003', 'palmyra-large'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}` })
  },
  ai21: {
    name: 'AI21 Labs', baseUrl: 'https://api.ai21.com/studio/v1',
    models: ['jamba-1.5-large', 'jamba-1.5-mini', 'jamba-instruct'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}` })
  },
  huggingface: {
    name: 'HuggingFace Inference', baseUrl: 'https://api-inference.huggingface.co/models',
    models: ['meta-llama/Meta-Llama-3.1-405B-Instruct', 'mistralai/Mixtral-8x22B-Instruct-v0.1', 'google/gemma-2-27b-it'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}` }),
    isHuggingFace: true
  },
  deepinfra: {
    name: 'DeepInfra', baseUrl: 'https://api.deepinfra.com/v1/openai',
    models: ['meta-llama/Meta-Llama-3.1-405B-Instruct', 'mistralai/Mixtral-8x22B-Instruct', 'Qwen/Qwen2-72B-Instruct', 'google/gemma-2-27b-it'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}` })
  },
  novita: {
    name: 'Novita AI', baseUrl: 'https://api.novita.ai/v3/openai',
    models: ['meta-llama/llama-3.1-405b-instruct', 'mistralai/mixtral-8x22b-instruct', 'deepseek/deepseek-chat'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}` })
  },
  featherless: {
    name: 'Featherless AI', baseUrl: 'https://api.featherless.ai/v1',
    models: ['meta-llama/Meta-Llama-3.1-405B-Instruct', 'mistralai/Mixtral-8x22B-Instruct-v0.1'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}` })
  },
  chutes: {
    name: 'Chutes AI', baseUrl: 'https://api.chutes.ai/v1',
    models: ['meta-llama/llama-3.1-405b-instruct', 'mistralai/mixtral-8x22b-instruct'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}` })
  },
  centml: {
    name: 'CentML', baseUrl: 'https://api.centml.com/v1',
    models: ['meta-llama/llama-3.1-405b-instruct', 'mistralai/mixtral-8x22b-instruct'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}` })
  },
  openpipe: {
    name: 'OpenPipe', baseUrl: 'https://api.openpipe.ai/v1',
    models: ['openpipe/mistral-7b', 'openpipe/llama-3.1-8b'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}` })
  },
  infermatic: {
    name: 'Infermatic', baseUrl: 'https://api.infermatic.ai/v1',
    models: ['llama-3.1-405b', 'mixtral-8x22b', 'qwen2-72b'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}` })
  },

  // ═══ CHINESE PROVIDERS ═══
  yi: {
    name: '01.AI (Yi)', baseUrl: 'https://api.01.ai/v1',
    models: ['yi-large', 'yi-medium', 'yi-spark', 'yi-large-turbo'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}` })
  },
  moonshot: {
    name: 'Moonshot AI', baseUrl: 'https://api.moonshot.cn/v1',
    models: ['moonshot-v1-128k', 'moonshot-v1-32k', 'moonshot-v1-8k'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}` })
  },
  zhipu: {
    name: 'Zhipu AI (GLM)', baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: ['glm-4-plus', 'glm-4', 'glm-4-flash', 'glm-4v'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}` })
  },
  baidu: {
    name: 'Baidu (ERNIE)', baseUrl: 'https://aip.baidubce.com',
    models: ['ernie-4.0-8k', 'ernie-3.5-8k', 'ernie-speed-128k'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}` }),
    isBaidu: true
  },
  alibaba: {
    name: 'Alibaba (Qwen)', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: ['qwen-max', 'qwen-plus', 'qwen-turbo', 'qwen-vl-max', 'qwen-long'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}` })
  },
  minimax: {
    name: 'MiniMax', baseUrl: 'https://api.minimax.chat/v1',
    models: ['abab6.5s-chat', 'abab6.5-chat', 'abab5.5-chat'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}` })
  },
  baichuan: {
    name: 'Baichuan', baseUrl: 'https://api.baichuan-ai.com/v1',
    models: ['Baichuan4', 'Baichuan3-Turbo', 'Baichuan2-Turbo'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}` })
  },
  siliconflow: {
    name: 'SiliconFlow', baseUrl: 'https://api.siliconflow.cn/v1',
    models: ['Qwen/Qwen2-72B-Instruct', 'meta-llama/Meta-Llama-3.1-405B-Instruct', 'deepseek-ai/deepseek-v2-chat'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}` })
  },
  volcengine: {
    name: 'VolcEngine (Doubao)', baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    models: ['doubao-pro-128k', 'doubao-lite-128k', 'doubao-pro-32k'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}` })
  },

  // ═══ SPECIALIZED PROVIDERS ═══
  voyage: {
    name: 'Voyage AI (Embeddings)', baseUrl: 'https://api.voyageai.com/v1',
    models: ['voyage-large-2', 'voyage-code-2', 'voyage-2'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}` })
  },
  modal: {
    name: 'Modal', baseUrl: 'https://modal.com/api/v1',
    models: ['custom-endpoint'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}` })
  },
  runpod: {
    name: 'RunPod', baseUrl: 'https://api.runpod.ai/v2',
    models: ['custom-endpoint'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}` })
  },
  lambda: {
    name: 'Lambda Labs', baseUrl: 'https://api.lambdalabs.com/v1',
    models: ['llama-3.1-405b-instruct', 'llama-3.1-70b-instruct'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}` })
  },
  banana: {
    name: 'Banana', baseUrl: 'https://api.banana.dev/v1',
    models: ['custom-model'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}` })
  },
  mystic: {
    name: 'Mystic', baseUrl: 'https://api.mystic.ai/v1',
    models: ['custom-model'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}` })
  },
  baseten: {
    name: 'Baseten', baseUrl: 'https://app.baseten.co/api/v1',
    models: ['custom-model'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}` })
  },
  fireworks_deepseek: {
    name: 'Fireworks DeepSeek', baseUrl: 'https://api.fireworks.ai/inference/v1',
    models: ['accounts/fireworks/models/deepseek-coder-v2-instruct', 'accounts/fireworks/models/deepseek-v3'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}` })
  },
  nebius: {
    name: 'Nebius AI', baseUrl: 'https://api.studio.nebius.ai/v1',
    models: ['meta/Meta-Llama-3.1-405B-Instruct', 'mistralai/Mixtral-8x22B-Instruct'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}` })
  },
  upstage: {
    name: 'Upstage', baseUrl: 'https://api.upstage.ai/v1/solar',
    models: ['solar-1-mini-chat', 'solar-1-mini-128k'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}` })
  },
  cohere_embeddings: {
    name: 'Cohere Embeddings', baseUrl: 'https://api.cohere.ai/v1',
    models: ['embed-english-v3.0', 'embed-multilingual-v3.0'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}` })
  },
  jina: {
    name: 'Jina AI', baseUrl: 'https://api.jina.ai/v1',
    models: ['jina-embeddings-v2-base-en', 'jina-reranker-v2-base-multilingual'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}` })
  },
  elevenlabs: {
    name: 'ElevenLabs (TTS)', baseUrl: 'https://api.elevenlabs.io/v1',
    models: ['eleven_multilingual_v2', 'eleven_turbo_v2', 'eleven_monolingual_v1'],
    headers: (k) => ({ 'xi-api-key': k }),
    isElevenLabs: true
  },
  openai_tts: {
    name: 'OpenAI TTS', baseUrl: 'https://api.openai.com/v1',
    models: ['tts-1', 'tts-1-hd', 'tts-1-1106'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}` })
  },
  openai_whisper: {
    name: 'OpenAI Whisper (STT)', baseUrl: 'https://api.openai.com/v1',
    models: ['whisper-1'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}` })
  },
  openai_dalle: {
    name: 'OpenAI DALL-E (Images)', baseUrl: 'https://api.openai.com/v1',
    models: ['dall-e-3', 'dall-e-2'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}` })
  },
  stability: {
    name: 'Stability AI (Images)', baseUrl: 'https://api.stability.ai/v2beta',
    models: ['stable-diffusion-xl-1024-v1-0', 'stable-diffusion-v1-6'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}` })
  },
  replicate_images: {
    name: 'Replicate (Images)', baseUrl: 'https://api.replicate.com/v1',
    models: ['stability-ai/sdxl', 'black-forest-labs/flux-schnell'],
    headers: (k) => ({ 'Authorization': `Bearer ${k}` })
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
