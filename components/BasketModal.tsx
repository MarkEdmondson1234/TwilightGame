/**
 * BasketModal - UI for adding food to the picnic basket
 *
 * Opens when the player interacts with the placed picnic basket during the
 * Mr Fox's Picnic quest (filling_basket stage). Shows food items from the
 * player's inventory and lets them add one at a time.
 */

import React, { useState, useMemo } from 'react';
import { inventoryManager } from '../utils/inventoryManager';
import { getItem, ItemCategory } from '../data/items';
import {
  addMealToBasket,
  getBasketContents,
  MAX_BASKET_MEALS,
} from '../data/questHandlers/mrFoxPicnicHandler';
import ItemTooltip, { TooltipContent } from './ItemTooltip';
import GameIcon from './GameIcon';
import { Z_MODAL, zClass } from '../zIndex';
import { FALLBACK_ITEM_ICON } from '../utils/iconMap';

interface BasketModalProps {
  onClose: () => void;
  onResult: (message: string, success: boolean) => void;
}

const COLS = 6;
const MIN_ROWS = 3;

const BasketModal: React.FC<BasketModalProps> = ({ onClose, onResult }) => {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const basketContents = getBasketContents();

  // Only food items that aren't already in the basket
  const foodItems = useMemo(() => {
    const inventory = inventoryManager.getInventoryData();
    return inventory.items
      .filter((item) => {
        const def = getItem(item.itemId);
        return def?.category === ItemCategory.FOOD || def?.edible === true;
      })
      .map((item) => {
        const def = getItem(item.itemId)!;
        return {
          id: item.itemId,
          name: def.displayName,
          icon: def.image || FALLBACK_ITEM_ICON,
          quantity: item.quantity,
          description: def.description,
          alreadyInBasket: basketContents.includes(item.itemId),
        };
      });
  }, []);

  const displaySlots = Math.max(MIN_ROWS * COLS, Math.ceil(foodItems.length / COLS) * COLS);
  const slots = useMemo(() => {
    const arr: ((typeof foodItems)[0] | null)[] = Array(displaySlots).fill(null);
    foodItems.forEach((item, i) => { if (i < displaySlots) arr[i] = item; });
    return arr;
  }, [foodItems, displaySlots]);

  const handleAddToBasket = () => {
    if (!selectedItemId) return;
    const result = addMealToBasket(selectedItemId);
    onResult(result.message, result.success);
    if (result.success) onClose();
  };

  const remaining = MAX_BASKET_MEALS - basketContents.length;

  return (
    <div
      className={`fixed inset-0 bg-black/80 flex items-center justify-center ${zClass(Z_MODAL)} pointer-events-auto`}
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-b from-amber-900 to-amber-950 border-4 border-amber-600 rounded-lg p-6 max-w-xl w-full max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-amber-800 border-2 border-amber-500 flex items-center justify-center">
              <GameIcon icon="🧺" size={36} alt="Basket" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-amber-200">Add food to the basket</h2>
              <p className="text-sm text-amber-400 mt-1 italic">
                {remaining > 0
                  ? `Room for ${remaining} more ${remaining === 1 ? 'dish' : 'dishes'} — variety is the spice of life!`
                  : 'The basket is full!'}
              </p>
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
        <div className="flex-1 min-h-0 max-h-[50vh] overflow-y-auto pr-2">
          {foodItems.length === 0 ? (
            <div className="text-center text-amber-300 py-8">
              <p className="text-lg mb-2">No food in your inventory</p>
              <p className="text-sm text-amber-400">Cook or buy some food first.</p>
            </div>
          ) : (
            <div className="grid grid-cols-6 gap-2">
              {slots.map((item, index) => {
                const isEmpty = item === null;
                const isSelected = selectedItemId === item?.id;
                const alreadyAdded = item?.alreadyInBasket ?? false;

                const tooltipContent: TooltipContent | null = item
                  ? { name: item.name, description: item.description, image: item.icon, quantity: item.quantity }
                  : null;

                const slotButton = (
                  <button
                    key={index}
                    disabled={isEmpty || alreadyAdded}
                    onClick={() => !isEmpty && !alreadyAdded && setSelectedItemId(item!.id)}
                    className={`
                      aspect-square rounded border-2 flex flex-col items-center justify-center p-1 transition-all
                      ${isEmpty
                        ? 'border-amber-800 bg-amber-900/30 cursor-default'
                        : alreadyAdded
                          ? 'border-amber-700 bg-amber-800/40 cursor-not-allowed opacity-50'
                          : isSelected
                            ? 'border-amber-400 bg-amber-700 scale-105 shadow-lg'
                            : 'border-amber-700 bg-amber-800/60 hover:border-amber-500 hover:bg-amber-700/60 cursor-pointer'
                      }
                    `}
                  >
                    {!isEmpty && (
                      <>
                        <img
                          src={item!.icon}
                          alt={item!.name}
                          className="w-8 h-8 object-contain"
                          style={{ imageRendering: 'auto' }}
                        />
                        {alreadyAdded && (
                          <span className="text-[9px] text-amber-400 mt-0.5">✓ added</span>
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
                  <React.Fragment key={index}>{slotButton}</React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected item info + confirm */}
        {selectedItemId && (() => {
          const item = foodItems.find((i) => i.id === selectedItemId);
          if (!item) return null;
          return (
            <div className="mt-4 pt-4 border-t border-amber-700">
              <div className="flex items-center gap-3 mb-3">
                <img src={item.icon} alt={item.name} className="w-10 h-10 object-contain" />
                <div>
                  <p className="text-amber-200 font-semibold">{item.name}</p>
                  {item.description && (
                    <p className="text-amber-400 text-xs italic">{item.description}</p>
                  )}
                </div>
              </div>
              <button
                onClick={handleAddToBasket}
                disabled={remaining <= 0}
                className="w-full py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800 disabled:opacity-50 text-white font-bold rounded transition-colors"
              >
                Add to basket
              </button>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default BasketModal;
