import React, { useState, useEffect } from 'react';
import { Crown, Users, Clock, Dice6, Copy, RefreshCw, LogOut, Swords, FileText, Settings } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { useAppContext } from '../contexts/AppContext';
import { SessionService } from '../services/SessionService';
import { CharacterService } from '../services/CharacterService';
import { DiceService, DiceResult, RollRequest } from '../services/DiceService';
import { DiceRoller } from './DiceRoller';
import { DiceBox } from './DiceBox';
import { DiceTray } from './DiceTray';
import { PlayerList } from './PlayerList';
import { TorchIndicator } from './TorchIndicator';
import { InitiativeTracker } from './InitiativeTracker';
import { Character, DiceRoll } from '../types';
import { toast } from 'sonner@2.0.3';

const GMLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-sm font-medium text-muted-foreground mb-1">{children}</div>
);

export const GMPanel: React.FC = () => {
  const { session, user, setState, setSession } = useAppContext();
  const [sessionAge, setSessionAge] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [diceRolls, setDiceRolls] = useState<DiceRoll[]>([]);
  const [sessionCharacters, setSessionCharacters] = useState<Character[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Floating component toggles
  const [showPlayerList, setShowPlayerList] = useState(true);
  const [showTorchIndicator, setShowTorchIndicator] = useState(true);
  const [showDiceTray, setShowDiceTray] = useState(true);

  // Update session age display and load data
  useEffect(() => {
    const updateAge = () => {
      if (session) {
        const sessionStart = parseInt(session.gmId.split('-')[1]) || Date.now();
        const ageMs = Date.now() - sessionStart;
        const ageMinutes = Math.floor(ageMs / 60000);
        const ageHours = Math.floor(ageMinutes / 60);
        
        if (ageHours > 0) {
          setSessionAge(`${ageHours}h ${ageMinutes % 60}m`);
        } else {
          setSessionAge(`${ageMinutes}m`);
        }
      }
    };

    updateAge();
    const interval = setInterval(updateAge, 60000);

    // Load session data
    if (session) {
      const rollHistory = DiceService.getRollHistory(session.id);
      setDiceRolls(rollHistory);
      
      const characters = CharacterService.getCharactersBySession(session.id);
      setSessionCharacters(characters);
    }

    return () => clearInterval(interval);
  }, [session]);

  const handleCopyToken = async () => {
    if (!session?.id) return;
    
    try {
      await navigator.clipboard.writeText(session.id);
      toast.success('Session token copied to clipboard!', {
        description: 'Share this with your players',
      });
    } catch (error) {
      toast.error('Failed to copy token', {
        description: 'Please copy manually: ' + session.id,
      });
    }
  };

  const handleRefreshSession = async () => {
    setIsRefreshing(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      SessionService.updateActivity();
      toast.success('Session refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh session');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLeaveSession = async () => {
    if (!user || !session) return;
    
    try {
      await SessionService.leaveSession(user.id, session.id);
      toast.success('Session ended successfully');
      setState('start');
    } catch (error) {
      toast.error('Failed to end session');
    }
  };

  const handleSessionUpdate = (updates: Partial<typeof session>) => {
    if (session) {
      const updatedSession = { ...session, ...updates };
      setSession(updatedSession);
    }
  };

  const handleDiceRoll = (result: DiceResult, request: RollRequest) => {
    if (!user || !session) return;

    // Create dice roll record with string details
    const diceRoll: DiceRoll = {
      id: `roll-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sessionId: session.id,
      characterId: user.id,
      rollerUsername: user.username + ' (GM)',
      expression: request.expression,
      result: result.total,
      details: result.details,
      timestamp: result.timestamp,
    };

    // Add to local state
    setDiceRolls(prev => [...prev, diceRoll]);
    
    // Save to session history
    DiceService.saveDiceRoll(session.id, diceRoll);

    // Show tab notification if not on dice tab
    if (activeTab !== 'dice') {
      toast.success(`GM roll: ${result.total}`, {
        description: 'All players can see this roll',
        action: {
          label: 'View',
          onClick: () => setActiveTab('dice'),
        },
      });
    }
  };

  const handleClearDiceHistory = () => {
    if (session) {
      DiceService.clearSessionHistory(session.id);
      setDiceRolls([]);
      toast.success('Dice history cleared for all players');
    }
  };

  const getSessionStatus = () => {
    if (!session) return 'Unknown';
    const playerCount = session.players.length;
    if (playerCount === 0) return 'Waiting for players';
    if (playerCount === 1) return 'Ready to start';
    return 'Active session';
  };

  const getCharacterHealthSummary = () => {
    const totalCharacters = sessionCharacters.length;
    const healthyCharacters = sessionCharacters.filter(char => 
      (char.resources.HP / char.resources.maxHP) > 0.5
    ).length;
    const woundedCharacters = sessionCharacters.filter(char => {
      const percentage = char.resources.HP / char.resources.maxHP;
      return percentage > 0.25 && percentage <= 0.5;
    }).length;
    const criticalCharacters = sessionCharacters.filter(char => {
      const percentage = char.resources.HP / char.resources.maxHP;
      return percentage > 0 && percentage <= 0.25;
    }).length;
    const downCharacters = sessionCharacters.filter(char => char.resources.HP <= 0).length;

    return { totalCharacters, healthyCharacters, woundedCharacters, criticalCharacters, downCharacters };
  };

  const healthSummary = getCharacterHealthSummary();

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Crown className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Game Master Panel</h1>
              <p className="text-muted-foreground">Welcome, {user?.username}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefreshSession}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleLeaveSession}>
              <LogOut className="w-4 h-4 mr-2" />
              End Session
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center space-x-2">
              <Crown className="w-4 h-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="dice" className="flex items-center space-x-2">
              <Dice6 className="w-4 h-4" />
              <span className="hidden sm:inline">Dice</span>
              {diceRolls.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {diceRolls.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="combat" className="flex items-center space-x-2">
              <Swords className="w-4 h-4" />
              <span className="hidden sm:inline">Combat</span>
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Notes</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="space-y-6">
              {/* Session Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="w-5 h-5" />
                    <span>Session Information</span>
                  </CardTitle>
                  <CardDescription>
                    Share this token with your players to let them join the session
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <GMLabel>Session Token</GMLabel>
                      <div className="flex items-center space-x-2">
                        <div className="text-2xl font-mono font-bold text-primary">
                          {session?.id || 'Loading...'}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopyToken}
                          disabled={!session?.id}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">
                        {session?.players.length || 0} Players Connected
                      </Badge>
                      <Badge variant="outline">
                        Session Age: {sessionAge}
                      </Badge>
                      <Badge variant={session?.players.length === 0 ? 'outline' : 'default'}>
                        {getSessionStatus()}
                      </Badge>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="text-sm text-muted-foreground">
                    <p>Session ID: {session?.id}</p>
                    <p>Created: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Users className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Active Players</p>
                        <p className="text-xl font-bold">{session?.players.length || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Torch Status</p>
                        <p className="text-xl font-bold">
                          {session?.torchState.isRunning ? 'Active' : 'Inactive'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Dice6 className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Total Rolls</p>
                        <p className="text-xl font-bold">{diceRolls.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Crown className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Characters</p>
                        <p className="text-xl font-bold">{healthSummary.totalCharacters}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Character Health Overview */}
              {sessionCharacters.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Character Health Overview</CardTitle>
                    <CardDescription>
                      Health status of all player characters in the session
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-emerald-600">{healthSummary.healthyCharacters}</div>
                        <div className="text-sm text-muted-foreground">Healthy</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">{healthSummary.woundedCharacters}</div>
                        <div className="text-sm text-muted-foreground">Wounded</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-destructive">{healthSummary.criticalCharacters}</div>
                        <div className="text-sm text-muted-foreground">Critical</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-muted-foreground">{healthSummary.downCharacters}</div>
                        <div className="text-sm text-muted-foreground">Down</div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {sessionCharacters.map((character) => {
                        const hpPercentage = (character.resources.HP / character.resources.maxHP) * 100;
                        const getStatusColor = () => {
                          if (hpPercentage <= 0) return 'destructive';
                          if (hpPercentage <= 25) return 'destructive';
                          if (hpPercentage <= 50) return 'secondary';
                          return 'default';
                        };
                        
                        return (
                          <div key={character.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div>
                                <span className="font-medium">{character.characterInfo.characterName}</span>
                                <p className="text-sm text-muted-foreground">
                                  Level {character.resources.level} {character.characterInfo.class}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <div className="text-right">
                                <div className="font-mono text-sm">
                                  {character.resources.HP} / {character.resources.maxHP}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  AC: {character.resources.AC}
                                </div>
                              </div>
                              <Badge variant={getStatusColor() as any}>
                                {hpPercentage <= 0 ? 'Down' :
                                 hpPercentage <= 25 ? 'Critical' :
                                 hpPercentage <= 50 ? 'Wounded' : 'Healthy'}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Player List */}
              {session && session.players.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Connected Players</CardTitle>
                    <CardDescription>
                      Players currently in your session
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {session.players.map((playerId, index) => {
                        const character = sessionCharacters.find(char => char.userId === playerId);
                        return (
                          <div key={playerId} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                              <div>
                                <span>Player {index + 1}</span>
                                {character && (
                                  <p className="text-sm text-muted-foreground">
                                    Playing: {character.characterInfo.characterName}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Badge variant="outline">Online</Badge>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="dice">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DiceRoller
                onRollComplete={handleDiceRoll}
              />
              <DiceBox
                rolls={diceRolls}
                onClearHistory={handleClearDiceHistory}
                maxHeight="500px"
              />
            </div>
          </TabsContent>

          <TabsContent value="combat">
            <InitiativeTracker sessionCharacters={sessionCharacters} />
          </TabsContent>

          <TabsContent value="notes">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>Session Notes</span>
                </CardTitle>
                <CardDescription>
                  Campaign notes and session management tools
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3>Session Notes</h3>
                  <p className="text-muted-foreground mb-4">
                    Advanced note-taking and campaign management tools coming soon
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Button variant="outline" disabled>
                      Campaign Notes
                    </Button>
                    <Button variant="outline" disabled>
                      NPC Database
                    </Button>
                    <Button variant="outline" disabled>
                      Location Notes
                    </Button>
                    <Button variant="outline" disabled>
                      Plot Tracker
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Floating Components</CardTitle>
                  <CardDescription>
                    Control which floating interface elements are visible
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="gm-player-list">Player List</Label>
                        <p className="text-sm text-muted-foreground">
                          Shows all connected session participants
                        </p>
                      </div>
                      <Switch
                        id="gm-player-list"
                        checked={showPlayerList}
                        onCheckedChange={setShowPlayerList}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="gm-torch-indicator">Torch Timer</Label>
                        <p className="text-sm text-muted-foreground">
                          Shows torch countdown timer with GM controls
                        </p>
                      </div>
                      <Switch
                        id="gm-torch-indicator"
                        checked={showTorchIndicator}
                        onCheckedChange={setShowTorchIndicator}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="gm-dice-tray">Dice Tray</Label>
                        <p className="text-sm text-muted-foreground">
                          Quick access dice rolling interface
                        </p>
                      </div>
                      <Switch
                        id="gm-dice-tray"
                        checked={showDiceTray}
                        onCheckedChange={setShowDiceTray}
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <Button onClick={() => toast.success('Settings saved!')}>
                      Save Preferences
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Session Management</CardTitle>
                  <CardDescription>
                    Advanced session controls and management options
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Button variant="outline" onClick={handleRefreshSession} disabled={isRefreshing}>
                      <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                      Refresh Session
                    </Button>
                    <Button variant="outline" onClick={handleCopyToken}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Token
                    </Button>
                    <Button variant="outline" disabled>
                      Export Session
                    </Button>
                    <Button variant="outline" disabled>
                      Backup Data
                    </Button>
                    <Button variant="outline" disabled>
                      Player Permissions
                    </Button>
                    <Button variant="destructive" onClick={handleLeaveSession}>
                      <LogOut className="w-4 h-4 mr-2" />
                      End Session
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Floating Components */}
      {session && showPlayerList && (
        <PlayerList
          session={session}
          sessionCharacters={sessionCharacters}
          currentUserId={user?.id}
        />
      )}

      {session && showTorchIndicator && (
        <TorchIndicator
          session={session}
          onSessionUpdate={handleSessionUpdate}
          isGM={true}
        />
      )}

      {showDiceTray && (
        <DiceTray onRollComplete={handleDiceRoll} />
      )}
    </div>
  );
};