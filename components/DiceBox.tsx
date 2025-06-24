import React, { useEffect, useRef, useState } from 'react';
import { Dice6, User, Clock, Trash2, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { DiceRoll } from '../types';
import { useAppContext } from '../contexts/AppContext';

interface DiceBoxProps {
  rolls: DiceRoll[];
  onClearHistory?: () => void;
  className?: string;
  maxHeight?: string;
}

type FilterType = 'all' | 'mine' | 'others' | 'high' | 'low' | 'critical';

export const DiceBox: React.FC<DiceBoxProps> = ({
  rolls,
  onClearHistory,
  className = '',
  maxHeight = '400px',
}) => {
  const { user } = useAppContext();
  const [filter, setFilter] = useState<FilterType>('all');
  const [expandedRolls, setExpandedRolls] = useState<Set<string>>(new Set());
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to bottom when new rolls are added
  useEffect(() => {
    if (autoScroll && scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [rolls, autoScroll]);

  // Filter rolls based on selected filter
  const filteredRolls = rolls.filter(roll => {
    switch (filter) {
      case 'mine':
        return roll.characterId === user?.id;
      case 'others':
        return roll.characterId !== user?.id;
      case 'high':
        return roll.result >= 15;
      case 'low':
        return roll.result <= 5;
      case 'critical':
        return roll.details.includes('20') || roll.details.includes('1');
      default:
        return true;
    }
  });

  // Toggle roll expansion
  const toggleRollExpansion = (rollId: string) => {
    const newExpanded = new Set(expandedRolls);
    if (newExpanded.has(rollId)) {
      newExpanded.delete(rollId);
    } else {
      newExpanded.add(rollId);
    }
    setExpandedRolls(newExpanded);
  };

  // Format timestamp
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get roll result color
  const getRollColor = (roll: DiceRoll): string => {
    if (roll.details.includes('20') && roll.expression.includes('d20')) {
      return 'text-emerald-600 font-bold'; // Critical success
    }
    if (roll.details.includes('1') && roll.expression.includes('d20')) {
      return 'text-destructive font-bold'; // Critical failure
    }
    if (roll.result >= 15) {
      return 'text-emerald-600';
    }
    if (roll.result <= 5) {
      return 'text-destructive';
    }
    return 'text-foreground';
  };

  // Get dice type from expression
  const getDiceType = (expression: string): string => {
    const match = expression.match(/(\d*)d(\d+)/);
    if (match) {
      const count = match[1] || '1';
      const sides = match[2];
      return `${count}d${sides}`;
    }
    return 'dice';
  };

  const RollItem: React.FC<{ roll: DiceRoll; isExpanded: boolean }> = ({ roll, isExpanded }) => (
    <div className="space-y-2 p-3 border rounded-lg bg-card/50 hover:bg-card transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-sm">{roll.rollerUsername}</span>
          <Badge variant="outline" className="text-xs">
            {getDiceType(roll.expression)}
          </Badge>
          <span className="text-xs text-muted-foreground flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>{formatTime(roll.timestamp)}</span>
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`text-lg font-bold ${getRollColor(roll)}`}>
            {roll.result}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleRollExpansion(roll.id)}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        <span className="font-mono">{roll.expression}</span>
        {roll.details && (
          <span className="ml-2">→ {roll.details.split('→')[1] || roll.details}</span>
        )}
      </div>

      {isExpanded && (
        <div className="mt-2 p-2 bg-muted/50 rounded text-xs space-y-1">
          <div><strong>Full Expression:</strong> {roll.expression}</div>
          <div><strong>Details:</strong> {roll.details}</div>
          <div><strong>Time:</strong> {new Date(roll.timestamp).toLocaleString()}</div>
          {roll.characterId && (
            <div><strong>Character ID:</strong> {roll.characterId}</div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Dice6 className="w-5 h-5" />
            <span>Dice Box</span>
            <Badge variant="outline">{filteredRolls.length}</Badge>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Select value={filter} onValueChange={(value) => setFilter(value as FilterType)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Rolls</SelectItem>
                <SelectItem value="mine">My Rolls</SelectItem>
                <SelectItem value="others">Others</SelectItem>
                <SelectItem value="high">High (15+)</SelectItem>
                <SelectItem value="low">Low (5-)</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            {onClearHistory && (
              <Button variant="outline" size="sm" onClick={onClearHistory}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="px-4 pb-4" style={{ height: maxHeight }} ref={scrollAreaRef}>
          {filteredRolls.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Dice6 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No dice rolls yet</p>
              <p className="text-sm">Be the first to roll the dice!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRolls.map((roll) => (
                <RollItem
                  key={roll.id}
                  roll={roll}
                  isExpanded={expandedRolls.has(roll.id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Auto-scroll toggle */}
        <div className="border-t p-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{rolls.length} total rolls</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAutoScroll(!autoScroll)}
              className="text-xs h-6"
            >
              Auto-scroll: {autoScroll ? 'On' : 'Off'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};