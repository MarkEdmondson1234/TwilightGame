/**
 * CloudShadows - Slow-moving cloud shadows on the ground
 *
 * Creates subtle dark shadows that drift slowly across the game world,
 * simulating clouds passing overhead. Shadows move in world space and
 * scroll with the camera.
 *
 * Varies based on:
 * - Season: Summer has more/darker shadows, winter has fewer/fainter
 * - Weather: No shadows during rain, fog, snow (overcast conditions)
 * - Randomization: Shadow positions/sizes vary each day
 */

import React, { useState, useEffect, useMemo } from 'react';
import { TILE_SIZE } from '../constants';
import { Z_SPRITE_BACKGROUND, zClass } from '../zIndex';
import { TimeManager } from '../utils/TimeManager';

interface CloudShadowsProps {
  cameraX: number;
  cameraY: number;
  mapWidth: number;
  mapHeight: number;
  weather: 'clear' | 'rain' | 'snow' | 'fog' | 'mist' | 'storm' | 'cherry_blossoms';
  enabled?: boolean;
}

interface ShadowConfig {
  id: string;
  width: number;
  height: number;
  startX: number;
  startY: number;
  baseSpeedX: number;
  baseSpeedY: number;
  baseOpacity: number;
  borderRadius: string;
}

/**
 * Simple seeded random number generator for consistent randomization
 */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/**
 * Get seasonal modifiers for shadow appearance
 */
function getSeasonalModifiers(season: string): {
  opacityMult: number;
  speedMult: number;
  countMult: number;
} {
  switch (season.toLowerCase()) {
    case 'summer':
      // Bright sun = more clouds, darker shadows, slower drift
      return { opacityMult: 1.3, speedMult: 0.7, countMult: 1.5 };
    case 'spring':
      // Moderate sun, gentle breeze
      return { opacityMult: 1.0, speedMult: 1.0, countMult: 1.0 };
    case 'autumn':
      // Weaker sun, windier, more clouds
      return { opacityMult: 0.8, speedMult: 1.4, countMult: 1.3 };
    case 'winter':
      // Weak sun, often overcast - very few faint shadows
      return { opacityMult: 0.3, speedMult: 0.5, countMult: 0.3 };
    default:
      return { opacityMult: 1.0, speedMult: 1.0, countMult: 1.0 };
  }
}

/**
 * Check if weather allows shadows (needs visible sun)
 */
function weatherAllowsShadows(weather: string): boolean {
  switch (weather) {
    case 'clear':
    case 'cherry_blossoms':
      return true;
    case 'rain':
    case 'snow':
    case 'fog':
    case 'mist':
    case 'storm':
      return false;
    default:
      return true;
  }
}

/**
 * Border radius presets for varied cloud shapes
 */
const BORDER_RADIUS_PRESETS = [
  '50% 60% 40% 55%',
  '45% 55% 50% 45%',
  '55% 45% 55% 50%',
  '40% 60% 45% 55%',
  '60% 50% 55% 45%',
  '48% 52% 47% 53%',
  '55% 50% 45% 50%',
  '42% 58% 52% 48%',
];

/**
 * Generate shadow configurations with randomization
 * Uses current day as seed for consistent daily variation
 */
function generateShadows(
  mapWidth: number,
  mapHeight: number,
  countMult: number,
  daySeed: number
): ShadowConfig[] {
  const mapWidthPx = mapWidth * TILE_SIZE;
  const mapHeightPx = mapHeight * TILE_SIZE;

  // Base count varies by map size, adjusted by season
  const baseCount = Math.max(2, Math.floor((mapWidth * mapHeight) / 200));
  const shadowCount = Math.max(1, Math.round(baseCount * countMult));

  // Create seeded random generator for this day
  const random = seededRandom(daySeed);

  const shadows: ShadowConfig[] = [];

  for (let i = 0; i < shadowCount; i++) {
    // Randomize size (150-500px width, proportional height)
    const width = 150 + random() * 350;
    const height = width * (0.5 + random() * 0.3); // 50-80% of width

    // Random starting position across the map
    const startX = random() * mapWidthPx;
    const startY = random() * mapHeightPx;

    // Randomize speed (5-20 px/s horizontal, slower vertical)
    const baseSpeedX = 5 + random() * 15;
    const baseSpeedY = baseSpeedX * (0.2 + random() * 0.3);

    // Randomize opacity (0.08-0.18)
    const baseOpacity = 0.08 + random() * 0.1;

    // Random border radius from presets
    const borderRadius = BORDER_RADIUS_PRESETS[Math.floor(random() * BORDER_RADIUS_PRESETS.length)];

    shadows.push({
      id: `shadow-${i}`,
      width,
      height,
      startX,
      startY,
      baseSpeedX,
      baseSpeedY,
      baseOpacity,
      borderRadius,
    });
  }

  return shadows;
}

const CloudShadows: React.FC<CloudShadowsProps> = ({
  cameraX,
  cameraY,
  mapWidth,
  mapHeight,
  weather,
  enabled = true,
}) => {
  const [time, setTime] = useState(0);

  // Get current season and day for seeding
  const { season, day, year } = TimeManager.getCurrentTime();
  const { opacityMult, speedMult, countMult } = getSeasonalModifiers(season);

  // Create a seed based on the current day (changes daily)
  const daySeed = year * 1000 + day;

  // Generate shadows (memoized, regenerates when day/season changes)
  const shadows = useMemo(() => {
    return generateShadows(mapWidth, mapHeight, countMult, daySeed);
  }, [mapWidth, mapHeight, countMult, daySeed]);

  // Check if shadows should be visible
  const showShadows = enabled && weatherAllowsShadows(weather);

  // Animate shadows
  useEffect(() => {
    if (!showShadows) return;

    let animationFrame: number;
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const delta = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
      setTime((t) => t + delta);
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [showShadows]);

  if (!showShadows) {
    return null;
  }

  const mapWidthPx = mapWidth * TILE_SIZE;
  const mapHeightPx = mapHeight * TILE_SIZE;

  return (
    <div
      className={`fixed inset-0 pointer-events-none overflow-hidden ${zClass(Z_SPRITE_BACKGROUND)}`}
    >
      {shadows.map((shadow) => {
        // Apply seasonal speed modifier
        const speedX = shadow.baseSpeedX * speedMult;
        const speedY = shadow.baseSpeedY * speedMult;

        // Calculate current position with wrapping
        const totalX = shadow.startX + time * speedX;
        const totalY = shadow.startY + time * speedY;

        // Wrap position to stay within extended map bounds
        const wrapWidth = mapWidthPx + shadow.width * 2;
        const wrapHeight = mapHeightPx + shadow.height * 2;
        const worldX = (((totalX % wrapWidth) + wrapWidth) % wrapWidth) - shadow.width;
        const worldY = (((totalY % wrapHeight) + wrapHeight) % wrapHeight) - shadow.height;

        // Convert to screen space
        const screenX = worldX - cameraX;
        const screenY = worldY - cameraY;

        // Apply seasonal opacity modifier
        const opacity = shadow.baseOpacity * opacityMult;

        return (
          <div
            key={shadow.id}
            className="absolute"
            style={{
              left: `${screenX}px`,
              top: `${screenY}px`,
              width: `${shadow.width}px`,
              height: `${shadow.height}px`,
              backgroundColor: 'rgba(0, 0, 0, 1)',
              opacity,
              borderRadius: shadow.borderRadius,
              filter: 'blur(20px)',
              transition: 'opacity 2s ease-out',
            }}
          />
        );
      })}
    </div>
  );
};

// Cloud shadows are large, slow-moving — skip re-render for small camera movements
const CAMERA_THRESHOLD = 48;

export default React.memo(CloudShadows, (prev, next) => {
  if (prev.weather !== next.weather) return false;
  if (prev.enabled !== next.enabled) return false;
  if (prev.mapWidth !== next.mapWidth || prev.mapHeight !== next.mapHeight) return false;
  if (
    Math.abs(prev.cameraX - next.cameraX) >= CAMERA_THRESHOLD ||
    Math.abs(prev.cameraY - next.cameraY) >= CAMERA_THRESHOLD
  ) {
    return false;
  }
  return true;
});
