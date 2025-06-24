import { Character, DiceRoll } from '../types';
import { CharacterService } from './CharacterService';

export interface DiceExpression {
  count: number;
  sides: number;
  modifier: number;
  attributeBonus?: keyof Character['basicAttributes'];
  advantage?: boolean;
  disadvantage?: boolean;
  description?: string;
}

export interface DiceResult {
  expression: string;
  rolls: Array<{
    die: number;
    result: number;
    isMax: boolean;
    isMin: boolean;
  }>;
  modifiers: Array<{
    name: string;
    value: number;
  }>;
  total: number;
  details: string;
  timestamp: number;
}

export interface RollRequest {
  expression: string;
  character?: Character;
  advantage?: boolean;
  disadvantage?: boolean;
  description?: string;
}

export class DiceService {
  private static readonly STORAGE_KEY = 'rpg-tool-dice-history';
  private static rollHistory = new Map<string, DiceRoll[]>(); // sessionId -> rolls

  // Parse dice expression (e.g., "3d6+2", "1d20+STR+5", "2d8-1")
  static parseDiceExpression(expression: string): DiceExpression | null {
    try {
      // Clean and normalize the expression
      const cleaned = expression.toLowerCase().replace(/\s+/g, '');
      
      // Basic dice expression regex: XdY+/-Z
      const basicMatch = cleaned.match(/^(\d*)d(\d+)([+-]\d+)?$/);
      if (basicMatch) {
        const count = parseInt(basicMatch[1]) || 1;
        const sides = parseInt(basicMatch[2]);
        const modifier = basicMatch[3] ? parseInt(basicMatch[3]) : 0;
        
        if (count > 0 && count <= 100 && sides > 0 && sides <= 1000) {
          return { count, sides, modifier };
        }
      }

      // Complex expression with attribute bonus: 1d20+STR+3
      const complexMatch = cleaned.match(/^(\d*)d(\d+)([+-](?:str|dex|con|int|wis|cha))?([+-]\d+)?$/);
      if (complexMatch) {
        const count = parseInt(complexMatch[1]) || 1;
        const sides = parseInt(complexMatch[2]);
        const attributeMatch = complexMatch[3];
        const numericModifier = complexMatch[4] ? parseInt(complexMatch[4]) : 0;
        
        let attributeBonus: keyof Character['basicAttributes'] | undefined;
        if (attributeMatch) {
          const attr = attributeMatch.substring(1).toUpperCase() as keyof Character['basicAttributes'];
          if (['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].includes(attr)) {
            attributeBonus = attr;
          }
        }

        if (count > 0 && count <= 100 && sides > 0 && sides <= 1000) {
          return { count, sides, modifier: numericModifier, attributeBonus };
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  // Generate cryptographically secure random number
  private static secureRandom(): number {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const array = new Uint32Array(1);
      window.crypto.getRandomValues(array);
      return array[0] / (0xffffffff + 1);
    }
    // Fallback to Math.random() if crypto API not available
    return Math.random();
  }

  // Roll a single die
  private static rollDie(sides: number): number {
    return Math.floor(this.secureRandom() * sides) + 1;
  }

  // Roll dice with advantage (roll twice, take higher)
  private static rollWithAdvantage(sides: number): { result: number; details: string } {
    const roll1 = this.rollDie(sides);
    const roll2 = this.rollDie(sides);
    const result = Math.max(roll1, roll2);
    return { result, details: `(${roll1}, ${roll2})` };
  }

  // Roll dice with disadvantage (roll twice, take lower)
  private static rollWithDisadvantage(sides: number): { result: number; details: string } {
    const roll1 = this.rollDie(sides);
    const roll2 = this.rollDie(sides);
    const result = Math.min(roll1, roll2);
    return { result, details: `(${roll1}, ${roll2})` };
  }

  // Execute dice roll
  static rollDice(request: RollRequest): DiceResult {
    const parsed = this.parseDiceExpression(request.expression);
    if (!parsed) {
      throw new Error('Invalid dice expression');
    }

    const rolls: DiceResult['rolls'] = [];
    const modifiers: DiceResult['modifiers'] = [];
    let total = 0;

    // Handle advantage/disadvantage for d20 rolls
    const hasAdvantage = request.advantage && parsed.sides === 20 && parsed.count === 1;
    const hasDisadvantage = request.disadvantage && parsed.sides === 20 && parsed.count === 1;

    if (hasAdvantage || hasDisadvantage) {
      const rollResult = hasAdvantage 
        ? this.rollWithAdvantage(parsed.sides)
        : this.rollWithDisadvantage(parsed.sides);
      
      rolls.push({
        die: parsed.sides,
        result: rollResult.result,
        isMax: rollResult.result === parsed.sides,
        isMin: rollResult.result === 1,
      });
      total += rollResult.result;
    } else {
      // Normal rolls
      for (let i = 0; i < parsed.count; i++) {
        const result = this.rollDie(parsed.sides);
        rolls.push({
          die: parsed.sides,
          result,
          isMax: result === parsed.sides,
          isMin: result === 1,
        });
        total += result;
      }
    }

    // Add numeric modifier
    if (parsed.modifier !== 0) {
      modifiers.push({
        name: 'Modifier',
        value: parsed.modifier,
      });
      total += parsed.modifier;
    }

    // Add attribute bonus
    if (parsed.attributeBonus && request.character) {
      const attributeValue = request.character.basicAttributes[parsed.attributeBonus];
      const bonus = CharacterService.calculateModifier(attributeValue);
      modifiers.push({
        name: `${parsed.attributeBonus} Bonus`,
        value: bonus,
      });
      total += bonus;
    }

    // Apply luck bonus if character has luck
    if (request.character?.resources.luck) {
      const luckBonus = 1;
      modifiers.push({
        name: 'Luck Bonus',
        value: luckBonus,
      });
      total += luckBonus;
    }

    // Build details string
    let details = '';
    if (hasAdvantage) {
      details += '(Advantage) ';
    } else if (hasDisadvantage) {
      details += '(Disadvantage) ';
    }
    
    details += `${parsed.count}d${parsed.sides}`;
    if (rolls.length === 1) {
      details += ` → ${rolls[0].result}`;
    } else {
      details += ` → [${rolls.map(r => r.result).join(', ')}]`;
    }

    modifiers.forEach(mod => {
      details += ` ${mod.value >= 0 ? '+' : ''}${mod.value} (${mod.name})`;
    });

    return {
      expression: request.expression,
      rolls,
      modifiers,
      total,
      details,
      timestamp: Date.now(),
    };
  }

  // Create common dice expressions
  static getCommonRolls(character?: Character): Array<{ label: string; expression: string; description: string }> {
    const baseRolls = [
      { label: 'd20', expression: '1d20', description: 'Basic d20 roll' },
      { label: 'd4', expression: '1d4', description: 'Four-sided die' },
      { label: 'd6', expression: '1d6', description: 'Six-sided die' },
      { label: 'd8', expression: '1d8', description: 'Eight-sided die' },
      { label: 'd10', expression: '1d10', description: 'Ten-sided die' },
      { label: 'd12', expression: '1d12', description: 'Twelve-sided die' },
      { label: 'd100', expression: '1d100', description: 'Percentile die' },
      { label: '4d6', expression: '4d6', description: 'Ability score generation' },
      { label: '2d6', expression: '2d6', description: 'Common damage roll' },
    ];

    if (!character) {
      return baseRolls;
    }

    // Add character-specific rolls
    const characterRolls = [
      { label: 'Attack (Melee)', expression: `1d20${character.resources.meleeAtkBonus >= 0 ? '+' : ''}${character.resources.meleeAtkBonus}`, description: 'Melee attack roll' },
      { label: 'Attack (Ranged)', expression: `1d20${character.resources.rangedAtkBonus >= 0 ? '+' : ''}${character.resources.rangedAtkBonus}`, description: 'Ranged attack roll' },
      { label: 'Spell Attack', expression: `1d20${character.resources.spellcastingBonus >= 0 ? '+' : ''}${character.resources.spellcastingBonus}`, description: 'Spell attack roll' },
      { label: 'STR Save', expression: '1d20+STR', description: 'Strength saving throw' },
      { label: 'DEX Save', expression: '1d20+DEX', description: 'Dexterity saving throw' },
      { label: 'CON Save', expression: '1d20+CON', description: 'Constitution saving throw' },
      { label: 'INT Save', expression: '1d20+INT', description: 'Intelligence saving throw' },
      { label: 'WIS Save', expression: '1d20+WIS', description: 'Wisdom saving throw' },
      { label: 'CHA Save', expression: '1d20+CHA', description: 'Charisma saving throw' },
    ];

    return [...baseRolls, ...characterRolls];
  }

  // Save dice roll to session history
  static saveDiceRoll(sessionId: string, diceRoll: DiceRoll): void {
    if (!this.rollHistory.has(sessionId)) {
      this.rollHistory.set(sessionId, []);
    }
    
    const rolls = this.rollHistory.get(sessionId)!;
    rolls.push(diceRoll);
    
    // Keep only last 100 rolls per session
    if (rolls.length > 100) {
      rolls.splice(0, rolls.length - 100);
    }
    
    this.rollHistory.set(sessionId, rolls);
    this.saveToStorage();
  }

  // Get dice roll history for session
  static getRollHistory(sessionId: string): DiceRoll[] {
    return this.rollHistory.get(sessionId) || [];
  }

  // Clear session history
  static clearSessionHistory(sessionId: string): void {
    this.rollHistory.delete(sessionId);
    this.saveToStorage();
  }

  // Validate dice expression
  static isValidExpression(expression: string): boolean {
    return this.parseDiceExpression(expression) !== null;
  }

  // Get suggested expressions based on input
  static getSuggestions(input: string): string[] {
    const suggestions: string[] = [];
    const cleaned = input.toLowerCase().trim();

    // Basic dice suggestions
    if (cleaned.match(/^\d*d?\d*$/)) {
      const nums = [4, 6, 8, 10, 12, 20, 100];
      nums.forEach(num => {
        if (num.toString().startsWith(cleaned) || `d${num}`.startsWith(cleaned)) {
          suggestions.push(`1d${num}`);
          if (num <= 20) {
            suggestions.push(`2d${num}`);
            suggestions.push(`3d${num}`);
          }
        }
      });
    }

    // Attribute-based suggestions
    if (cleaned.includes('str') || cleaned.includes('dex') || cleaned.includes('con') ||
        cleaned.includes('int') || cleaned.includes('wis') || cleaned.includes('cha')) {
      const attrs = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
      attrs.forEach(attr => {
        if (attr.toLowerCase().startsWith(cleaned.replace(/.*([a-z]{2,3}).*/, '$1'))) {
          suggestions.push(`1d20+${attr}`);
        }
      });
    }

    return suggestions.slice(0, 5); // Limit to 5 suggestions
  }

  // Save to localStorage
  private static saveToStorage(): void {
    try {
      const data = Array.from(this.rollHistory.entries());
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save dice history to localStorage:', error);
    }
  }

  // Load from localStorage
  static loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data: [string, DiceRoll[]][] = JSON.parse(stored);
        this.rollHistory = new Map(data);
      }
    } catch (error) {
      console.warn('Failed to load dice history from localStorage:', error);
      this.rollHistory = new Map();
    }
  }

  // Initialize service
  static initialize(): void {
    this.loadFromStorage();
  }
}

// Initialize the service
DiceService.initialize();