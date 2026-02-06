/**
 * GiftModal - UI for selecting items to give to NPCs
 *
 * Features:
 * - Grid display of giftable items from player's inventory
 * - NPC portrait and name display
 * - Filters out tools and non-giftable items
 * - Shows hints about NPC preferences
 */

import React, { useState, useMemo } from 'react';
import { inventoryManager } from '../utils/inventoryManager';
import { friendshipManager } from '../utils/FriendshipManager';
import { npcManager } from '../NPCManager';
import { getItem, ItemCategory } from '../data/items';
import { NPC_FOOD_PREFERENCES, RecipeCategory } from '../data/recipes';
import ItemTooltip, { TooltipContent } from './ItemTooltip';
import { Z_MODAL, zClass } from '../zIndex';

export interface GiftResult {
  success: boolean;
  itemId: string;
  itemName: string;
  points: number;
  reaction: 'loved' | 'liked' | 'neutral' | 'disliked';
  message: string;
  dialogueNodeId?: string;
}

interface GiftModalProps {
  npcId: string;
  onClose: () => void;
  onGiftGiven: (result: GiftResult) => void;
}

// Categories of items that can be gifted
const GIFTABLE_CATEGORIES = [
  ItemCategory.CROP,
  ItemCategory.FOOD,
  ItemCategory.INGREDIENT,
  ItemCategory.MATERIAL,
  ItemCategory.MISC,
];

// Potions that can be given to NPCs (not drunk by player)
const GIFTABLE_POTIONS = ['potion_friendship', 'potion_bitter_grudge'];

// Get display name for recipe category
const CATEGORY_DISPLAY_NAMES: Record<RecipeCategory, string> = {
  savoury: 'savoury dishes',
  dessert: 'sweet treats',
  baking: 'baked goods',
  starter: 'starter dishes',
  tutorial: 'simple recipes',
};

const GiftModal: React.FC<GiftModalProps> = ({ npcId, onClose, onGiftGiven }) => {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Get NPC data
  const npc = useMemo(() => npcManager.getNPCById(npcId), [npcId]);
  const npcName = npc?.name || 'Unknown';

  // Get friendship info
  const hearts = friendshipManager.getFriendshipHearts(npcId);

  // Get NPC food preferences for hint
  const preferences = NPC_FOOD_PREFERENCES[npcId];
  const preferenceHint = preferences
    ? `Loves ${preferences.map((p) => CATEGORY_DISPLAY_NAMES[p]).join(' and ')}`
    : null;

  // Get giftable items from inventory
  const giftableItems = useMemo(() => {
    const inventory = inventoryManager.getInventoryData();
    return inventory.items
      .filter((item) => {
        const itemDef = getItem(item.itemId);
        if (!itemDef) return false;
        // Allow standard giftable categories OR specific giftable potions
        return (
          GIFTABLE_CATEGORIES.includes(itemDef.category) ||
          GIFTABLE_POTIONS.includes(item.itemId)
        );
      })
      .map((item) => {
        const itemDef = getItem(item.itemId)!;
        return {
          id: item.itemId,
          name: itemDef.displayName,
          icon: itemDef.image || '📦',
          quantity: item.quantity,
          category: itemDef.category,
          description: itemDef.description,
        };
      });
  }, []);

  // Grid settings
  const COLS = 6;
  const MIN_ROWS = 3;
  const displaySlots = Math.max(MIN_ROWS * COLS, Math.ceil(giftableItems.length / COLS) * COLS);

  // Create slot array
  const slots = useMemo(() => {
    const arr: ((typeof giftableItems)[0] | null)[] = Array(displaySlots).fill(null);
    giftableItems.forEach((item, index) => {
      if (index < displaySlots) {
        arr[index] = item;
      }
    });
    return arr;
  }, [giftableItems, displaySlots]);

  // Handle gift confirmation
  const handleGiveGift = () => {
    if (!selectedItemId) return;

    const itemDef = getItem(selectedItemId);
    if (!itemDef) return;

    // Give the gift via FriendshipManager
    const result = friendshipManager.giveGift(npcId, selectedItemId, npc || undefined);

    // Remove item from inventory
    inventoryManager.removeItem(selectedItemId, 1);

    // Generate reaction message
    let message = '';
    switch (result.reaction) {
      case 'loved':
        message = `${npcName} absolutely loves ${itemDef.displayName}! (+${result.points})`;
        break;
      case 'liked':
        message = `${npcName} appreciates ${itemDef.displayName}. (+${result.points})`;
        break;
      case 'neutral':
        message = `${npcName} accepts ${itemDef.displayName}. (+${result.points})`;
        break;
      case 'disliked':
        message = `${npcName} didn't like ${itemDef.displayName}... (${result.points})`;
        break;
    }

    onGiftGiven({
      success: true,
      itemId: selectedItemId,
      itemName: itemDef.displayName,
      points: result.points,
      reaction: result.reaction,
      message,
      dialogueNodeId: result.dialogueNodeId,
    });

    onClose();
  };

  return (
    <div
      className={`fixed inset-0 bg-black/80 flex items-center justify-center ${zClass(Z_MODAL)} pointer-events-auto`}
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-b from-pink-900 to-pink-950 border-4 border-pink-600 rounded-lg p-6 max-w-xl w-full max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with NPC info */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-4">
            {/* NPC Portrait */}
            <div className="w-16 h-16 rounded-full bg-pink-800 border-2 border-pink-500 overflow-hidden flex items-center justify-center">
              {npc?.portraitSprite || npc?.dialogueSprite ? (
                <img
                  src={npc.portraitSprite || npc.dialogueSprite}
                  alt={npcName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl">🎁</span>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-pink-200">Give Gift to {npcName}</h2>
              <div className="flex items-center gap-0.5 mt-1">
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    className={`text-lg ${i < hearts ? 'text-pink-400' : 'text-pink-900'}`}
                  >
                    ♥
                  </span>
                ))}
              </div>
              {preferenceHint && (
                <p className="text-xs text-pink-400 mt-1 italic">{preferenceHint}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-red-600 hover:bg-red-500 text-white font-bold rounded-full transition-colors"
          >
            ×
          </button>
        </div>

        {/* Item Grid */}
        <div className="flex-1 overflow-y-auto pr-2 inventory-scrollbar">
          {giftableItems.length === 0 ? (
            <div className="text-center text-pink-300 py-8">
              <p className="text-lg mb-2">No items to give</p>
              <p className="text-sm text-pink-400">
                Gather crops, cook food, or buy ingredients to give as gifts.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-6 gap-2">
              {slots.map((item, index) => {
                const isEmpty = item === null;
                const isSelected = selectedItemId === item?.id;

                const tooltipContent: TooltipContent | null = item
                  ? {
                      name: item.name,
                      description: item.description,
                      image: item.icon,
                      quantity: item.quantity,
                    }
                  : null;

                const slotButton = (
                  <button
                    key={index}
                    onClick={() => item && setSelectedItemId(item.id)}
                    className={`
                      relative w-full aspect-square rounded-lg transition-all
                      ${
                        isSelected
                          ? 'border-4 border-yellow-400 bg-yellow-900/60 shadow-lg shadow-yellow-500/50'
                          : 'border-2 bg-pink-900/40 border-pink-600 hover:bg-pink-800/60'
                      }
                      ${isEmpty ? 'cursor-default opacity-50' : 'cursor-pointer'}
                    `}
                    disabled={isEmpty}
                  >
                    {item && (
                      <>
                        <div className="absolute inset-0 flex items-center justify-center">
                          {item.icon.startsWith('/') || item.icon.startsWith('http') ? (
                            <img
                              src={item.icon}
                              alt={item.name}
                              className="w-10 h-10 object-contain"
                            />
                          ) : (
                            <span className="text-2xl">{item.icon}</span>
                          )}
                        </div>

                        {/* Quantity Badge */}
                        {item.quantity > 1 && (
                          <div className="absolute bottom-0 right-0 bg-black/80 text-white text-xs font-bold px-1.5 py-0.5 rounded-tl-lg rounded-br-lg min-w-[18px] text-center">
                            {item.quantity}
                          </div>
                        )}
                      </>
                    )}
                  </button>
                );

                return tooltipContent ? (
                  <ItemTooltip key={index} content={tooltipContent}>
                    {slotButton}
                  </ItemTooltip>
                ) : (
                  slotButton
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with selected item and Give button */}
        <div className="mt-4 pt-4 border-t border-pink-700 flex justify-between items-center">
          <div className="text-pink-300">
            {selectedItemId ? (
              <span className="font-semibold">{getItem(selectedItemId)?.displayName}</span>
            ) : (
              <span className="text-pink-400 italic">Select an item to give</span>
            )}
          </div>
          <button
            onClick={handleGiveGift}
            disabled={!selectedItemId}
            className={`
              px-6 py-2 rounded-lg font-bold transition-all
              ${
                selectedItemId
                  ? 'bg-pink-600 hover:bg-pink-500 text-white cursor-pointer'
                  : 'bg-pink-800 text-pink-500 cursor-not-allowed'
              }
            `}
          >
            Give Gift 🎁
          </button>
        </div>
      </div>
    </div>
  );
};

export default GiftModal;
