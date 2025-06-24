import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Edit3, Trash2, Save, X, Calendar, Target, Heart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Character } from '../types';
import { toast } from 'sonner@2.0.3';

interface JournalEntry {
  id: string;
  title: string;
  content: string;
  type: 'backstory' | 'session' | 'goal' | 'note';
  timestamp: number;
  sessionDate?: string;
}

interface CharacterJournalProps {
  character: Character;
  onCharacterUpdate: (updates: Partial<Character>) => void;
  className?: string;
}

const JOURNAL_STORAGE_KEY = 'rpg-tool-character-journals';

export const CharacterJournal: React.FC<CharacterJournalProps> = ({
  character,
  onCharacterUpdate,
  className = '',
}) => {
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [newEntry, setNewEntry] = useState<Partial<JournalEntry>>({
    title: '',
    content: '',
    type: 'note',
  });

  // Load journal entries from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(JOURNAL_STORAGE_KEY);
      if (stored) {
        const allJournals = JSON.parse(stored);
        const characterJournal = allJournals[character.id] || [];
        setJournalEntries(characterJournal);
      }
    } catch (error) {
      console.warn('Failed to load journal entries:', error);
    }
  }, [character.id]);

  // Save journal entries to localStorage
  const saveJournalEntries = (entries: JournalEntry[]) => {
    try {
      const stored = localStorage.getItem(JOURNAL_STORAGE_KEY);
      const allJournals = stored ? JSON.parse(stored) : {};
      allJournals[character.id] = entries;
      localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(allJournals));
      setJournalEntries(entries);
    } catch (error) {
      console.warn('Failed to save journal entries:', error);
      toast.error('Failed to save journal entry');
    }
  };

  const handleAddEntry = () => {
    if (!newEntry.title?.trim() || !newEntry.content?.trim()) {
      toast.error('Please fill in title and content');
      return;
    }

    const entry: JournalEntry = {
      id: `entry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: newEntry.title,
      content: newEntry.content,
      type: newEntry.type || 'note',
      timestamp: Date.now(),
      sessionDate: newEntry.type === 'session' ? new Date().toISOString().split('T')[0] : undefined,
    };

    const updatedEntries = [...journalEntries, entry];
    saveJournalEntries(updatedEntries);
    
    setNewEntry({ title: '', content: '', type: 'note' });
    setIsAddEntryOpen(false);
    toast.success('Journal entry added');
  };

  const handleEditEntry = (entry: JournalEntry) => {
    setEditingEntry({ ...entry });
  };

  const handleSaveEdit = () => {
    if (!editingEntry?.title?.trim() || !editingEntry?.content?.trim()) {
      toast.error('Please fill in title and content');
      return;
    }

    const updatedEntries = journalEntries.map(entry =>
      entry.id === editingEntry.id ? editingEntry : entry
    );
    
    saveJournalEntries(updatedEntries);
    setEditingEntry(null);
    toast.success('Journal entry updated');
  };

  const handleDeleteEntry = (entryId: string) => {
    const updatedEntries = journalEntries.filter(entry => entry.id !== entryId);
    saveJournalEntries(updatedEntries);
    toast.success('Journal entry deleted');
  };

  const getEntryIcon = (type: JournalEntry['type']) => {
    switch (type) {
      case 'backstory': return <Heart className="w-4 h-4" />;
      case 'session': return <Calendar className="w-4 h-4" />;
      case 'goal': return <Target className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  const getEntryColor = (type: JournalEntry['type']) => {
    switch (type) {
      case 'backstory': return 'default';
      case 'session': return 'secondary';
      case 'goal': return 'outline';
      default: return 'outline';
    }
  };

  const filterEntriesByType = (type: JournalEntry['type']) => {
    return journalEntries.filter(entry => entry.type === type);
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const EntryCard: React.FC<{ entry: JournalEntry }> = ({ entry }) => (
    <Card key={entry.id} className="mb-4">
      <CardContent className="p-4">
        {editingEntry?.id === entry.id ? (
          // Edit mode
          <div className="space-y-4">
            <Input
              value={editingEntry.title}
              onChange={(e) => setEditingEntry({ ...editingEntry, title: e.target.value })}
              placeholder="Entry title..."
            />
            <Select
              value={editingEntry.type}
              onValueChange={(value) => setEditingEntry({ ...editingEntry, type: value as JournalEntry['type'] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="backstory">Backstory</SelectItem>
                <SelectItem value="session">Session Log</SelectItem>
                <SelectItem value="goal">Goal/Motivation</SelectItem>
                <SelectItem value="note">General Note</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              value={editingEntry.content}
              onChange={(e) => setEditingEntry({ ...editingEntry, content: e.target.value })}
              placeholder="Write your entry content..."
              rows={6}
            />
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
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Badge variant={getEntryColor(entry.type) as any} className="flex items-center space-x-1">
                  {getEntryIcon(entry.type)}
                  <span className="capitalize">{entry.type}</span>
                </Badge>
                <h3 className="font-semibold">{entry.title}</h3>
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
            
            <p className="text-sm text-muted-foreground mb-3">
              {formatDate(entry.timestamp)}
              {entry.sessionDate && ` • Session: ${entry.sessionDate}`}
            </p>
            
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap">{entry.content}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <BookOpen className="w-5 h-5" />
              <span>Character Journal</span>
            </CardTitle>
            <Dialog open={isAddEntryOpen} onOpenChange={setIsAddEntryOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  New Entry
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add Journal Entry</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="entry-title">Title</Label>
                    <Input
                      id="entry-title"
                      placeholder="Entry title..."
                      value={newEntry.title || ''}
                      onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="entry-type">Type</Label>
                    <Select
                      value={newEntry.type}
                      onValueChange={(value) => setNewEntry({ ...newEntry, type: value as JournalEntry['type'] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="backstory">Backstory</SelectItem>
                        <SelectItem value="session">Session Log</SelectItem>
                        <SelectItem value="goal">Goal/Motivation</SelectItem>
                        <SelectItem value="note">General Note</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="entry-content">Content</Label>
                    <Textarea
                      id="entry-content"
                      placeholder="Write your entry content..."
                      value={newEntry.content || ''}
                      onChange={(e) => setNewEntry({ ...newEntry, content: e.target.value })}
                      rows={8}
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
          </div>
        </CardHeader>
        
        <CardContent>
          {journalEntries.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3>No Journal Entries Yet</h3>
              <p className="text-muted-foreground mb-6">
                Start documenting your character's story and adventures
              </p>
              <Button onClick={() => setIsAddEntryOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Entry
              </Button>
            </div>
          ) : (
            <Tabs defaultValue="all" className="space-y-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">
                  All ({journalEntries.length})
                </TabsTrigger>
                <TabsTrigger value="backstory">
                  <Heart className="w-4 h-4 mr-2" />
                  Backstory ({filterEntriesByType('backstory').length})
                </TabsTrigger>
                <TabsTrigger value="session">
                  <Calendar className="w-4 h-4 mr-2" />
                  Sessions ({filterEntriesByType('session').length})
                </TabsTrigger>
                <TabsTrigger value="goal">
                  <Target className="w-4 h-4 mr-2" />
                  Goals ({filterEntriesByType('goal').length})
                </TabsTrigger>
                <TabsTrigger value="note">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Notes ({filterEntriesByType('note').length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                <div className="space-y-4">
                  {journalEntries
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .map(entry => <EntryCard key={entry.id} entry={entry} />)}
                </div>
              </TabsContent>

              <TabsContent value="backstory">
                <div className="space-y-4">
                  {filterEntriesByType('backstory')
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .map(entry => <EntryCard key={entry.id} entry={entry} />)}
                </div>
              </TabsContent>

              <TabsContent value="session">
                <div className="space-y-4">
                  {filterEntriesByType('session')
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .map(entry => <EntryCard key={entry.id} entry={entry} />)}
                </div>
              </TabsContent>

              <TabsContent value="goal">
                <div className="space-y-4">
                  {filterEntriesByType('goal')
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .map(entry => <EntryCard key={entry.id} entry={entry} />)}
                </div>
              </TabsContent>

              <TabsContent value="note">
                <div className="space-y-4">
                  {filterEntriesByType('note')
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .map(entry => <EntryCard key={entry.id} entry={entry} />)}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
};