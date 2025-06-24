import { Character, User } from '../types';

export interface CharacterValidationResult {
  isValid: boolean;
  errors: {
    characterName?: string;
    playerName?: string;
    ancestry?: string;
    class?: string;
    background?: string;
    attributes?: string;
    resources?: string;
    general?: string;
  };
}

export interface CharacterCreationData {
  characterName: string;
  playerName: string;
  ancestry: string;
  class: string;
  background: string;
  deity: string;
  characterImage: string;
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
}

export class CharacterService {
  private static readonly STORAGE_KEY = 'rpg-tool-characters';
  private static characters = new Map<string, Character>();

  // Generate random character image from Unsplash
  static generateCharacterImage(ancestry?: string): string {
    const themes = [
      'fantasy-warrior', 'medieval-character', 'fantasy-portrait',
      'warrior-armor', 'mage-wizard', 'rogue-thief', 'fantasy-art'
    ];
    const theme = ancestry ? `${ancestry.toLowerCase()}-fantasy` : themes[Math.floor(Math.random() * themes.length)];
    const seed = Math.floor(Math.random() * 1000);
    return `https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop&crop=face&auto=format&q=80&ixid=${seed}`;
  }

  // Calculate attribute modifier
  static calculateModifier(attributeValue: number): number {
    return Math.floor((attributeValue - 10) / 2);
  }

  // Calculate AC based on equipped armor and DEX modifier
  static calculateAC(character: Character): number {
    let baseAC = 10; // Base AC without armor
    let dexModifier = this.calculateModifier(character.basicAttributes.DEX);
    let maxDexBonus = 999; // No limit by default

    // Find equipped armor
    const equippedArmor = character.armor.find(armor => armor.equipped);
    if (equippedArmor) {
      baseAC = equippedArmor.baseAC;
      maxDexBonus = equippedArmor.maxAttributeBonus;
    }

    // Apply DEX modifier with maximum limit
    const appliedDexBonus = Math.min(dexModifier, maxDexBonus);
    return baseAC + appliedDexBonus;
  }

  // Validate character data
  static validateCharacter(data: Partial<CharacterCreationData>): CharacterValidationResult {
    const errors: CharacterValidationResult['errors'] = {};

    // Validate character name
    if (!data.characterName?.trim()) {
      errors.characterName = 'Character name is required';
    } else if (data.characterName.trim().length < 2) {
      errors.characterName = 'Character name must be at least 2 characters';
    } else if (data.characterName.trim().length > 50) {
      errors.characterName = 'Character name must be less than 50 characters';
    }

    // Validate player name
    if (!data.playerName?.trim()) {
      errors.playerName = 'Player name is required';
    } else if (data.playerName.trim().length < 2) {
      errors.playerName = 'Player name must be at least 2 characters';
    }

    // Validate ancestry
    if (!data.ancestry?.trim()) {
      errors.ancestry = 'Ancestry is required';
    }

    // Validate class
    if (!data.class?.trim()) {
      errors.class = 'Class is required';
    }

    // Validate background
    if (!data.background?.trim()) {
      errors.background = 'Background is required';
    }

    // Validate attributes
    if (data.basicAttributes) {
      const attrs = data.basicAttributes;
      const attributeValues = [attrs.STR, attrs.DEX, attrs.CON, attrs.INT, attrs.WIS, attrs.CHA];
      
      if (attributeValues.some(val => val < 3 || val > 20)) {
        errors.attributes = 'Attributes must be between 3 and 20';
      }

      const totalPoints = attributeValues.reduce((sum, val) => sum + val, 0);
      if (totalPoints < 48 || totalPoints > 90) {
        errors.attributes = 'Total attribute points should be between 48 and 90';
      }
    }

    // Validate resources
    if (data.resources) {
      const res = data.resources;
      
      if (res.level < 1 || res.level > 20) {
        errors.resources = 'Level must be between 1 and 20';
      }

      if (res.HP < 1 || res.maxHP < 1) {
        errors.resources = 'HP and Max HP must be at least 1';
      }

      if (res.HP > res.maxHP) {
        errors.resources = 'Current HP cannot exceed Max HP';
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  // Create default character template
  static createDefaultCharacter(user: User, sessionId: string): CharacterCreationData {
    return {
      characterName: '',
      playerName: user.username,
      ancestry: '',
      class: '',
      background: '',
      deity: '',
      characterImage: this.generateCharacterImage(),
      basicAttributes: {
        STR: 10,
        DEX: 10,
        CON: 10,
        INT: 10,
        WIS: 10,
        CHA: 10,
      },
      resources: {
        level: 1,
        HP: 8,
        maxHP: 8,
        AC: 10,
        meleeAtkBonus: 0,
        rangedAtkBonus: 0,
        spellcastingBonus: 0,
        luck: false,
      },
    };
  }

  // Create a new character
  static async createCharacter(
    data: CharacterCreationData,
    user: User,
    sessionId: string
  ): Promise<Character> {
    const validation = this.validateCharacter(data);
    if (!validation.isValid) {
      throw new Error('Character validation failed: ' + Object.values(validation.errors).join(', '));
    }

    const characterId = `char-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const character: Character = {
      id: characterId,
      userId: user.id,
      sessionId: sessionId,
      characterInfo: {
        characterName: data.characterName.trim(),
        playerName: data.playerName.trim(),
        ancestry: data.ancestry.trim(),
        class: data.class.trim(),
        background: data.background.trim(),
        deity: data.deity.trim(),
        characterImage: data.characterImage,
      },
      basicAttributes: { ...data.basicAttributes },
      resources: {
        ...data.resources,
        AC: this.calculateAC({
          basicAttributes: data.basicAttributes,
          armor: [],
        } as Character),
      },
      weapons: [],
      armor: [],
      equipment: [],
      spells: [],
      talents: [],
    };

    // Store character
    this.characters.set(characterId, character);
    this.saveCharactersToStorage();

    return character;
  }

  // Update character
  static async updateCharacter(characterId: string, updates: Partial<Character>): Promise<Character> {
    const existingCharacter = this.characters.get(characterId);
    if (!existingCharacter) {
      throw new Error('Character not found');
    }

    const updatedCharacter = {
      ...existingCharacter,
      ...updates,
      id: characterId, // Ensure ID doesn't change
    };

    // Recalculate AC if attributes or armor changed
    if (updates.basicAttributes || updates.armor) {
      updatedCharacter.resources.AC = this.calculateAC(updatedCharacter);
    }

    this.characters.set(characterId, updatedCharacter);
    this.saveCharactersToStorage();

    return updatedCharacter;
  }

  // Get character by ID
  static getCharacter(characterId: string): Character | null {
    return this.characters.get(characterId) || null;
  }

  // Get characters by user
  static getCharactersByUser(userId: string): Character[] {
    return Array.from(this.characters.values()).filter(char => char.userId === userId);
  }

  // Get characters by session
  static getCharactersBySession(sessionId: string): Character[] {
    return Array.from(this.characters.values()).filter(char => char.sessionId === sessionId);
  }

  // Delete character
  static async deleteCharacter(characterId: string): Promise<void> {
    this.characters.delete(characterId);
    this.saveCharactersToStorage();
  }

  // Save characters to localStorage
  private static saveCharactersToStorage(): void {
    try {
      const charactersArray = Array.from(this.characters.entries());
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(charactersArray));
    } catch (error) {
      console.warn('Failed to save characters to localStorage:', error);
    }
  }

  // Load characters from localStorage
  static loadCharactersFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const charactersArray: [string, Character][] = JSON.parse(stored);
        this.characters = new Map(charactersArray);
      }
    } catch (error) {
      console.warn('Failed to load characters from localStorage:', error);
      this.characters = new Map();
    }
  }

  // Get common ancestry options
  static getAncestryOptions(): string[] {
    return [
      'Human', 'Elf', 'Dwarf', 'Halfling', 'Dragonborn',
      'Gnome', 'Half-Elf', 'Half-Orc', 'Tiefling', 'Aasimar',
      'Goliath', 'Firbolg', 'Kenku', 'Tabaxi', 'Warforged'
    ];
  }

  // Get common class options
  static getClassOptions(): string[] {
    return [
      'Fighter', 'Wizard', 'Rogue', 'Cleric', 'Ranger',
      'Barbarian', 'Bard', 'Druid', 'Monk', 'Paladin',
      'Sorcerer', 'Warlock', 'Artificer', 'Blood Hunter'
    ];
  }

  // Get common background options
  static getBackgroundOptions(): string[] {
    return [
      'Acolyte', 'Criminal', 'Folk Hero', 'Noble', 'Sage',
      'Soldier', 'Charlatan', 'Entertainer', 'Guild Artisan', 'Hermit',
      'Outlander', 'Sailor', 'Urchin', 'Merchant', 'Scholar'
    ];
  }

  // Generate random stats (4d6 drop lowest)
  static rollRandomStats(): { STR: number; DEX: number; CON: number; INT: number; WIS: number; CHA: number } {
    const rollStat = () => {
      const rolls = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1);
      rolls.sort((a, b) => b - a);
      return rolls.slice(0, 3).reduce((sum, roll) => sum + roll, 0);
    };

    return {
      STR: rollStat(),
      DEX: rollStat(),
      CON: rollStat(),
      INT: rollStat(),
      WIS: rollStat(),
      CHA: rollStat(),
    };
  }

  // Initialize service
  static initialize(): void {
    this.loadCharactersFromStorage();
  }
}

// Initialize the service
CharacterService.initialize();