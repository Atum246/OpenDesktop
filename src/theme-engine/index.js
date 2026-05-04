'use strict';

class ThemeEngine {
  constructor(config) {
    this.config = config || {};
    this.themes = new Map([
      ['hacker-red', {
        name: 'Hacker Red', description: 'Classic hacker terminal with red accents',
        colors: { primary: '#FF0000', secondary: '#00FFFF', bg: '#0a0a0a', text: '#00FF41' }
      }],
      ['matrix', {
        name: 'Matrix', description: 'Green on black matrix style',
        colors: { primary: '#00FF41', secondary: '#003300', bg: '#000000', text: '#00FF41' }
      }],
      ['cyberpunk', {
        name: 'Cyberpunk', description: 'Neon purple and cyan cyberpunk',
        colors: { primary: '#FF00FF', secondary: '#00FFFF', bg: '#1a0a2e', text: '#E0E0E0' }
      }],
      ['minimal', {
        name: 'Minimal', description: 'Clean minimal dark theme',
        colors: { primary: '#FFFFFF', secondary: '#888888', bg: '#1a1a1a', text: '#CCCCCC' }
      }],
      ['vaporwave', {
        name: 'Vaporwave', description: 'Retro vaporwave aesthetics',
        colors: { primary: '#FF71CE', secondary: '#01CDFE', bg: '#2B1055', text: '#B967FF' }
      }],
    ]);
    this.activeTheme = this.config.get('theme', 'hacker-red');
  }

  listThemes() {
    const list = [];
    for (const [id, theme] of this.themes) {
      list.push({ id, name: theme.name, description: theme.description, active: id === this.activeTheme });
    }
    return list;
  }

  getTheme(name) {
    return this.themes.get(name) || null;
  }

  setActive(name) {
    if (!this.themes.has(name)) return { error: `Theme "${name}" not found` };
    this.activeTheme = name;
    this.config.set('theme', name);
    return { active: name, theme: this.themes.get(name) };
  }

  createTheme(name, colors) {
    if (this.themes.has(name)) return { error: 'Theme already exists' };
    const theme = {
      name: name.charAt(0).toUpperCase() + name.slice(1),
      description: `Custom theme: ${name}`,
      colors: {
        primary: colors.primary || '#00FF41',
        secondary: colors.secondary || '#00FFFF',
        bg: colors.bg || '#0a0a0a',
        text: colors.text || '#CCCCCC'
      }
    };
    this.themes.set(name, theme);
    return { created: true, theme };
  }

  getStatus() {
    return { activeTheme: this.activeTheme, totalThemes: this.themes.size };
  }
}

module.exports = ThemeEngine;
