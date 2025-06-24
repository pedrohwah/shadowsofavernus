import React, { useState, useRef, useEffect } from 'react';
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Plus, Minus, Zap, Sparkles, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { DiceService, RollRequest, DiceResult } from '../services/DiceService';
import { useAppContext } from '../contexts/AppContext';
import { Character } from '../types';
import { toast } from 'sonner@2.0.3';

interface DiceRollerProps {
  character?: Character;
  onRollComplete: (result: DiceResult, request: RollRequest) => void;
  className?: string;
}

type DiceType = 4 | 6 | 8 | 10 | 12 | 20 | 100;

const DiceIcon: React.FC<{ sides: number; isRolling?: boolean }> = ({ sides, isRolling = false }) => {
  const className = `w-6 h-6 ${isRolling ? 'dice-rolling' : ''}`;
  
  switch (sides) {
    case 4: return <Dice1 className={className} />;
    case 6: return <Dice2 className={className} />;
    case 8: return <Dice3 className={className} />;
    case 10: return <Dice4 className={className} />;
    case 12: return <Dice5 className={className} />;
    case 20: return <Dice6 className={className} />;
    case 100: return <div className={`${className} border-2 border-current rounded flex items-center justify-center text-xs font-bold`}>%</div>;
    default: return <Dice6 className={className} />;
  }
};

export const DiceRoller: React.FC<DiceRollerProps> = ({
  character,
  onRollComplete,
  className = '',
}) => {
  const { user } = useAppContext();
  const [expression, setExpression] = useState('1d20');
  const [modifier, setModifier] = useState(0);
  const [selectedAttribute, setSelectedAttribute] = useState<keyof Character['basicAttributes'] | ''>('');
  const [advantage, setAdvantage] = useState(false);
  const [disadvantage, setDisadvantage] = useState(false);
  const [description, setDescription] = useState('');
  const [isRolling, setIsRolling] = useState(false);
  const [lastResult, setLastResult] = useState<DiceResult | null>(null);
  const [quickRollMode, setQuickRollMode] = useState(true);
  const rollButtonRef = useRef<HTMLButtonElement>(null);

  // Parse current expression to extract dice info
  const parsedExpression = DiceService.parseDiceExpression(expression);

  // Build final expression string
  const buildFinalExpression = (): string => {
    let finalExpression = expression;
    
    if (modifier !== 0) {
      finalExpression += `${modifier >= 0 ? '+' : ''}${modifier}`;
    }
    
    if (selectedAttribute && character) {
      finalExpression += `+${selectedAttribute}`;
    }
    
    return finalExpression;
  };

  // Handle dice roll
  const handleRoll = async () => {
    if (!parsedExpression) {
      toast.error('Invalid dice expression');
      return;
    }

    setIsRolling(true);
    
    try {
      // Add animation delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const request: RollRequest = {
        expression: buildFinalExpression(),
        character,
        advantage,
        disadvantage,
        description: description.trim() || undefined,
      };

      const result = DiceService.rollDice(request);
      setLastResult(result);
      onRollComplete(result, request);

      // Show success toast
      toast.success(`Rolled ${result.total}!`, {
        description: result.details,
        duration: 3000,
      });

      // Apply luck glow effect if character has luck
      if (character?.resources.luck && rollButtonRef.current) {
        rollButtonRef.current.classList.add('luck-glow');
        setTimeout(() => {
          rollButtonRef.current?.classList.remove('luck-glow');
        }, 2000);
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to roll dice';
      toast.error('Roll failed', { description: message });
    } finally {
      setIsRolling(false);
    }
  };

  // Handle quick dice selection
  const handleQuickDice = (sides: DiceType, count: number = 1) => {
    setExpression(`${count}d${sides}`);
    setModifier(0);
    setSelectedAttribute('');
    setAdvantage(false);
    setDisadvantage(false);
  };

  // Handle common roll selection
  const handleCommonRoll = (rollExpression: string) => {
    setExpression(rollExpression);
    setModifier(0);
    setSelectedAttribute('');
  };

  // Handle advantage/disadvantage toggle
  const handleAdvantageToggle = (type: 'advantage' | 'disadvantage') => {
    if (type === 'advantage') {
      setAdvantage(!advantage);
      if (!advantage) setDisadvantage(false);
    } else {
      setDisadvantage(!disadvantage);
      if (!disadvantage) setAdvantage(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setExpression('1d20');
    setModifier(0);
    setSelectedAttribute('');
    setAdvantage(false);
    setDisadvantage(false);
    setDescription('');
    setLastResult(null);
  };

  const commonRolls = DiceService.getCommonRolls(character);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <DiceIcon sides={parsedExpression?.sides || 20} isRolling={isRolling} />
            <span>Dice Roller</span>
          </span>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Switch
              checked={quickRollMode}
              onCheckedChange={setQuickRollMode}
            />
            <Label className="text-sm">Quick Mode</Label>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Dice Selection */}
        {quickRollMode && (
          <div className="space-y-3">
            <Label>Quick Dice</Label>
            <div className="grid grid-cols-4 gap-2">
              {([4, 6, 8, 10, 12, 20, 100] as DiceType[]).map(sides => (
                <Button
                  key={sides}
                  variant={parsedExpression?.sides === sides ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleQuickDice(sides)}
                  className="flex items-center space-x-1"
                >
                  <DiceIcon sides={sides} />
                  <span>d{sides}</span>
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickRollMode(false)}
                className="text-xs"
              >
                Custom
              </Button>
            </div>

            {/* Common Rolls */}
            {character && (
              <div className="space-y-2">
                <Label>Quick Rolls</Label>
                <div className="grid grid-cols-2 gap-2">
                  {commonRolls.slice(-6).map((roll, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => handleCommonRoll(roll.expression)}
                      className="text-xs"
                    >
                      {roll.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Custom Expression */}
        {!quickRollMode && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="dice-expression">Dice Expression</Label>
              <Input
                id="dice-expression"
                placeholder="e.g., 3d6+2, 1d20+STR"
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                className={`font-mono ${!DiceService.isValidExpression(expression) ? 'border-destructive' : ''}`}
              />
              {!DiceService.isValidExpression(expression) && (
                <p className="text-sm text-destructive">Invalid dice expression</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="modifier">Modifier</Label>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setModifier(modifier - 1)}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <Input
                    id="modifier"
                    type="number"
                    value={modifier}
                    onChange={(e) => setModifier(parseInt(e.target.value) || 0)}
                    className="text-center font-mono"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setModifier(modifier + 1)}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {character && (
                <div className="space-y-2">
                  <Label htmlFor="attribute">Attribute Bonus</Label>
                  <Select value={selectedAttribute} onValueChange={(value) => setSelectedAttribute(value as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {Object.entries(character.basicAttributes).map(([attr, value]) => (
                        <SelectItem key={attr} value={attr}>
                          {attr} ({value >= 10 ? '+' : ''}{Math.floor((value - 10) / 2)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Advantage/Disadvantage */}
        {parsedExpression?.sides === 20 && parsedExpression?.count === 1 && (
          <div className="space-y-3">
            <Separator />
            <div className="flex items-center justify-around">
              <div className="flex items-center space-x-2">
                <Switch
                  id="advantage"
                  checked={advantage}
                  onCheckedChange={() => handleAdvantageToggle('advantage')}
                />
                <Label htmlFor="advantage" className="flex items-center space-x-1">
                  <Zap className="w-4 h-4 text-emerald-500" />
                  <span>Advantage</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="disadvantage"
                  checked={disadvantage}
                  onCheckedChange={() => handleAdvantageToggle('disadvantage')}
                />
                <Label htmlFor="disadvantage" className="flex items-center space-x-1">
                  <Zap className="w-4 h-4 text-destructive rotate-180" />
                  <span>Disadvantage</span>
                </Label>
              </div>
            </div>
          </div>
        )}

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description (Optional)</Label>
          <Input
            id="description"
            placeholder="e.g., Attack roll, Stealth check"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Final Expression Preview */}
        <div className="bg-muted/50 p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Rolling:</span>
            <code className="font-mono font-bold">{buildFinalExpression()}</code>
          </div>
          {(advantage || disadvantage) && (
            <div className="text-xs text-muted-foreground mt-1">
              {advantage ? 'With Advantage' : 'With Disadvantage'}
            </div>
          )}
          {character?.resources.luck && (
            <div className="text-xs text-primary flex items-center space-x-1 mt-1">
              <Sparkles className="w-3 h-3" />
              <span>Luck bonus will be applied</span>
            </div>
          )}
        </div>

        {/* Roll Button */}
        <Button
          ref={rollButtonRef}
          onClick={handleRoll}
          disabled={isRolling || !DiceService.isValidExpression(expression)}
          className="w-full"
          size="lg"
        >
          {isRolling ? (
            <>
              <DiceIcon sides={parsedExpression?.sides || 20} isRolling={true} />
              <span className="ml-2">Rolling...</span>
            </>
          ) : (
            <>
              <DiceIcon sides={parsedExpression?.sides || 20} />
              <span className="ml-2">Roll Dice</span>
            </>
          )}
        </Button>

        {/* Last Result */}
        {lastResult && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Last Roll</span>
              <Badge variant="outline">{lastResult.expression}</Badge>
            </div>
            <div className="text-2xl font-bold text-center text-primary mb-2">
              {lastResult.total}
            </div>
            <div className="text-xs text-muted-foreground text-center">
              {lastResult.details}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};