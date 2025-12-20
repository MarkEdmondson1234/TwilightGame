import React from 'react';
import { MapDefinition } from '../types';

interface ForegroundImageLayersProps {
  currentMap: MapDefinition | null;
}

/**
 * Renders foreground image layers for background-image rooms as DOM elements
 *
 * This allows proper z-ordering with NPCs (which are also DOM elements).
 * The foreground layers render in front of both NPCs and the player.
 *
 * Used for layered interiors like the shop where the counter
 * needs to appear in front of the fox shopkeeper.
 */
const ForegroundImageLayers: React.FC<ForegroundImageLayersProps> = ({ currentMap }) => {
  // Only render for background-image rooms with foreground layers
  if (!currentMap || currentMap.renderMode !== 'background-image' || !currentMap.foregroundLayers) {
    return null;
  }

  return (
    <>
      {currentMap.foregroundLayers.map((layer, index) => {
        // Calculate centered position
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const width = layer.width ?? viewportWidth;
        const height = layer.height ?? viewportHeight;

        let left = layer.offsetX ?? 0;
        let top = layer.offsetY ?? 0;

        if (layer.centered) {
          left = (viewportWidth - width) / 2;
          top = (viewportHeight - height) / 2;
        }

        return (
          <img
            key={`foreground-layer-${index}`}
            src={layer.image}
            alt=""
            className="absolute pointer-events-none"
            style={{
              left,
              top,
              width,
              height,
              opacity: layer.opacity ?? 1.0,
              zIndex: layer.zIndex ?? 200, // Use the layer's z-index for proper ordering
              imageRendering: 'auto', // Use auto for painted backgrounds (not pixel art)
            }}
          />
        );
      })}
    </>
  );
};

export default ForegroundImageLayers;
