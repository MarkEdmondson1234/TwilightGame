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
 * - Checks seasonal and time-of-day conditions (supports single values or arrays)
 * - Supports radius-based placement around trigger tiles
 * - Supports multiple instances per trigger tile (random count from range)
 * - Supports array values for varied positioning (random offset per instance)
 * - Supports array values for varied scale (random size per instance)
 * - Supports random horizontal flip
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

        // Check conditions (support array values)
        if (animation.conditions) {
          // Check season (support both single value and array)
          if (animation.conditions.season) {
            const seasons = Array.isArray(animation.conditions.season)
              ? animation.conditions.season
              : [animation.conditions.season];
            if (!seasons.includes(seasonKey)) {
              continue;
            }
          }
          // Check time of day (support both single value and array)
          if (animation.conditions.timeOfDay) {
            const timesOfDay = Array.isArray(animation.conditions.timeOfDay)
              ? animation.conditions.timeOfDay
              : [animation.conditions.timeOfDay];
            if (!timesOfDay.includes(timeOfDay)) {
              continue;
            }
          }
        }

        // Calculate base position of trigger tile
        const tileX = x * TILE_SIZE;
        const tileY = y * TILE_SIZE;

        // Determine how many instances to render for this animation
        const instanceCount = animation.instances
          ? (Array.isArray(animation.instances)
              ? Math.floor(Math.random() * (animation.instances[1] - animation.instances[0] + 1)) + animation.instances[0]
              : animation.instances)
          : 1;

        // Render multiple instances with varied positions
        for (let instance = 0; instance < instanceCount; instance++) {
          // Unique key for each instance
          const animKey = `${animation.id}-${x}-${y}-${instance}`;

          // Skip if we've already rendered this instance
          if (renderedAnimations.has(animKey)) {
            continue;
          }
          renderedAnimations.add(animKey);

          // Create deterministic "random" values based on position (so they don't change on re-render)
          // Simple hash function to convert position to pseudo-random number
          const hash = (str: string) => {
            let h = 0;
            for (let i = 0; i < str.length; i++) {
              h = Math.imul(31, h) + str.charCodeAt(i) | 0;
            }
            return Math.abs(h);
          };

          const seed = hash(animKey);
          const seededRandom = (index: number) => ((seed + index * 1234567) % 10000) / 10000;

          // Support both scalar and array values for varied positioning (deterministic)
          const offsetX = Array.isArray(animation.offsetX)
            ? animation.offsetX[Math.floor(seededRandom(0) * animation.offsetX.length)]
            : animation.offsetX;
          const offsetY = Array.isArray(animation.offsetY)
            ? animation.offsetY[Math.floor(seededRandom(1) * animation.offsetY.length)]
            : animation.offsetY;

          // Support array scale or default to 1 (deterministic)
          const scale = animation.scale
            ? (Array.isArray(animation.scale)
                ? animation.scale[Math.floor(seededRandom(2) * animation.scale.length)]
                : animation.scale)
            : 1;

          // Horizontal flip (deterministic, based on seeded random)
          const shouldFlip = animation.flipHorizontal && seededRandom(3) > 0.5;
          const flipTransform = shouldFlip ? 'scaleX(-1)' : '';

          // Use animation-specific GIF size, or default to 512 for optimized GIFs
          const gifSize = animation.gifSize || 512;
          const scaledSize = gifSize * scale;

          // Position includes offset from tile center, minus half the scaled GIF size to center it
          const animX = tileX + (offsetX * TILE_SIZE) + (TILE_SIZE / 2) - (scaledSize / 2);
          const animY = tileY + (offsetY * TILE_SIZE) + (TILE_SIZE / 2) - (scaledSize / 2);

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
                transform: `scale(${scale}) ${flipTransform}`.trim(),
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
  }

  return <>{animationElements}</>;
};

export default AnimationOverlay;
