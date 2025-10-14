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
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-end justify-center z-50">
      <div className="bg-slate-900 border-t-4 border-teal-500 w-full max-w-3xl shadow-2xl">
        {/* Dialogue Content */}
        <div className="p-6">
          <h3 className="text-teal-400 font-bold text-sm tracking-wide mb-3">{npc.name}</h3>
          <p className="text-gray-100 text-xl leading-relaxed mb-4 font-serif">
            {currentDialogue.text}
          </p>

          {/* Response options (if any) */}
          {currentDialogue.responses && currentDialogue.responses.length > 0 && (
            <div className="space-y-2 mb-4">
              {currentDialogue.responses.map((response, index) => (
                <button
                  key={index}
                  onClick={() => {
                    // Future: navigate to response.nextId
                    console.log(`Selected response: ${response.text}`);
                  }}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-gray-200 px-4 py-3 text-left transition-colors border-l-2 border-transparent hover:border-teal-400"
                >
                  → {response.text}
                </button>
              ))}
            </div>
          )}

          <div className="text-right text-gray-500 text-sm">Press E to close</div>
        </div>
      </div>
    </div>
  );
};

export default DialogueBox;
