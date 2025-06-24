import React, { useState } from 'react';
import { User, Dice6, RefreshCw, Check, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Progress } from './ui/progress';
import { CharacterService, CharacterCreationData, CharacterValidationResult } from '../services/CharacterService';
import { useAppContext } from '../contexts/AppContext';
import { toast } from 'sonner@2.0.3';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface CharacterCreationProps {
  onCharacterCreated: (character: any) => void;
  onCancel: () => void;
}

type CreationStep = 'basic-info' | 'attributes' | 'resources' | 'review';

export const CharacterCreation: React.FC<CharacterCreationProps> = ({
  onCharacterCreated,
  onCancel,
}) => {
  const { user, session } = useAppContext();
  const [currentStep, setCurrentStep] = useState<CreationStep>('basic-info');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<CharacterValidationResult['errors']>({});

  // Initialize character data
  const [characterData, setCharacterData] = useState<CharacterCreationData>(() => {
    if (!user || !session) throw new Error('User and session required');
    return CharacterService.createDefaultCharacter(user, session.id);
  });

  const steps: { key: CreationStep; title: string; description: string }[] = [
    { key: 'basic-info', title: 'Basic Info', description: 'Character identity and background' },
    { key: 'attributes', title: 'Attributes', description: 'Core ability scores' },
    { key: 'resources', title: 'Resources', description: 'Health, level, and combat stats' },
    { key: 'review', title: 'Review', description: 'Finalize your character' },
  ];

  const currentStepIndex = steps.findIndex(step => step.key === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const validateCurrentStep = (): boolean => {
    const validation = CharacterService.validateCharacter(characterData);
    setErrors(validation.errors);

    switch (currentStep) {
      case 'basic-info':
        return !validation.errors.characterName && !validation.errors.playerName && 
               !validation.errors.ancestry && !validation.errors.class && !validation.errors.background;
      case 'attributes':
        return !validation.errors.attributes;
      case 'resources':
        return !validation.errors.resources;
      case 'review':
        return validation.isValid;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      const nextIndex = currentStepIndex + 1;
      if (nextIndex < steps.length) {
        setCurrentStep(steps[nextIndex].key);
      }
    }
  };

  const handlePrevious = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].key);
    }
  };

  const handleSubmit = async () => {
    if (!user || !session) return;

    setIsLoading(true);
    try {
      const character = await CharacterService.createCharacter(characterData, user, session.id);
      toast.success('Character created successfully!');
      onCharacterCreated(character);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create character';
      toast.error('Failed to create character', { description: message });
    } finally {
      setIsLoading(false);
    }
  };

  const updateCharacterData = (updates: Partial<CharacterCreationData>) => {
    setCharacterData(prev => ({ ...prev, ...updates }));
    // Clear related errors
    setErrors(prev => ({ ...prev }));
  };

  const generateRandomImage = () => {
    const newImage = CharacterService.generateCharacterImage(characterData.ancestry);
    updateCharacterData({ characterImage: newImage });
  };

  const rollRandomStats = () => {
    const randomStats = CharacterService.rollRandomStats();
    updateCharacterData({ basicAttributes: randomStats });
    toast.success('Rolled random attributes!');
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'basic-info':
        return (
          <div className="space-y-6">
            {/* Character Image */}
            <div className="text-center space-y-4">
              <div className="w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-primary/20">
                <ImageWithFallback
                  src={characterData.characterImage}
                  alt="Character"
                  className="w-full h-full object-cover"
                />
              </div>
              <Button variant="outline" onClick={generateRandomImage}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Random Image
              </Button>
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="character-name">Character Name</Label>
                <Input
                  id="character-name"
                  value={characterData.characterName}
                  onChange={(e) => updateCharacterData({ characterName: e.target.value })}
                  placeholder="Enter character name"
                  className={errors.characterName ? 'border-destructive' : ''}
                />
                {errors.characterName && (
                  <p className="text-sm text-destructive">{errors.characterName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="player-name">Player Name</Label>
                <Input
                  id="player-name"
                  value={characterData.playerName}
                  onChange={(e) => updateCharacterData({ playerName: e.target.value })}
                  placeholder="Enter player name"
                  className={errors.playerName ? 'border-destructive' : ''}
                />
                {errors.playerName && (
                  <p className="text-sm text-destructive">{errors.playerName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ancestry">Ancestry</Label>
                <Select
                  value={characterData.ancestry}
                  onValueChange={(value) => updateCharacterData({ ancestry: value })}
                >
                  <SelectTrigger className={errors.ancestry ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Select ancestry" />
                  </SelectTrigger>
                  <SelectContent>
                    {CharacterService.getAncestryOptions().map(ancestry => (
                      <SelectItem key={ancestry} value={ancestry}>{ancestry}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.ancestry && (
                  <p className="text-sm text-destructive">{errors.ancestry}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="class">Class</Label>
                <Select
                  value={characterData.class}
                  onValueChange={(value) => updateCharacterData({ class: value })}
                >
                  <SelectTrigger className={errors.class ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {CharacterService.getClassOptions().map(characterClass => (
                      <SelectItem key={characterClass} value={characterClass}>{characterClass}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.class && (
                  <p className="text-sm text-destructive">{errors.class}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="background">Background</Label>
                <Select
                  value={characterData.background}
                  onValueChange={(value) => updateCharacterData({ background: value })}
                >
                  <SelectTrigger className={errors.background ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Select background" />
                  </SelectTrigger>
                  <SelectContent>
                    {CharacterService.getBackgroundOptions().map(background => (
                      <SelectItem key={background} value={background}>{background}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.background && (
                  <p className="text-sm text-destructive">{errors.background}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="deity">Deity (Optional)</Label>
                <Input
                  id="deity"
                  value={characterData.deity}
                  onChange={(e) => updateCharacterData({ deity: e.target.value })}
                  placeholder="Enter deity name"
                />
              </div>
            </div>
          </div>
        );

      case 'attributes':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3>Ability Scores</h3>
                <p className="text-sm text-muted-foreground">
                  Set your character's core attributes (3-20 each)
                </p>
              </div>
              <Button variant="outline" onClick={rollRandomStats}>
                <Dice6 className="w-4 h-4 mr-2" />
                Roll Random
              </Button>
            </div>

            {errors.attributes && (
              <p className="text-sm text-destructive">{errors.attributes}</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(characterData.basicAttributes).map(([attr, value]) => (
                <div key={attr} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>{attr}</Label>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-bold">{value}</span>
                      <span className="text-sm text-muted-foreground">
                        ({CharacterService.calculateModifier(value) >= 0 ? '+' : ''}
                        {CharacterService.calculateModifier(value)})
                      </span>
                    </div>
                  </div>
                  <Slider
                    value={[value]}
                    onValueChange={([newValue]) => {
                      updateCharacterData({
                        basicAttributes: {
                          ...characterData.basicAttributes,
                          [attr]: newValue,
                        }
                      });
                    }}
                    min={3}
                    max={20}
                    step={1}
                    className="w-full"
                  />
                </div>
              ))}
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm">
                <strong>Total Points:</strong>{' '}
                {Object.values(characterData.basicAttributes).reduce((sum, val) => sum + val, 0)}
                {' '}(Recommended: 60-75)
              </p>
            </div>
          </div>
        );

      case 'resources':
        return (
          <div className="space-y-6">
            <div>
              <h3>Character Resources</h3>
              <p className="text-sm text-muted-foreground">
                Configure your character's level, health, and combat statistics
              </p>
            </div>

            {errors.resources && (
              <p className="text-sm text-destructive">{errors.resources}</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="level">Level</Label>
                <div className="flex items-center space-x-2">
                  <Slider
                    value={[characterData.resources.level]}
                    onValueChange={([value]) => {
                      updateCharacterData({
                        resources: { ...characterData.resources, level: value }
                      });
                    }}
                    min={1}
                    max={20}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-lg font-bold w-8">{characterData.resources.level}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-hp">Max HP</Label>
                <Input
                  id="max-hp"
                  type="number"
                  value={characterData.resources.maxHP}
                  onChange={(e) => {
                    const maxHP = parseInt(e.target.value) || 1;
                    updateCharacterData({
                      resources: {
                        ...characterData.resources,
                        maxHP,
                        HP: Math.min(characterData.resources.HP, maxHP),
                      }
                    });
                  }}
                  min={1}
                  max={999}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="current-hp">Current HP</Label>
                <Input
                  id="current-hp"
                  type="number"
                  value={characterData.resources.HP}
                  onChange={(e) => {
                    const HP = parseInt(e.target.value) || 1;
                    updateCharacterData({
                      resources: { ...characterData.resources, HP }
                    });
                  }}
                  min={0}
                  max={characterData.resources.maxHP}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="melee-bonus">Melee Attack Bonus</Label>
                <Input
                  id="melee-bonus"
                  type="number"
                  value={characterData.resources.meleeAtkBonus}
                  onChange={(e) => {
                    updateCharacterData({
                      resources: {
                        ...characterData.resources,
                        meleeAtkBonus: parseInt(e.target.value) || 0
                      }
                    });
                  }}
                  min={-10}
                  max={20}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ranged-bonus">Ranged Attack Bonus</Label>
                <Input
                  id="ranged-bonus"
                  type="number"
                  value={characterData.resources.rangedAtkBonus}
                  onChange={(e) => {
                    updateCharacterData({
                      resources: {
                        ...characterData.resources,
                        rangedAtkBonus: parseInt(e.target.value) || 0
                      }
                    });
                  }}
                  min={-10}
                  max={20}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="spell-bonus">Spellcasting Bonus</Label>
                <Input
                  id="spell-bonus"
                  type="number"
                  value={characterData.resources.spellcastingBonus}
                  onChange={(e) => {
                    updateCharacterData({
                      resources: {
                        ...characterData.resources,
                        spellcastingBonus: parseInt(e.target.value) || 0
                      }
                    });
                  }}
                  min={-10}
                  max={20}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="luck"
                checked={characterData.resources.luck}
                onCheckedChange={(checked) => {
                  updateCharacterData({
                    resources: { ...characterData.resources, luck: checked }
                  });
                }}
              />
              <Label htmlFor="luck">Lucky (Golden glow effect)</Label>
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="space-y-6">
            <div>
              <h3>Review Your Character</h3>
              <p className="text-sm text-muted-foreground">
                Review all details before creating your character
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Character Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="w-5 h-5" />
                    <span>Character Info</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary/20 mx-auto mb-4">
                    <ImageWithFallback
                      src={characterData.characterImage}
                      alt="Character"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p><strong>Name:</strong> {characterData.characterName}</p>
                  <p><strong>Player:</strong> {characterData.playerName}</p>
                  <p><strong>Ancestry:</strong> {characterData.ancestry}</p>
                  <p><strong>Class:</strong> {characterData.class}</p>
                  <p><strong>Background:</strong> {characterData.background}</p>
                  {characterData.deity && <p><strong>Deity:</strong> {characterData.deity}</p>}
                </CardContent>
              </Card>

              {/* Attributes & Resources */}
              <Card>
                <CardHeader>
                  <CardTitle>Stats & Resources</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="font-medium mb-2">Attributes:</p>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      {Object.entries(characterData.basicAttributes).map(([attr, value]) => (
                        <div key={attr} className="flex justify-between">
                          <span>{attr}:</span>
                          <span>{value} ({CharacterService.calculateModifier(value) >= 0 ? '+' : ''}{CharacterService.calculateModifier(value)})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="font-medium mb-2">Resources:</p>
                    <div className="space-y-1 text-sm">
                      <p>Level: {characterData.resources.level}</p>
                      <p>HP: {characterData.resources.HP}/{characterData.resources.maxHP}</p>
                      <p>AC: {CharacterService.calculateAC({ basicAttributes: characterData.basicAttributes, armor: [] } as any)}</p>
                      <p>Luck: {characterData.resources.luck ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2>Create New Character</h2>
        <p className="text-muted-foreground">Build your character step by step</p>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Step {currentStepIndex + 1} of {steps.length}</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <Progress value={progress} className="w-full" />
      </div>

      {/* Step Navigation */}
      <div className="flex justify-center">
        <div className="flex space-x-4">
          {steps.map((step, index) => (
            <div
              key={step.key}
              className={`flex items-center space-x-2 ${
                index <= currentStepIndex ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  index < currentStepIndex
                    ? 'bg-primary border-primary text-primary-foreground'
                    : index === currentStepIndex
                    ? 'border-primary text-primary'
                    : 'border-muted-foreground'
                }`}
              >
                {index < currentStepIndex ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <div className="hidden md:block">
                <p className="font-medium">{step.title}</p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={currentStepIndex === 0 ? onCancel : handlePrevious}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {currentStepIndex === 0 ? 'Cancel' : 'Previous'}
        </Button>

        <Button
          onClick={currentStep === 'review' ? handleSubmit : handleNext}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
              Creating...
            </>
          ) : currentStep === 'review' ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Create Character
            </>
          ) : (
            <>
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};