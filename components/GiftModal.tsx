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
import { gameState } from '../GameState';
import { decorationManager } from '../utils/DecorationManager';
import { savePaintingImage } from '../utils/paintingImageService';
import { getGiftService } from '../firebase/safe';
import ItemTooltip, { TooltipContent } from './ItemTooltip';
import GameIcon from './GameIcon';
import { Z_MODAL, zClass } from '../zIndex';
import { FALLBACK_ITEM_ICON } from '../utils/iconMap';
import { yuleCelebrationManager } from '../utils/YuleCelebrationManager';

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
  /** The NPC being gifted. Omitted when gifting another player. */
  npcId?: string;
  /** The player being gifted. Omitted when gifting an NPC. One of the two is required. */
  playerTarget?: { uid: string; name: string };
  onClose: () => void;
  onGiftGiven: (result: GiftResult) => void;
  /** Surface delivery failures — a gift that did not arrive must be said out loud. */
  onShowToast?: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

// Categories of items that cannot be gifted (tools only)
const NON_GIFTABLE_CATEGORIES = [ItemCategory.TOOL];

// Get display name for recipe category
const CATEGORY_DISPLAY_NAMES: Record<RecipeCategory, string> = {
  savoury: 'savoury dishes',
  dessert: 'sweet treats',
  baking: 'baked goods',
  starter: 'tea',
  miscellaneous: 'special recipes',
};

const GiftModal: React.FC<GiftModalProps> = ({
  npcId,
  playerTarget,
  onClose,
  onGiftGiven,
  onShowToast,
}) => {
  const isPlayerGift = !!playerTarget;
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  // Guards against a double-tap/double-click submitting the gift twice
  // (awarding friendship points twice) before onClose() unmounts the modal.
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get NPC data (absent when gifting another player)
  const npc = useMemo(() => (npcId ? npcManager.getNPCById(npcId) : undefined), [npcId]);
  const npcName = npc?.name || 'Unknown';

  // Get friendship info — a player gift has no hearts to show
  const hearts = npcId ? friendshipManager.getFriendshipHearts(npcId) : 0;

  // Get NPC food preferences for hint
  const preferences = npcId ? NPC_FOOD_PREFERENCES[npcId] : undefined;
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
        // Show all items except non-giftable categories (tools)
        return !NON_GIFTABLE_CATEGORIES.includes(itemDef.category);
      })
      .map((item) => {
        const itemDef = getItem(item.itemId)!;
        return {
          id: item.itemId,
          name: itemDef.displayName,
          icon: itemDef.image || FALLBACK_ITEM_ICON,
          quantity: item.quantity,
          category: itemDef.category,
          description: itemDef.description,
          // Crafted artwork (wreaths, paintings) rides with the instance so
          // the recipient sees the same wreath that left the giver's bag.
          decorationId: item.decorationId,
        };
      });
  }, []);

  // Whose name rides on the wire. Read at render time like chat's playerName.
  const giverName = gameState.getSelectedCharacter()?.name ?? 'Traveller';

  // The name in the header — the NPC's, or the other player's.
  const targetName = isPlayerGift ? playerTarget!.name : npcName;

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
  const handleGiveGift = async () => {
    if (!selectedItemId || isSubmitting) return;

    const itemDef = getItem(selectedItemId);
    if (!itemDef) return;

    setIsSubmitting(true);

    if (isPlayerGift && playerTarget) {
      // Player-to-player: the item leaves the giver's bag only once the send
      // has been accepted, so a failed send never loses anything.
      const selectedRow = giftableItems.find((row) => row.id === selectedItemId);
      const decorationId = selectedRow?.decorationId;

      // The artwork must be in the shared picture store before the gift
      // document lands — the recipient fetches it from there. The craft-time
      // save normally did this; re-saving is idempotent and heals the gap.
      if (decorationId) {
        const artwork = decorationManager.getPainting(decorationId);
        if (artwork) {
          void savePaintingImage(decorationId, artwork.imageUrl, itemDef.displayName);
        }
      }

      const sent = await getGiftService().sendGift({
        fromName: giverName,
        toUid: playerTarget.uid,
        toName: playerTarget.name,
        itemId: selectedItemId,
        ...(decorationId ? { decorationId } : {}),
      });

      if (!sent) {
        setIsSubmitting(false);
        onShowToast?.(`The gift to ${playerTarget.name} could not be sent.`, 'error');
        return;
      }

      if (decorationId) {
        inventoryManager.removeItemInstanceByDecorationId(selectedItemId, decorationId);
      } else {
        inventoryManager.removeItem(selectedItemId, 1);
      }

      onGiftGiven({
        success: true,
        itemId: selectedItemId,
        itemName: itemDef.displayName,
        points: 0,
        reaction: 'neutral',
        message: `You gave ${playerTarget.name} a ${itemDef.displayName}! 🎁`,
      });
      onClose();
      return;
    }

    if (!npcId) return;

    // Give the gift via FriendshipManager
    const result = friendshipManager.giveGift(npcId, selectedItemId, npc || undefined);

    // Yule celebration intercept — grants Yule reward if celebration is active
    const yuleResult = yuleCelebrationManager.interceptGift(npcId, selectedItemId);

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
      dialogueNodeId:
        yuleResult === 'already_claimed'
          ? 'yule_gift_already_claimed'
          : yuleResult
            ? 'yule_gift_reaction'
            : result.dialogueNodeId,
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
        {/* Header — the NPC's portrait and hearts, or the other player's name */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-4">
            {/* NPC Portrait */}
            <div className="w-16 h-16 rounded-full bg-pink-800 border-2 border-pink-500 overflow-hidden flex items-center justify-center">
              {npc?.portraitSprite || npc?.dialogueSprite ? (
                <img
                  src={npc.portraitSprite || npc.dialogueSprite}
                  alt={targetName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <GameIcon icon="🎁" size={36} alt="Gift" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-pink-200">Give Gift to {targetName}</h2>
              {/* Hearts are a friendship meter, which only NPCs have. Showing a
                  row of empty ones for a player would promise a mechanic that
                  does not exist. */}
              {!isPlayerGift && (
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
              )}
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
        <div className="flex-1 min-h-0 max-h-[50vh] overflow-y-auto pr-2 gift-scrollbar">
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
            disabled={!selectedItemId || isSubmitting}
            className={`
              px-6 py-2 rounded-lg font-bold transition-all
              ${
                selectedItemId && !isSubmitting
                  ? 'bg-pink-600 hover:bg-pink-500 text-white cursor-pointer'
                  : 'bg-pink-800 text-pink-500 cursor-not-allowed'
              }
            `}
          >
            Give Gift{' '}
            <GameIcon icon="🎁" size={20} alt="Gift" className="inline-block align-middle ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default GiftModal;
