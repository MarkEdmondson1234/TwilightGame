/**
 * EventChainPopup - In-game popup for event chain choices
 *
 * Displays the current stage's narrative text and choice buttons,
 * styled to match DialogueBox. Appears when the player triggers a
 * chain stage that requires a decision.
 */

import React from 'react';
import { Z_DIALOGUE, zClass } from '../zIndex';

interface EventChainPopupProps {
  chainId: string;
  stageText: string;
  choices: Array<{ text: string; next: string }>;
  onChoice: (index: number) => void;
  onDismiss: () => void;
}

export const EventChainPopup: React.FC<EventChainPopupProps> = ({
  stageText,
  choices,
  onChoice,
  onDismiss,
}) => {
  return (
    <div className={`fixed inset-0 ${zClass(Z_DIALOGUE)} overflow-hidden pointer-events-none`}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 pointer-events-auto"
        style={{ background: 'rgba(0, 0, 0, 0.4)' }}
        onClick={onDismiss}
      />

      {/* Popup card */}
      <div
        className="absolute pointer-events-auto"
        style={{
          left: '50%',
          bottom: '8%',
          transform: 'translateX(-50%)',
          width: 'min(92vw, 600px)',
        }}
      >
        <div
          className="rounded-xl border border-slate-500 shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95))',
            backdropFilter: 'blur(8px)',
          }}
        >
          {/* Narrative text */}
          <div
            className="px-6 pt-5 pb-4 text-gray-200 leading-relaxed"
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: '1rem',
            }}
          >
            {stageText}
          </div>

          {/* Divider */}
          <div className="mx-6 border-t border-slate-600" />

          {/* Choice buttons */}
          <div className="px-6 py-4 flex flex-col gap-2">
            {choices.map((choice, index) => (
              <button
                key={index}
                onClick={() => onChoice(index)}
                className="bg-slate-700 bg-opacity-90 hover:bg-slate-600 active:bg-slate-500 text-gray-100 px-4 py-3 text-sm transition-all rounded-lg border border-slate-500 hover:border-amber-400 text-left w-full"
                style={{
                  fontFamily: 'Georgia, "Times New Roman", serif',
                }}
              >
                {choice.text}
              </button>
            ))}
          </div>

          {/* Dismiss hint */}
          <div
            className="px-6 pb-3 text-xs text-slate-500 text-center"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            Click outside to decide later
          </div>
        </div>
      </div>
    </div>
  );
};
