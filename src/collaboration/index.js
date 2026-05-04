/**
 * Real-Time Collaboration
 * 
 * Multiple users, one agent instance. Team mode where developers share
 * an agent session — like Google Docs but for AI-assisted work.
 */

const EventEmitter = require('events');
const crypto = require('crypto');

class Collaboration extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      maxParticipants: config.maxParticipants || 10,
      sessionTimeout: config.sessionTimeout || 3600000, // 1 hour
      ...config
    };

    this.sessions = new Map();
    this.participants = new Map();
    this.cursors = new Map();        // participant -> cursor position
    this.selections = new Map();     // participant -> selection
    this.chatHistory = [];
    this.actionHistory = [];
    this.permissions = new Map();    // participant -> permissions
  }

  async initialize() {
    this.emit('initialized');
    return this;
  }

  /**
   * Create a collaboration session.
   */
  createSession(options = {}) {
    const session = {
      id: this._generateId(),
      name: options.name || 'Untitled Session',
      createdBy: options.createdBy || 'host',
      createdAt: Date.now(),
      status: 'active',
      participants: [],
      sharedContext: options.context || {},
      settings: {
        allowGuestControl: options.allowGuestControl || false,
        maxParticipants: options.maxParticipants || this.config.maxParticipants,
        recordingEnabled: options.recordingEnabled || false,
        ...options.settings
      },
      history: []
    };

    this.sessions.set(session.id, session);
    this.emit('session_created', session);

    return { success: true, session };
  }

  /**
   * Join an existing session.
   */
  joinSession(sessionId, participant) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    if (session.participants.length >= session.settings.maxParticipants) {
      return { success: false, error: 'Session is full' };
    }

    const participantObj = {
      id: this._generateId(),
      name: participant.name || 'Anonymous',
      role: participant.role || 'viewer', // host, editor, viewer
      joinedAt: Date.now(),
      lastActive: Date.now(),
      color: this._assignColor(session.participants.length)
    };

    session.participants.push(participantObj.id);
    this.participants.set(participantObj.id, {
      ...participantObj,
      sessionId
    });

    // Set permissions based on role
    this.permissions.set(participantObj.id, this._getRolePermissions(participantObj.role));

    this.emit('participant_joined', { sessionId, participant: participantObj });

    return { success: true, participant: participantObj, session };
  }

  /**
   * Leave a session.
   */
  leaveSession(sessionId, participantId) {
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false, error: 'Session not found' };

    session.participants = session.participants.filter(id => id !== participantId);
    this.participants.delete(participantId);
    this.permissions.delete(participantId);
    this.cursors.delete(participantId);
    this.selections.delete(participantId);

    // End session if empty
    if (session.participants.length === 0) {
      session.status = 'empty';
    }

    this.emit('participant_left', { sessionId, participantId });
    return { success: true };
  }

  /**
   * Send an action that all participants can see.
   */
  async broadcastAction(sessionId, participantId, action) {
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false, error: 'Session not found' };

    const permissions = this.permissions.get(participantId);
    if (!permissions || (!permissions.canControl && !permissions.canEdit)) {
      return { success: false, error: 'Insufficient permissions' };
    }

    const actionEntry = {
      id: this._generateId(),
      sessionId,
      participantId,
      timestamp: Date.now(),
      type: action.type,        // 'command', 'file_edit', 'cursor', 'selection', 'chat'
      data: action.data,
      visible: true
    };

    session.history.push(actionEntry);
    this.actionHistory.push(actionEntry);

    // Update participant last active
    const participant = this.participants.get(participantId);
    if (participant) {
      participant.lastActive = Date.now();
    }

    this.emit('action_broadcast', actionEntry);

    return { success: true, action: actionEntry };
  }

  /**
   * Update cursor position (for showing where each user is looking).
   */
  updateCursor(participantId, position) {
    this.cursors.set(participantId, {
      ...position,
      timestamp: Date.now()
    });

    this.emit('cursor_updated', { participantId, position });
  }

  /**
   * Update selection range.
   */
  updateSelection(participantId, selection) {
    this.selections.set(participantId, {
      ...selection,
      timestamp: Date.now()
    });

    this.emit('selection_updated', { participantId, selection });
  }

  /**
   * Send a chat message within the session.
   */
  sendChat(sessionId, participantId, message) {
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false, error: 'Session not found' };

    const participant = this.participants.get(participantId);
    const chatEntry = {
      id: this._generateId(),
      sessionId,
      participantId,
      participantName: participant?.name || 'Unknown',
      message,
      timestamp: Date.now()
    };

    this.chatHistory.push(chatEntry);
    session.history.push({ ...chatEntry, type: 'chat' });

    this.emit('chat_message', chatEntry);
    return { success: true, chat: chatEntry };
  }

  /**
   * Get chat history for a session.
   */
  getChatHistory(sessionId, limit = 50) {
    return this.chatHistory
      .filter(c => c.sessionId === sessionId)
      .slice(-limit);
  }

  /**
   * Update participant permissions.
   */
  setPermissions(participantId, permissions) {
    const current = this.permissions.get(participantId);
    if (!current) return { success: false, error: 'Participant not found' };

    this.permissions.set(participantId, { ...current, ...permissions });
    this.emit('permissions_updated', { participantId, permissions });

    return { success: true };
  }

  /**
   * Promote a participant to editor.
   */
  promoteToEditor(participantId) {
    return this.setPermissions(participantId, {
      canEdit: true,
      canControl: false,
      canChat: true
    });
  }

  /**
   * Promote a participant to co-host.
   */
  promoteToHost(participantId) {
    const participant = this.participants.get(participantId);
    if (participant) participant.role = 'host';

    return this.setPermissions(participantId, {
      canEdit: true,
      canControl: true,
      canChat: true,
      canManageParticipants: true
    });
  }

  /**
   * Get all cursors for a session (for rendering).
   */
  getSessionCursors(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    return session.participants
      .map(pid => {
        const cursor = this.cursors.get(pid);
        const participant = this.participants.get(pid);
        if (!cursor || !participant) return null;
        return {
          participantId: pid,
          name: participant.name,
          color: participant.color,
          position: cursor
        };
      })
      .filter(Boolean);
  }

  /**
   * Get session state.
   */
  getSessionState(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return {
      ...session,
      participants: session.participants.map(pid => {
        const p = this.participants.get(pid);
        return p ? {
          id: p.id,
          name: p.name,
          role: p.role,
          color: p.color,
          lastActive: p.lastActive,
          cursor: this.cursors.get(pid),
          selection: this.selections.get(pid)
        } : null;
      }).filter(Boolean),
      chatCount: this.chatHistory.filter(c => c.sessionId === sessionId).length,
      actionCount: session.history.length
    };
  }

  /**
   * List all active sessions.
   */
  listSessions() {
    return Array.from(this.sessions.values())
      .filter(s => s.status === 'active')
      .map(s => ({
        id: s.id,
        name: s.name,
        participants: s.participants.length,
        maxParticipants: s.settings.maxParticipants,
        createdBy: s.createdBy,
        createdAt: s.createdAt
      }));
  }

  /**
   * End a session.
   */
  endSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false, error: 'Session not found' };

    session.status = 'ended';
    session.endedAt = Date.now();

    // Notify all participants
    for (const pid of session.participants) {
      this.emit('session_ended', { sessionId, participantId: pid });
      this.participants.delete(pid);
      this.permissions.delete(pid);
      this.cursors.delete(pid);
      this.selections.delete(pid);
    }

    session.participants = [];
    return { success: true };
  }

  /**
   * Get collaboration statistics.
   */
  getStats() {
    return {
      activeSessions: Array.from(this.sessions.values()).filter(s => s.status === 'active').length,
      totalParticipants: this.participants.size,
      totalActions: this.actionHistory.length,
      totalChatMessages: this.chatHistory.length,
      sessions: this.sessions.size
    };
  }

  // ==================== PRIVATE METHODS ====================

  _getRolePermissions(role) {
    const permissions = {
      host: {
        canControl: true,
        canEdit: true,
        canChat: true,
        canManageParticipants: true,
        canEndSession: true
      },
      editor: {
        canControl: false,
        canEdit: true,
        canChat: true,
        canManageParticipants: false,
        canEndSession: false
      },
      viewer: {
        canControl: false,
        canEdit: false,
        canChat: true,
        canManageParticipants: false,
        canEndSession: false
      }
    };
    return permissions[role] || permissions.viewer;
  }

  _assignColor(index) {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
      '#BB8FCE', '#85C1E9'
    ];
    return colors[index % colors.length];
  }

  _generateId() {
    return `collab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = { Collaboration };
