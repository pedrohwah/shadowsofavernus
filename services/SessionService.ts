import { GameSession, User, Character } from '../types';

export interface SessionValidationResult {
  isValid: boolean;
  session?: GameSession;
  error?: string;
}

export interface SessionStorage {
  user: User | null;
  session: GameSession | null;
  character: Character | null;
  lastActivity: number;
}

export class SessionService {
  private static readonly STORAGE_KEY = 'rpg-tool-session';
  private static readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
  private static activeSessions = new Map<string, GameSession>();

  // Generate a unique session token
  static generateSessionToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Validate session token format
  static isValidTokenFormat(token: string): boolean {
    return /^[A-Z0-9]{6}$/.test(token);
  }

  // Validate username
  static isValidUsername(username: string): boolean {
    return username.trim().length >= 2 && username.trim().length <= 30;
  }

  // Create a new GM session
  static async createGMSession(username: string): Promise<GameSession> {
    const sanitizedUsername = username.trim() || 'Game Master';
    
    if (!this.isValidUsername(sanitizedUsername)) {
      throw new Error('Username must be between 2 and 30 characters');
    }

    const sessionId = this.generateSessionToken();
    const gmUser: User = {
      id: `gm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      username: sanitizedUsername,
      role: 'GM',
      currentSessionId: sessionId,
    };

    const session: GameSession = {
      id: sessionId,
      gmId: gmUser.id,
      players: [],
      torchState: {
        isRunning: false,
        startTime: 0,
        duration: 0,
        remainingTime: 0,
      },
      playerOrder: [],
    };

    // Store session in memory (in real app, this would be Firebase)
    this.activeSessions.set(sessionId, session);

    // Store in localStorage for persistence
    this.saveToStorage({
      user: gmUser,
      session,
      character: null,
      lastActivity: Date.now(),
    });

    return session;
  }

  // Validate and join existing session
  static async validateAndJoinSession(
    sessionToken: string,
    username: string
  ): Promise<SessionValidationResult> {
    const sanitizedToken = sessionToken.trim().toUpperCase();
    const sanitizedUsername = username.trim();

    // Validate input format
    if (!this.isValidTokenFormat(sanitizedToken)) {
      return {
        isValid: false,
        error: 'Session token must be 6 characters (letters and numbers only)',
      };
    }

    if (!this.isValidUsername(sanitizedUsername)) {
      return {
        isValid: false,
        error: 'Username must be between 2 and 30 characters',
      };
    }

    // Check if session exists (mock validation)
    let session = this.activeSessions.get(sanitizedToken);
    
    if (!session) {
      // In a real app, this would query Firebase
      // For now, create a mock session if token doesn't exist
      const mockGmId = `gm-${Date.now()}`;
      session = {
        id: sanitizedToken,
        gmId: mockGmId,
        players: [],
        torchState: {
          isRunning: false,
          startTime: 0,
          duration: 0,
          remainingTime: 0,
        },
        playerOrder: [],
      };
      this.activeSessions.set(sanitizedToken, session);
    }

    // Create player user
    const playerUser: User = {
      id: `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      username: sanitizedUsername,
      role: 'Player',
      currentSessionId: sanitizedToken,
    };

    // Add player to session
    if (!session.players.includes(playerUser.id)) {
      session.players.push(playerUser.id);
    }

    // Store in localStorage for persistence
    this.saveToStorage({
      user: playerUser,
      session,
      character: null,
      lastActivity: Date.now(),
    });

    return {
      isValid: true,
      session,
    };
  }

  // Save session data to localStorage
  private static saveToStorage(data: SessionStorage): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save session to localStorage:', error);
    }
  }

  // Load session data from localStorage
  static loadFromStorage(): SessionStorage | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return null;

      const data: SessionStorage = JSON.parse(stored);
      
      // Check if session has expired
      if (Date.now() - data.lastActivity > this.SESSION_TIMEOUT) {
        this.clearStorage();
        return null;
      }

      return data;
    } catch (error) {
      console.warn('Failed to load session from localStorage:', error);
      this.clearStorage();
      return null;
    }
  }

  // Clear session storage
  static clearStorage(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear session storage:', error);
    }
  }

  // Update session activity timestamp
  static updateActivity(): void {
    const stored = this.loadFromStorage();
    if (stored) {
      stored.lastActivity = Date.now();
      this.saveToStorage(stored);
    }
  }

  // Get session by ID (mock Firebase query)
  static getSessionById(sessionId: string): GameSession | null {
    return this.activeSessions.get(sessionId) || null;
  }

  // Leave session
  static async leaveSession(userId: string, sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.players = session.players.filter(id => id !== userId);
    }
    this.clearStorage();
  }

  // Check if session is active
  static isSessionActive(sessionId: string): boolean {
    return this.activeSessions.has(sessionId);
  }
}