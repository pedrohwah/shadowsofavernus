import React, { useState } from 'react';
import { Dice6, ChevronUp, ChevronDown, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { DiceService, RollRequest, DiceResult } from '../services/DiceService';
import { useAppContext } from '../contexts/AppContext';
import { toast } from 'sonner@2.0.3';

interface DiceTrayProps {
  onRollComplete: (result: DiceResult, request: RollRequest) => void;
  className?: string;
}

export const DiceTray: React.FC<DiceTrayProps> = ({
  onRollComplete,
  className = '',
}) => {
  const { character } = useAppContext();
  const [isExpanded, setIsExpanded] = useState(false);
  const [expression, setExpression] = useState('1d20');
  const [isRolling, setIsRolling] = useState(false);
  const [lastResult, setLastResult] = useState<number | null>(null);

  // Quick dice options
  const quickDice = [
    { label: 'd4', expression: '1d4' },
    { label: 'd6', expression: '1d6' },
    { label: 'd8', expression: '1d8' },
    { label: 'd10', expression: '1d10' },
    { label: 'd12', expression: '1d12' },
    { label: 'd20', expression: '1d20' },
    { label: 'd100', expression: '1d100' },
  ];

  // Character attribute quick rolls
  const attributeRolls = character ? [
    { label: 'STR', expression: '1d20+STR' },
    { label: 'DEX', expression: '1d20+DEX' },
    { label: 'CON', expression: '1d20+CON' },
    { label: 'INT', expression: '1d20+INT' },
    { label: 'WIS', expression: '1d20+WIS' },
    { label: 'CHA', expression: '1d20+CHA' },
  ] : [];

  const handleQuickRoll = async (rollExpression: string) => {
    if (!DiceService.isValidExpression(rollExpression)) {
      toast.error('Invalid dice expression');
      return;
    }

    setIsRolling(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 300)); // Quick animation
      
      const request: RollRequest = {
        expression: rollExpression,
        character,
      };

      const result = DiceService.rollDice(request);
      setLastResult(result.total);
      onRollComplete(result, request);

      toast.success(`Quick roll: ${result.total}`, {
        description: `${rollExpression} → ${result.details}`,
        duration: 2000,
      });

      // Auto-collapse after roll
      setTimeout(() => setIsExpanded(false), 1000);

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to roll dice';
      toast.error('Roll failed', { description: message });
    } finally {
      setIsRolling(false);
    }
  };

  const handleCustomRoll = async () => {
    if (!DiceService.isValidExpression(expression)) {
      toast.error('Invalid dice expression');
      return;
    }

    setIsRolling(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const request: RollRequest = {
        expression,
        character,
      };

      const result = DiceService.rollDice(request);
      setLastResult(result.total);
      onRollComplete(result, request);

      toast.success(`Rolled ${result.total}!`, {
        description: result.details,
        duration: 3000,
      });

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to roll dice';
      toast.error('Roll failed', { description: message });
    } finally {
      setIsRolling(false);
    }
  };

  return (
    <div className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 ${className}`}>
      <Card className="bg-card/95 backdrop-blur-sm border-2 shadow-lg">
        <CardContent className="p-3">
          {/* Collapsed View */}
          {!isExpanded && (
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(true)}
                className="flex items-center space-x-2"
              >
                <Dice6 className={`w-5 h-5 ${isRolling ? 'dice-rolling' : ''}`} />
                <span>Dice Tray</span>
                <ChevronUp className="w-4 h-4" />
              </Button>
              
              {lastResult && (
                <Badge variant="outline" className="animate-in slide-in-from-bottom">
                  Last: {lastResult}
                </Badge>
              )}
              
              {/* Quick d20 roll */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickRoll('1d20')}
                disabled={isRolling}
              >
                d20
              </Button>
            </div>
          )}

          {/* Expanded View */}
          {isExpanded && (
            <div className="space-y-4 min-w-[400px]">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Dice6 className={`w-5 h-5 ${isRolling ? 'dice-rolling' : ''}`} />
                  <span className="font-medium">Quick Dice Tray</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Quick Dice */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Quick Dice</p>
                <div className="flex flex-wrap gap-1">
                  {quickDice.map((dice) => (
                    <Button
                      key={dice.label}
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickRoll(dice.expression)}
                      disabled={isRolling}
                      className="text-xs h-8"
                    >
                      {dice.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Character Rolls */}
              {character && attributeRolls.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Attribute Rolls</p>
                  <div className="flex flex-wrap gap-1">
                    {attributeRolls.map((roll) => (
                      <Button
                        key={roll.label}
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickRoll(roll.expression)}
                        disabled={isRolling}
                        className="text-xs h-8"
                      >
                        {roll.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Expression */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Custom Roll</p>
                <div className="flex items-center space-x-2">
                  <Input
                    placeholder="e.g., 3d6+2"
                    value={expression}
                    onChange={(e) => setExpression(e.target.value)}
                    className={`text-sm font-mono ${!DiceService.isValidExpression(expression) ? 'border-destructive' : ''}`}
                  />
                  <Button
                    onClick={handleCustomRoll}
                    disabled={isRolling || !DiceService.isValidExpression(expression)}
                    size="sm"
                  >
                    Roll
                  </Button>
                </div>
              </div>

              {/* Last Result */}
              {lastResult && (
                <div className="text-center p-2 bg-primary/10 rounded border border-primary/20">
                  <p className="text-xs text-muted-foreground">Last Roll</p>
                  <p className="text-lg font-bold text-primary">{lastResult}</p>
                </div>
              )}

              {/* Collapse */}
              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(false)}
                  className="text-xs"
                >
                  <ChevronDown className="w-4 h-4 mr-1" />
                  Collapse
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};