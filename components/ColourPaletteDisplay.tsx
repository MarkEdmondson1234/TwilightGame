/**
 * ColourPaletteDisplay - Shows available paint colours as swatches
 *
 * Displays unlocked colours with clickable swatches, and locked colours
 * greyed out with forage hints. Used in the DecorationCraftingUI painting tab.
 */

import React from 'react';
import GameIcon from './GameIcon';

interface PaintColourInfo {
  paintId: string;
  colour: string;
  displayName: string;
  unlocked: boolean;
  hint?: string;
}

interface ColourPaletteDisplayProps {
  colours: PaintColourInfo[];
  selectedPaints: string[];
  onTogglePaint: (paintId: string) => void;
  /** Maximum paints that can be selected (for frame) */
  maxSelection?: number;
}

export const ColourPaletteDisplay: React.FC<ColourPaletteDisplayProps> = ({
  colours,
  selectedPaints,
  onTogglePaint,
  maxSelection = 2,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>
        Paint Palette
        {selectedPaints.length > 0 && (
          <span
            style={{ fontWeight: 'normal', fontSize: '12px', marginLeft: '8px', color: '#666' }}
          >
            {selectedPaints.length}/{maxSelection} selected
          </span>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '6px',
        }}
      >
        {colours.map((c) => {
          const isSelected = selectedPaints.includes(c.paintId);
          const canSelect = c.unlocked && (isSelected || selectedPaints.length < maxSelection);

          return (
            <button
              key={c.paintId}
              onClick={() => {
                if (canSelect) onTogglePaint(c.paintId);
              }}
              disabled={!canSelect && !isSelected}
              title={c.unlocked ? c.displayName : (c.hint ?? 'Locked')}
              style={{
                width: '100%',
                aspectRatio: '1',
                borderRadius: '6px',
                border: isSelected ? '3px solid #fff' : '2px solid rgba(0,0,0,0.2)',
                background: c.unlocked ? c.colour : '#444',
                cursor: canSelect || isSelected ? 'pointer' : 'not-allowed',
                opacity: c.unlocked ? 1 : 0.4,
                boxShadow: isSelected ? `0 0 8px ${c.colour}` : 'none',
                transition: 'all 0.15s ease',
                position: 'relative',
                padding: 0,
              }}
            >
              {!c.unlocked && (
                <span
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <GameIcon icon="🔒" size={16} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected paint names */}
      {selectedPaints.length > 0 && (
        <div style={{ fontSize: '12px', color: '#aaa' }}>
          Frame:{' '}
          {selectedPaints
            .map((id) => colours.find((c) => c.paintId === id)?.displayName ?? id)
            .join(' + ')}
        </div>
      )}

      {/* Hint for locked colours */}
      {colours.some((c) => !c.unlocked) && (
        <div style={{ fontSize: '11px', color: '#888', fontStyle: 'italic' }}>
          Forage ingredients and craft paints to unlock more colours.
        </div>
      )}
    </div>
  );
};
