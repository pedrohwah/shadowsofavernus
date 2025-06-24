// Core data types for the RPG Tool application

export interface User {
  id: string;
  username: string;
  role: 'gm' | 'player';
}

export interface Session {
  id: string;
  gmId: string;
  players: string[];
  createdAt: number;
  lastActivity: number;
  torchState: {
    isRunning: boolean;
    remainingMinutes: number;
    startedAt?: number;
  };
}

export interface Character {
  id: string;
  userId: string;
  sessionId: string;
  characterInfo: {
    characterName: string;
    playerName: string;
    ancestry: string;
    class: string;
    background: string;
    deity: string;
    characterImage: string;
  };
  basicAttributes: {
    STR: number;
    DEX: number;
    CON: number;
    INT: number;
    WIS: number;
    CHA: number;
  };
  resources: {
    level: number;
    HP: number;
    maxHP: number;
    AC: number;
    meleeAtkBonus: number;
    rangedAtkBonus: number;
    spellcastingBonus: number;
    luck: boolean;
  };
  weapons: Weapon[];
  armor: Armor[];
  equipment: Equipment[];
  spells: string[];
  talents: string[];
}

export interface Weapon {
  id: string;
  name: string;
  damage: string;
  type: string;
  slots: number;
  equipped: boolean;
}

export interface Armor {
  id: string;
  name: string;
  baseAC: number;
  maxAttributeBonus: number;
  slots: number;
  equipped: boolean;
}

export interface Equipment {
  id: string;
  name: string;
  description?: string;
  slots: number;
  quantity: number;
}

export interface DiceRoll {
  id: string;
  sessionId: string;
  characterId: string;
  rollerUsername: string;
  expression: string;
  result: number;
  details: string; // Human-readable details of the roll calculation
  timestamp: number;
}

// Application state types
export type AppState = 'start' | 'gm-panel' | 'player-panel';

export interface AppContextType {
  state: AppState;
  setState: (state: AppState) => void;
  user: User | null;
  setUser: (user: User | null) => void;
  session: Session | null;
  setSession: (session: Session | null) => void;
  character: Character | null;
  setCharacter: (character: Character | null) => void;
}