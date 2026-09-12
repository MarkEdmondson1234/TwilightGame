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

import { useTouchDevice } from '../hooks/useTouchDevice';
import MobileMenuShell from './MobileMenuShell';
import React, { useEffect, useState } from 'react';
import { EMOTES, ITEM_EMOTES } from '../multiplayer/emotes';
import type { EmoteId } from '../multiplayer/emotes';
import { Z_EMOTE_WHEEL, zClass } from '../zIndex';

interface EmoteWheelProps {
  onSelect: (emote: EmoteId) => void;
  onClose: () => void;
  /** Smaller targets for short screens, matching TouchControls' compact mode */
  compact?: boolean;
}

const EmoteWheel: React.FC<EmoteWheelProps> = ({ onSelect, onClose, compact = false }) => {
  const isTouchDevice = useTouchDevice();
  const [showIcons, setShowIcons] = useState(false);
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const categories: Record<string, string> = {
    all: 'All',
    food: 'Food',
    potion: 'Potions',
    ingredient: 'Ingredients',
    magical: 'Magic',
    crop: 'Crops',
    seed: 'Seeds',
    tool: 'Tools',
    material: 'Materials',
    decoration: 'Decorations',
    furniture: 'Furniture',
  };
  const icons = ITEM_EMOTES.filter(
    (item) =>
      (category === 'all' || item.category === category) &&
      item.label.toLowerCase().includes(query.toLowerCase())
  );
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showIcons) setShowIcons(false);
        else onClose();
        return;
      }
      // 1-8 pick an emote directly, so a keyboard player never needs the mouse.
      if (showIcons) return;
      const index = Number.parseInt(e.key, 10) - 1;
      if (!Number.isNaN(index) && index >= 0 && index < EMOTES.length) {
        e.preventDefault();
        onSelect(EMOTES[index].id);
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onSelect, showIcons]);

  if (showIcons)
    return (
      <MobileMenuShell className={`${zClass(Z_EMOTE_WHEEL)} bg-black/60`}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Game icon emotes"
          className="w-full max-w-3xl h-full max-h-full flex flex-col min-h-0 rounded-2xl border-2 border-amber-200/70 bg-stone-800 p-2 text-amber-50 gap-2"
        >
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setShowIcons(false)} className="min-h-12 px-3">
              Back
            </button>
            <input
              aria-label="Search game icons"
              type="search"
              placeholder="Search icons…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => event.stopPropagation()}
              className="min-w-0 flex-1 min-h-12 rounded-lg bg-stone-700 px-3 text-base"
            />
            <button onClick={onClose} className="min-h-12 px-3">
              Close
            </button>
          </div>
          <nav aria-label="Icon categories" className="flex gap-2 overflow-x-auto shrink-0">
            {Object.entries(categories)
              .filter(([key]) => key === 'all' || ITEM_EMOTES.some((item) => item.category === key))
              .map(([key, label]) => (
                <button
                  key={key}
                  aria-pressed={category === key}
                  onClick={() => setCategory(key)}
                  className={`min-h-11 px-3 shrink-0 rounded-lg ${category === key ? 'bg-amber-200 text-stone-900' : 'bg-stone-700'}`}
                >
                  {label}
                </button>
              ))}
          </nav>
          <div className="overflow-y-auto min-h-0 flex-1" style={{ overscrollBehavior: 'contain' }}>
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))' }}
            >
              {icons.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelect(item.id);
                    onClose();
                  }}
                  aria-label={item.label}
                  title={item.label}
                  className="flex flex-col items-center justify-center rounded-xl bg-stone-700 p-2 min-h-20"
                >
                  <img
                    src={item.image}
                    alt=""
                    loading="lazy"
                    draggable={false}
                    className="w-12 h-12 object-contain"
                  />
                  <span className="text-xs leading-tight mt-1">{item.label}</span>
                </button>
              ))}
            </div>
            {icons.length === 0 && <p className="p-4">No matching icons.</p>}
          </div>
        </div>
      </MobileMenuShell>
    );

  const buttonSize = compact ? 'w-12 h-12 text-2xl' : 'w-14 h-14 text-3xl';

  if (isTouchDevice)
    return (
      <MobileMenuShell className={`${zClass(Z_EMOTE_WHEEL)} bg-black/40`}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Emotes"
          className="max-h-full overflow-y-auto rounded-2xl border-2 border-amber-200/70 bg-stone-800 p-3 text-amber-50"
        >
          <div className="sticky top-0 z-10 bg-stone-800 flex items-center justify-between gap-4">
            <h2>Emotes</h2>
            <button onClick={onClose} className="min-h-12 px-3">
              Close
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {EMOTES.map((emote) => (
              <button
                key={emote.id}
                aria-label={emote.label}
                title={emote.label}
                onClick={() => {
                  onSelect(emote.id);
                  onClose();
                }}
                className="w-14 h-14 text-3xl rounded-xl bg-stone-700"
              >
                <img
                  src={emote.image}
                  alt=""
                  draggable={false}
                  className="w-full h-full object-contain"
                />
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowIcons(true)}
            className="w-full min-h-12 mt-2 rounded-lg bg-stone-700 text-amber-100"
          >
            More icons…
          </button>
        </div>
      </MobileMenuShell>
    );

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
              <img
                src={emote.image}
                alt=""
                draggable={false}
                className="w-full h-full object-contain"
              />
            </button>
          ))}
          <button
            onClick={() => setShowIcons(true)}
            className="min-h-12 px-3 rounded-xl bg-stone-700 text-amber-100"
          >
            More icons…
          </button>
        </div>
      </div>
    </>
  );
};

export default EmoteWheel;
