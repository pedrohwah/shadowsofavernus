import React, { useState } from 'react';
import { Users, Crown, User, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Session, Character } from '../types';

interface PlayerListProps {
  session: Session;
  sessionCharacters?: Character[];
  currentUserId?: string;
  onClose?: () => void;
  className?: string;
}

export const PlayerList: React.FC<PlayerListProps> = ({
  session,
  sessionCharacters = [],
  currentUserId,
  onClose,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get character for a player ID
  const getCharacterForPlayer = (playerId: string): Character | undefined => {
    return sessionCharacters.find(char => char.userId === playerId);
  };

  // Generate player initials
  const getPlayerInitials = (playerId: string, character?: Character): string => {
    if (character) {
      return character.characterInfo.characterName
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return playerId.slice(0, 2).toUpperCase();
  };

  // Get player display name
  const getPlayerDisplayName = (playerId: string, character?: Character): string => {
    if (character) {
      return character.characterInfo.characterName;
    }
    return `Player ${playerId.slice(-4)}`;
  };

  // Get player status
  const getPlayerStatus = (playerId: string, character?: Character): string => {
    if (character) {
      const hpPercentage = (character.resources.HP / character.resources.maxHP) * 100;
      if (hpPercentage <= 0) return 'Down';
      if (hpPercentage <= 25) return 'Critical';
      if (hpPercentage <= 50) return 'Wounded';
      return 'Healthy';
    }
    return 'Connected';
  };

  // Get status color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Down': return 'destructive';
      case 'Critical': return 'destructive';
      case 'Wounded': return 'secondary';
      case 'Healthy': return 'default';
      default: return 'outline';
    }
  };

  const totalPlayers = session.players.length + 1; // +1 for GM

  return (
    <div className={`fixed top-4 left-4 z-40 ${className}`}>
      <Card className="bg-card/95 backdrop-blur-sm border-2 shadow-lg">
        <CardContent className="p-3">
          {/* Collapsed View */}
          {!isExpanded && (
            <div className="flex items-center justify-between min-w-[160px]">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">
                  {totalPlayers} Connected
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <Badge variant="outline" className="text-xs">
                  {session.players.length}P + GM
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(true)}
                >
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Expanded View */}
          {isExpanded && (
            <div className="space-y-4 min-w-[250px]">
              {/* Header */}
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>Session Players</span>
                </CardTitle>
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

              {/* GM Entry */}
              <div className="flex items-center space-x-3 p-2 bg-primary/10 rounded-lg border border-primary/20">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Crown className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-sm">Game Master</span>
                    <Badge variant="default" className="text-xs">GM</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Session: {session.id}</p>
                </div>
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              </div>

              {/* Players List */}
              <div className="space-y-2">
                {session.players.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No players connected</p>
                    <p className="text-xs">Share the session token to invite players</p>
                  </div>
                ) : (
                  session.players.map((playerId, index) => {
                    const character = getCharacterForPlayer(playerId);
                    const status = getPlayerStatus(playerId, character);
                    const isCurrentUser = playerId === currentUserId;
                    
                    return (
                      <div 
                        key={playerId}
                        className={`flex items-center space-x-3 p-2 rounded-lg ${
                          isCurrentUser ? 'bg-secondary/50 border border-secondary' : 'bg-muted/30'
                        }`}
                      >
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className={character ? 'bg-primary/10' : 'bg-muted'}>
                            {character ? (
                              getPlayerInitials(playerId, character)
                            ) : (
                              <User className="w-4 h-4" />
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-sm">
                              {getPlayerDisplayName(playerId, character)}
                            </span>
                            {isCurrentUser && (
                              <Badge variant="outline" className="text-xs">You</Badge>
                            )}
                          </div>
                          {character ? (
                            <p className="text-xs text-muted-foreground">
                              Level {character.resources.level} {character.characterInfo.class} • 
                              HP: {character.resources.HP}/{character.resources.maxHP}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              Player {index + 1} • No character
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          <Badge variant={getStatusColor(status) as any} className="text-xs">
                            {status}
                          </Badge>
                          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Session Info */}
              <div className="pt-2 border-t border-border">
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>Session ID:</span>
                    <span className="font-mono">{session.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Connected:</span>
                    <span>{totalPlayers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Characters:</span>
                    <span>{sessionCharacters.length}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};