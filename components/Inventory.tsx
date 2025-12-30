import React from 'react';
import ItemTooltip, { TooltipContent } from './ItemTooltip';
import { getItem } from '../data/items';
import { Z_INVENTORY_MODAL, zClass } from '../zIndex';

export interface InventoryItem {
  id: string;
  name: string;
  icon: string;
  quantity: number;
  value?: number; // Gold value for trading
}

interface InventoryProps {
  isOpen: boolean;
  onClose: () => void;
  items: InventoryItem[];
  onItemClick?: (item: InventoryItem, slotIndex: number) => void;
  selectedSlot?: number | null; // Currently selected slot index
  maxSlots?: number;
  title?: string;
}

/**
 * Inventory UI component with grid-based item display
 * - First 9 slots are "quick slots" highlighted in purple
 * - Items stack with quantity display
 * - Scrollable for overflow items
 * - Designed for trading between two inventories
 */
const Inventory: React.FC<InventoryProps> = ({
  isOpen,
  onClose,
  items,
  onItemClick,
  selectedSlot = null,
  maxSlots, // Optional prop - if provided, limits capacity; otherwise unlimited
  title = 'Inventory',
}) => {
  if (!isOpen) return null;

  // Calculate dynamic slot count for unlimited inventory
  const COLS = 9;
  const MIN_ROWS = 4; // Always show at least 4 rows (36 slots) for quick slots + buffer
  const BUFFER_ROWS = 1; // Show one extra empty row after last item

  let displaySlots: number;
  if (maxSlots !== undefined) {
    // Limited inventory mode (e.g., for trading UI)
    displaySlots = maxSlots;
  } else {
    // Unlimited inventory mode - grow dynamically
    const usedSlots = items.length;
    const requiredRows = Math.ceil(usedSlots / COLS) + BUFFER_ROWS;
    const totalRows = Math.max(MIN_ROWS, requiredRows);
    displaySlots = totalRows * COLS;
  }

  // Create array of slots (empty or with items)
  const slots: (InventoryItem | null)[] = Array(displaySlots).fill(null);
  items.forEach((item, index) => {
    if (index < displaySlots) {
      slots[index] = item;
    }
  });

  const handleSlotClick = (item: InventoryItem | null, index: number) => {
    if (item && onItemClick) {
      onItemClick(item, index);
    }
  };

  return (
    <div
      className={`fixed inset-0 bg-black/80 flex items-center justify-center ${zClass(Z_INVENTORY_MODAL)} pointer-events-auto`}
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-b from-amber-900 to-amber-950 border-4 border-amber-700 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-amber-200">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-red-600 hover:bg-red-500 text-white font-bold rounded-full transition-colors"
          >
            ×
          </button>
        </div>

        {/* Inventory Grid - Scrollable */}
        <div className="overflow-y-scroll flex-1 pr-2 max-h-[500px] inventory-scrollbar">
          <div className="grid grid-cols-9 gap-2">
            {slots.map((item, index) => {
              const isQuickSlot = index < 9;
              const isEmpty = item === null;
              const isSelected = selectedSlot === index;

              // Get full item definition for tooltip
              const itemDef = item ? getItem(item.id) : null;
              const tooltipContent: TooltipContent | null = item && itemDef ? {
                name: item.name,
                description: itemDef.description,
                image: item.icon,
                quantity: item.quantity,
                additionalInfo: isSelected ? '[SELECTED]' : undefined,
              } : null;

              const slotButton = (
                <button
                  key={index}
                  onClick={() => handleSlotClick(item, index)}
                  className={`
                    relative w-full aspect-square rounded-lg transition-all
                    ${isSelected
                      ? 'border-4 border-yellow-400 bg-yellow-900/60 shadow-lg shadow-yellow-500/50'
                      : `border-2 ${isQuickSlot
                        ? 'bg-purple-900/40 border-purple-500 hover:bg-purple-800/60'
                        : 'bg-amber-950/40 border-amber-700 hover:bg-amber-900/60'
                      }`
                    }
                    ${isEmpty ? 'cursor-default' : 'cursor-pointer'}
                  `}
                  disabled={isEmpty}
                >
                  {/* Item Icon */}
                  {item && (
                    <>
                      <div className="absolute inset-0 flex items-center justify-center">
                        {item.icon.startsWith('/') || item.icon.startsWith('http') ? (
                          <img
                            src={item.icon}
                            alt={item.name}
                            className="w-12 h-12 object-contain pixelated"
                          />
                        ) : (
                          <span className="text-3xl">{item.icon}</span>
                        )}
                      </div>

                      {/* Quantity Badge (only if > 1) */}
                      {item.quantity > 1 && (
                        <div className="absolute bottom-0 right-0 bg-black/80 text-white text-xs font-bold px-1.5 py-0.5 rounded-tl-lg rounded-br-lg min-w-[20px] text-center">
                          {item.quantity}
                        </div>
                      )}
                    </>
                  )}

                  {/* Quick Slot Number Indicator */}
                  {isQuickSlot && (
                    <div className="absolute top-0 left-0 bg-purple-600/80 text-white text-xs font-bold px-1 py-0.5 rounded-br-lg rounded-tl-lg">
                      {index + 1}
                    </div>
                  )}
                </button>
              );

              // Wrap with tooltip if item exists
              return tooltipContent ? (
                <ItemTooltip key={index} content={tooltipContent}>
                  {slotButton}
                </ItemTooltip>
              ) : (
                slotButton
              );
            })}
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-4 pt-4 border-t border-amber-700 text-amber-300 text-sm">
          <p>
            {maxSlots !== undefined
              ? `Slots: ${items.length} / ${maxSlots}`
              : `Items: ${items.length}${items.length > 0 ? ' (unlimited capacity)' : ''}`
            }
          </p>
          <p className="text-xs text-amber-400 mt-1">
            First 9 slots are quick slots (1-9 keys)
          </p>
        </div>
      </div>
    </div>
  );
};

export default Inventory;
