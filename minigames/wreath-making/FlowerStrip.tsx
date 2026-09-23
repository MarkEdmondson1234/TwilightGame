/**
 * Wreath Making mini-game — compact flower picker.
 *
 * A single horizontally scrolling row of large buttons, for phones and tablets.
 * Tap selects (tap again to put it back); there is deliberately no drag from
 * here, so a sideways swipe scrolls the strip instead of picking up a flower.
 */

import React from 'react';
import { FlowerThumb } from './FlowerSprites';
import { FLOWER_COLOURS } from './wreathConstants';
import { MIN_TOUCH_TARGET } from './wreathLayout';
import type { AvailableFlower } from './wreathTypes';

/** Strip buttons are comfortably larger than the 44px minimum. */
const STRIP_BUTTON = 68;
const STRIP_THUMB = 44;

interface FlowerStripProps {
  placedCount: number;
  availableFlowers: AvailableFlower[];
  selectedFlower: string | null;
  onSelectFlower: (itemId: string) => void;
}

export const FlowerStrip: React.FC<FlowerStripProps> = ({
  placedCount,
  availableFlowers,
  selectedFlower,
  onSelectFlower,
}) => {
  if (availableFlowers.length === 0) {
    return (
      <div style={{ padding: '8px 12px', color: '#a8b89a', fontSize: 13, fontStyle: 'italic' }}>
        {placedCount > 0
          ? 'All your flowers are on the wreath. Create it, or remove a flower to rearrange.'
          : 'You have no flowers. Ask Mum about her starter basket, or forage or grow some.'}
      </div>
    );
  }

  return (
    <div
      role="listbox"
      aria-label="Your flowers"
      aria-orientation="horizontal"
      data-testid="wreath-flower-strip"
      style={{
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        overflowY: 'hidden',
        padding: '6px 12px',
        touchAction: 'pan-x',
        overscrollBehaviorX: 'contain',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'thin',
      }}
    >
      {availableFlowers.map((f) => {
        const isActive = selectedFlower === f.itemId;
        const accent = FLOWER_COLOURS[f.itemId] ?? '#6b8e5a';
        return (
          <button
            key={f.itemId}
            role="option"
            aria-selected={isActive}
            aria-label={`${f.displayName} (${f.available} available)`}
            onClick={() => onSelectFlower(f.itemId)}
            style={{
              flex: '0 0 auto',
              width: STRIP_BUTTON,
              minHeight: Math.max(MIN_TOUCH_TARGET, STRIP_BUTTON),
              padding: '4px 2px',
              background: isActive ? '#4a6a3a' : '#2a3a22',
              border: `3px solid ${isActive ? accent : '#3a5a2a'}`,
              borderRadius: 12,
              boxShadow: isActive ? `0 0 0 2px ${accent}55` : undefined,
              color: '#e0e8d0',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              touchAction: 'manipulation',
            }}
          >
            <FlowerThumb itemId={f.itemId} size={STRIP_THUMB} />
            <span
              style={{
                background: 'rgba(0,0,0,0.45)',
                borderRadius: 4,
                padding: '0 5px',
                fontSize: 12,
              }}
            >
              ×{f.available}
            </span>
          </button>
        );
      })}
    </div>
  );
};
