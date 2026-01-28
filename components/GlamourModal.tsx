/**
 * GlamourModal - UI for selecting an NPC to disguise as (Glamour Draught potion)
 *
 * Features:
 * - Grid display of NPCs the player has met
 * - NPC portrait and name display
 * - Sets player disguise state for 1 in-game day
 */

import React, { useState, useMemo } from 'react';
import { friendshipManager } from '../utils/FriendshipManager';
import { npcManager } from '../NPCManager';
import { gameState } from '../GameState';
import { Z_MODAL, zClass } from '../zIndex';

interface GlamourModalProps {
  onClose: () => void;
  onDisguiseSelected: (npcId: string, npcName: string, sprite: string) => void;
}

// Duration for glamour disguise: 1 in-game day = 2 real hours = 7,200,000 ms
const GLAMOUR_DURATION_MS = 7200000;

const GlamourModal: React.FC<GlamourModalProps> = ({ onClose, onDisguiseSelected }) => {
  const [selectedNpcId, setSelectedNpcId] = useState<string | null>(null);

  // Get NPCs the player has interacted with (has friendship record)
  const availableNPCs = useMemo(() => {
    const friendships = friendshipManager.getAllFriendships();
    const npcs: Array<{
      id: string;
      name: string;
      sprite: string;
      portrait: string | null;
      hearts: number;
    }> = [];

    for (const friendship of friendships) {
      const npc = npcManager.getNPCById(friendship.npcId);
      if (npc) {
        // Get the best sprite for the NPC (portrait > dialogue > regular)
        const sprite = npc.portraitSprite || npc.dialogueSprite || npc.sprite;
        npcs.push({
          id: npc.id,
          name: npc.name,
          sprite: sprite,
          portrait: npc.portraitSprite || npc.dialogueSprite || null,
          hearts: friendshipManager.getFriendshipHearts(npc.id),
        });
      }
    }

    // Sort by friendship level (most friendly first)
    return npcs.sort((a, b) => b.hearts - a.hearts);
  }, []);

  // Get selected NPC details
  const selectedNpc = useMemo(() => {
    if (!selectedNpcId) return null;
    return availableNPCs.find((npc) => npc.id === selectedNpcId) || null;
  }, [selectedNpcId, availableNPCs]);

  // Handle disguise confirmation
  const handleConfirmDisguise = () => {
    if (!selectedNpc) return;

    // Set the disguise in GameState
    gameState.setPlayerDisguise(
      selectedNpc.id,
      selectedNpc.name,
      selectedNpc.sprite,
      GLAMOUR_DURATION_MS
    );

    // Notify parent component
    onDisguiseSelected(selectedNpc.id, selectedNpc.name, selectedNpc.sprite);
    onClose();
  };

  // Grid settings
  const COLS = 4;
  const MIN_ROWS = 2;
  const displaySlots = Math.max(MIN_ROWS * COLS, Math.ceil(availableNPCs.length / COLS) * COLS);

  // Create slot array
  const slots = useMemo(() => {
    const arr: ((typeof availableNPCs)[0] | null)[] = Array(displaySlots).fill(null);
    availableNPCs.forEach((npc, index) => {
      if (index < displaySlots) {
        arr[index] = npc;
      }
    });
    return arr;
  }, [availableNPCs, displaySlots]);

  return (
    <div
      className={`fixed inset-0 bg-black/80 flex items-center justify-center ${zClass(Z_MODAL)} pointer-events-auto`}
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-b from-purple-900 to-purple-950 border-4 border-purple-500 rounded-lg p-6 max-w-lg w-full max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold text-purple-200">Glamour Draught</h2>
            <p className="text-sm text-purple-400 mt-1">
              Choose who you wish to appear as
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-red-600 hover:bg-red-500 text-white font-bold rounded-full transition-colors"
          >
            ×
          </button>
        </div>

        {/* NPC Grid */}
        <div className="flex-1 overflow-y-auto pr-2 inventory-scrollbar">
          {availableNPCs.length === 0 ? (
            <div className="text-center text-purple-300 py-8">
              <p className="text-lg mb-2">No one to disguise as</p>
              <p className="text-sm text-purple-400">
                Talk to villagers first to learn their appearance.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {slots.map((npc, index) => {
                const isEmpty = npc === null;
                const isSelected = selectedNpcId === npc?.id;

                return (
                  <button
                    key={index}
                    onClick={() => npc && setSelectedNpcId(npc.id)}
                    className={`
                      relative aspect-square rounded-lg transition-all flex flex-col items-center justify-center p-2
                      ${
                        isSelected
                          ? 'border-4 border-yellow-400 bg-yellow-900/60 shadow-lg shadow-yellow-500/50'
                          : 'border-2 bg-purple-900/40 border-purple-600 hover:bg-purple-800/60'
                      }
                      ${isEmpty ? 'cursor-default opacity-30' : 'cursor-pointer'}
                    `}
                    disabled={isEmpty}
                  >
                    {npc && (
                      <>
                        {/* NPC Portrait */}
                        <div className="w-12 h-12 rounded-full bg-purple-800 border-2 border-purple-500 overflow-hidden flex items-center justify-center mb-1">
                          {npc.portrait ? (
                            <img
                              src={npc.portrait}
                              alt={npc.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-2xl">✨</span>
                          )}
                        </div>
                        {/* NPC Name */}
                        <span className="text-xs text-purple-200 text-center truncate w-full">
                          {npc.name}
                        </span>
                        {/* Friendship Hearts */}
                        <div className="flex items-center gap-0.5 mt-0.5">
                          {[...Array(Math.min(npc.hearts, 5))].map((_, i) => (
                            <span key={i} className="text-[8px] text-pink-400">
                              ♥
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with selected NPC and Confirm button */}
        <div className="mt-4 pt-4 border-t border-purple-700 flex justify-between items-center">
          <div className="text-purple-300">
            {selectedNpc ? (
              <span className="font-semibold">Disguise as {selectedNpc.name}</span>
            ) : (
              <span className="text-purple-400 italic">Select someone to disguise as</span>
            )}
          </div>
          <button
            onClick={handleConfirmDisguise}
            disabled={!selectedNpc}
            className={`
              px-6 py-2 rounded-lg font-bold transition-all
              ${
                selectedNpc
                  ? 'bg-purple-600 hover:bg-purple-500 text-white cursor-pointer'
                  : 'bg-purple-800 text-purple-500 cursor-not-allowed'
              }
            `}
          >
            ✨ Transform
          </button>
        </div>

        {/* Duration note */}
        <p className="text-xs text-purple-500 text-center mt-2">
          The glamour will last for one day
        </p>
      </div>
    </div>
  );
};

export default GlamourModal;
