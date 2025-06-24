import React, { useState } from 'react';
import { Crown, Users, Dice6, Sword, Shield, ScrollText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { useAppContext } from '../contexts/AppContext';
import { SessionService } from '../services/SessionService';
import { User, Session } from '../types';
import { toast } from 'sonner@2.0.3';

export const StartingPage: React.FC = () => {
  const { setState, setUser, setSession } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  const [gmUsername, setGMUsername] = useState('');
  const [playerUsername, setPlayerUsername] = useState('');
  const [sessionToken, setSessionToken] = useState('');

  const handleCreateSession = async () => {
    if (!gmUsername.trim()) {
      toast.error('Please enter your username');
      return;
    }

    setIsLoading(true);
    try {
      // Create GM user
      const gmUser: User = {
        id: `gm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        username: gmUsername.trim(),
        role: 'gm',
      };

      // Create session
      const session: Session = {
        id: SessionService.generateSessionToken(),
        gmId: gmUser.id,
        players: [],
        createdAt: Date.now(),
        lastActivity: Date.now(),
        torchState: {
          isRunning: false,
          remainingMinutes: 60,
        },
      };

      // Save session
      SessionService.createSession(session);

      // Set state
      setUser(gmUser);
      setSession(session);
      setState('gm-panel');

      toast.success('Session created successfully!', {
        description: `Session token: ${session.id}`,
      });
    } catch (error) {
      toast.error('Failed to create session');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinSession = async () => {
    if (!playerUsername.trim()) {
      toast.error('Please enter your username');
      return;
    }

    if (!sessionToken.trim()) {
      toast.error('Please enter a session token');
      return;
    }

    setIsLoading(true);
    try {
      // Validate session token
      const session = SessionService.getSession(sessionToken.trim().toUpperCase());
      if (!session) {
        toast.error('Invalid session token');
        return;
      }

      // Create player user
      const playerUser: User = {
        id: `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        username: playerUsername.trim(),
        role: 'player',
      };

      // Join session
      await SessionService.joinSession(playerUser.id, session.id);

      // Update session with new player
      const updatedSession = {
        ...session,
        players: [...session.players, playerUser.id],
        lastActivity: Date.now(),
      };

      // Set state
      setUser(playerUser);
      setSession(updatedSession);
      setState('player-panel');

      toast.success('Joined session successfully!');
    } catch (error) {
      toast.error('Failed to join session');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3">
            <Dice6 className="w-12 h-12 text-primary" />
            <h1 className="text-4xl font-bold">RPG Tool</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A streamlined virtual RPG companion for character management and dice rolling
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="text-center">
            <CardContent className="pt-6">
              <Sword className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Character Management</h3>
              <p className="text-sm text-muted-foreground">
                Create and manage detailed character sheets with real-time updates
              </p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="pt-6">
              <Dice6 className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Advanced Dice System</h3>
              <p className="text-sm text-muted-foreground">
                Roll complex expressions with advantage, character bonuses, and shared history
              </p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="pt-6">
              <Shield className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Session Tools</h3>
              <p className="text-sm text-muted-foreground">
                Initiative tracking, health monitoring, and collaborative gameplay
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* GM Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Crown className="w-6 h-6 text-primary" />
                <span>Game Master</span>
              </CardTitle>
              <CardDescription>
                Create a new session and invite players to join your adventure
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gm-username">Your Username</Label>
                <Input
                  id="gm-username"
                  placeholder="Enter your GM name"
                  value={gmUsername}
                  onChange={(e) => setGMUsername(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateSession()}
                />
              </div>
              
              <Button 
                className="w-full" 
                onClick={handleCreateSession}
                disabled={isLoading || !gmUsername.trim()}
              >
                <Crown className="w-4 h-4 mr-2" />
                Create New Session
              </Button>

              <div className="text-sm text-muted-foreground space-y-1">
                <p>• Generate a unique 6-character session token</p>
                <p>• Manage player characters and session state</p>
                <p>• Access advanced GM tools and controls</p>
              </div>
            </CardContent>
          </Card>

          {/* Player Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-6 h-6 text-primary" />
                <span>Player</span>
              </CardTitle>
              <CardDescription>
                Join an existing session using a token provided by your GM
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="player-username">Your Username</Label>
                <Input
                  id="player-username"
                  placeholder="Enter your player name"
                  value={playerUsername}
                  onChange={(e) => setPlayerUsername(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="session-token">Session Token</Label>
                <Input
                  id="session-token"
                  placeholder="Enter 6-character token"
                  value={sessionToken}
                  onChange={(e) => setSessionToken(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoinSession()}
                  maxLength={6}
                />
              </div>
              
              <Button 
                className="w-full" 
                onClick={handleJoinSession}
                disabled={isLoading || !playerUsername.trim() || !sessionToken.trim()}
              >
                <Users className="w-4 h-4 mr-2" />
                Join Session
              </Button>

              <div className="text-sm text-muted-foreground space-y-1">
                <p>• Create and manage your character sheets</p>
                <p>• Roll dice with character integration</p>
                <p>• Collaborate in real-time with your party</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Built for tabletop RPG enthusiasts • No accounts required • Data stays on your device
          </p>
        </div>
      </div>
    </div>
  );
};