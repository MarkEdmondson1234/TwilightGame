/**
 * EmoteWheel — the quickest way players talk to each other.
 *
 * The vocabulary is closed on purpose (see multiplayer/emotes.ts): this game is
 * played by children, and a fixed set of gestures means it is not *possible* to
 * say something harmful with one. Chat exists too (components/ChatPanel.tsx),
 * but an emote needs no typing, which on a tablet mid-game matters.
 *
 * Laid out as a bar rather than a true radial: eight targets around a circle are
 * fiddly on a tablet, and this sits directly above the touch controls that open it.
 */

import React, { useEffect } from 'react';
import { EMOTES } from '../multiplayer/emotes';
import type { EmoteId } from '../multiplayer/emotes';
import { Z_EMOTE_WHEEL, zClass } from '../zIndex';

interface EmoteWheelProps {
  onSelect: (emote: EmoteId) => void;
  onClose: () => void;
  /** Smaller targets for short screens, matching TouchControls' compact mode */
  compact?: boolean;
}

const EmoteWheel: React.FC<EmoteWheelProps> = ({ onSelect, onClose, compact = false }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      // 1-8 pick an emote directly, so a keyboard player never needs the mouse.
      const index = Number.parseInt(e.key, 10) - 1;
      if (!Number.isNaN(index) && index >= 0 && index < EMOTES.length) {
        e.preventDefault();
        onSelect(EMOTES[index].id);
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onSelect]);

  const buttonSize = compact ? 'w-12 h-12 text-2xl' : 'w-14 h-14 text-3xl';

  return (
    <>
      {/* Invisible backdrop — a tap anywhere else dismisses without choosing */}
      <div
        className={`fixed inset-0 ${zClass(Z_EMOTE_WHEEL)}`}
        onClick={onClose}
        onTouchStart={onClose}
      />

      <div
        className={`fixed left-1/2 -translate-x-1/2 ${zClass(Z_EMOTE_WHEEL)}`}
        style={{
          bottom: compact
            ? 'calc(180px + env(safe-area-inset-bottom, 0px))'
            : 'calc(220px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="flex gap-1.5 rounded-2xl border-2 border-amber-200/70 bg-stone-800/95 px-3 py-2 shadow-xl">
          {EMOTES.map((emote, index) => (
            <button
              key={emote.id}
              title={`${emote.label} (${index + 1})`}
              aria-label={emote.label}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(emote.id);
                onClose();
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onSelect(emote.id);
                onClose();
              }}
              className={`${buttonSize} flex items-center justify-center rounded-xl bg-stone-700/80 transition-transform hover:scale-110 hover:bg-stone-600 active:scale-95`}
            >
              {emote.icon}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default EmoteWheel;
