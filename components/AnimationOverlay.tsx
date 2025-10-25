import React from 'react';
import { MapDefinition, TileAnimation } from '../types';
import { getTileData } from '../utils/mapUtils';
import { TILE_SIZE, TILE_ANIMATIONS } from '../constants';

interface AnimationOverlayProps {
  currentMap: MapDefinition;
  visibleRange: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  seasonKey: 'spring' | 'summer' | 'autumn' | 'winter';
  timeOfDay: 'day' | 'night';
  layer: 'background' | 'midground' | 'foreground';
}

/**
 * AnimationOverlay - Renders animated GIFs based on tile-based triggers
 *
 * Features:
 * - Automatically finds matching tiles in visible area
 * - Checks seasonal and time-of-day conditions
 * - Supports radius-based placement around trigger tiles
 * - Viewport culling for performance
 * - Configurable opacity and scale
 */
const AnimationOverlay: React.FC<AnimationOverlayProps> = ({
  currentMap,
  visibleRange,
  seasonKey,
  timeOfDay,
  layer,
}) => {
  // Filter animations for this layer
  const layerAnimations = TILE_ANIMATIONS.filter(anim => anim.layer === layer);

  // Track which animations we've already rendered (to avoid duplicates)
  const renderedAnimations = new Set<string>();

  return (
    <>
      {currentMap.grid.map((row, y) =>
        row.map((_, x) => {
          // Performance: Skip tiles outside visible viewport (with margin for radius)
          const margin = 5; // Extra margin to catch nearby trigger tiles
          if (
            x < visibleRange.minX - margin ||
            x > visibleRange.maxX + margin ||
            y < visibleRange.minY - margin ||
            y > visibleRange.maxY + margin
          ) {
            return null;
          }

          const tileData = getTileData(x, y);
          if (!tileData) return null;

          // Find animations that match this tile type
          const matchingAnimations = layerAnimations.filter(
            anim => anim.tileType === tileData.type
          );

          return matchingAnimations.map((animation) => {
            // Check conditions
            if (animation.conditions) {
              if (animation.conditions.season && animation.conditions.season !== seasonKey) {
                return null;
              }
              if (animation.conditions.timeOfDay && animation.conditions.timeOfDay !== timeOfDay) {
                return null;
              }
              // Future: weather condition support
            }

            // Calculate base position of trigger tile
            const tileX = x * TILE_SIZE;
            const tileY = y * TILE_SIZE;

            // Calculate animation position based on offset
            // Note: GIF images are 512x512px, so we need to center them properly
            const scale = animation.scale || 1;
            const gifSize = 512; // Optimized GIF size
            const scaledSize = gifSize * scale;

            // Position includes offset from tile center, minus half the scaled GIF size to center it
            const animX = tileX + (animation.offsetX * TILE_SIZE) + (TILE_SIZE / 2) - (scaledSize / 2);
            const animY = tileY + (animation.offsetY * TILE_SIZE) + (TILE_SIZE / 2) - (scaledSize / 2);

            // Create unique key based on position (to avoid rendering same animation multiple times)
            const animKey = `${animation.id}-${x}-${y}`;

            // Skip if we've already rendered this animation at this position
            if (renderedAnimations.has(animKey)) {
              return null;
            }
            renderedAnimations.add(animKey);

            // Check if animation is within visible bounds (accounting for scale)
            const estimatedSize = scaledSize;
            if (
              animX + estimatedSize < visibleRange.minX * TILE_SIZE ||
              animX - estimatedSize > visibleRange.maxX * TILE_SIZE ||
              animY + estimatedSize < visibleRange.minY * TILE_SIZE ||
              animY - estimatedSize > visibleRange.maxY * TILE_SIZE
            ) {
              return null;
            }

            return (
              <img
                key={animKey}
                src={animation.image}
                alt={`Animation ${animation.id}`}
                className="absolute pointer-events-none"
                style={{
                  left: animX,
                  top: animY,
                  width: gifSize,
                  height: gifSize,
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left', // Scale from top-left since we positioned from there
                  opacity: animation.opacity ?? 1,
                  // Prevent interaction
                  pointerEvents: 'none',
                  // Ensure smooth animation
                  imageRendering: 'auto',
                }}
              />
            );
          });
        })
      )}
    </>
  );
};

export default AnimationOverlay;
