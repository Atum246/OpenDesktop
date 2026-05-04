'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

// ═══════════════════════════════════════════════════════════════
//  CUSTOM AI MODEL BUILDER — Train, Fine-tune, Deploy 🧠🔬
// ═══════════════════════════════════════════════════════════════

class ModelTrainer {
  constructor(config, provider, memory) {
    this.config = config;
    this.provider = provider;
    this.memory = memory;
    this.modelsDir = path.join(os.homedir(), '.opendesktop', 'models');
    this.trainingDir = path.join(os.homedir(), '.opendesktop', 'training-data');
    this.versionHistory = [];
    if (!fs.existsSync(this.modelsDir)) fs.mkdirSync(this.modelsDir, { recursive: true });
    if (!fs.existsSync(this.trainingDir)) fs.mkdirSync(this.trainingDir, { recursive: true });
    this._loadHistory();
  }

  // ─── GENERATE TRAINING DATA FROM INTERACTIONS ───
  async generateTrainingData(task, options = {}) {
    const events = this.memory.getEvents({ limit: options.eventLimit || 500 });
    const corrections = this.memory.getEvents({ type: 'correction' });

    const trainingPairs = [];

    // Extract successful interactions
    for (const event of events) {
      if (event.type === 'chat' && event.user && event.assistant) {
        trainingPairs.push({
          input: event.user,
          output: event.assistant,
          quality: 'auto',
          source: 'interaction'
        });
      }
    }

    // Generate additional synthetic training data
    if (options.generateSynthetic !== false) {
      const synthetic = await this._generateSyntheticData(task, options.count || 50);
      trainingPairs.push(...synthetic);
    }

    // Format for training
    const formatted = trainingPairs.map(pair => ({
      instruction: pair.input,
      output: pair.output,
      source: pair.source
    }));

    const filename = `${task.replace(/\s+/g, '-').toLowerCase()}_${Date.now().toString(36)}.json`;
    const filepath = path.join(this.trainingDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(formatted, null, 2));

    return { task, examples: formatted.length, file: filepath, filename };
  }

  async _generateSyntheticData(task, count) {
    const response = await this.provider.chat(
      `Generate ${count} high-quality training examples for: "${task}"

Return as JSON array: [{"input": "user question or command", "output": "ideal AI response"}]
Make them diverse, covering edge cases, different phrasings, and various complexity levels.
Return ONLY the JSON array.`,
      { maxTokens: 8000 }
    );

    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      const data = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      return data.map(d => ({ ...d, quality: 'synthetic', source: 'generated' }));
    } catch {
      return [];
    }
  }

  // ─── FINE-TUNE VIA OLLAMA ───
  async fineTune(modelName, trainingFile, options = {}) {
    const trainingData = JSON.parse(fs.readFileSync(trainingFile, 'utf8'));

    // Create Modelfile for Ollama
    const systemPrompt = options.systemPrompt || `You are a specialized AI assistant trained for: ${options.task || 'general tasks'}. Be helpful, accurate, and concise.`;

    const modelfile = `FROM ${options.baseModel || 'llama3.1'}
SYSTEM "${systemPrompt}"
PARAMETER temperature ${options.temperature || 0.7}
PARAMETER num_ctx ${options.contextSize || 4096}

${trainingData.slice(0, 20).map(d => `TEMPLATE "{{ .System }}
User: {{ .Prompt }}
Assistant: {{ .Response }}"\n`).join('')}`;

    const modelfilePath = path.join(this.modelsDir, `${modelName}_Modelfile`);
    fs.writeFileSync(modelfilePath, modelfile);

    try {
      // Check if Ollama is available
      await this._exec('ollama --version', { timeout: 5000 });

      // Create the model
      const output = await this._exec(`ollama create ${modelName} -f "${modelfilePath}"`, { timeout: 300000 });

      const version = {
        name: modelName,
        version: (this.versionHistory.filter(v => v.name === modelName).length + 1),
        baseModel: options.baseModel || 'llama3.1',
        trainingExamples: trainingData.length,
        created: new Date().toISOString(),
        modelfile: modelfilePath,
        status: 'created'
      };

      this.versionHistory.push(version);
      this._saveHistory();

      return { success: true, model: modelName, version: version.version, output };
    } catch (err) {
      if (err.message.includes('not found') || err.message.includes('not recognized')) {
        return {
          success: false,
          error: 'Ollama not installed',
          suggestion: 'Install Ollama: curl -fsSL https://ollama.com/install.sh | sh',
          alternative: 'Use cloud training with /model-trainer cloud'
        };
      }
      return { success: false, error: err.message };
    }
  }

  // ─── EVALUATE MODEL ───
  async evaluate(modelName, testCases) {
    const results = [];

    for (const test of testCases) {
      try {
        const response = await this.provider.chat(test.input, {
          model: modelName,
          maxTokens: 1024
        });

        const score = this._scoreResponse(response, test.expected);
        results.push({
          input: test.input,
          expected: test.expected?.slice(0, 100),
          actual: response.slice(0, 200),
          score,
          passed: score >= 0.7
        });
      } catch (err) {
        results.push({ input: test.input, error: err.message, score: 0, passed: false });
      }
    }

    const avgScore = results.reduce((s, r) => s + r.score, 0) / results.length;
    const passRate = results.filter(r => r.passed).length / results.length;

    return {
      model: modelName,
      testCases: results.length,
      averageScore: Math.round(avgScore * 100),
      passRate: Math.round(passRate * 100),
      results
    };
  }

  _scoreResponse(actual, expected) {
    if (!expected) return 0.8; // No expected = partial score
    const actualLower = actual.toLowerCase();
    const expectedLower = expected.toLowerCase();

    // Simple keyword overlap scoring
    const expectedWords = new Set(expectedLower.split(/\s+/));
    const actualWords = new Set(actualLower.split(/\s+/));
    const overlap = [...expectedWords].filter(w => actualWords.has(w)).length;
    return Math.min(1, overlap / Math.max(1, expectedWords.size));
  }

  // ─── COMPARE MODELS ───
  async compareModels(models, testPrompt) {
    const results = [];

    for (const model of models) {
      const startTime = Date.now();
      try {
        const response = await this.provider.chat(testPrompt, { model, maxTokens: 1024 });
        const duration = Date.now() - startTime;

        results.push({
          model,
          response: response.slice(0, 500),
          duration,
          responseLength: response.length,
          tokensPerSecond: Math.round(response.length / (duration / 1000))
        });
      } catch (err) {
        results.push({ model, error: err.message, duration: Date.now() - startTime });
      }
    }

    return { testPrompt, results, comparedAt: new Date().toISOString() };
  }

  // ─── SUGGEST CLOUD HOSTING ───
  suggestHosting(modelSize) {
    const suggestions = [];

    // Free tier options
    suggestions.push({
      name: 'Ollama (Local)',
      cost: 'Free',
      pros: ['No cost', 'Full privacy', 'No internet needed'],
      cons: ['Uses local resources', 'Limited by hardware'],
      setup: 'curl -fsSL https://ollama.com/install.sh | sh',
      bestFor: 'Development and testing'
    });

    suggestions.push({
      name: 'Google Colab',
      cost: 'Free (limited)',
      pros: ['Free GPU', 'Easy setup', 'Jupyter notebooks'],
      cons: ['Session timeouts', 'Limited compute'],
      setup: 'Upload notebook to colab.research.google.com',
      bestFor: 'Training and experimentation'
    });

    suggestions.push({
      name: 'Hugging Face Spaces',
      cost: 'Free',
      pros: ['Free hosting', 'Easy deployment', 'Community'],
      cons: ['Limited compute', 'Public by default'],
      setup: 'Push model to huggingface.co',
      bestFor: 'Sharing and demo'
    });

    suggestions.push({
      name: 'Railway',
      cost: 'Free tier ($5 credit)',
      pros: ['Easy deploy', 'Custom domains', 'Persistent'],
      cons: ['Limited free tier'],
      setup: 'railway deploy',
      bestFor: 'Production deployment'
    });

    suggestions.push({
      name: 'Fly.io',
      cost: 'Free tier (3 shared VMs)',
      pros: ['Global edge', 'Persistent', 'GPU available'],
      cons: ['Complex setup'],
      setup: 'flyctl launch',
      bestFor: 'Production with low latency'
    });

    suggestions.push({
      name: 'Modal',
      cost: 'Free tier ($30/month credit)',
      pros: ['Serverless GPU', 'Pay per use', 'Fast cold start'],
      cons: ['Requires Python'],
      setup: 'pip install modal && modal deploy',
      bestFor: 'On-demand inference'
    });

    return {
      modelSize: modelSize || 'unknown',
      suggestions,
      recommendation: modelSize === 'small' ? 'Ollama (local) or HuggingFace Spaces' : 'Modal or Fly.io'
    };
  }

  // ─── EXPORT MODEL ───
  async exportModel(modelName, format = 'gguf') {
    const formats = {
      gguf: { ext: '.gguf', cmd: `ollama show ${modelName} --modelfile` },
      safetensors: { ext: '.safetensors', note: 'Export via HuggingFace transformers' },
      onnx: { ext: '.onnx', note: 'Export via optimum library' }
    };

    const fmt = formats[format];
    if (!fmt) return { error: `Unknown format: ${format}. Supported: ${Object.keys(formats).join(', ')}` };

    try {
      if (fmt.cmd) {
        const output = await this._exec(fmt.cmd, { timeout: 30000 });
        const exportPath = path.join(this.modelsDir, `${modelName}${fmt.ext}`);
        fs.writeFileSync(exportPath, output);
        return { success: true, path: exportPath, format };
      }
      return { success: false, note: fmt.note };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ─── VERSION HISTORY ───
  getVersionHistory(modelName) {
    if (modelName) return this.versionHistory.filter(v => v.name === modelName);
    return this.versionHistory;
  }

  _loadHistory() {
    try {
      const file = path.join(this.modelsDir, 'history.json');
      if (fs.existsSync(file)) this.versionHistory = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {}
  }

  _saveHistory() {
    try {
      fs.writeFileSync(path.join(this.modelsDir, 'history.json'), JSON.stringify(this.versionHistory, null, 2));
    } catch {}
  }

  _exec(cmd, options = {}) {
    return new Promise((resolve, reject) => {
      exec(cmd, { timeout: options.timeout || 60000, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
        if (err) reject(err);
        else resolve(stdout);
      });
    });
  }

  getTrainingFiles() {
    return fs.readdirSync(this.trainingDir).filter(f => f.endsWith('.json'));
  }
}

module.exports = ModelTrainer;
