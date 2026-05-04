/**
 * Conversational Interface
 * 
 * Makes talking to OpenDesktop feel like talking to a real person.
 * Detects intent from natural language, executes actions proactively,
 * formats responses conversationally, handles follow-ups, remembers context.
 */

const EventEmitter = require('events');

class ConversationalInterface extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      maxHistory: config.maxHistory || 50,
      proactiveActions: config.proactiveActions !== false,
      ...config
    };

    this.conversationHistory = [];
    this.pendingActions = [];
    this.lastTopic = null;
    this.userMood = 'neutral'; // neutral, frustrated, happy, rushed, curious
    this.conversationStyle = 'balanced'; // concise, balanced, detailed
    this.moodHistory = [];
  }

  async initialize(engine) {
    this.engine = engine;
    this.emit('initialized');
    return this;
  }

  /**
   * Process a user message — understand intent, detect actions, generate response.
   * This is the main entry point that replaces raw provider.chat().
   */
  async processMessage(userMessage) {
    const startTime = Date.now();

    // 1. Analyze the message
    const analysis = this._analyzeMessage(userMessage);

    // 2. Update conversation context
    this._updateContext(userMessage, analysis);

    // 3. Detect mood
    this._detectMood(userMessage);

    // 4. Build enhanced system prompt
    const systemPrompt = this._buildConversationalPrompt(analysis);

    // 5. Get AI response
    let response;
    try {
      response = await this.engine.provider.chat(userMessage, { systemPrompt });
    } catch (err) {
      return this._handleError(err, userMessage);
    }

    // 6. Detect if response should trigger actions
    const actions = this._detectActions(userMessage, response, analysis);

    // 7. Execute actions if any
    let actionResults = [];
    if (actions.length > 0 && this.config.proactiveActions) {
      actionResults = await this._executeActions(actions);
    }

    // 8. Format the response naturally
    const formattedResponse = this._formatResponse(response, actionResults, analysis);

    // 9. Store in history
    this._addToHistory(userMessage, formattedResponse, analysis, actions);

    // 10. Track
    const duration = Date.now() - startTime;
    this.emit('message_processed', {
      input: userMessage,
      output: formattedResponse,
      actions: actions.length,
      duration,
      mood: this.userMood
    });

    return {
      text: formattedResponse,
      actions,
      actionResults,
      mood: this.userMood,
      duration
    };
  }

  /**
   * Get a natural greeting based on time and context.
   */
  getGreeting() {
    const hour = new Date().getHours();
    const name = this.engine.userName || '';
    const aiName = this.engine.aiName || 'OpenDesktop';

    let timeGreeting;
    if (hour < 6) timeGreeting = "It's late";
    else if (hour < 12) timeGreeting = 'Good morning';
    else if (hour < 17) timeGreeting = 'Good afternoon';
    else if (hour < 21) timeGreeting = 'Good evening';
    else timeGreeting = "It's getting late";

    const greetings = [
      `${timeGreeting}${name ? ', ' + name : ''}. I'm ${aiName}. What are we working on?`,
      `Hey${name ? ' ' + name : ''}! ${timeGreeting}. What's up?`,
      `${timeGreeting}${name ? ' ' + name : ''}. Ready when you are.`,
      `Yo${name ? ' ' + name : ''}! ${timeGreeting}. What do you need?`,
    ];

    // Pick based on context
    if (this.userMood === 'rushed') {
      return `Hey${name ? ' ' + name : ''}. What do you need?`;
    }
    if (this.conversationHistory.length > 0) {
      const lastTime = this.conversationHistory[this.conversationHistory.length - 1].timestamp;
      const hoursSince = (Date.now() - lastTime) / 3600000;
      if (hoursSince > 8) {
        return `Welcome back${name ? ' ' + name : ''}! It's been a while. What are we doing?`;
      }
      if (hoursSince > 1) {
        return `Hey again${name ? ' ' + name : ''}! What's next?`;
      }
    }

    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  /**
   * Get a natural farewell.
   */
  getFarewell() {
    const name = this.engine.userName || '';
    const farewells = [
      `Later${name ? ' ' + name : ''}. I'll be here when you need me.`,
      `Catch you later${name ? ' ' + name : ''}!`,
      `Bye${name ? ' ' + name : ''}. Don't be a stranger.`,
      `Peace${name ? ' ' + name : ''}. You know where to find me.`,
    ];
    return farewells[Math.floor(Math.random() * farewells.length)];
  }

  /**
   * Get conversation statistics.
   */
  getStats() {
    return {
      totalMessages: this.conversationHistory.length,
      userMessages: this.conversationHistory.filter(h => h.role === 'user').length,
      actionsExecuted: this.conversationHistory.reduce((sum, h) => sum + (h.actions?.length || 0), 0),
      currentMood: this.userMood,
      conversationStyle: this.conversationStyle,
      lastTopic: this.lastTopic
    };
  }

  // ==================== PRIVATE METHODS ====================

  _analyzeMessage(message) {
    const msgLower = message.toLowerCase().trim();
    const analysis = {
      intent: 'general',
      isQuestion: false,
      isCommand: false,
      isFollowUp: false,
      isGreeting: false,
      isFarewell: false,
      topic: null,
      entities: [],
      urgency: 'normal'
    };

    // Detect intent
    if (msgLower.match(/^(hi|hey|hello|yo|sup|what's up|howdy|greetings)/)) {
      analysis.intent = 'greeting';
      analysis.isGreeting = true;
    } else if (msgLower.match(/^(bye|goodbye|see ya|later|peace|cya|gotta go)/)) {
      analysis.intent = 'farewell';
      analysis.isFarewell = true;
    } else if (msgLower.match(/^(what|how|why|when|where|who|can you|could you|is there|are there|do you)/)) {
      analysis.isQuestion = true;
      analysis.intent = 'question';
    } else if (msgLower.match(/^(run|execute|open|start|stop|kill|install|deploy|build|create|make|write|send|post|find|search|show|list|get|check|test|fix|update|delete|remove|move|copy)/)) {
      analysis.isCommand = true;
      analysis.intent = 'command';
    }

    // Detect follow-up
    if (msgLower.match(/^(and|also|then|after that|next|now|ok|okay|sure|yes|yeah|yep|no|nope|but|however)/)) {
      analysis.isFollowUp = true;
    }

    // Detect urgency
    if (msgLower.match(/(urgent|asap|now|immediately|quick|hurry|fast)/)) {
      analysis.urgency = 'high';
    }

    // Detect topic
    const topicPatterns = {
      'code': /(\.js|\.py|\.ts|code|programming|function|bug|error|debug|compile|syntax)/,
      'file': /(file|folder|directory|path|document|read|write|save)/,
      'web': /(search|browse|website|url|google|look up|find out)/,
      'system': /(system|process|memory|cpu|disk|network|performance)/,
      'deploy': /(deploy|build|ship|release|publish|production)/,
      'research': /(research|analyze|investigate|study|learn|understand)/,
      'automate': /(automate|schedule|cron|repeat|workflow|routine)/,
      'chat': /(feel|think|opinion|what do you|tell me about)/
    };

    for (const [topic, pattern] of Object.entries(topicPatterns)) {
      if (pattern.test(msgLower)) {
        analysis.topic = topic;
        break;
      }
    }

    // Detect follow-up to previous topic
    if (analysis.isFollowUp && this.lastTopic) {
      analysis.topic = this.lastTopic;
    }

    return analysis;
  }

  _updateContext(message, analysis) {
    if (analysis.topic) {
      this.lastTopic = analysis.topic;
    }
  }

  _detectMood(message) {
    const msgLower = message.toLowerCase();

    if (msgLower.match(/(frustrated|annoyed|angry|wtf|damn|broken|doesn't work|not working|keeps failing|useless)/)) {
      this.userMood = 'frustrated';
    } else if (msgLower.match(/(thanks|thank you|awesome|great|perfect|nice|excellent|amazing|love it|cool)/)) {
      this.userMood = 'happy';
    } else if (msgLower.match(/(quick|fast|hurry|asap|urgent|now|don't have time)/)) {
      this.userMood = 'rushed';
    } else if (msgLower.match(/(how does|why does|what is|explain|tell me|curious|interesting|wonder)/)) {
      this.userMood = 'curious';
    } else {
      this.userMood = 'neutral';
    }

    this.moodHistory.push({ mood: this.userMood, timestamp: Date.now() });
    if (this.moodHistory.length > 20) this.moodHistory = this.moodHistory.slice(-10);
  }

  _buildConversationalPrompt(analysis) {
    const name = this.engine.userName || '';
    const aiName = this.engine.aiName || 'OpenDesktop';
    const context = this.engine.buildContext ? this.engine.buildContext() : '';

    // Base personality
    let prompt = `You are ${aiName}, a highly capable AI desktop agent. You're talking to ${name || 'the user'}.

CORE PERSONALITY:
- You talk like a real person, not a corporate chatbot
- You're direct, competent, and slightly witty
- You don't use filler phrases like "Great question!" or "I'd be happy to help!"
- You get straight to the point
- You use natural language contractions (you're, don't, I'll, etc.)
- You can disagree, have opinions, and make jokes
- You admit when you don't know something
- You proactively suggest things when relevant

RESPONSE STYLE:
- Short messages for simple things, longer for complex topics
- Don't explain what you're about to do — just do it
- Don't apologize unless you actually messed up
- Match the user's energy — if they're casual, be casual; if they're serious, be serious
- Use line breaks for readability, not walls of text`;

    // Mood-specific adjustments
    if (this.userMood === 'frustrated') {
      prompt += `\n\nThe user seems frustrated. Be empathetic but not patronizing. Focus on solving the problem. Skip pleasantries.`;
    } else if (this.userMood === 'rushed') {
      prompt += `\n\nThe user is in a hurry. Be extra concise. Give the answer first, explain later if needed.`;
    } else if (this.userMood === 'curious') {
      prompt += `\n\nThe user is curious and wants to learn. Be informative but not lecture-y. Use examples.`;
    }

    // Intent-specific adjustments
    if (analysis.isCommand) {
      prompt += `\n\nThe user wants you to DO something. Execute it. Report the result. Don't ask unnecessary confirmation questions for safe operations.`;
    }
    if (analysis.isFollowUp && this.lastTopic) {
      prompt += `\n\nThis is a follow-up about ${this.lastTopic}. Don't repeat context. Just continue naturally.`;
    }

    // Add recent conversation context
    if (this.conversationHistory.length > 0) {
      const recentHistory = this.conversationHistory.slice(-6);
      const historyStr = recentHistory.map(h => 
        `${h.role === 'user' ? (name || 'User') : aiName}: ${h.content.substring(0, 200)}`
      ).join('\n');
      prompt += `\n\nRECENT CONVERSATION:\n${historyStr}`;
    }

    // Add system context
    if (context) {
      prompt += `\n\nSYSTEM CONTEXT:\n${context}`;
    }

    return prompt;
  }

  _detectActions(userMessage, response, analysis) {
    const actions = [];
    const msgLower = userMessage.toLowerCase();

    // Only detect actions for command-like messages
    if (!analysis.isCommand && analysis.intent !== 'command') {
      return actions;
    }

    // File operations
    if (msgLower.match(/(open|read|show|cat|display)\s+(the\s+)?file/)) {
      const fileMatch = msgLower.match(/(?:open|read|show|cat|display)\s+(?:the\s+)?(?:file\s+)?(.+?\.\w+)/);
      if (fileMatch) {
        actions.push({ type: 'read_file', target: fileMatch[1].trim() });
      }
    }

    if (msgLower.match(/(create|make|write|new)\s+(a\s+)?file/)) {
      actions.push({ type: 'create_file', message: userMessage });
    }

    // Search
    if (msgLower.match(/(search|google|look up|find out|what is)\s+(.+)/)) {
      actions.push({ type: 'web_search', query: userMessage });
    }

    // System
    if (msgLower.match(/(run|execute)\s+(the\s+)?command/)) {
      actions.push({ type: 'run_command', message: userMessage });
    }

    if (msgLower.match(/(open|launch|start)\s+(the\s+)?app/)) {
      const appMatch = msgLower.match(/(?:open|launch|start)\s+(?:the\s+)?(?:app\s+)?(\w+)/);
      if (appMatch) {
        actions.push({ type: 'open_app', app: appMatch[1] });
      }
    }

    return actions;
  }

  async _executeActions(actions) {
    const results = [];

    for (const action of actions) {
      try {
        let result;
        switch (action.type) {
          case 'read_file':
            const fs = require('fs').promises;
            const content = await fs.readFile(action.target, 'utf8');
            result = { success: true, content: content.substring(0, 5000) };
            break;

          case 'web_search':
            if (this.engine.webSearch) {
              result = await this.engine.webSearch.search(action.query);
            }
            break;

          case 'open_app':
            if (this.engine.automation) {
              result = await this.engine.automation.openApp(action.app);
            }
            break;

          case 'run_command':
            // Extract command from message
            const cmdMatch = action.message.match(/(?:run|execute)\s+(?:the\s+)?(?:command\s+)?[":']?(.+?)[":']?\s*$/);
            if (cmdMatch && this.engine.automation) {
              const { exec } = require('child_process');
              result = await new Promise((resolve) => {
                exec(cmdMatch[1], { timeout: 30000 }, (err, stdout, stderr) => {
                  resolve({ stdout, stderr, error: err?.message });
                });
              });
            }
            break;

          default:
            result = { success: false, error: 'Unknown action' };
        }
        results.push({ action: action.type, result });
      } catch (err) {
        results.push({ action: action.type, error: err.message });
      }
    }

    return results;
  }

  _formatResponse(response, actionResults, analysis) {
    let formatted = response;

    // Clean up common AI verbal tics
    const ticsToClean = [
      /^(Certainly!?|Sure!?|Of course!?|Absolutely!?|Great question!?)\s*/i,
      /^(I'd be happy to|I'll be glad to|Let me)\s+(help you with|assist you with)\s*/i,
      /^(Here's what I found|Here are the results|Here is the information):\s*/i,
      /^(Based on (?:my |the )?(?:analysis|research|understanding)),?\s*/i
    ];

    for (const tic of ticsToClean) {
      formatted = formatted.replace(tic, '');
    }

    // Capitalize first letter if we stripped something
    if (formatted && formatted[0] === formatted[0].toLowerCase()) {
      formatted = formatted[0].toUpperCase() + formatted.slice(1);
    }

    // Add action results naturally
    if (actionResults && actionResults.length > 0) {
      for (const ar of actionResults) {
        if (ar.result?.success && ar.result?.content) {
          // Don't dump file contents into chat — summarize instead
          if (ar.action === 'read_file') {
            const lines = ar.result.content.split('\n').length;
            formatted += `\n\n(${lines} lines in the file)`;
          }
        }
      }
    }

    return formatted;
  }

  _handleError(err, userMessage) {
    const name = this.engine.userName || '';

    let errorResponse;
    if (err.message?.includes('API key') || err.message?.includes('unauthorized')) {
      errorResponse = `Looks like there's an API key issue. Run \`opendesktop --setup\` to reconfigure.`;
    } else if (err.message?.includes('timeout') || err.message?.includes('ETIMEDOUT')) {
      errorResponse = `That timed out. Could be the provider having issues — want to try again?`;
    } else if (err.message?.includes('rate limit')) {
      errorResponse = `Hit a rate limit. Give it a moment and try again.`;
    } else {
      errorResponse = `Something went wrong: ${err.message}. Want me to try a different approach?`;
    }

    return {
      text: errorResponse,
      actions: [],
      actionResults: [],
      mood: this.userMood,
      error: true
    };
  }

  _addToHistory(userMessage, response, analysis, actions) {
    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
      analysis
    });

    this.conversationHistory.push({
      role: 'assistant',
      content: typeof response === 'string' ? response : response.text || response,
      timestamp: Date.now(),
      actions
    });

    // Keep bounded
    if (this.conversationHistory.length > this.config.maxHistory * 2) {
      this.conversationHistory = this.conversationHistory.slice(-this.config.maxHistory);
    }
  }
}

module.exports = { ConversationalInterface };
