import React, { useState } from 'react';
import { User, Heart, Shield, Sparkles, Minus, Plus, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Character } from '../types';
import { CharacterService } from '../services/CharacterService';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { toast } from 'sonner@2.0.3';

interface CharacterCardProps {
  character: Character;
  onCharacterUpdate: (updates: Partial<Character>) => void;
  onClose?: () => void;
  className?: string;
}

export const CharacterCard: React.FC<CharacterCardProps> = ({
  character,
  onCharacterUpdate,
  onClose,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingHP, setIsEditingHP] = useState(false);
  const [tempHP, setTempHP] = useState(character.resources.HP);

  const hpPercentage = (character.resources.HP / character.resources.maxHP) * 100;

  const getHPColor = (percentage: number) => {
    if (percentage <= 25) return 'bg-destructive';
    if (percentage <= 50) return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

  const handleHPChange = (delta: number) => {
    const newHP = Math.max(0, Math.min(character.resources.maxHP, character.resources.HP + delta));
    onCharacterUpdate({
      resources: { ...character.resources, HP: newHP }
    });
    
    if (delta > 0) {
      toast.success(`Healed ${delta} HP`, { duration: 2000 });
    } else {
      toast.error(`Took ${Math.abs(delta)} damage`, { duration: 2000 });
    }
  };

  const handleHPEdit = () => {
    if (isEditingHP) {
      const newHP = Math.max(0, Math.min(character.resources.maxHP, tempHP));
      onCharacterUpdate({
        resources: { ...character.resources, HP: newHP }
      });
      setIsEditingHP(false);
      toast.success('HP updated');
    } else {
      setTempHP(character.resources.HP);
      setIsEditingHP(true);
    }
  };

  const handleHPCancel = () => {
    setTempHP(character.resources.HP);
    setIsEditingHP(false);
  };

  const toggleLuck = () => {
    onCharacterUpdate({
      resources: { ...character.resources, luck: !character.resources.luck }
    });
    toast.success(character.resources.luck ? 'Luck disabled' : 'Luck activated!', {
      duration: 2000,
    });
  };

  return (
    <div className={`fixed top-4 right-4 z-40 ${className}`}>
      <Card className="bg-card/95 backdrop-blur-sm border-2 shadow-lg min-w-[280px]">
        <CardContent className="p-4">
          {/* Collapsed View */}
          {!isExpanded && (
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-primary/20">
                    <ImageWithFallback
                      src={character.characterInfo.characterImage}
                      alt={character.characterInfo.characterName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{character.characterInfo.characterName}</p>
                    <p className="text-xs text-muted-foreground">
                      Level {character.resources.level} {character.characterInfo.class}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  {character.resources.luck && (
                    <Sparkles className="w-4 h-4 text-primary luck-glow" />
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(true)}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* HP Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center space-x-1">
                    <Heart className="w-3 h-3 text-destructive" />
                    <span>HP</span>
                  </span>
                  <span className="font-mono">
                    {character.resources.HP}/{character.resources.maxHP}
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${getHPColor(hpPercentage)}`}
                    style={{ width: `${Math.max(hpPercentage, 0)}%` }}
                  />
                </div>
              </div>

              {/* Quick Stats */}
              <div className="flex justify-between text-xs">
                <span className="flex items-center space-x-1">
                  <Shield className="w-3 h-3" />
                  <span>AC {character.resources.AC}</span>
                </span>
                <Badge variant="outline" className="text-xs">
                  {Math.round(hpPercentage)}% HP
                </Badge>
              </div>
            </div>
          )}

          {/* Expanded View */}
          {isExpanded && (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary/20">
                    <ImageWithFallback
                      src={character.characterInfo.characterImage}
                      alt={character.characterInfo.characterName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-bold">{character.characterInfo.characterName}</p>
                    <p className="text-sm text-muted-foreground">
                      Level {character.resources.level} {character.characterInfo.ancestry} {character.characterInfo.class}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {character.characterInfo.background}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  {onClose && (
                    <Button variant="ghost" size="sm" onClick={onClose}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(false)}
                  >
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* HP Management */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center space-x-2">
                    <Heart className="w-4 h-4 text-destructive" />
                    <span className="font-medium">Health Points</span>
                  </span>
                  <Badge variant={hpPercentage <= 25 ? 'destructive' : 'secondary'}>
                    {Math.round(hpPercentage)}%
                  </Badge>
                </div>

                {/* HP Display/Edit */}
                <div className="flex items-center space-x-2">
                  {isEditingHP ? (
                    <>
                      <Input
                        type="number"
                        value={tempHP}
                        onChange={(e) => setTempHP(parseInt(e.target.value) || 0)}
                        min={0}
                        max={character.resources.maxHP}
                        className="w-20 text-center"
                      />
                      <span className="text-muted-foreground">/{character.resources.maxHP}</span>
                      <Button size="sm" onClick={handleHPEdit}>
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleHPCancel}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleHPChange(-1)}
                        disabled={character.resources.HP <= 0}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <div
                        className="text-lg font-bold cursor-pointer px-2"
                        onClick={handleHPEdit}
                      >
                        {character.resources.HP} / {character.resources.maxHP}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleHPChange(1)}
                        disabled={character.resources.HP >= character.resources.maxHP}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>

                {/* HP Progress Bar */}
                <div className="w-full bg-secondary rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-300 ${getHPColor(hpPercentage)}`}
                    style={{ width: `${Math.max(hpPercentage, 0)}%` }}
                  />
                </div>

                {/* Quick HP Buttons */}
                {!isEditingHP && (
                  <div className="flex justify-center space-x-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleHPChange(-5)}
                      disabled={character.resources.HP <= 0}
                      className="text-xs"
                    >
                      -5
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleHPChange(5)}
                      disabled={character.resources.HP >= character.resources.maxHP}
                      className="text-xs"
                    >
                      +5
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleHPChange(character.resources.maxHP - character.resources.HP)}
                      disabled={character.resources.HP >= character.resources.maxHP}
                      className="text-xs"
                    >
                      Full Heal
                    </Button>
                  </div>
                )}
              </div>

              {/* Core Stats */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center space-x-1">
                    <Shield className="w-3 h-3" />
                    <span>AC</span>
                  </span>
                  <span className="font-bold">{character.resources.AC}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Level</span>
                  <span className="font-bold">{character.resources.level}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Melee</span>
                  <span className="font-mono">
                    {character.resources.meleeAtkBonus >= 0 ? '+' : ''}{character.resources.meleeAtkBonus}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Ranged</span>
                  <span className="font-mono">
                    {character.resources.rangedAtkBonus >= 0 ? '+' : ''}{character.resources.rangedAtkBonus}
                  </span>
                </div>
              </div>

              {/* Luck Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sparkles className={`w-4 h-4 ${character.resources.luck ? 'text-primary luck-glow' : 'text-muted-foreground'}`} />
                  <span className="text-sm">Lucky</span>
                </div>
                <Button
                  variant={character.resources.luck ? 'default' : 'outline'}
                  size="sm"
                  onClick={toggleLuck}
                  className={character.resources.luck ? 'luck-glow' : ''}
                >
                  {character.resources.luck ? 'Active' : 'Inactive'}
                </Button>
              </div>

              {/* Attributes Quick View */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                {Object.entries(character.basicAttributes).map(([attr, value]) => (
                  <div key={attr} className="text-center">
                    <div className="font-medium">{attr}</div>
                    <div className="text-muted-foreground">
                      {CharacterService.calculateModifier(value) >= 0 ? '+' : ''}
                      {CharacterService.calculateModifier(value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};