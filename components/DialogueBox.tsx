import React from 'react';
import { NPC } from '../types';

interface DialogueBoxProps {
  npc: NPC;
  onClose: () => void;
}

/**
 * DialogueBox - Shows NPC dialogue in a modal overlay
 */
const DialogueBox: React.FC<DialogueBoxProps> = ({ npc, onClose }) => {
  // For now, show the first dialogue node
  // Future: implement full dialogue tree navigation
  const currentDialogue = npc.dialogue[0];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg border-4 border-slate-600 w-full max-w-2xl mb-4 shadow-2xl">
        {/* NPC Name Header */}
        <div className="bg-slate-700 px-6 py-3 border-b-2 border-slate-600 flex justify-between items-center">
          <h3 className="text-xl font-bold text-teal-300">{npc.name}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl font-bold leading-none"
          >
            ×
          </button>
        </div>

        {/* Dialogue Content */}
        <div className="p-6 space-y-4">
          <p className="text-white text-lg leading-relaxed">
            {currentDialogue.text}
          </p>

          {/* Response options (if any) */}
          {currentDialogue.responses && currentDialogue.responses.length > 0 && (
            <div className="space-y-2">
              {currentDialogue.responses.map((response, index) => (
                <button
                  key={index}
                  onClick={() => {
                    // Future: navigate to response.nextId
                    console.log(`Selected response: ${response.text}`);
                  }}
                  className="w-full bg-slate-700 hover:bg-slate-600 text-white px-4 py-3 rounded-lg text-left transition-colors border-2 border-transparent hover:border-teal-400"
                >
                  → {response.text}
                </button>
              ))}
            </div>
          )}

          {/* Close button */}
          <div className="pt-4 border-t border-slate-600">
            <button
              onClick={onClose}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Close [Esc]
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DialogueBox;
