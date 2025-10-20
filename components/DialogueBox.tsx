import React, { useState } from 'react';
import { NPC, DialogueNode } from '../types';

interface DialogueBoxProps {
  npc: NPC;
  playerSprite: string; // Current player sprite (idle frame)
  onClose: () => void;
  onNodeChange?: (npcId: string, nodeId: string) => void; // Callback when dialogue node changes
}

/**
 * DialogueBox - Shows NPC dialogue with portraits in a modal overlay
 * Displays player character on left, NPC on right (zoomed to top half)
 * Supports dialogue trees and has hooks for future AI integration
 */
const DialogueBox: React.FC<DialogueBoxProps> = ({ npc, playerSprite, onClose, onNodeChange }) => {
  const [currentNodeId, setCurrentNodeId] = useState<string>('greeting');

  // Find current dialogue node
  const currentDialogue = npc.dialogue.find(node => node.id === currentNodeId) || npc.dialogue[0];

  const handleResponse = (nextId?: string) => {
    if (nextId) {
      setCurrentNodeId(nextId);
      // Notify parent about node change (for handling item pickups, etc.)
      if (onNodeChange) {
        onNodeChange(npc.id, nextId);
      }
    } else {
      // No next node, close dialogue
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-end sm:items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 border-4 border-amber-600 rounded-lg w-full max-w-5xl shadow-2xl flex flex-col sm:flex-row overflow-hidden max-h-[90vh]">
        {/* Player Portrait - Left Side on desktop, hidden on mobile */}
        <div className="hidden sm:flex w-72 bg-slate-950 border-r-4 border-teal-600 flex-col items-center justify-start p-4">
          <div className="text-teal-400 font-bold text-lg mb-2">You</div>
          <div className="relative w-full h-64 overflow-hidden">
            {/* Portrait Background */}
            <div className="absolute inset-0 bg-teal-500 opacity-20 rounded-lg"></div>

            {/* Player Sprite - Zoomed to show top half (portrait style) */}
            <img
              src={playerSprite}
              alt="Player"
              className="relative w-full h-full object-cover object-top"
              style={{
                imageRendering: 'auto', // Smooth rendering for high-res portraits
                transform: 'scale(1.8)',
                transformOrigin: 'top center',
              }}
            />
          </div>
        </div>

        {/* Dialogue Content - Center */}
        <div className="flex-1 p-4 sm:p-6 flex flex-col overflow-y-auto">
          {/* NPC Name Header */}
          <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-amber-600">
            <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse"></div>
            <h3 className="text-amber-400 font-bold text-xl tracking-wide">{npc.name}</h3>
          </div>

          {/* Dialogue Text */}
          <div className="flex-1 mb-4 sm:mb-6">
            <p className="text-gray-100 text-base sm:text-lg leading-relaxed font-serif italic">
              "{currentDialogue.text}"
            </p>
          </div>

          {/* Response Options */}
          {currentDialogue.responses && currentDialogue.responses.length > 0 ? (
            <div className="space-y-2">
              <p className="text-gray-400 text-sm mb-2">Choose your response:</p>
              {currentDialogue.responses.map((response, index) => (
                <button
                  key={index}
                  onClick={() => handleResponse(response.nextId)}
                  className="w-full bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-gray-100 px-3 sm:px-4 py-2 sm:py-3 text-left text-sm sm:text-base transition-all border-l-4 border-transparent hover:border-amber-500 rounded"
                >
                  <span className="text-amber-400 mr-2">▶</span>
                  {response.text}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center">
              <button
                onClick={() => onClose()}
                className="bg-amber-600 hover:bg-amber-500 active:bg-amber-400 text-slate-900 font-bold px-6 py-3 rounded transition-colors"
              >
                Continue [E]
              </button>
            </div>
          )}

          {/* Help Text - Hide on mobile */}
          <div className="hidden sm:block text-center text-gray-500 text-xs mt-4">
            Press ESC or E to close
          </div>
        </div>

        {/* NPC Portrait - Right Side on desktop, Top on mobile */}
        <div className="sm:hidden w-full bg-slate-950 border-t-4 sm:border-t-0 sm:border-l-4 border-amber-600 flex flex-row sm:flex-col items-center justify-center p-3 order-first">
          <div className="relative w-20 h-20 overflow-hidden mr-3">
            {/* Portrait Background */}
            <div className="absolute inset-0 bg-amber-500 opacity-20 rounded-lg"></div>

            {/* NPC Sprite - Mobile (smaller) */}
            <img
              src={npc.portraitSprite || npc.sprite}
              alt={npc.name}
              className="relative w-full h-full object-cover object-top"
              style={{
                imageRendering: 'auto', // Smooth rendering for portraits
                transform: 'scale(1.8)',
                transformOrigin: 'top center',
              }}
            />
          </div>
          <div className="text-amber-400 font-bold text-base">{npc.name}</div>
        </div>

        {/* NPC Portrait - Right Side (Desktop only) */}
        <div className="hidden sm:flex w-72 bg-slate-950 border-l-4 border-amber-600 flex-col items-center justify-start p-4">
          <div className="text-amber-400 font-bold text-lg mb-2">{npc.name}</div>
          <div className="relative w-full h-64 overflow-hidden">
            {/* Portrait Background */}
            <div className="absolute inset-0 bg-amber-500 opacity-20 rounded-lg"></div>

            {/* NPC Sprite - Zoomed to show top half (portrait style) */}
            <img
              src={npc.portraitSprite || npc.sprite}
              alt={npc.name}
              className="relative w-full h-full object-cover object-top"
              style={{
                imageRendering: 'auto', // Smooth rendering for portraits
                transform: 'scale(1.8)',
                transformOrigin: 'top center',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DialogueBox;
