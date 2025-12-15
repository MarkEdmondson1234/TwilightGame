import React from 'react';
import { PlacedItem } from '../types';
import { TILE_SIZE } from '../constants';
import { shouldShowDecayWarning, getDecayProgress } from '../utils/itemDecayManager';

interface PlacedItemsProps {
  items: PlacedItem[];
  cameraX: number;
  cameraY: number;
}

/**
 * PlacedItems - Renders food items and other placed objects on the map
 * Items blink/fade when approaching decay time (last 30 seconds)
 */
const PlacedItems: React.FC<PlacedItemsProps> = ({ items, cameraX, cameraY }) => {
  console.log('[PlacedItems] Rendering placed items:', items.length, items);

  return (
    <>
      {items.map((item) => {
        const screenX = item.position.x * TILE_SIZE - cameraX;
        const screenY = item.position.y * TILE_SIZE - cameraY;
        const showWarning = shouldShowDecayWarning(item);
        const decayProgress = getDecayProgress(item);

        return (
          <div
            key={item.id}
            style={{
              position: 'absolute',
              left: `${screenX}px`,
              top: `${screenY}px`,
              width: `${TILE_SIZE}px`,
              height: `${TILE_SIZE}px`,
              pointerEvents: 'none',
              zIndex: 150, // Between player (100) and foreground sprites (200)
            }}
          >
            <img
              src={item.image}
              alt={item.itemId}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                imageRendering: 'pixelated',
                // Blinking animation for items about to decay (1 second cycle)
                animation: showWarning ? 'blink 1s infinite' : 'none',
                // Fade out based on decay progress
                opacity: showWarning ? 0.6 : 1.0,
              }}
            />
          </div>
        );
      })}
      <style>
        {`
          @keyframes blink {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 0.3; }
          }
        `}
      </style>
    </>
  );
};

export default PlacedItems;
