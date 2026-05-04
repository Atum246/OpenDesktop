'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');

// ═══════════════════════════════════════════════════════════════
//  SKILL CREATOR — Create Tools & Skills On The Fly 🧩⚡
// ═══════════════════════════════════════════════════════════════

class SkillCreator {
  constructor(config) {
    this.config = config;
    this.skillsDir = path.join(os.homedir(), '.opendesktop', 'plugins');
    if (!fs.existsSync(this.skillsDir)) fs.mkdirSync(this.skillsDir, { recursive: true });
  }

  async createSkill(name, description, options = {}) {
    const skillDir = path.join(this.skillsDir, name);
    if (fs.existsSync(skillDir)) return { error: `Skill ${name} already exists` };
    fs.mkdirSync(skillDir, { recursive: true });

    const manifest = {
      name,
      version: options.version || '1.0.0',
      description,
      author: options.author || 'OpenDesktop User',
      main: 'index.js',
      commands: options.commands || [],
      triggers: options.triggers || [],
      permissions: options.permissions || ['read', 'write', 'execute'],
      tags: options.tags || [],
      created: new Date().toISOString()
    };

    fs.writeFileSync(path.join(skillDir, 'plugin.json'), JSON.stringify(manifest, null, 2));

    const boilerplate = `'use strict';

/**
 * ${name} — ${description}
 * Created by OpenDesktop Skill Creator
 * 
 * This skill can be triggered by commands or natural language.
 * 
 * Available hooks:
 *   - execute(params, engine) — Main execution
 *   - onMessage(message, engine) — When user sends a message
 *   - onScreen(screenshot, engine) — When screenshot is taken
 *   - onFileChange(path, engine) — When files change
 *   - onTimer(engine) — Periodic timer
 */

module.exports = {
  // Main execution handler
  async execute(params, engine) {
    const { command, args, context } = params;
    
    // Your skill logic here
    console.log('Executing ${name} with:', args);
    
    return {
      success: true,
      message: '${name} executed successfully',
      data: {}
    };
  },

  // Message handler (natural language triggers)
  async onMessage(message, engine) {
    // Check if this message is relevant to your skill
    const keywords = ${JSON.stringify(options.keywords || [name.toLowerCase()])};
    const isRelevant = keywords.some(kw => message.toLowerCase().includes(kw));
    
    if (isRelevant) {
      // Process the message
      return { handled: true, response: 'Handled by ${name}' };
    }
    return { handled: false };
  },

  // Screen analysis handler
  async onScreen(screenshot, engine) {
    return { handled: false };
  },

  // File change handler
  async onFileChange(filePath, engine) {
    return { handled: false };
  },

  // Periodic timer handler
  async onTimer(engine) {
    return { handled: false };
  }
};
`;

    fs.writeFileSync(path.join(skillDir, 'index.js'), boilerplate);

    // Create a README for the skill
    fs.writeFileSync(path.join(skillDir, 'README.md'), `# ${name}\n\n${description}\n\n## Commands\n\n${(options.commands || []).map(c => `- \`/${c}\``).join('\n') || 'No commands defined'}\n\n## Usage\n\n\`\`\`javascript\n// The skill is auto-loaded by OpenDesktop\n// Trigger via: /${name} or natural language\n\`\`\`\n`);

    return { created: true, name, path: skillDir, manifest };
  }

  async updateSkill(name, updates) {
    const skillDir = path.join(this.skillsDir, name);
    if (!fs.existsSync(skillDir)) return { error: `Skill ${name} not found` };

    const manifestPath = path.join(skillDir, 'plugin.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    Object.assign(manifest, updates, { updated: new Date().toISOString() });
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    return { updated: true, name, manifest };
  }

  async deleteSkill(name) {
    const skillDir = path.join(this.skillsDir, name);
    if (!fs.existsSync(skillDir)) return { error: `Skill ${name} not found` };
    fs.rmSync(skillDir, { recursive: true });
    return { deleted: true, name };
  }

  listSkills() {
    return fs.readdirSync(this.skillsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => {
        const manifestPath = path.join(this.skillsDir, d.name, 'plugin.json');
        if (fs.existsSync(manifestPath)) {
          return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        }
        return { name: d.name, incomplete: true };
      });
  }

  getSkill(name) {
    const skillDir = path.join(this.skillsDir, name);
    if (!fs.existsSync(skillDir)) return null;
    const manifestPath = path.join(skillDir, 'plugin.json');
    return fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : null;
  }

  // Generate a skill from natural language description
  async generateSkill(description) {
    // Parse the description to extract key info
    const nameMatch = description.match(/(?:called|named)\s+["']?(\w+)["']?/i);
    const name = nameMatch ? nameMatch[1] : `skill_${Date.now().toString(36)}`;
    
    const commands = [];
    const cmdMatches = description.matchAll(/(?:command|cmd|slash)\s+["']?\/?(\w+)["']?/gi);
    for (const match of cmdMatches) commands.push(match[1]);

    const keywords = [];
    const kwMatches = description.matchAll(/(?:trigger|keyword|when)\s+["']?(\w+)["']?/gi);
    for (const match of kwMatches) keywords.push(match[1]);

    return this.createSkill(name, description, { commands, keywords });
  }
}

module.exports = SkillCreator;
