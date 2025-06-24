import React, { useState, useEffect } from 'react';
import { Swords, Plus, Play, Pause, SkipForward, Trash2, Edit3, Save, X, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Progress } from './ui/progress';
import { Character } from '../types';
import { toast } from 'sonner@2.0.3';

interface InitiativeEntry {
  id: string;
  name: string;
  initiative: number;
  maxHP: number;
  currentHP: number;
  ac: number;
  type: 'player' | 'npc' | 'monster';
  characterId?: string;
  notes?: string;
}

interface InitiativeTrackerProps {
  sessionCharacters: Character[];
  className?: string;
}

const INITIATIVE_STORAGE_KEY = 'rpg-tool-initiative-tracker';

export const InitiativeTracker: React.FC<InitiativeTrackerProps> = ({
  sessionCharacters,
  className = '',
}) => {
  const [initiativeList, setInitiativeList] = useState<InitiativeEntry[]>([]);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [roundNumber, setRoundNumber] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<InitiativeEntry | null>(null);
  const [newEntry, setNewEntry] = useState<Partial<InitiativeEntry>>({
    name: '',
    initiative: 0,
    maxHP: 1,
    currentHP: 1,
    ac: 10,
    type: 'npc',
  });

  // Load initiative data from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(INITIATIVE_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        setInitiativeList(data.initiativeList || []);
        setCurrentTurn(data.currentTurn || 0);
        setRoundNumber(data.roundNumber || 1);
        setIsRunning(data.isRunning || false);
      }
    } catch (error) {
      console.warn('Failed to load initiative data:', error);
    }
  }, []);

  // Save initiative data to localStorage
  const saveInitiativeData = (list: InitiativeEntry[], turn: number, round: number, running: boolean) => {
    try {
      const data = {
        initiativeList: list,
        currentTurn: turn,
        roundNumber: round,
        isRunning: running,
      };
      localStorage.setItem(INITIATIVE_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save initiative data:', error);
    }
  };

  // Add player characters to initiative
  const addPlayerCharacters = () => {
    const playerEntries: InitiativeEntry[] = sessionCharacters.map(character => ({
      id: `player-${character.id}`,
      name: character.characterInfo.characterName,
      initiative: 0, // Will need to be rolled
      maxHP: character.resources.maxHP,
      currentHP: character.resources.HP,
      ac: character.resources.AC,
      type: 'player' as const,
      characterId: character.id,
    }));

    const updatedList = [...initiativeList, ...playerEntries].filter((entry, index, self) => 
      index === self.findIndex(e => e.id === entry.id)
    );

    setInitiativeList(updatedList);
    saveInitiativeData(updatedList, currentTurn, roundNumber, isRunning);
    toast.success(`Added ${playerEntries.length} player characters`);
  };

  const handleAddEntry = () => {
    if (!newEntry.name?.trim()) {
      toast.error('Please enter a name');
      return;
    }

    const entry: InitiativeEntry = {
      id: `entry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: newEntry.name,
      initiative: newEntry.initiative || 0,
      maxHP: newEntry.maxHP || 1,
      currentHP: newEntry.currentHP || newEntry.maxHP || 1,
      ac: newEntry.ac || 10,
      type: newEntry.type || 'npc',
      notes: newEntry.notes,
    };

    const updatedList = [...initiativeList, entry].sort((a, b) => b.initiative - a.initiative);
    setInitiativeList(updatedList);
    saveInitiativeData(updatedList, currentTurn, roundNumber, isRunning);
    
    setNewEntry({ name: '', initiative: 0, maxHP: 1, currentHP: 1, ac: 10, type: 'npc' });
    setIsAddEntryOpen(false);
    toast.success('Entry added to initiative');
  };

  const handleEditEntry = (entry: InitiativeEntry) => {
    setEditingEntry({ ...entry });
  };

  const handleSaveEdit = () => {
    if (!editingEntry) return;

    const updatedList = initiativeList.map(entry =>
      entry.id === editingEntry.id ? editingEntry : entry
    ).sort((a, b) => b.initiative - a.initiative);

    setInitiativeList(updatedList);
    saveInitiativeData(updatedList, currentTurn, roundNumber, isRunning);
    setEditingEntry(null);
    toast.success('Entry updated');
  };

  const handleDeleteEntry = (entryId: string) => {
    const updatedList = initiativeList.filter(entry => entry.id !== entryId);
    const newCurrentTurn = currentTurn >= updatedList.length ? 0 : currentTurn;
    
    setInitiativeList(updatedList);
    setCurrentTurn(newCurrentTurn);
    saveInitiativeData(updatedList, newCurrentTurn, roundNumber, isRunning);
    toast.success('Entry removed');
  };

  const handleNextTurn = () => {
    if (initiativeList.length === 0) return;

    let nextTurn = currentTurn + 1;
    let nextRound = roundNumber;

    if (nextTurn >= initiativeList.length) {
      nextTurn = 0;
      nextRound += 1;
    }

    setCurrentTurn(nextTurn);
    setRoundNumber(nextRound);
    saveInitiativeData(initiativeList, nextTurn, nextRound, isRunning);
    
    const currentEntry = initiativeList[nextTurn];
    toast.success(`${currentEntry.name}'s turn (Round ${nextRound})`);
  };

  const handleStartCombat = () => {
    if (initiativeList.length === 0) {
      toast.error('Add entries to initiative first');
      return;
    }

    setIsRunning(!isRunning);
    const newRunning = !isRunning;
    saveInitiativeData(initiativeList, currentTurn, roundNumber, newRunning);
    
    if (newRunning) {
      toast.success('Combat started!');
    } else {
      toast.info('Combat paused');
    }
  };

  const handleResetCombat = () => {
    setCurrentTurn(0);
    setRoundNumber(1);
    setIsRunning(false);
    saveInitiativeData(initiativeList, 0, 1, false);
    toast.success('Combat reset');
  };

  const handleClearAll = () => {
    setInitiativeList([]);
    setCurrentTurn(0);
    setRoundNumber(1);
    setIsRunning(false);
    saveInitiativeData([], 0, 1, false);
    toast.success('Initiative cleared');
  };

  const handleHPChange = (entryId: string, newHP: number) => {
    const updatedList = initiativeList.map(entry =>
      entry.id === entryId
        ? { ...entry, currentHP: Math.max(0, Math.min(entry.maxHP, newHP)) }
        : entry
    );
    
    setInitiativeList(updatedList);
    saveInitiativeData(updatedList, currentTurn, roundNumber, isRunning);
  };

  const getTypeColor = (type: InitiativeEntry['type']) => {
    switch (type) {
      case 'player': return 'default';
      case 'npc': return 'secondary';
      case 'monster': return 'destructive';
      default: return 'outline';
    }
  };

  const getHPColor = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage <= 0) return 'bg-destructive';
    if (percentage <= 25) return 'bg-destructive';
    if (percentage <= 50) return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

  const InitiativeEntryComponent: React.FC<{ entry: InitiativeEntry; index: number }> = ({ entry, index }) => (
    <div
      className={`p-4 border rounded-lg transition-colors ${
        index === currentTurn && isRunning
          ? 'border-primary bg-primary/10'
          : 'border-border hover:border-primary/50'
      }`}
    >
      {editingEntry?.id === entry.id ? (
        // Edit mode
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Name</Label>
              <Input
                value={editingEntry.name}
                onChange={(e) => setEditingEntry({ ...editingEntry, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Initiative</Label>
              <Input
                type="number"
                value={editingEntry.initiative}
                onChange={(e) => setEditingEntry({ ...editingEntry, initiative: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Max HP</Label>
              <Input
                type="number"
                value={editingEntry.maxHP}
                onChange={(e) => setEditingEntry({ ...editingEntry, maxHP: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div>
              <Label>Current HP</Label>
              <Input
                type="number"
                value={editingEntry.currentHP}
                onChange={(e) => setEditingEntry({ ...editingEntry, currentHP: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>AC</Label>
              <Input
                type="number"
                value={editingEntry.ac}
                onChange={(e) => setEditingEntry({ ...editingEntry, ac: parseInt(e.target.value) || 10 })}
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" size="sm" onClick={() => setEditingEntry(null)}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveEdit}>
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        </div>
      ) : (
        // View mode
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="text-xl font-bold w-8 text-center">
                {entry.initiative}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold">{entry.name}</span>
                  <Badge variant={getTypeColor(entry.type) as any} className="text-xs">
                    {entry.type}
                  </Badge>
                  {index === currentTurn && isRunning && (
                    <Badge variant="default" className="text-xs">
                      Current Turn
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  AC: {entry.ac}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={() => handleEditEntry(entry)}>
                <Edit3 className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleDeleteEntry(entry.id)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
          
          {/* HP Management */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Health Points</span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleHPChange(entry.id, entry.currentHP - 1)}
                  disabled={entry.currentHP <= 0}
                >
                  -1
                </Button>
                <span className="text-sm font-mono w-16 text-center">
                  {entry.currentHP} / {entry.maxHP}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleHPChange(entry.id, entry.currentHP + 1)}
                  disabled={entry.currentHP >= entry.maxHP}
                >
                  +1
                </Button>
              </div>
            </div>
            
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${getHPColor(entry.currentHP, entry.maxHP)}`}
                style={{ width: `${Math.max((entry.currentHP / entry.maxHP) * 100, 0)}%` }}
              />
            </div>
          </div>
          
          {entry.notes && (
            <div className="mt-2 text-sm text-muted-foreground">
              <strong>Notes:</strong> {entry.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Swords className="w-5 h-5" />
              <span>Initiative Tracker</span>
              {isRunning && (
                <Badge variant="default" className="ml-2">
                  Round {roundNumber}
                </Badge>
              )}
            </CardTitle>
            
            <div className="flex items-center space-x-2">
              <Dialog open={isAddEntryOpen} onOpenChange={setIsAddEntryOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Entry
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Initiative Entry</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Name</Label>
                      <Input
                        placeholder="Character or creature name"
                        value={newEntry.name || ''}
                        onChange={(e) => setNewEntry({ ...newEntry, name: e.target.value })}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Initiative</Label>
                        <Input
                          type="number"
                          value={newEntry.initiative || ''}
                          onChange={(e) => setNewEntry({ ...newEntry, initiative: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <Label>Type</Label>
                        <Select
                          value={newEntry.type}
                          onValueChange={(value) => setNewEntry({ ...newEntry, type: value as InitiativeEntry['type'] })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="player">Player</SelectItem>
                            <SelectItem value="npc">NPC</SelectItem>
                            <SelectItem value="monster">Monster</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Max HP</Label>
                        <Input
                          type="number"
                          value={newEntry.maxHP || ''}
                          onChange={(e) => {
                            const maxHP = parseInt(e.target.value) || 1;
                            setNewEntry({ ...newEntry, maxHP, currentHP: maxHP });
                          }}
                        />
                      </div>
                      <div>
                        <Label>Current HP</Label>
                        <Input
                          type="number"
                          value={newEntry.currentHP || ''}
                          onChange={(e) => setNewEntry({ ...newEntry, currentHP: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                      <div>
                        <Label>AC</Label>
                        <Input
                          type="number"
                          value={newEntry.ac || ''}
                          onChange={(e) => setNewEntry({ ...newEntry, ac: parseInt(e.target.value) || 10 })}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label>Notes (Optional)</Label>
                      <Input
                        placeholder="Special abilities, conditions, etc."
                        value={newEntry.notes || ''}
                        onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
                      />
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setIsAddEntryOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddEntry}>
                        Add Entry
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              {sessionCharacters.length > 0 && (
                <Button variant="outline" size="sm" onClick={addPlayerCharacters}>
                  <Users className="w-4 h-4 mr-2" />
                  Add Players
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {initiativeList.length === 0 ? (
            <div className="text-center py-12">
              <Swords className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3>No Initiative Entries</h3>
              <p className="text-muted-foreground mb-6">
                Add characters and creatures to start tracking initiative
              </p>
              <div className="space-x-2">
                <Button onClick={() => setIsAddEntryOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Entry
                </Button>
                {sessionCharacters.length > 0 && (
                  <Button variant="outline" onClick={addPlayerCharacters}>
                    <Users className="w-4 h-4 mr-2" />
                    Add Players
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Combat Controls */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Round</div>
                    <div className="text-xl font-bold">{roundNumber}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Current Turn</div>
                    <div className="text-lg font-semibold">
                      {initiativeList[currentTurn]?.name || 'None'}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant={isRunning ? 'destructive' : 'default'}
                    onClick={handleStartCombat}
                  >
                    {isRunning ? (
                      <>
                        <Pause className="w-4 h-4 mr-2" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Start
                      </>
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={handleNextTurn}
                    disabled={!isRunning}
                  >
                    <SkipForward className="w-4 h-4 mr-2" />
                    Next Turn
                  </Button>
                  
                  <Button variant="outline" onClick={handleResetCombat}>
                    Reset
                  </Button>
                  
                  <Button variant="outline" onClick={handleClearAll}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              {/* Initiative List */}
              <div className="space-y-3">
                {initiativeList.map((entry, index) => (
                  <InitiativeEntryComponent key={entry.id} entry={entry} index={index} />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};