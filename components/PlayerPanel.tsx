import React, { useState, useEffect } from 'react';
import { User, Package, BookOpen, Plus, Users, Dice6, Settings } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { useAppContext } from '../contexts/AppContext';
import { CharacterService } from '../services/CharacterService';
import { DiceService, DiceResult, RollRequest } from '../services/DiceService';
import { CharacterCreation } from './CharacterCreation';
import { CharacterSheet } from './CharacterSheet';
import { DiceRoller } from './DiceRoller';
import { DiceBox } from './DiceBox';
import { DiceTray } from './DiceTray';
import { CharacterCard } from './CharacterCard';
import { PlayerList } from './PlayerList';
import { TorchIndicator } from './TorchIndicator';
import { InventoryManager } from './InventoryManager';
import { CharacterJournal } from './CharacterJournal';
import { Character, DiceRoll } from '../types';
import { toast } from 'sonner@2.0.3';

type PanelView = 'character-list' | 'character-creation' | 'character-sheet';

export const PlayerPanel: React.FC = () => {
  const { user, session, character, setCharacter, setState, setSession } = useAppContext();
  const [currentView, setCurrentView] = useState<PanelView>('character-list');
  const [userCharacters, setUserCharacters] = useState<Character[]>([]);
  const [sessionCharacters, setSessionCharacters] = useState<Character[]>([]);
  const [diceRolls, setDiceRolls] = useState<DiceRoll[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('character');
  
  // Floating component toggles
  const [showCharacterCard, setShowCharacterCard] = useState(true);
  const [showPlayerList, setShowPlayerList] = useState(true);
  const [showTorchIndicator, setShowTorchIndicator] = useState(true);
  const [showDiceTray, setShowDiceTray] = useState(true);

  // Load user's characters and session data
  useEffect(() => {
    if (user && session) {
      const characters = CharacterService.getCharactersByUser(user.id);
      setUserCharacters(characters);
      
      // Load all session characters for player list
      const allSessionCharacters = CharacterService.getCharactersBySession(session.id);
      setSessionCharacters(allSessionCharacters);
      
      // Load dice roll history for this session
      const rollHistory = DiceService.getRollHistory(session.id);
      setDiceRolls(rollHistory);
      
      // If user has a character in this session, auto-select it
      const sessionCharacter = characters.find(char => char.sessionId === session.id);
      if (sessionCharacter && !character) {
        setCharacter(sessionCharacter);
        setCurrentView('character-sheet');
      } else if (!sessionCharacter && characters.length === 0) {
        setCurrentView('character-list');
      } else if (character) {
        setCurrentView('character-sheet');
      }
    }
    setIsLoading(false);
  }, [user, session, character, setCharacter]);

  const handleBackToStart = () => {
    setState('start');
  };

  const handleCharacterCreated = (newCharacter: Character) => {
    setCharacter(newCharacter);
    setUserCharacters(prev => [...prev, newCharacter]);
    setSessionCharacters(prev => [...prev, newCharacter]);
    setCurrentView('character-sheet');
    toast.success('Character created successfully!');
  };

  const handleSelectCharacter = (characterId: string) => {
    const selectedCharacter = userCharacters.find(char => char.id === characterId);
    if (selectedCharacter) {
      setCharacter(selectedCharacter);
      setCurrentView('character-sheet');
    }
  };

  const handleEditCharacter = () => {
    toast.info('Character editing coming soon!');
  };

  const handleCharacterUpdate = async (updates: Partial<Character>) => {
    if (!character) return;
    
    try {
      const updatedCharacter = await CharacterService.updateCharacter(character.id, updates);
      setCharacter(updatedCharacter);
      
      // Update character in lists
      setUserCharacters(prev => prev.map(char => 
        char.id === character.id ? updatedCharacter : char
      ));
      setSessionCharacters(prev => prev.map(char => 
        char.id === character.id ? updatedCharacter : char
      ));
      
    } catch (error) {
      toast.error('Failed to update character');
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
      characterId: character?.id || user.id,
      rollerUsername: user.username,
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
      toast.success(`Dice rolled: ${result.total}`, {
        description: 'Check the Dice tab for details',
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
      toast.success('Dice history cleared');
    }
  };

  const renderCharacterList = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2>Your Characters</h2>
        <p className="text-muted-foreground">
          Choose a character for this session or create a new one
        </p>
      </div>

      {userCharacters.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3>No Characters Yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first character to begin your adventure
            </p>
            <Button onClick={() => setCurrentView('character-creation')}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Character
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userCharacters.map((char) => (
              <Card 
                key={char.id} 
                className={`cursor-pointer transition-colors hover:border-primary/50 ${
                  character?.id === char.id ? 'border-primary' : ''
                }`}
                onClick={() => handleSelectCharacter(char.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{char.characterInfo.characterName}</CardTitle>
                    {char.sessionId === session?.id && (
                      <Badge variant="default">Active</Badge>
                    )}
                  </div>
                  <CardDescription>
                    Level {char.resources.level} {char.characterInfo.ancestry} {char.characterInfo.class}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>HP:</span>
                      <span>{char.resources.HP}/{char.resources.maxHP}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>AC:</span>
                      <span>{char.resources.AC}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Background:</span>
                      <span>{char.characterInfo.background}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Button 
              variant="outline" 
              onClick={() => setCurrentView('character-creation')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Character
            </Button>
          </div>
        </>
      )}
    </div>
  );

  const renderMainInterface = () => (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="character" className="flex items-center space-x-2">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Character</span>
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
          <TabsTrigger value="inventory" className="flex items-center space-x-2">
            <Package className="w-4 h-4" />
            <span className="hidden sm:inline">Inventory</span>
          </TabsTrigger>
          <TabsTrigger value="journal" className="flex items-center space-x-2">
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Journal</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="character">
          {character ? (
            <CharacterSheet 
              character={character} 
              isOwner={true}
              onEdit={handleEditCharacter}
            />
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3>No Character Selected</h3>
                <p className="text-muted-foreground mb-4">
                  Select or create a character to view the character sheet
                </p>
                <Button onClick={() => setCurrentView('character-list')}>
                  Select Character
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="dice">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DiceRoller
              character={character}
              onRollComplete={handleDiceRoll}
            />
            <DiceBox
              rolls={diceRolls}
              onClearHistory={handleClearDiceHistory}
              maxHeight="500px"
            />
          </div>
        </TabsContent>

        <TabsContent value="inventory">
          {character ? (
            <InventoryManager
              character={character}
              onCharacterUpdate={handleCharacterUpdate}
            />
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3>No Character Selected</h3>
                <p className="text-muted-foreground mb-4">
                  Select a character to manage their inventory
                </p>
                <Button onClick={() => setCurrentView('character-list')}>
                  Select Character
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="journal">
          {character ? (
            <CharacterJournal
              character={character}
              onCharacterUpdate={handleCharacterUpdate}
            />
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3>No Character Selected</h3>
                <p className="text-muted-foreground mb-4">
                  Select a character to write in their journal
                </p>
                <Button onClick={() => setCurrentView('character-list')}>
                  Select Character
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="settings">
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
                    <Label htmlFor="character-card">Character Card</Label>
                    <p className="text-sm text-muted-foreground">
                      Shows character health and quick actions
                    </p>
                  </div>
                  <Switch
                    id="character-card"
                    checked={showCharacterCard}
                    onCheckedChange={setShowCharacterCard}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="player-list">Player List</Label>
                    <p className="text-sm text-muted-foreground">
                      Shows all connected session participants
                    </p>
                  </div>
                  <Switch
                    id="player-list"
                    checked={showPlayerList}
                    onCheckedChange={setShowPlayerList}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="torch-indicator">Torch Timer</Label>
                    <p className="text-sm text-muted-foreground">
                      Shows torch countdown timer
                    </p>
                  </div>
                  <Switch
                    id="torch-indicator"
                    checked={showTorchIndicator}
                    onCheckedChange={setShowTorchIndicator}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="dice-tray">Dice Tray</Label>
                    <p className="text-sm text-muted-foreground">
                      Quick access dice rolling interface
                    </p>
                  </div>
                  <Switch
                    id="dice-tray"
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
        </TabsContent>
      </Tabs>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading characters...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <User className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Player Panel</h1>
              <p className="text-sm text-muted-foreground">
                {user?.username} • Session: {session?.id}
                {character && ` • Playing: ${character.characterInfo.characterName}`}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {character && currentView === 'character-sheet' && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentView('character-list')}
              >
                <Users className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Characters</span>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleBackToStart}>
              Leave Session
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-4 pb-20">
        {currentView === 'character-list' && renderCharacterList()}
        {currentView === 'character-creation' && (
          <CharacterCreation 
            onCharacterCreated={handleCharacterCreated}
            onCancel={() => setCurrentView('character-list')}
          />
        )}
        {currentView === 'character-sheet' && renderMainInterface()}
      </div>

      {/* Floating Components */}
      {currentView === 'character-sheet' && character && showCharacterCard && (
        <CharacterCard
          character={character}
          onCharacterUpdate={handleCharacterUpdate}
        />
      )}

      {currentView === 'character-sheet' && session && showPlayerList && (
        <PlayerList
          session={session}
          sessionCharacters={sessionCharacters}
          currentUserId={user?.id}
        />
      )}

      {currentView === 'character-sheet' && session && showTorchIndicator && (
        <TorchIndicator
          session={session}
          onSessionUpdate={handleSessionUpdate}
          isGM={false}
        />
      )}

      {currentView === 'character-sheet' && showDiceTray && (
        <DiceTray onRollComplete={handleDiceRoll} />
      )}
    </div>
  );
};