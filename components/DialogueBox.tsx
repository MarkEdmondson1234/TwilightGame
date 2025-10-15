import React, { useState } from 'react';
import { NPC, DialogueNode } from '../types';

interface DialogueBoxProps {
  npc: NPC;
  playerSprite: string; // Current player sprite (idle frame)
  onClose: () => void;
}

/**
 * DialogueBox - Shows NPC dialogue with portraits in a modal overlay
 * Displays player character on left, NPC on right (zoomed to top half)
 * Supports dialogue trees and has hooks for future AI integration
 */
const DialogueBox: React.FC<DialogueBoxProps> = ({ npc, playerSprite, onClose }) => {
  const [currentNodeId, setCurrentNodeId] = useState<string>('greeting');

  // Find current dialogue node
  const currentDialogue = npc.dialogue.find(node => node.id === currentNodeId) || npc.dialogue[0];

  const handleResponse = (nextId?: string) => {
    if (nextId) {
      setCurrentNodeId(nextId);
    } else {
      // No next node, close dialogue
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 border-4 border-amber-600 rounded-lg w-full max-w-5xl shadow-2xl flex overflow-hidden">
        {/* Player Portrait - Left Side */}
        <div className="w-72 bg-slate-950 border-r-4 border-teal-600 flex flex-col items-center justify-start p-4">
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
                imageRendering: 'pixelated',
                transform: 'scale(1.8)',
                transformOrigin: 'top center',
              }}
            />
          </div>
        </div>

        {/* Dialogue Content - Center */}
        <div className="flex-1 p-6 flex flex-col">
          {/* NPC Name Header */}
          <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-amber-600">
            <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse"></div>
            <h3 className="text-amber-400 font-bold text-xl tracking-wide">{npc.name}</h3>
          </div>

          {/* Dialogue Text */}
          <div className="flex-1 mb-6">
            <p className="text-gray-100 text-lg leading-relaxed font-serif italic">
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
                  className="w-full bg-slate-700 hover:bg-slate-600 text-gray-100 px-4 py-3 text-left transition-all border-l-4 border-transparent hover:border-amber-500 rounded"
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
                className="bg-amber-600 hover:bg-amber-500 text-slate-900 font-bold px-6 py-3 rounded transition-colors"
              >
                Continue [E]
              </button>
            </div>
          )}

          {/* Help Text */}
          <div className="text-center text-gray-500 text-xs mt-4">
            Press ESC or E to close
          </div>
        </div>

        {/* NPC Portrait - Right Side */}
        <div className="w-72 bg-slate-950 border-l-4 border-amber-600 flex flex-col items-center justify-start p-4">
          <div className="text-amber-400 font-bold text-lg mb-2">{npc.name}</div>
          <div className="relative w-full h-64 overflow-hidden">
            {/* Portrait Background */}
            <div className="absolute inset-0 bg-amber-500 opacity-20 rounded-lg"></div>

            {/* NPC Sprite - Zoomed to show top half (portrait style) */}
            <img
              src={npc.sprite}
              alt={npc.name}
              className="relative w-full h-full object-cover object-top"
              style={{
                imageRendering: 'pixelated',
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
