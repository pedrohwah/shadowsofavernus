import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppState, AppContextType, User, Session, Character } from '../types';

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, setState] = useState<AppState>('start');
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [character, setCharacter] = useState<Character | null>(null);

  // Load saved state from localStorage on mount
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('rpg-tool-user');
      const savedSession = localStorage.getItem('rpg-tool-session');
      const savedCharacter = localStorage.getItem('rpg-tool-character');

      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
      }

      if (savedSession) {
        const parsedSession = JSON.parse(savedSession);
        // Check if session is still valid (24 hours)
        const sessionAge = Date.now() - parsedSession.createdAt;
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours

        if (sessionAge < maxAge) {
          setSession(parsedSession);
          if (parsedUser) {
            setState(parsedUser.role === 'gm' ? 'gm-panel' : 'player-panel');
          }
        } else {
          // Session expired, clean up
          localStorage.removeItem('rpg-tool-session');
        }
      }

      if (savedCharacter) {
        const parsedCharacter = JSON.parse(savedCharacter);
        setCharacter(parsedCharacter);
      }
    } catch (error) {
      console.warn('Failed to load saved state:', error);
    }
  }, []);

  // Save state to localStorage when it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('rpg-tool-user', JSON.stringify(user));
    } else {
      localStorage.removeItem('rpg-tool-user');
    }
  }, [user]);

  useEffect(() => {
    if (session) {
      localStorage.setItem('rpg-tool-session', JSON.stringify(session));
    } else {
      localStorage.removeItem('rpg-tool-session');
    }
  }, [session]);

  useEffect(() => {
    if (character) {
      localStorage.setItem('rpg-tool-character', JSON.stringify(character));
    } else {
      localStorage.removeItem('rpg-tool-character');
    }
  }, [character]);

  const contextValue: AppContextType = {
    state,
    setState,
    user,
    setUser,
    session,
    setSession,
    character,
    setCharacter,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
