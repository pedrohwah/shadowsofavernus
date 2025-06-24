import React, { useState, useEffect } from 'react';
import { Flame, Play, Pause, RotateCcw, Clock, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Progress } from './ui/progress';
import { Session } from '../types';
import { SessionService } from '../services/SessionService';
import { toast } from 'sonner@2.0.3';

interface TorchIndicatorProps {
  session: Session;
  onSessionUpdate: (updates: Partial<Session>) => void;
  onClose?: () => void;
  className?: string;
  isGM?: boolean;
}

export const TorchIndicator: React.FC<TorchIndicatorProps> = ({
  session,
  onSessionUpdate,
  onClose,
  className = '',
  isGM = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [tempMinutes, setTempMinutes] = useState(session.torchState.remainingMinutes);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update current time every second when torch is running
  useEffect(() => {
    if (session.torchState.isRunning) {
      const interval = setInterval(() => {
        setCurrentTime(Date.now());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [session.torchState.isRunning]);

  // Calculate remaining time
  const getRemainingTime = (): { minutes: number; seconds: number; percentage: number } => {
    if (!session.torchState.isRunning || !session.torchState.startedAt) {
      return {
        minutes: session.torchState.remainingMinutes,
        seconds: 0,
        percentage: (session.torchState.remainingMinutes / 60) * 100, // Assuming 60 min max
      };
    }

    const elapsedMs = currentTime - session.torchState.startedAt;
    const elapsedMinutes = elapsedMs / (1000 * 60);
    const remainingTotal = Math.max(0, session.torchState.remainingMinutes - elapsedMinutes);
    
    const minutes = Math.floor(remainingTotal);
    const seconds = Math.floor((remainingTotal - minutes) * 60);
    const percentage = (remainingTotal / 60) * 100; // Assuming 60 min max

    return { minutes, seconds, percentage };
  };

  const { minutes, seconds, percentage } = getRemainingTime();

  // Handle torch control
  const handleTorchToggle = () => {
    if (!isGM) {
      toast.error('Only the GM can control the torch');
      return;
    }

    const newState = {
      ...session.torchState,
      isRunning: !session.torchState.isRunning,
    };

    if (newState.isRunning) {
      // Starting the torch
      newState.startedAt = Date.now();
      toast.success('Torch lit! Time is now counting down');
    } else {
      // Stopping the torch
      if (session.torchState.startedAt) {
        const elapsedMs = Date.now() - session.torchState.startedAt;
        const elapsedMinutes = elapsedMs / (1000 * 60);
        newState.remainingMinutes = Math.max(0, session.torchState.remainingMinutes - elapsedMinutes);
      }
      newState.startedAt = undefined;
      toast.info('Torch paused');
    }

    onSessionUpdate({ torchState: newState });
    SessionService.updateActivity();
  };

  const handleResetTorch = () => {
    if (!isGM) {
      toast.error('Only the GM can control the torch');
      return;
    }

    const newState = {
      isRunning: false,
      remainingMinutes: 60, // Reset to 1 hour
      startedAt: undefined,
    };

    onSessionUpdate({ torchState: newState });
    SessionService.updateActivity();
    toast.success('Torch reset to 60 minutes');
  };

  const handleTimeEdit = () => {
    if (!isGM) {
      toast.error('Only the GM can control the torch');
      return;
    }

    if (isEditingTime) {
      const newMinutes = Math.max(0, Math.min(300, tempMinutes)); // Max 5 hours
      const newState = {
        ...session.torchState,
        remainingMinutes: newMinutes,
        isRunning: false,
        startedAt: undefined,
      };
      
      onSessionUpdate({ torchState: newState });
      setIsEditingTime(false);
      toast.success(`Torch set to ${newMinutes} minutes`);
    } else {
      setTempMinutes(Math.floor(getRemainingTime().minutes + (getRemainingTime().seconds / 60)));
      setIsEditingTime(true);
    }
  };

  const handleTimeCancel = () => {
    setTempMinutes(session.torchState.remainingMinutes);
    setIsEditingTime(false);
  };

  // Get torch status
  const getTorchStatus = () => {
    if (minutes <= 0 && seconds <= 0) return 'Extinguished';
    if (session.torchState.isRunning) return 'Burning';
    return 'Ready';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Extinguished': return 'destructive';
      case 'Burning': return 'default';
      default: return 'secondary';
    }
  };

  const getFlameColor = () => {
    if (minutes <= 0 && seconds <= 0) return 'text-muted-foreground';
    if (minutes <= 5) return 'text-destructive';
    if (minutes <= 15) return 'text-yellow-500';
    return 'text-primary';
  };

  // Auto-notification when torch is running low
  useEffect(() => {
    if (session.torchState.isRunning && minutes === 5 && seconds === 0) {
      toast.warning('Torch burning low!', {
        description: '5 minutes remaining',
        duration: 5000,
      });
    }
    if (session.torchState.isRunning && minutes === 1 && seconds === 0) {
      toast.error('Torch almost out!', {
        description: '1 minute remaining',
        duration: 5000,
      });
    }
    if (session.torchState.isRunning && minutes === 0 && seconds === 0) {
      toast.error('Torch extinguished!', {
        description: 'The torch has burned out',
        duration: 5000,
      });
    }
  }, [minutes, seconds, session.torchState.isRunning]);

  return (
    <div className={`fixed bottom-20 right-4 z-40 ${className}`}>
      <Card className="bg-card/95 backdrop-blur-sm border-2 shadow-lg">
        <CardContent className="p-3">
          {/* Collapsed View */}
          {!isExpanded && (
            <div className="flex items-center justify-between min-w-[140px]">
              <div className="flex items-center space-x-2">
                <Flame className={`w-4 h-4 ${getFlameColor()} ${session.torchState.isRunning ? 'animate-pulse' : ''}`} />
                <span className="text-sm font-mono">
                  {minutes}:{seconds.toString().padStart(2, '0')}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <Badge variant={getStatusColor(getTorchStatus()) as any} className="text-xs">
                  {getTorchStatus()}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(true)}
                >
                  <ChevronUp className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Expanded View */}
          {isExpanded && (
            <div className="space-y-4 min-w-[250px]">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Flame className={`w-5 h-5 ${getFlameColor()} ${session.torchState.isRunning ? 'animate-pulse' : ''}`} />
                  <span className="font-medium">Torch Timer</span>
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
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Time Display */}
              <div className="text-center space-y-2">
                {isEditingTime ? (
                  <div className="flex items-center justify-center space-x-2">
                    <Input
                      type="number"
                      value={tempMinutes}
                      onChange={(e) => setTempMinutes(parseInt(e.target.value) || 0)}
                      min={0}
                      max={300}
                      className="w-20 text-center"
                    />
                    <span className="text-sm text-muted-foreground">minutes</span>
                    <Button size="sm" onClick={handleTimeEdit}>
                      Set
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleTimeCancel}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <>
                    <div 
                      className={`text-3xl font-mono font-bold ${getFlameColor()} ${
                        isGM ? 'cursor-pointer' : ''
                      }`}
                      onClick={isGM ? handleTimeEdit : undefined}
                      title={isGM ? 'Click to edit time' : undefined}
                    >
                      {minutes}:{seconds.toString().padStart(2, '0')}
                    </div>
                    <Badge variant={getStatusColor(getTorchStatus()) as any}>
                      {getTorchStatus()}
                    </Badge>
                  </>
                )}
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <Progress 
                  value={Math.max(0, percentage)} 
                  className="h-2"
                />
                <div className="text-xs text-muted-foreground text-center">
                  {Math.max(0, percentage).toFixed(1)}% remaining
                </div>
              </div>

              {/* Controls (GM Only) */}
              {isGM && !isEditingTime && (
                <div className="flex justify-center space-x-2">
                  <Button
                    variant={session.torchState.isRunning ? 'destructive' : 'default'}
                    size="sm"
                    onClick={handleTorchToggle}
                    disabled={minutes <= 0 && seconds <= 0 && !session.torchState.isRunning}
                  >
                    {session.torchState.isRunning ? (
                      <>
                        <Pause className="w-3 h-3 mr-1" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 mr-1" />
                        Start
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetTorch}
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Reset
                  </Button>
                </div>
              )}

              {/* Info */}
              <div className="text-xs text-muted-foreground text-center space-y-1">
                {isGM ? (
                  <p>GM Controls: Start/pause timer and set duration</p>
                ) : (
                  <p>Torch timer controlled by Game Master</p>
                )}
                {session.torchState.isRunning && (
                  <div className="flex items-center justify-center space-x-1 text-primary">
                    <Clock className="w-3 h-3" />
                    <span>Timer is running</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};