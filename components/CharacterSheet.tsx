import React from 'react';
import { User, Heart, Shield, Sword, Sparkles, Edit3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { Character } from '../types';
import { CharacterService } from '../services/CharacterService';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface CharacterSheetProps {
  character: Character;
  isOwner?: boolean;
  onEdit?: () => void;
}

export const CharacterSheet: React.FC<CharacterSheetProps> = ({
  character,
  isOwner = false,
  onEdit,
}) => {
  const hpPercentage = (character.resources.HP / character.resources.maxHP) * 100;

  const getHPColor = (percentage: number) => {
    if (percentage <= 25) return 'bg-destructive';
    if (percentage <= 50) return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

  const AttributeDisplay: React.FC<{ label: string; value: number }> = ({ label, value }) => {
    const modifier = CharacterService.calculateModifier(value);
    return (
      <div className="text-center space-y-1">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-sm text-muted-foreground">
          {modifier >= 0 ? '+' : ''}{modifier}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Character Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-primary/20">
                <ImageWithFallback
                  src={character.characterInfo.characterImage}
                  alt={character.characterInfo.characterName}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <CardTitle className="text-2xl flex items-center space-x-2">
                  <span>{character.characterInfo.characterName}</span>
                  {character.resources.luck && (
                    <Sparkles className="w-5 h-5 text-primary luck-glow" />
                  )}
                </CardTitle>
                <CardDescription className="space-y-1">
                  <div>Level {character.resources.level} {character.characterInfo.ancestry} {character.characterInfo.class}</div>
                  <div>Player: {character.characterInfo.playerName}</div>
                  <div>{character.characterInfo.background}</div>
                  {character.characterInfo.deity && (
                    <div>Deity: {character.characterInfo.deity}</div>
                  )}
                </CardDescription>
              </div>
            </div>
            {isOwner && onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit3 className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Core Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Health */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Heart className="w-5 h-5 text-destructive" />
              <span className="font-medium">Health Points</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {character.resources.HP} / {character.resources.maxHP}
                </span>
                <Badge variant={hpPercentage <= 25 ? 'destructive' : 'secondary'}>
                  {Math.round(hpPercentage)}%
                </Badge>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getHPColor(hpPercentage)}`}
                  style={{ width: `${Math.max(hpPercentage, 0)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Armor Class */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Shield className="w-5 h-5 text-primary" />
              <span className="font-medium">Armor Class</span>
            </div>
            <div className="text-3xl font-bold text-center">
              {character.resources.AC}
            </div>
          </CardContent>
        </Card>

        {/* Combat Bonuses */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Sword className="w-5 h-5 text-primary" />
              <span className="font-medium">Attack Bonuses</span>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Melee:</span>
                <span className="font-mono">
                  {character.resources.meleeAtkBonus >= 0 ? '+' : ''}{character.resources.meleeAtkBonus}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Ranged:</span>
                <span className="font-mono">
                  {character.resources.rangedAtkBonus >= 0 ? '+' : ''}{character.resources.rangedAtkBonus}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Spell:</span>
                <span className="font-mono">
                  {character.resources.spellcastingBonus >= 0 ? '+' : ''}{character.resources.spellcastingBonus}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attributes */}
      <Card>
        <CardHeader>
          <CardTitle>Ability Scores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            <AttributeDisplay label="STR" value={character.basicAttributes.STR} />
            <AttributeDisplay label="DEX" value={character.basicAttributes.DEX} />
            <AttributeDisplay label="CON" value={character.basicAttributes.CON} />
            <AttributeDisplay label="INT" value={character.basicAttributes.INT} />
            <AttributeDisplay label="WIS" value={character.basicAttributes.WIS} />
            <AttributeDisplay label="CHA" value={character.basicAttributes.CHA} />
          </div>
        </CardContent>
      </Card>

      {/* Equipment Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Weapons */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Sword className="w-5 h-5" />
              <span>Weapons</span>
              <Badge variant="outline">{character.weapons.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {character.weapons.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No weapons equipped</p>
            ) : (
              <div className="space-y-2">
                {character.weapons.map((weapon, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <div>
                      <p className="font-medium">{weapon.name}</p>
                      <p className="text-sm text-muted-foreground">{weapon.damage} • {weapon.type}</p>
                    </div>
                    <Badge variant="outline">{weapon.slots} slots</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Armor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>Armor</span>
              <Badge variant="outline">{character.armor.filter(a => a.equipped).length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {character.armor.filter(a => a.equipped).length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No armor equipped</p>
            ) : (
              <div className="space-y-2">
                {character.armor.filter(a => a.equipped).map((armor, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <div>
                      <p className="font-medium">{armor.name}</p>
                      <p className="text-sm text-muted-foreground">Base AC: {armor.baseAC}</p>
                    </div>
                    <Badge variant="outline">{armor.slots} slots</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Spells and Talents */}
      {(character.spells.length > 0 || character.talents.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {character.spells.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5" />
                  <span>Spells</span>
                  <Badge variant="outline">{character.spells.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {character.spells.map((spell, index) => (
                    <div key={index} className="p-2 bg-muted/50 rounded">
                      <p>{spell}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {character.talents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span>Talents</span>
                  <Badge variant="outline">{character.talents.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {character.talents.map((talent, index) => (
                    <div key={index} className="p-2 bg-muted/50 rounded">
                      <p>{talent}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};