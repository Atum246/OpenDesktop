'use strict';
const { exec, spawn } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════
//  VOICE COMMAND SYSTEM — Talk to OpenDesktop 🎤🗣️
// ═══════════════════════════════════════════════════════════════

class VoiceSystem {
  constructor(config, engine) {
    this.config = config;
    this.engine = engine;
    this.platform = os.platform();
    this.isListening = false;
    this.ttsEnabled = true;
    this.sttEnabled = true;
    this.voice = config.get('voice.voice', 'default');
    this.language = config.get('voice.language', 'en-US');
    this.wakeWord = config.get('voice.wakeWord', 'hey desktop');
    this.audioDir = path.join(os.homedir(), '.opendesktop', 'audio');
    if (!fs.existsSync(this.audioDir)) fs.mkdirSync(this.audioDir, { recursive: true });
  }

  async startListening() {
    this.isListening = true;
    return {
      listening: true,
      wakeWord: this.wakeWord,
      language: this.language,
      note: 'Voice listening active. Say the wake word to trigger.'
    };
  }

  stopListening() {
    this.isListening = false;
    return { listening: false };
  }

  async speak(text, options = {}) {
    if (!this.ttsEnabled) return { spoken: false, reason: 'TTS disabled' };

    try {
      switch (this.platform) {
        case 'darwin':
          await this._exec(`say -v ${options.voice || 'Samantha'} "${text.replace(/"/g, '\\"')}"`);
          break;
        case 'linux':
          // Try espeak, spd-say, or festival
          try {
            await this._exec(`spd-say "${text.replace(/"/g, '\\"')}"`);
          } catch {
            try {
              await this._exec(`espeak "${text.replace(/"/g, '\\"')}"`);
            } catch {
              await this._exec(`echo "${text.replace(/"/g, '\\"')}" | festival --tts 2>/dev/null`);
            }
          }
          break;
        case 'win32':
          await this._exec(`powershell -Command "Add-Type -AssemblyName System.Speech; $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer; $synth.Speak('${text.replace(/'/g, "''")}')"`);
          break;
      }
      return { spoken: true, text };
    } catch (err) {
      return { spoken: false, error: err.message };
    }
  }

  async transcribeAudio(audioPath) {
    // Use Whisper API or local transcription
    try {
      const provider = this.engine?.provider;
      if (provider?.providerName === 'openai' || provider?.providerName === 'openrouter') {
        const axios = require('axios');
        const FormData = require('form-data');
        const form = new FormData();
        form.append('file', fs.createReadStream(audioPath));
        form.append('model', 'whisper-1');
        form.append('language', this.language.split('-')[0]);

        const resp = await axios.post('https://api.openai.com/v1/audio/transcriptions', form, {
          headers: { ...form.getHeaders(), 'Authorization': `Bearer ${provider.apiKey}` }
        });
        return { text: resp.data.text, success: true };
      }
      return { error: 'Transcription requires OpenAI API key with Whisper access' };
    } catch (err) {
      return { error: `Transcription failed: ${err.message}` };
    }
  }

  async processVoiceCommand(audioInput) {
    const transcription = await this.transcribeAudio(audioInput);
    if (transcription.error) return transcription;

    const text = transcription.text.toLowerCase();
    if (text.includes(this.wakeWord.toLowerCase())) {
      const command = text.split(this.wakeWord.toLowerCase())[1]?.trim();
      if (command && this.engine) {
        const response = await this.engine.chat(command);
        await this.speak(response);
        return { command, response, executed: true };
      }
    }
    return { text: transcription.text, wakeWordDetected: false };
  }

  getVoices() {
    if (this.platform === 'darwin') {
      return this._exec('say -v ?').then(out => out.stdout.split('\n').filter(Boolean).map(line => {
        const parts = line.split(/\s+/);
        return { name: parts[0], language: parts[1] };
      }));
    }
    return [{ name: 'default', language: 'en-US' }];
  }

  _exec(cmd) {
    return new Promise((resolve, reject) => {
      exec(cmd, { timeout: 30000 }, (err, stdout, stderr) => {
        if (err) reject(err);
        else resolve({ stdout, stderr });
      });
    });
  }

  getStatus() { return { listening: this.isListening, tts: this.ttsEnabled, stt: this.sttEnabled, voice: this.voice, language: this.language, wakeWord: this.wakeWord }; }
  setVoice(v) { this.voice = v; this.config.set('voice.voice', v); }
  setLanguage(l) { this.language = l; this.config.set('voice.language', l); }
  setWakeWord(w) { this.wakeWord = w; this.config.set('voice.wakeWord', w); }
}

module.exports = VoiceSystem;
