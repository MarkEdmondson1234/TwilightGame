/**
 * Ambient VFX Hook
 *
 * Manages subtle environmental visual effects based on weather and game state.
 * Triggers lightning during storms, water sparkles near water, etc.
 * Keeps effects infrequent for atmospheric subtlety.
 */

import { useEffect, useRef } from 'react';
import { Position, TileType } from '../types';
import { getTileData } from '../utils/mapUtils';
import { gameState } from '../GameState';

interface AmbientVFXConfig {
  /** VFX trigger callback */
  triggerVFX: (vfxType: string, position?: Position) => void;
  /** Current player position */
  playerPos: Position;
  /** Current map ID */
  currentMapId: string;
  /** Whether ambient effects are enabled */
  enabled: boolean;
}

// Check intervals (in ms)
const STORM_CHECK_INTERVAL = 3000;
const WATER_CHECK_INTERVAL = 5000;
const CHERRY_BLOSSOM_CHECK_INTERVAL = 4000;
const MOTHER_SEA_CHECK_INTERVAL = 4000; // Mother Sea ambient effect

// Probabilities (0-1)
const STORM_LIGHTNING_CHANCE = 0.03; // 3% per check
const WATER_SPARKLE_CHANCE = 0.05; // 5% per check
const CHERRY_BLOSSOM_CHANCE = 0.02; // 2% per check
const MOTHER_SEA_MAGIC_CHANCE = 0.08; // 8% per check (more frequent near the mystical spirit)

// Mother Sea's position in the magical lake
const MOTHER_SEA_POSITION = { x: 15, y: 13 };

// Water tile types to check for proximity
const WATER_TILES = new Set([
  TileType.WATER,
  TileType.WATER_CENTER,
  TileType.WATER_LEFT,
  TileType.WATER_RIGHT,
  TileType.WATER_TOP,
  TileType.WATER_BOTTOM,
]);

/**
 * Check if there's water within a given radius of a position
 */
function findNearbyWaterTile(pos: Position, radius: number): Position | null {
  const centerX = Math.floor(pos.x);
  const centerY = Math.floor(pos.y);

  const waterTiles: Position[] = [];

  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      const x = centerX + dx;
      const y = centerY + dy;
      const tile = getTileData(x, y);

      if (tile && WATER_TILES.has(tile.type)) {
        waterTiles.push({ x: x + 0.5, y: y + 0.5 }); // Center of tile
      }
    }
  }

  if (waterTiles.length === 0) return null;

  // Return a random water tile
  return waterTiles[Math.floor(Math.random() * waterTiles.length)];
}

/**
 * Get a random position offset from player for effects
 */
function getRandomOffsetPosition(
  playerPos: Position,
  minOffset: number,
  maxOffset: number
): Position {
  const angle = Math.random() * Math.PI * 2;
  const distance = minOffset + Math.random() * (maxOffset - minOffset);

  return {
    x: playerPos.x + Math.cos(angle) * distance,
    y: playerPos.y + Math.sin(angle) * distance,
  };
}

/**
 * Hook for managing ambient VFX effects
 */
export function useAmbientVFX(config: AmbientVFXConfig): void {
  const { triggerVFX, playerPos, currentMapId, enabled } = config;

  // Refs to track last check times
  const lastStormCheck = useRef(0);
  const lastWaterCheck = useRef(0);
  const lastCherryCheck = useRef(0);
  const lastMotherSeaCheck = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const checkAmbientEffects = () => {
      const now = Date.now();
      const weather = gameState.getWeather();

      // Storm lightning
      if (weather === 'storm' && now - lastStormCheck.current >= STORM_CHECK_INTERVAL) {
        lastStormCheck.current = now;

        if (Math.random() < STORM_LIGHTNING_CHANCE) {
          // Lightning at random position near player (offset to feel more atmospheric)
          const lightningPos = getRandomOffsetPosition(playerPos, 2, 5);
          triggerVFX('lightning', lightningPos);
        }
      }

      // Water sparkle
      if (now - lastWaterCheck.current >= WATER_CHECK_INTERVAL) {
        lastWaterCheck.current = now;

        const waterTile = findNearbyWaterTile(playerPos, 3);
        if (waterTile && Math.random() < WATER_SPARKLE_CHANCE) {
          triggerVFX('water_sparkle', waterTile);
        }
      }

      // Cherry blossom burst
      if (
        weather === 'cherry_blossoms' &&
        now - lastCherryCheck.current >= CHERRY_BLOSSOM_CHECK_INTERVAL
      ) {
        lastCherryCheck.current = now;

        if (Math.random() < CHERRY_BLOSSOM_CHANCE) {
          const petalPos = getRandomOffsetPosition(playerPos, 1, 3);
          triggerVFX('petal_burst', petalPos);
        }
      }

      // Mother Sea ambient magic (at the magical lake)
      if (
        currentMapId === 'magical_lake' &&
        now - lastMotherSeaCheck.current >= MOTHER_SEA_CHECK_INTERVAL
      ) {
        lastMotherSeaCheck.current = now;

        if (Math.random() < MOTHER_SEA_MAGIC_CHANCE) {
          // Trigger sea_magic ring effect around Mother Sea's position
          // Add slight random offset to feel more organic
          const magicPos = {
            x: MOTHER_SEA_POSITION.x + (Math.random() - 0.5) * 4,
            y: MOTHER_SEA_POSITION.y + (Math.random() - 0.5) * 4,
          };
          triggerVFX('sea_magic', magicPos);
        }
      }
    };

    // Check every second (individual effects have their own cooldowns)
    const intervalId = setInterval(checkAmbientEffects, 1000);

    return () => clearInterval(intervalId);
  }, [enabled, playerPos, currentMapId, triggerVFX]);
}
