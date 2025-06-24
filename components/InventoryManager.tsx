import React, { useState } from 'react';
import { Package, Plus, Minus, Trash2, Search, Filter, Sword, Shield, Shirt } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Character, Equipment, Weapon, Armor } from '../types';
import { CharacterService } from '../services/CharacterService';
import { toast } from 'sonner@2.0.3';

interface InventoryManagerProps {
  character: Character;
  onCharacterUpdate: (updates: Partial<Character>) => void;
  className?: string;
}

interface ItemDatabase {
  weapons: Weapon[];
  armor: Armor[];
  equipment: Equipment[];
}

const DEFAULT_ITEMS: ItemDatabase = {
  weapons: [
    { id: 'sword-1', name: 'Longsword', damage: '1d8', type: 'Melee', slots: 2, equipped: false },
    { id: 'dagger-1', name: 'Dagger', damage: '1d4', type: 'Melee', slots: 1, equipped: false },
    { id: 'bow-1', name: 'Shortbow', damage: '1d6', type: 'Ranged', slots: 2, equipped: false },
    { id: 'staff-1', name: 'Quarterstaff', damage: '1d6', type: 'Melee', slots: 2, equipped: false },
    { id: 'crossbow-1', name: 'Light Crossbow', damage: '1d8', type: 'Ranged', slots: 3, equipped: false },
  ],
  armor: [
    { id: 'leather-1', name: 'Leather Armor', baseAC: 11, maxAttributeBonus: 99, slots: 3, equipped: false },
    { id: 'chain-1', name: 'Chain Mail', baseAC: 16, maxAttributeBonus: 0, slots: 4, equipped: false },
    { id: 'plate-1', name: 'Plate Armor', baseAC: 18, maxAttributeBonus: 0, slots: 6, equipped: false },
    { id: 'shield-1', name: 'Shield', baseAC: 2, maxAttributeBonus: 99, slots: 1, equipped: false },
  ],
  equipment: [
    { id: 'rope-1', name: 'Rope (50 ft)', description: 'Hemp rope', slots: 1, quantity: 1 },
    { id: 'torch-1', name: 'Torch', description: 'Light source', slots: 1, quantity: 5 },
    { id: 'rations-1', name: 'Trail Rations', description: 'Food for 1 day', slots: 1, quantity: 3 },
    { id: 'potion-1', name: 'Healing Potion', description: 'Restores 1d8+1 HP', slots: 1, quantity: 2 },
    { id: 'coin-1', name: 'Gold Coins', description: 'Currency', slots: 0, quantity: 100 },
  ],
};

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  character,
  onCharacterUpdate,
  className = '',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'weapons' | 'armor' | 'equipment'>('all');
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [newItemType, setNewItemType] = useState<'weapon' | 'armor' | 'equipment'>('equipment');

  // Calculate total slots used
  const totalSlotsUsed = [
    ...character.weapons.map(w => w.slots),
    ...character.armor.map(a => a.slots),
    ...character.equipment.map(e => e.slots * e.quantity),
  ].reduce((sum, slots) => sum + slots, 0);

  const maxSlots = 10 + CharacterService.calculateModifier(character.basicAttributes.STR);

  // Filter items based on search and type
  const filteredWeapons = character.weapons.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (filterType === 'all' || filterType === 'weapons')
  );

  const filteredArmor = character.armor.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (filterType === 'all' || filterType === 'armor')
  );

  const filteredEquipment = character.equipment.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (filterType === 'all' || filterType === 'equipment')
  );

  // Handle equipment changes
  const handleToggleEquipped = (type: 'weapon' | 'armor', id: string) => {
    const updates: Partial<Character> = {};

    if (type === 'weapon') {
      updates.weapons = character.weapons.map(weapon =>
        weapon.id === id ? { ...weapon, equipped: !weapon.equipped } : weapon
      );
    } else {
      updates.armor = character.armor.map(armor =>
        armor.id === id ? { ...armor, equipped: !armor.equipped } : armor
      );
    }

    // Recalculate AC if armor changed
    if (type === 'armor') {
      const equippedArmor = (updates.armor || character.armor).filter(a => a.equipped);
      const baseAC = equippedArmor.reduce((ac, armor) => ac + armor.baseAC, 10);
      const dexMod = CharacterService.calculateModifier(character.basicAttributes.DEX);
      const maxDexBonus = Math.min(...equippedArmor.map(a => a.maxAttributeBonus), 99);
      const finalAC = baseAC + Math.min(dexMod, maxDexBonus);
      
      updates.resources = { ...character.resources, AC: finalAC };
    }

    onCharacterUpdate(updates);
    toast.success(type === 'weapon' ? 'Weapon updated' : 'Armor updated');
  };

  const handleQuantityChange = (id: string, delta: number) => {
    const updates: Partial<Character> = {
      equipment: character.equipment.map(item =>
        item.id === id
          ? { ...item, quantity: Math.max(0, item.quantity + delta) }
          : item
      ).filter(item => item.quantity > 0), // Remove items with 0 quantity
    };

    onCharacterUpdate(updates);
  };

  const handleRemoveItem = (type: 'weapon' | 'armor' | 'equipment', id: string) => {
    const updates: Partial<Character> = {};

    switch (type) {
      case 'weapon':
        updates.weapons = character.weapons.filter(item => item.id !== id);
        break;
      case 'armor':
        updates.armor = character.armor.filter(item => item.id !== id);
        // Recalculate AC
        const remainingArmor = updates.armor.filter(a => a.equipped);
        const baseAC = remainingArmor.reduce((ac, armor) => ac + armor.baseAC, 10);
        const dexMod = CharacterService.calculateModifier(character.basicAttributes.DEX);
        const maxDexBonus = remainingArmor.length > 0
          ? Math.min(...remainingArmor.map(a => a.maxAttributeBonus), 99)
          : 99;
        const finalAC = baseAC + Math.min(dexMod, maxDexBonus);
        updates.resources = { ...character.resources, AC: finalAC };
        break;
      case 'equipment':
        updates.equipment = character.equipment.filter(item => item.id !== id);
        break;
    }

    onCharacterUpdate(updates);
    toast.success('Item removed');
  };

  const handleAddItem = (item: Weapon | Armor | Equipment, type: 'weapon' | 'armor' | 'equipment') => {
    const newId = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newItem = { ...item, id: newId };

    const updates: Partial<Character> = {};

    switch (type) {
      case 'weapon':
        updates.weapons = [...character.weapons, newItem as Weapon];
        break;
      case 'armor':
        updates.armor = [...character.armor, newItem as Armor];
        break;
      case 'equipment':
        updates.equipment = [...character.equipment, newItem as Equipment];
        break;
    }

    onCharacterUpdate(updates);
    setIsAddItemOpen(false);
    toast.success('Item added to inventory');
  };

  const getEncumbranceStatus = () => {
    const percentage = (totalSlotsUsed / maxSlots) * 100;
    if (percentage >= 100) return { status: 'Overloaded', color: 'destructive' };
    if (percentage >= 80) return { status: 'Heavy', color: 'secondary' };
    if (percentage >= 60) return { status: 'Moderate', color: 'default' };
    return { status: 'Light', color: 'outline' };
  };

  const encumbrance = getEncumbranceStatus();

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Package className="w-5 h-5" />
              <span>Inventory Management</span>
            </CardTitle>
            <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Item</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Item Type</Label>
                    <Select value={newItemType} onValueChange={(value) => setNewItemType(value as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weapon">Weapon</SelectItem>
                        <SelectItem value="armor">Armor</SelectItem>
                        <SelectItem value="equipment">Equipment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Choose from Database</Label>
                    <div className="grid gap-2 max-h-40 overflow-y-auto">
                      {newItemType === 'weapon' && DEFAULT_ITEMS.weapons.map((weapon) => (
                        <Button
                          key={weapon.id}
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddItem(weapon, 'weapon')}
                          className="justify-start text-left"
                        >
                          <Sword className="w-4 h-4 mr-2" />
                          <div>
                            <div>{weapon.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {weapon.damage} damage, {weapon.slots} slots
                            </div>
                          </div>
                        </Button>
                      ))}
                      
                      {newItemType === 'armor' && DEFAULT_ITEMS.armor.map((armor) => (
                        <Button
                          key={armor.id}
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddItem(armor, 'armor')}
                          className="justify-start text-left"
                        >
                          <Shield className="w-4 h-4 mr-2" />
                          <div>
                            <div>{armor.name}</div>
                            <div className="text-xs text-muted-foreground">
                              AC {armor.baseAC}, {armor.slots} slots
                            </div>
                          </div>
                        </Button>
                      ))}
                      
                      {newItemType === 'equipment' && DEFAULT_ITEMS.equipment.map((equipment) => (
                        <Button
                          key={equipment.id}
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddItem(equipment, 'equipment')}
                          className="justify-start text-left"
                        >
                          <Package className="w-4 h-4 mr-2" />
                          <div>
                            <div>{equipment.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {equipment.description}, {equipment.slots} slots
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Encumbrance Display */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Carrying Capacity</Label>
              <Badge variant={encumbrance.color as any}>
                {encumbrance.status}
              </Badge>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  encumbrance.color === 'destructive' ? 'bg-destructive' :
                  encumbrance.color === 'secondary' ? 'bg-yellow-500' : 'bg-primary'
                }`}
                style={{ width: `${Math.min((totalSlotsUsed / maxSlots) * 100, 100)}%` }}
              />
            </div>
            <div className="text-sm text-muted-foreground text-center">
              {totalSlotsUsed} / {maxSlots} slots used
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={(value) => setFilterType(value as any)}>
              <SelectTrigger className="w-32">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="weapons">Weapons</SelectItem>
                <SelectItem value="armor">Armor</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Inventory Tabs */}
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All Items</TabsTrigger>
              <TabsTrigger value="weapons">
                <Sword className="w-4 h-4 mr-2" />
                Weapons
              </TabsTrigger>
              <TabsTrigger value="armor">
                <Shield className="w-4 h-4 mr-2" />
                Armor
              </TabsTrigger>
              <TabsTrigger value="equipment">
                <Package className="w-4 h-4 mr-2" />
                Equipment
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-3">
              {/* Weapons */}
              {filteredWeapons.length > 0 && (
                <div className="space-y-2">
                  <h4 className="flex items-center space-x-2">
                    <Sword className="w-4 h-4" />
                    <span>Weapons</span>
                  </h4>
                  {filteredWeapons.map((weapon) => (
                    <InventoryItem
                      key={weapon.id}
                      item={weapon}
                      type="weapon"
                      onToggleEquipped={() => handleToggleEquipped('weapon', weapon.id)}
                      onRemove={() => handleRemoveItem('weapon', weapon.id)}
                    />
                  ))}
                </div>
              )}

              {/* Armor */}
              {filteredArmor.length > 0 && (
                <div className="space-y-2">
                  <h4 className="flex items-center space-x-2">
                    <Shield className="w-4 h-4" />
                    <span>Armor</span>
                  </h4>
                  {filteredArmor.map((armor) => (
                    <InventoryItem
                      key={armor.id}
                      item={armor}
                      type="armor"
                      onToggleEquipped={() => handleToggleEquipped('armor', armor.id)}
                      onRemove={() => handleRemoveItem('armor', armor.id)}
                    />
                  ))}
                </div>
              )}

              {/* Equipment */}
              {filteredEquipment.length > 0 && (
                <div className="space-y-2">
                  <h4 className="flex items-center space-x-2">
                    <Package className="w-4 h-4" />
                    <span>Equipment</span>
                  </h4>
                  {filteredEquipment.map((equipment) => (
                    <InventoryItem
                      key={equipment.id}
                      item={equipment}
                      type="equipment"
                      onQuantityChange={(delta) => handleQuantityChange(equipment.id, delta)}
                      onRemove={() => handleRemoveItem('equipment', equipment.id)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="weapons">
              {filteredWeapons.map((weapon) => (
                <InventoryItem
                  key={weapon.id}
                  item={weapon}
                  type="weapon"
                  onToggleEquipped={() => handleToggleEquipped('weapon', weapon.id)}
                  onRemove={() => handleRemoveItem('weapon', weapon.id)}
                />
              ))}
            </TabsContent>

            <TabsContent value="armor">
              {filteredArmor.map((armor) => (
                <InventoryItem
                  key={armor.id}
                  item={armor}
                  type="armor"
                  onToggleEquipped={() => handleToggleEquipped('armor', armor.id)}
                  onRemove={() => handleRemoveItem('armor', armor.id)}
                />
              ))}
            </TabsContent>

            <TabsContent value="equipment">
              {filteredEquipment.map((equipment) => (
                <InventoryItem
                  key={equipment.id}
                  item={equipment}
                  type="equipment"
                  onQuantityChange={(delta) => handleQuantityChange(equipment.id, delta)}
                  onRemove={() => handleRemoveItem('equipment', equipment.id)}
                />
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

// Individual inventory item component
interface InventoryItemProps {
  item: Weapon | Armor | Equipment;
  type: 'weapon' | 'armor' | 'equipment';
  onToggleEquipped?: () => void;
  onQuantityChange?: (delta: number) => void;
  onRemove: () => void;
}

const InventoryItem: React.FC<InventoryItemProps> = ({
  item,
  type,
  onToggleEquipped,
  onQuantityChange,
  onRemove,
}) => {
  const isEquipped = 'equipped' in item ? item.equipped : false;
  const hasQuantity = 'quantity' in item;

  return (
    <div className={`p-3 border rounded-lg ${isEquipped ? 'border-primary bg-primary/5' : 'border-border'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            {type === 'weapon' && <Sword className="w-4 h-4" />}
            {type === 'armor' && <Shield className="w-4 h-4" />}
            {type === 'equipment' && <Package className="w-4 h-4" />}
            <span className="font-medium">{item.name}</span>
          </div>
          
          {hasQuantity && (
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onQuantityChange?.(-1)}
                disabled={!('quantity' in item) || item.quantity <= 1}
              >
                <Minus className="w-3 h-3" />
              </Button>
              <span className="w-8 text-center">
                {'quantity' in item ? item.quantity : 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onQuantityChange?.(1)}
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {onToggleEquipped && (
            <Button
              variant={isEquipped ? 'default' : 'outline'}
              size="sm"
              onClick={onToggleEquipped}
            >
              {isEquipped ? 'Equipped' : 'Equip'}
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={onRemove}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="mt-2 text-sm text-muted-foreground">
        {type === 'weapon' && 'damage' in item && (
          <span>Damage: {item.damage} • Type: {item.type} • Slots: {item.slots}</span>
        )}
        {type === 'armor' && 'baseAC' in item && (
          <span>AC: {item.baseAC} • Max Dex: {item.maxAttributeBonus === 99 ? '∞' : item.maxAttributeBonus} • Slots: {item.slots}</span>
        )}
        {type === 'equipment' && 'description' in item && (
          <span>{item.description} • Slots: {item.slots}</span>
        )}
      </div>
    </div>
  );
};