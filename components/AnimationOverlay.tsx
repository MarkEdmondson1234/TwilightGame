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
 * - Only iterates visible tiles (not full grid) for performance
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

  // Early exit if no animations for this layer
  if (layerAnimations.length === 0) {
    return null;
  }

  // Track which animations we've already rendered (to avoid duplicates)
  const renderedAnimations = new Set<string>();
  const animationElements: React.ReactNode[] = [];

  // Calculate visible range with margin (for animations that extend beyond trigger tile)
  const margin = 5;
  const startX = Math.max(0, visibleRange.minX - margin);
  const endX = Math.min(currentMap.width - 1, visibleRange.maxX + margin);
  const startY = Math.max(0, visibleRange.minY - margin);
  const endY = Math.min(currentMap.height - 1, visibleRange.maxY + margin);

  // Only iterate visible tiles (not full grid)
  for (let y = startY; y <= endY; y++) {
    for (let x = startX; x <= endX; x++) {
      const tileData = getTileData(x, y);
      if (!tileData) continue;

      // Find animations that match this tile type
      for (const animation of layerAnimations) {
        if (animation.tileType !== tileData.type) continue;

        // Check conditions
        if (animation.conditions) {
          if (animation.conditions.season && animation.conditions.season !== seasonKey) {
            continue;
          }
          if (animation.conditions.timeOfDay && animation.conditions.timeOfDay !== timeOfDay) {
            continue;
          }
        }

        // Create unique key based on position (to avoid rendering same animation multiple times)
        const animKey = `${animation.id}-${x}-${y}`;

        // Skip if we've already rendered this animation at this position
        if (renderedAnimations.has(animKey)) {
          continue;
        }
        renderedAnimations.add(animKey);

        // Calculate base position of trigger tile
        const tileX = x * TILE_SIZE;
        const tileY = y * TILE_SIZE;

        // Calculate animation position based on offset
        const scale = animation.scale || 1;
        const gifSize = 512; // Optimized GIF size
        const scaledSize = gifSize * scale;

        // Position includes offset from tile center, minus half the scaled GIF size to center it
        const animX = tileX + (animation.offsetX * TILE_SIZE) + (TILE_SIZE / 2) - (scaledSize / 2);
        const animY = tileY + (animation.offsetY * TILE_SIZE) + (TILE_SIZE / 2) - (scaledSize / 2);

        // Check if animation is within visible bounds (accounting for scale)
        if (
          animX + scaledSize < visibleRange.minX * TILE_SIZE ||
          animX - scaledSize > visibleRange.maxX * TILE_SIZE ||
          animY + scaledSize < visibleRange.minY * TILE_SIZE ||
          animY - scaledSize > visibleRange.maxY * TILE_SIZE
        ) {
          continue;
        }

        animationElements.push(
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
              transformOrigin: 'top left',
              opacity: animation.opacity ?? 1,
              pointerEvents: 'none',
              imageRendering: 'auto',
            }}
          />
        );
      }
    }
  }

  return <>{animationElements}</>;
};

export default AnimationOverlay;
