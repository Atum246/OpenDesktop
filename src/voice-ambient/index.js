/**
 * Voice-First Ambient Mode
 * 
 * Persistent voice interface with wake word detection, natural interruption
 * handling, voice-triggered workflows, and voice cloning.
 */

const EventEmitter = require('events');

class VoiceAmbient extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      wakeWord: config.wakeWord || 'hey desktop',
      language: config.language || 'en-US',
      continuousListening: config.continuousListening || false,
      silenceTimeout: config.silenceTimeout || 3000,
      voiceCloneEnabled: config.voiceCloneEnabled || false,
      ttsProvider: config.ttsProvider || 'system',
      sttProvider: config.sttProvider || 'whisper',
      noiseThreshold: config.noiseThreshold || 0.3,
      ...config
    };

    this.isListening = false;
    this.isProcessing = false;
    this.isSpeaking = false;
    this.conversationContext = [];
    this.voiceProfiles = new Map();
    this.activeVoice = 'default';
    this.audioBuffer = [];
    this.wakeWordDetector = null;
    this.ttsEngine = null;
    this.sttEngine = null;
    this.interruptCallback = null;
    this.conversationState = 'idle'; // idle, listening, processing, speaking
  }

  async initialize(ttsSystem, sttSystem) {
    this.ttsEngine = ttsSystem;
    this.sttEngine = sttSystem;

    this.emit('initialized', {
      wakeWord: this.config.wakeWord,
      language: this.config.language,
      voiceCloneEnabled: this.config.voiceCloneEnabled
    });

    return this;
  }

  /**
   * Start ambient listening mode.
   */
  async startAmbient() {
    if (this.isListening) return;

    this.isListening = true;
    this.conversationState = 'idle';

    this.emit('ambient_started', { wakeWord: this.config.wakeWord });

    // Start continuous listening if supported
    if (this.config.continuousListening) {
      this._startContinuousListening();
    }

    return { status: 'listening', wakeWord: this.config.wakeWord };
  }

  /**
   * Stop ambient listening.
   */
  async stopAmbient() {
    this.isListening = false;
    this.conversationState = 'idle';
    this.audioBuffer = [];

    this.emit('ambient_stopped');
    return { status: 'stopped' };
  }

  /**
   * Process incoming audio for wake word detection and commands.
   */
  async processAudio(audioData) {
    if (!this.isListening) return null;

    this.audioBuffer.push(audioData);

    // Check for wake word
    if (this.conversationState === 'idle') {
      const wakeDetected = await this._detectWakeWord(audioData);
      if (wakeDetected) {
        this.conversationState = 'listening';
        this.emit('wake_word_detected', { wakeWord: this.config.wakeWord });
        return { type: 'wake_detected' };
      }
      return null;
    }

    // In listening state — process for commands
    if (this.conversationState === 'listening') {
      const silence = this._detectSilence(audioData);
      
      if (silence && this.audioBuffer.length > 5) {
        // End of utterance — process
        this.conversationState = 'processing';
        const fullAudio = this._concatenateAudio(this.audioBuffer);
        this.audioBuffer = [];

        const transcription = await this._transcribe(fullAudio);
        
        if (transcription && transcription.text) {
          this.emit('command_received', {
            text: transcription.text,
            confidence: transcription.confidence,
            timestamp: Date.now()
          });

          return {
            type: 'command',
            text: transcription.text,
            confidence: transcription.confidence
          };
        }

        this.conversationState = 'idle';
      }
    }

    return null;
  }

  /**
   * Speak a response using TTS.
   */
  async speak(text, options = {}) {
    if (this.isSpeaking) {
      // Interrupt current speech
      await this.stopSpeaking();
    }

    this.isSpeaking = true;
    this.conversationState = 'speaking';

    const voice = options.voice || this.activeVoice;
    const emotion = options.emotion || 'neutral';

    this.emit('speaking_started', { text, voice, emotion });

    try {
      if (this.ttsEngine) {
        await this.ttsEngine.speak(text, {
          voice,
          emotion,
          speed: options.speed || 1.0,
          pitch: options.pitch || 1.0
        });
      }
    } catch (err) {
      this.emit('tts_error', err);
    }

    this.isSpeaking = false;
    this.conversationState = 'idle';

    // Record in conversation context
    this.conversationContext.push({
      role: 'assistant',
      text,
      timestamp: Date.now()
    });

    // Keep context bounded
    if (this.conversationContext.length > 20) {
      this.conversationContext = this.conversationContext.slice(-15);
    }

    this.emit('speaking_complete', { text });
  }

  /**
   * Stop current speech immediately.
   */
  async stopSpeaking() {
    if (this.ttsEngine && this.ttsEngine.stop) {
      await this.ttsEngine.stop();
    }
    this.isSpeaking = false;
    this.conversationState = 'idle';

    // Register interrupt callback
    if (this.interruptCallback) {
      this.interruptCallback();
      this.interruptCallback = null;
    }

    this.emit('speaking_interrupted');
  }

  /**
   * Handle natural interruption — user speaks while assistant is talking.
   */
  async handleInterruption(audioData) {
    if (!this.isSpeaking) return null;

    // Check if the audio is speech (not just noise)
    const isSpeech = await this._detectSpeech(audioData);
    if (!isSpeech) return null;

    // Stop current speech
    await this.stopSpeaking();

    // Process the interruption
    this.conversationState = 'processing';
    const transcription = await this._transcribe(audioData);

    if (transcription && transcription.text) {
      this.emit('interruption', {
        text: transcription.text,
        confidence: transcription.confidence
      });

      return {
        type: 'interruption',
        text: transcription.text,
        confidence: transcription.confidence
      };
    }

    this.conversationState = 'idle';
    return null;
  }

  /**
   * Set the active voice for TTS.
   */
  setVoice(voiceName) {
    if (this.voiceProfiles.has(voiceName) || voiceName === 'default') {
      this.activeVoice = voiceName;
      this.emit('voice_changed', { voice: voiceName });
      return { success: true, voice: voiceName };
    }
    return { success: false, error: `Voice '${voiceName}' not found` };
  }

  /**
   * Clone a voice from audio samples.
   */
  async cloneVoice(name, audioSamples) {
    if (!this.config.voiceCloneEnabled) {
      return { success: false, error: 'Voice cloning is disabled' };
    }

    const profile = {
      name,
      samples: audioSamples.length,
      createdAt: Date.now(),
      parameters: await this._extractVoiceParameters(audioSamples)
    };

    this.voiceProfiles.set(name, profile);
    this.emit('voice_cloned', { name });

    return { success: true, profile };
  }

  /**
   * Get available voices.
   */
  getVoices() {
    const voices = [{ name: 'default', type: 'system' }];
    for (const [name, profile] of this.voiceProfiles) {
      voices.push({ name, type: 'cloned', ...profile });
    }
    return voices;
  }

  /**
   * Get conversation history.
   */
  getConversationHistory(limit = 10) {
    return this.conversationContext.slice(-limit);
  }

  /**
   * Clear conversation context.
   */
  clearConversation() {
    this.conversationContext = [];
    this.emit('conversation_cleared');
  }

  /**
   * Get ambient mode status.
   */
  getStatus() {
    return {
      isListening: this.isListening,
      isSpeaking: this.isSpeaking,
      isProcessing: this.isProcessing,
      conversationState: this.conversationState,
      wakeWord: this.config.wakeWord,
      activeVoice: this.activeVoice,
      availableVoices: this.voiceProfiles.size + 1,
      conversationLength: this.conversationContext.length,
      audioBufferSize: this.audioBuffer.length
    };
  }

  /**
   * Register a voice-triggered workflow.
   */
  registerVoiceTrigger(triggerPhrase, workflow) {
    const trigger = {
      phrase: triggerPhrase.toLowerCase(),
      workflow,
      createdAt: Date.now(),
      hitCount: 0
    };

    this.emit('trigger_registered', { phrase: triggerPhrase });
    return trigger;
  }

  // ==================== PRIVATE METHODS ====================

  async _detectWakeWord(audioData) {
    if (!this.sttEngine) return false;

    try {
      const transcription = await this.sttEngine.transcribe(audioData, {
        language: this.config.language,
        model: 'small' // Use smaller model for wake word detection
      });

      if (transcription && transcription.text) {
        const text = transcription.text.toLowerCase().trim();
        return text.includes(this.config.wakeWord.toLowerCase());
      }
    } catch (e) {
      // Wake word detection failed silently
    }

    return false;
  }

  _detectSilence(audioData) {
    // Simple silence detection based on audio level
    if (!audioData || audioData.length === 0) return false;

    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      sum += Math.abs(audioData[i]);
    }
    const average = sum / audioData.length;
    return average < this.config.noiseThreshold;
  }

  async _detectSpeech(audioData) {
    // Simple speech detection — checks if audio has speech-like characteristics
    if (!audioData || audioData.length === 0) return false;

    let energy = 0;
    for (let i = 0; i < audioData.length; i++) {
      energy += audioData[i] * audioData[i];
    }
    energy /= audioData.length;

    return energy > this.config.noiseThreshold * 2;
  }

  async _transcribe(audioData) {
    if (!this.sttEngine) return null;

    try {
      return await this.sttEngine.transcribe(audioData, {
        language: this.config.language
      });
    } catch (err) {
      this.emit('transcription_error', err);
      return null;
    }
  }

  _concatenateAudio(buffers) {
    const totalLength = buffers.reduce((sum, buf) => sum + buf.length, 0);
    const result = new Float32Array(totalLength);
    let offset = 0;
    for (const buf of buffers) {
      result.set(buf, offset);
      offset += buf.length;
    }
    return result;
  }

  async _extractVoiceParameters(audioSamples) {
    // Extract voice characteristics from samples
    // In production, this would use a voice analysis model
    return {
      pitch: 1.0,
      speed: 1.0,
      timbre: 'neutral',
      sampleCount: audioSamples.length
    };
  }

  _startContinuousListening() {
    // This would integrate with the system's audio input
    this.emit('continuous_listening_active');
  }
}

module.exports = { VoiceAmbient };
