import React from 'react';
import { PlacedItem } from '../types';
import { TILE_SIZE } from '../constants';
import { shouldShowDecayWarning, getDecayProgress } from '../utils/itemDecayManager';
import { getItem } from '../data/items';
import { Z_PLACED_ITEMS } from '../zIndex';

interface PlacedItemsProps {
  items: PlacedItem[];
  cameraX: number;
  cameraY: number;
  characterScale?: number;
}

/**
 * PlacedItems - Renders food items and other placed objects on the map
 * Items blink/fade when approaching decay time (last 30 seconds)
 * Supports custom painting images with decorative frames
 */
const PlacedItems: React.FC<PlacedItemsProps> = ({
  items,
  cameraX,
  cameraY,
  characterScale = 1.0,
}) => {
  console.log('[PlacedItems] Rendering placed items:', items.length, items);

  return (
    <>
      {items.map((item) => {
        const itemDef = getItem(item.itemId);
        const baseScale = item.customScale ?? itemDef?.placedScale ?? 1;
        const scale = baseScale * characterScale;
        const itemSize = TILE_SIZE * scale;
        const offset = (TILE_SIZE * (scale - 1)) / 2;
        const screenX = item.position.x * TILE_SIZE - cameraX - offset;
        const screenY = item.position.y * TILE_SIZE - cameraY - offset;
        const showWarning = shouldShowDecayWarning(item);
        const decayProgress = getDecayProgress(item);
        const imageSrc = item.customImage || item.image;
        const hasFrame = !!item.frameStyle;
        const emojiIcon = !imageSrc && itemDef?.icon ? itemDef.icon : null;

        return (
          <div
            key={item.id}
            style={{
              position: 'absolute',
              left: `${screenX}px`,
              top: `${screenY}px`,
              width: `${itemSize}px`,
              height: `${itemSize}px`,
              pointerEvents: 'none',
              zIndex: Z_PLACED_ITEMS,
              // Frame border for paintings
              ...(hasFrame
                ? {
                    border: `${item.frameStyle!.borderWidth}px solid ${item.frameStyle!.colour}`,
                    boxSizing: 'border-box' as const,
                  }
                : {}),
            }}
          >
            {emojiIcon ? (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: `${itemSize * 0.6}px`,
                  lineHeight: 1,
                  opacity: showWarning ? 0.6 : 1.0,
                  animation: showWarning ? 'blink 1s infinite' : 'none',
                }}
              >
                {emojiIcon}
              </div>
            ) : (
              <img
                src={imageSrc}
                alt={item.itemId}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  animation: showWarning ? 'blink 1s infinite' : 'none',
                  opacity: showWarning ? 0.6 : 1.0,
                }}
              />
            )}
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
