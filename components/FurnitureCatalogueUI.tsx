import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Z_SHOP, zClass } from '../zIndex';
import { getItem } from '../data/items';
import { inventoryManager } from '../utils/inventoryManager';
import { FALLBACK_ITEM_ICON } from '../utils/iconMap';

const CATALOGUE_ITEM_IDS = ['furniture_bookshelf', 'furniture_armchair'];

interface FurnitureCatalogueUIProps {
  isOpen: boolean;
  onClose: () => void;
  playerGold: number;
  playerInventory: { itemId: string; quantity: number; uses?: number; masteryLevel?: number }[];
  onTransaction: (
    newGold: number,
    newInventory: { itemId: string; quantity: number; uses?: number; masteryLevel?: number }[]
  ) => void;
}

export default function FurnitureCatalogueUI({
  isOpen,
  onClose,
  playerGold,
  onTransaction,
}: FurnitureCatalogueUIProps) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  const showFeedback = useCallback((msg: string) => {
    setFeedback(msg);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => setFeedback(null), 3000);
  }, []);

  const handleOrder = useCallback(
    (itemId: string) => {
      const def = getItem(itemId);
      const price = def?.buyPrice ?? 0;
      if (!def || playerGold < price) {
        showFeedback("You don't have enough gold for that.");
        return;
      }
      const success = inventoryManager.addItem(itemId, 1);
      if (!success) {
        showFeedback('Could not add item to inventory.');
        return;
      }
      const newInventory = inventoryManager.getAllItems();
      onTransaction(playerGold - price, newInventory);
      onClose();
    },
    [playerGold, onTransaction, onClose]
  );

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center ${zClass(Z_SHOP)}`}
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="relative rounded-xl shadow-2xl overflow-hidden w-[480px] max-w-[95vw]"
        style={{ background: 'linear-gradient(to bottom, #4c0519, #881337)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-rose-700">
          <h2 className="text-xl font-bold text-rose-100 tracking-wide">Order Furniture</h2>
          <div className="flex items-center gap-3">
            <div className="bg-yellow-900 border border-yellow-600 rounded-lg px-3 py-1 text-yellow-300 font-bold text-sm">
              💰 {playerGold}g
            </div>
            <button
              className="text-rose-300 hover:text-white text-2xl leading-none"
              onClick={onClose}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* Item list */}
        <div className="p-4 flex flex-col gap-3">
          {CATALOGUE_ITEM_IDS.map((itemId) => {
            const def = getItem(itemId);
            if (!def) return null;
            const price = def.buyPrice ?? 0;
            const canAfford = playerGold >= price;
            return (
              <div
                key={itemId}
                className="flex items-center gap-4 bg-rose-950 rounded-lg p-3 border border-rose-800"
              >
                {/* Item image */}
                <div className="w-16 h-16 flex-shrink-0 rounded-md overflow-hidden bg-rose-900 flex items-center justify-center">
                  <img
                    src={def.image ?? FALLBACK_ITEM_ICON}
                    alt={def.displayName}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-rose-100 font-semibold">{def.displayName}</p>
                  <p className="text-rose-300 text-sm leading-snug">{def.description}</p>
                </div>

                {/* Price + order button */}
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span className="text-yellow-300 font-bold text-sm">{price}g</span>
                  <button
                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                      canAfford
                        ? 'bg-rose-600 hover:bg-rose-500 text-white'
                        : 'bg-rose-950 text-rose-600 cursor-not-allowed border border-rose-800'
                    }`}
                    onClick={() => handleOrder(itemId)}
                    disabled={!canAfford}
                  >
                    Order
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Feedback message */}
        {feedback && (
          <div className="mx-4 mb-4 rounded-lg px-4 py-2 text-sm text-center font-medium bg-rose-800 text-rose-100 border border-rose-600">
            {feedback}
          </div>
        )}
      </div>
    </div>
  );
}
