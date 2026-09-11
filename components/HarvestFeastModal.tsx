/**
 * HarvestFeastModal - UI for placing a cooked meal on the Harvest Feast table
 *
 * Opens when the player interacts with the feast table while it is accepting
 * contributions (4pm-6pm on day 42 of Autumn). Cloned from BasketModal.tsx
 * rather than sharing it — the two pickers diverge in filter logic (this one
 * is cooked meals only, no raw/edible ingredients), capacity messaging, and
 * confirm side-effects, and BasketModal already ships the Mr Fox picnic quest.
 */

import React, { useState, useMemo } from 'react';
import { inventoryManager } from '../utils/inventoryManager';
import { getItem, ItemCategory } from '../data/items';
import { getOpenFoodSlots, placeFeastFood } from '../data/questHandlers/harvestFeastHandler';
import ItemTooltip, { TooltipContent } from './ItemTooltip';
import GameIcon from './GameIcon';
import { Z_MODAL, zClass } from '../zIndex';
import { FALLBACK_ITEM_ICON } from '../utils/iconMap';

interface HarvestFeastModalProps {
  onClose: () => void;
  onResult: (message: string, success: boolean) => void;
}

const COLS = 6;
const MIN_ROWS = 3;

const HarvestFeastModal: React.FC<HarvestFeastModalProps> = ({ onClose, onResult }) => {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const openSlots = getOpenFoodSlots();

  // Cooked meals only — deliberately not edible === true, which would admit
  // raw ingredients/produce. See the module doc comment.
  const mealItems = useMemo(() => {
    const inventory = inventoryManager.getInventoryData();
    return inventory.items
      .filter((item) => getItem(item.itemId)?.category === ItemCategory.FOOD)
      .map((item) => {
        const def = getItem(item.itemId)!;
        return {
          id: item.itemId,
          name: def.displayName,
          icon: def.image || FALLBACK_ITEM_ICON,
          quantity: item.quantity,
          description: def.description,
        };
      });
  }, []);

  const displaySlots = Math.max(MIN_ROWS * COLS, Math.ceil(mealItems.length / COLS) * COLS);
  const slots = useMemo(() => {
    const arr: ((typeof mealItems)[0] | null)[] = Array(displaySlots).fill(null);
    mealItems.forEach((item, i) => {
      if (i < displaySlots) arr[i] = item;
    });
    return arr;
  }, [mealItems, displaySlots]);

  const handlePlace = () => {
    if (!selectedItemId) return;
    const result = placeFeastFood(selectedItemId);
    onResult(result.message, result.success);
    if (result.success) onClose();
  };

  const remaining = openSlots.length;

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
              <GameIcon icon="🍲" size={36} alt="Feast table" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-amber-200">Add a dish to the feast</h2>
              <p className="text-sm text-amber-400 mt-1 italic">
                {remaining > 0
                  ? `Room for ${remaining} more ${remaining === 1 ? 'dish' : 'dishes'} on the table.`
                  : 'The table is full!'}
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
          {mealItems.length === 0 ? (
            <div className="text-center text-amber-300 py-8">
              <p className="text-lg mb-2">No cooked meals in your inventory</p>
              <p className="text-sm text-amber-400">Cook something first — raw ingredients won't do.</p>
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
                    disabled={isEmpty}
                    onClick={() => !isEmpty && setSelectedItemId(item!.id)}
                    className={`
                      aspect-square rounded border-2 flex flex-col items-center justify-center p-1 transition-all
                      ${
                        isEmpty
                          ? 'border-amber-800 bg-amber-900/30 cursor-default'
                          : isSelected
                            ? 'border-amber-400 bg-amber-700 scale-105 shadow-lg'
                            : 'border-amber-700 bg-amber-800/60 hover:border-amber-500 hover:bg-amber-700/60 cursor-pointer'
                      }
                    `}
                  >
                    {!isEmpty && (
                      <img
                        src={item!.icon}
                        alt={item!.name}
                        className="w-8 h-8 object-contain"
                        style={{ imageRendering: 'auto' }}
                      />
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
        {selectedItemId &&
          (() => {
            const item = mealItems.find((i) => i.id === selectedItemId);
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
                  onClick={handlePlace}
                  disabled={remaining <= 0}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800 disabled:opacity-50 text-white font-bold rounded transition-colors"
                >
                  Place on the table
                </button>
              </div>
            );
          })()}
      </div>
    </div>
  );
};

export default HarvestFeastModal;
