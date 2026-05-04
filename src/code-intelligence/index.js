'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');

// ═══════════════════════════════════════════════════════════════
//  CODE INTELLIGENCE — Doesn't Just Run Code, Understands It 💻🧠
//  Architecture analysis, debugging, refactoring, test generation, code review
// ═══════════════════════════════════════════════════════════════

class CodeIntelligence {
  constructor(config, provider, memory) {
    this.config = config;
    this.provider = provider;
    this.memory = memory;
    this.analysisCache = new Map();
    this.codebaseIndex = new Map(); // file -> { symbols, imports, exports, complexity }
  }

  // ─── ANALYZE CODEBASE ARCHITECTURE ───
  async analyzeCodebase(dirPath, options = {}) {
    const files = this._scanDirectory(dirPath);
    const analysis = {
      totalFiles: files.length,
      languages: {},
      structure: {},
      dependencies: new Set(),
      complexity: 0,
      issues: []
    };

    for (const file of files.slice(0, 100)) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const ext = path.extname(file);
        const lang = this._extToLanguage(ext);

        analysis.languages[lang] = (analysis.languages[lang] || 0) + 1;

        // Index the file
        const index = this._indexFile(file, content, lang);
        this.codebaseIndex.set(file, index);

        // Extract dependencies
        for (const dep of index.imports) {
          analysis.dependencies.add(dep);
        }

        analysis.complexity += index.complexity;
      } catch {}
    }

    analysis.dependencies = [...analysis.dependencies];

    // Generate high-level architecture description
    if (options.describe !== false) {
      analysis.description = await this._describeArchitecture(analysis, dirPath);
    }

    return analysis;
  }

  // ─── READ AND UNDERSTAND A FILE ───
  async understandFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const ext = path.extname(filePath);
    const lang = this._extToLanguage(ext);
    const index = this._indexFile(filePath, content, lang);

    const understanding = await this.provider.chat(
      `Analyze this ${lang} file and provide:
1. Purpose/role in the system
2. Key classes/functions and what they do
3. Dependencies and what they're used for
4. Data flow (inputs → processing → outputs)
5. Potential issues or improvements
6. How it connects to other parts of the system

File: ${filePath}
\`\`\`${lang}
${content.slice(0, 6000)}
\`\`\``,
      { maxTokens: 2000 }
    );

    return { file: filePath, language: lang, index, understanding };
  }

  // ─── DEBUG BY READING STACK TRACES ───
  async debugError(error, context = {}) {
    const analysis = await this.provider.chat(
      `Debug this error:

Error: ${error}
${context.stack ? `Stack trace:\n${context.stack}` : ''}
${context.file ? `File: ${context.file}` : ''}
${context.code ? `Relevant code:\n\`\`\`\n${context.code}\n\`\`\`` : ''}

Provide:
1. Root cause analysis
2. Why this error occurs
3. Step-by-step fix
4. Code changes needed
5. How to prevent this in the future
6. Related issues to check`,
      { maxTokens: 2000 }
    );

    return { error, analysis, timestamp: new Date().toISOString() };
  }

  // ─── SEMANTIC REFACTORING ───
  async refactor(filePath, goal, options = {}) {
    const content = fs.readFileSync(filePath, 'utf8');
    const ext = path.extname(filePath);
    const lang = this._extToLanguage(ext);

    const result = await this.provider.chat(
      `Refactor this ${lang} code. Goal: ${goal}

Current code:
\`\`\`${lang}
${content}
\`\`\`

Requirements:
1. Keep all existing functionality
2. ${goal}
3. Improve code quality
4. Add helpful comments

Return the COMPLETE refactored code in a code block.`,
      { maxTokens: 8000 }
    );

    const codeMatch = result.match(/```(?:\w+)?\n([\s\S]*?)```/);
    const refactored = codeMatch ? codeMatch[1].trim() : null;

    if (refactored && options.apply) {
      // Backup and apply
      const backup = filePath + '.bak';
      fs.copyFileSync(filePath, backup);
      fs.writeFileSync(filePath, refactored);
      return { applied: true, file: filePath, backup, changes: this._diff(content, refactored) };
    }

    return { file: filePath, goal, refactoredCode: refactored, analysis: result };
  }

  // ─── GENERATE TESTS ───
  async generateTests(filePath, options = {}) {
    const content = fs.readFileSync(filePath, 'utf8');
    const ext = path.extname(filePath);
    const lang = this._extToLanguage(ext);
    const framework = options.framework || 'jest';

    const result = await this.provider.chat(
      `Generate comprehensive tests for this ${lang} file using ${framework}.

File: ${path.basename(filePath)}
\`\`\`${lang}
${content}
\`\`\`

Generate tests that cover:
1. Happy path (normal operation)
2. Edge cases (empty input, null, boundary values)
3. Error handling (invalid input, failures)
4. Integration points
5. Performance considerations

Return ONLY the test code in a code block.`,
      { maxTokens: 6000 }
    );

    const codeMatch = result.match(/```(?:\w+)?\n([\s\S]*?)```/);
    const testCode = codeMatch ? codeMatch[1].trim() : null;

    if (testCode && options.save) {
      const testFile = filePath.replace(ext, `.test${ext}`);
      fs.writeFileSync(testFile, testCode);
      return { saved: true, testFile, testCode };
    }

    return { file: filePath, testCode, framework };
  }

  // ─── CODE REVIEW ───
  async reviewCode(filePath, options = {}) {
    const content = fs.readFileSync(filePath, 'utf8');
    const ext = path.extname(filePath);
    const lang = this._extToLanguage(ext);

    const result = await this.provider.chat(
      `Perform a thorough code review of this ${lang} file.

File: ${path.basename(filePath)}
\`\`\`${lang}
${content}
\`\`\`

Review for:
1. 🐛 Bugs and logic errors
2. 🔒 Security vulnerabilities
3. ⚡ Performance issues
4. 📖 Code readability and maintainability
5. 🏗️ Architecture and design patterns
6. ✅ Best practices compliance
7. 🧪 Test coverage gaps
8. 📝 Documentation quality

Rate each area 1-10 and provide specific, actionable feedback with line references where possible.`,
      { maxTokens: 3000 }
    );

    return { file: filePath, language: lang, review: result, timestamp: new Date().toISOString() };
  }

  // ─── EXPLAIN CODE ───
  async explainCode(code, language, level = 'intermediate') {
    const result = await this.provider.chat(
      `Explain this ${language || 'code'} at a ${level} level:

\`\`\`
${code}
\`\`\`

${level === 'beginner' ? 'Use simple language, explain every concept, avoid jargon.' : ''}
${level === 'intermediate' ? 'Focus on patterns, design decisions, and practical implications.' : ''}
${level === 'advanced' ? 'Discuss performance, edge cases, architectural implications, and alternatives.' : ''}`,
      { maxTokens: 1500 }
    );

    return { code: code.slice(0, 200), language, level, explanation: result };
  }

  // ─── FIND SIMILAR CODE ───
  async findSimilar(codeSnippet, dirPath) {
    const files = this._scanDirectory(dirPath);
    const results = [];

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const similarity = this._calculateSimilarity(codeSnippet, content);
        if (similarity > 0.3) {
          results.push({ file, similarity, excerpt: content.slice(0, 200) });
        }
      } catch {}
    }

    return results.sort((a, b) => b.similarity - a.similarity).slice(0, 10);
  }

  // ─── SUGGEST FIXES ───
  async suggestFix(errorMessage, code, language) {
    const result = await this.provider.chat(
      `This ${language} code has an error. Suggest a fix.

Error: ${errorMessage}

Code:
\`\`\`${language}
${code}
\`\`\`

Provide:
1. The exact fix
2. Explanation of why the error occurred
3. The corrected code in a code block`,
      { maxTokens: 2000 }
    );

    const codeMatch = result.match(/```(?:\w+)?\n([\s\S]*?)```/);
    return { error: errorMessage, fix: result, fixedCode: codeMatch?.[1]?.trim() };
  }

  // ─── PRIVATE HELPERS ───
  _scanDirectory(dir, maxDepth = 5, currentDepth = 0) {
    if (currentDepth >= maxDepth) return [];
    const files = [];
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === '__pycache__') continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...this._scanDirectory(fullPath, maxDepth, currentDepth + 1));
        } else if (this._isCodeFile(entry.name)) {
          files.push(fullPath);
        }
      }
    } catch {}
    return files;
  }

  _isCodeFile(filename) {
    const codeExts = ['.js', '.ts', '.py', '.rb', '.go', '.rs', '.java', '.c', '.cpp', '.h', '.cs', '.php', '.swift', '.kt', '.scala', '.lua', '.sh', '.bash', '.zsh', '.fish', '.ps1', '.r', '.jl', '.ex', '.erl', '.hs', '.clj', '.dart', '.zig', '.nim', '.cr', '.v', '.odin'];
    return codeExts.includes(path.extname(filename).toLowerCase());
  }

  _indexFile(filepath, content, language) {
    const lines = content.split('\n');
    const imports = [];
    const exports = [];
    const symbols = [];
    let complexity = 0;

    // Extract imports
    const importPatterns = [
      /require\(['"]([^'"]+)['"]\)/g,
      /import\s+.*?from\s+['"]([^'"]+)['"]/g,
      /from\s+(\S+)\s+import/g,
      /#include\s+[<"]([^>"]+)[>"]/g
    ];

    for (const pattern of importPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        imports.push(match[1]);
      }
    }

    // Extract function/class names
    const symbolPatterns = [
      /(?:async\s+)?(?:function|class|const|let|var)\s+(\w+)/g,
      /def\s+(\w+)/g,
      /fn\s+(\w+)/g,
      /func\s+(\w+)/g
    ];

    for (const pattern of symbolPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        symbols.push(match[1]);
      }
    }

    // Calculate complexity
    complexity += (content.match(/if\s*\(|else\s+if|switch\s*\(|case\s+/g) || []).length * 2;
    complexity += (content.match(/for\s*\(|while\s*\(|\.forEach|\.map\(/g) || []).length * 3;
    complexity += (content.match(/try\s*\{|catch\s*\(/g) || []).length;
    complexity += (content.match(/async\s+/g) || []).length;

    return { imports, exports, symbols, complexity, lineCount: lines.length, language };
  }

  _extToLanguage(ext) {
    const map = { '.js': 'javascript', '.ts': 'typescript', '.py': 'python', '.rb': 'ruby', '.go': 'go', '.rs': 'rust', '.java': 'java', '.c': 'c', '.cpp': 'cpp', '.cs': 'csharp', '.php': 'php', '.swift': 'swift', '.kt': 'kotlin', '.sh': 'bash', '.r': 'r', '.lua': 'lua' };
    return map[ext] || 'unknown';
  }

  _calculateSimilarity(a, b) {
    const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
    const union = new Set([...wordsA, ...wordsB]).size;
    return union > 0 ? intersection / union : 0;
  }

  _diff(original, modified) {
    const origLines = original.split('\n');
    const modLines = modified.split('\n');
    return {
      originalLines: origLines.length,
      modifiedLines: modLines.length,
      linesChanged: Math.abs(origLines.length - modLines.length)
    };
  }

  async _describeArchitecture(analysis, dirPath) {
    const topLangs = Object.entries(analysis.languages).sort((a, b) => b[1] - a[1]).slice(0, 3);
    return await this.provider.chat(
      `Describe the architecture of this codebase:
- Directory: ${dirPath}
- Files: ${analysis.totalFiles}
- Languages: ${topLangs.map(([l, c]) => `${l}(${c})`).join(', ')}
- Dependencies: ${analysis.dependencies.slice(0, 20).join(', ')}
- Total complexity: ${analysis.complexity}

Provide a concise architectural overview.`,
      { maxTokens: 500 }
    );
  }

  // ─── STATUS ───
  getStatus() {
    return {
      filesIndexed: this.codebaseIndex.size,
      cacheSize: this.analysisCache.size,
      totalComplexity: [...this.codebaseIndex.values()].reduce((s, i) => s + i.complexity, 0)
    };
  }
}

module.exports = CodeIntelligence;
