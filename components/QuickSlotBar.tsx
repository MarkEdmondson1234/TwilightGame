import React from 'react';
import { Z_HUD, zClass } from '../zIndex';

export interface InventoryItem {
  id: string;
  name: string;
  icon: string;
  quantity: number;
}

interface QuickSlotBarProps {
  items: InventoryItem[]; // First 9 items from inventory
  selectedSlot: number | null; // Currently selected slot (0-8)
  onSlotClick: (slotIndex: number) => void; // Select slot for equipment/use
}

/**
 * QuickSlotBar - Always-visible HUD bar showing the 9 quick slots
 * Positioned at bottom center of screen (like MMO action bars)
 * Display-only (no drag-drop) - organization happens in Inventory modal
 */
const QuickSlotBar: React.FC<QuickSlotBarProps> = ({ items, selectedSlot, onSlotClick }) => {
  // Create array of 9 slots (empty or with items)
  const slots: (InventoryItem | null)[] = Array(9).fill(null);
  items.forEach((item, index) => {
    if (index < 9) {
      slots[index] = item;
    }
  });

  return (
    <div
      className={`fixed left-1/2 -translate-x-1/2 ${zClass(Z_HUD)} pointer-events-auto
        bottom-5 md:bottom-5 sm:bottom-[90px] px-2 py-2 rounded-lg`}
      onClick={(e) => e.stopPropagation()} // Prevent clicks from passing through to game world
      style={{ background: 'rgba(0, 0, 0, 0.3)' }} // Subtle backdrop for click area
    >
      <div className="flex gap-2 md:gap-2 sm:gap-1">
        {slots.map((item, index) => {
          const isEmpty = item === null;
          const isSelected = selectedSlot === index;

          return (
            <button
              key={index}
              onClick={() => onSlotClick(index)}
              className={`
                relative rounded-lg transition-all
                w-12 h-12 md:w-12 md:h-12 sm:w-10 sm:h-10
                ${isSelected
                  ? 'border-4 border-yellow-400 bg-yellow-900/60 shadow-lg shadow-yellow-500/50'
                  : `border-2 bg-purple-900/40 border-purple-500 hover:bg-purple-800/60`
                }
                ${isEmpty ? 'opacity-50 cursor-default' : 'cursor-pointer'}
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
                        className="w-8 h-8 object-contain pixelated"
                      />
                    ) : (
                      <span className="text-2xl">{item.icon}</span>
                    )}
                  </div>

                  {/* Quantity Badge (only if > 1) */}
                  {item.quantity > 1 && (
                    <div className="absolute bottom-0 right-0 bg-black/80 text-white text-xs font-bold px-1 py-0.5 rounded-tl-lg rounded-br-lg min-w-[16px] text-center">
                      {item.quantity}
                    </div>
                  )}
                </>
              )}

              {/* Quick Slot Number Indicator */}
              <div className="absolute top-0 left-0 bg-purple-600/80 text-white text-xs font-bold px-1 py-0.5 rounded-br-lg rounded-tl-lg">
                {index + 1}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuickSlotBar;
