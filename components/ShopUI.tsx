/**
 * ShopUI - Dual-grid inventory interface for buying and selling items
 * Features:
 * - Side-by-side shop and player inventories
 * - Drag-and-drop between inventories (buy/sell)
 * - Quantity slider for multi-item transactions
 * - Seasonal inventory filtering
 * - Touch support for iPad
 */

import React, { useState, useEffect } from 'react';
import { shopManager } from '../utils/ShopManager';
import { ShopItem } from '../data/shopInventory';
import { getItem, ItemDefinition } from '../data/items';
import { TimeManager } from '../utils/TimeManager';

interface ShopUIProps {
  isOpen: boolean;
  onClose: () => void;
  playerGold: number;
  playerInventory: { itemId: string; quantity: number }[];
  onTransaction: (newGold: number, newInventory: { itemId: string; quantity: number }[]) => void;
}

interface DragState {
  itemId: string;
  quantity: number;
  fromShop: boolean; // true = dragging from shop, false = dragging from player
  maxQuantity: number;
}

const ShopUI: React.FC<ShopUIProps> = ({
  isOpen,
  onClose,
  playerGold,
  playerInventory,
  onTransaction,
}) => {
  const [shopInventory, setShopInventory] = useState<ShopItem[]>([]);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);
  const [showQuantitySlider, setShowQuantitySlider] = useState<boolean>(false);
  const [pendingTransaction, setPendingTransaction] = useState<{
    itemId: string;
    fromShop: boolean;
    maxQuantity: number;
  } | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Load shop inventory (filtered by season)
  useEffect(() => {
    if (isOpen) {
      const inventory = shopManager.getCurrentInventory();
      setShopInventory(inventory);
    }
  }, [isOpen]);

  // Close handler (ESC key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Auto-hide feedback after 3 seconds
  useEffect(() => {
    if (feedback) {
      const timeout = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(timeout);
    }
  }, [feedback]);

  if (!isOpen) return null;

  const currentTime = TimeManager.getCurrentTime();

  /**
   * Handle drag start (from shop or player inventory)
   */
  const handleDragStart = (
    itemId: string,
    fromShop: boolean,
    maxQuantity: number
  ) => {
    // If only 1 item, execute immediately
    if (maxQuantity === 1) {
      executeTransaction(itemId, 1, fromShop);
      return;
    }

    // Show quantity slider for multi-item stacks
    setPendingTransaction({ itemId, fromShop, maxQuantity });
    setSelectedQuantity(1);
    setShowQuantitySlider(true);
  };

  /**
   * Handle drag over (allow drop)
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  /**
   * Handle drop (execute transaction)
   */
  const handleDrop = (e: React.DragEvent, targetIsShop: boolean) => {
    e.preventDefault();

    if (!dragState) return;

    // Can't drop in same inventory
    if (dragState.fromShop === targetIsShop) {
      setDragState(null);
      return;
    }

    executeTransaction(dragState.itemId, dragState.quantity, dragState.fromShop);
    setDragState(null);
  };

  /**
   * Execute buy or sell transaction
   */
  const executeTransaction = (itemId: string, quantity: number, isBuying: boolean) => {
    if (isBuying) {
      // Buy from shop
      const result = shopManager.executeBuyTransaction(
        itemId,
        quantity,
        playerGold,
        playerInventory
      );

      if (result) {
        onTransaction(result.gold, result.inventory);
        setFeedback({ message: result.result.message, type: 'success' });
      } else {
        const validation = shopManager.validateBuyTransaction(
          itemId,
          quantity,
          playerGold,
          getEmptySlots(),
          playerInventory
        );
        setFeedback({ message: validation.message, type: 'error' });
      }
    } else {
      // Sell to shop
      const result = shopManager.executeSellTransaction(
        itemId,
        quantity,
        playerGold,
        playerInventory
      );

      if (result) {
        onTransaction(result.gold, result.inventory);
        setFeedback({ message: result.result.message, type: 'success' });
      } else {
        const validation = shopManager.validateSellTransaction(itemId, quantity, playerInventory);
        setFeedback({ message: validation.message, type: 'error' });
      }
    }

    setShowQuantitySlider(false);
    setPendingTransaction(null);
  };

  /**
   * Calculate empty inventory slots
   */
  const getEmptySlots = (): number => {
    const maxSlots = 36;
    return maxSlots - playerInventory.length;
  };

  /**
   * Confirm quantity selection and execute transaction
   */
  const confirmQuantity = () => {
    if (!pendingTransaction) return;

    executeTransaction(
      pendingTransaction.itemId,
      selectedQuantity,
      pendingTransaction.fromShop
    );
  };

  /**
   * Cancel quantity selection
   */
  const cancelQuantity = () => {
    setShowQuantitySlider(false);
    setPendingTransaction(null);
    setSelectedQuantity(1);
  };

  /**
   * Render shop item slot
   */
  const renderShopSlot = (shopItem: ShopItem) => {
    const itemDef = getItem(shopItem.itemId);
    if (!itemDef) return null;

    const canAfford = playerGold >= shopItem.buyPrice;

    return (
      <button
        key={shopItem.itemId}
        onClick={() =>
          handleDragStart(shopItem.itemId, true, shopManager.getMaxBuyQuantity(shopItem.itemId, playerGold))
        }
        className={`
          relative aspect-square rounded-lg border-2 transition-all
          ${canAfford
            ? 'bg-emerald-900/40 border-emerald-600 hover:bg-emerald-800/60 hover:scale-105 cursor-pointer'
            : 'bg-gray-900/40 border-gray-600 cursor-not-allowed opacity-50'
          }
        `}
        disabled={!canAfford}
        title={`${itemDef.displayName}\nBuy: ${shopItem.buyPrice}g${canAfford ? '' : ' (cannot afford)'}`}
      >
        {/* Item Image/Icon */}
        <div className="absolute inset-0 flex items-center justify-center p-2">
          {itemDef.image ? (
            <img
              src={itemDef.image}
              alt={itemDef.displayName}
              className="max-w-full max-h-full object-contain pixelated"
            />
          ) : (
            <span className="text-3xl">📦</span>
          )}
        </div>

        {/* Price Tag */}
        <div className="absolute bottom-0 right-0 bg-yellow-600/90 text-white text-xs font-bold px-1.5 py-0.5 rounded-tl-lg rounded-br-lg">
          {shopItem.buyPrice}g
        </div>
      </button>
    );
  };

  /**
   * Render player inventory slot
   */
  const renderPlayerSlot = (inventoryItem: { itemId: string; quantity: number } | null, index: number) => {
    if (!inventoryItem) {
      // Empty slot
      return (
        <div
          key={`empty-${index}`}
          className="relative aspect-square rounded-lg border-2 bg-amber-950/40 border-amber-700"
        />
      );
    }

    const itemDef = getItem(inventoryItem.itemId);
    if (!itemDef) return null;

    const sellPrice = shopManager.getMaxSellQuantity(inventoryItem.itemId, playerInventory);

    return (
      <button
        key={inventoryItem.itemId}
        onClick={() =>
          handleDragStart(inventoryItem.itemId, false, inventoryItem.quantity)
        }
        className="relative aspect-square rounded-lg border-2 bg-amber-900/40 border-amber-600 hover:bg-amber-800/60 hover:scale-105 cursor-pointer transition-all"
        title={`${itemDef.displayName} (${inventoryItem.quantity})\nSell: ${sellPrice || 0}g each`}
      >
        {/* Item Image/Icon */}
        <div className="absolute inset-0 flex items-center justify-center p-2">
          {itemDef.image ? (
            <img
              src={itemDef.image}
              alt={itemDef.displayName}
              className="max-w-full max-h-full object-contain pixelated"
            />
          ) : (
            <span className="text-3xl">📦</span>
          )}
        </div>

        {/* Quantity Badge */}
        {inventoryItem.quantity > 1 && (
          <div className="absolute bottom-0 right-0 bg-black/80 text-white text-xs font-bold px-1.5 py-0.5 rounded-tl-lg rounded-br-lg min-w-[20px] text-center">
            {inventoryItem.quantity}
          </div>
        )}
      </button>
    );
  };

  // Create slots for player inventory (fill empty slots)
  const maxSlots = 36;
  const playerSlots: ({ itemId: string; quantity: number } | null)[] = Array(maxSlots).fill(null);
  playerInventory.forEach((item, index) => {
    if (index < maxSlots) {
      playerSlots[index] = item;
    }
  });

  return (
    <>
      {/* Main Shop UI */}
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[2000] pointer-events-auto">
        <div className="bg-gradient-to-b from-slate-800 to-slate-900 border-4 border-slate-600 rounded-lg p-6 max-w-6xl w-full max-h-[90vh] flex flex-col">
          {/* Header with Gold Display and Close Button */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-3xl font-bold text-amber-200">General Store</h2>
            <div className="flex items-center gap-4">
              {/* Prominent Gold Display */}
              <div className="bg-gradient-to-br from-yellow-600 to-yellow-800 border-4 border-yellow-500 rounded-lg px-6 py-3 shadow-lg">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">💰</span>
                  <span className="text-3xl font-bold text-yellow-100" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
                    {playerGold}g
                  </span>
                </div>
              </div>
              {/* Close Button */}
              <button
                onClick={onClose}
                className="w-10 h-10 bg-red-600 hover:bg-red-500 text-white text-2xl font-bold rounded-full transition-colors"
              >
                ×
              </button>
            </div>
          </div>

          {/* Feedback Message */}
          {feedback && (
            <div
              className={`mb-4 p-3 rounded-lg border-2 ${
                feedback.type === 'success'
                  ? 'bg-green-900/60 border-green-500 text-green-200'
                  : 'bg-red-900/60 border-red-500 text-red-200'
              }`}
            >
              {feedback.message}
            </div>
          )}

          {/* Season and Time Info */}
          <div className="mb-3 text-sm text-slate-400">
            <span className="text-cyan-300 font-bold">{currentTime.season} {currentTime.day}</span>
            {' • '}
            <span>Seasonal items available</span>
          </div>

          {/* Dual Grid Layout */}
          <div className="flex-1 grid grid-cols-2 gap-6 overflow-hidden">
            {/* Shop Inventory (Left) */}
            <div className="flex flex-col">
              <h3 className="text-xl font-bold text-emerald-300 mb-3">Shop Stock</h3>
              <div className="flex-1 overflow-y-auto pr-2">
                <div className="grid grid-cols-6 gap-2">
                  {shopInventory.map(shopItem => renderShopSlot(shopItem))}
                </div>
              </div>
              <div className="mt-2 text-xs text-slate-400">
                Click to buy • {shopInventory.length} items available
              </div>
            </div>

            {/* Player Inventory (Right) */}
            <div className="flex flex-col">
              <h3 className="text-xl font-bold text-amber-300 mb-3">Your Inventory</h3>
              <div className="flex-1 overflow-y-auto pr-2">
                <div className="grid grid-cols-6 gap-2">
                  {playerSlots.map((item, index) => renderPlayerSlot(item, index))}
                </div>
              </div>
              <div className="mt-2 text-xs text-slate-400">
                Click to sell • {playerInventory.length} / {maxSlots} slots
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quantity Slider Modal */}
      {showQuantitySlider && pendingTransaction && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[2100] pointer-events-auto">
          <div className="bg-gradient-to-b from-slate-700 to-slate-800 border-4 border-slate-500 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-2xl font-bold text-white mb-4">
              {pendingTransaction.fromShop ? 'Buy' : 'Sell'} How Many?
            </h3>

            {/* Item Preview */}
            {(() => {
              const itemDef = getItem(pendingTransaction.itemId);
              if (!itemDef) return null;

              return (
                <div className="mb-6 flex items-center gap-4 bg-slate-900/60 p-4 rounded-lg border-2 border-slate-600">
                  {itemDef.image && (
                    <img
                      src={itemDef.image}
                      alt={itemDef.displayName}
                      className="w-16 h-16 object-contain pixelated"
                    />
                  )}
                  <div>
                    <p className="text-lg font-bold text-amber-200">{itemDef.displayName}</p>
                    <p className="text-sm text-slate-400">
                      Max: {pendingTransaction.maxQuantity}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Quantity Slider */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-bold text-slate-300">Quantity:</label>
                <span className="text-2xl font-bold text-yellow-300">{selectedQuantity}</span>
              </div>
              <input
                type="range"
                min="1"
                max={pendingTransaction.maxQuantity}
                value={selectedQuantity}
                onChange={(e) => setSelectedQuantity(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-yellow-500"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>1</span>
                <span>{pendingTransaction.maxQuantity}</span>
              </div>
            </div>

            {/* Total Cost/Earnings */}
            {(() => {
              const itemDef = getItem(pendingTransaction.itemId);
              if (!itemDef) return null;

              const price = pendingTransaction.fromShop
                ? shopInventory.find(si => si.itemId === pendingTransaction.itemId)?.buyPrice || 0
                : shopManager.getMaxSellQuantity(pendingTransaction.itemId, playerInventory) || 0;

              const total = price * selectedQuantity;

              return (
                <div className={`mb-6 p-4 rounded-lg border-2 ${
                  pendingTransaction.fromShop
                    ? 'bg-red-900/40 border-red-500'
                    : 'bg-green-900/40 border-green-500'
                }`}>
                  <p className="text-lg font-bold text-white">
                    {pendingTransaction.fromShop ? 'Total Cost:' : 'Total Earnings:'}
                    <span className="ml-2 text-2xl text-yellow-300">{total}g</span>
                  </p>
                </div>
              );
            })()}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={confirmQuantity}
                className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-lg transition-colors text-lg"
              >
                Confirm
              </button>
              <button
                onClick={cancelQuantity}
                className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg transition-colors text-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ShopUI;
