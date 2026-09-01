/**
 * RestIndicator — the "z z z" that drift off the player while they rest on furniture.
 *
 * Shown whenever `getRestingFurnitureEffect()` reports the player is inside a bed's or
 * bench's footprint, which is the same test StaminaManager reads to decide whether to
 * restore stamina — so the animation and the stamina gain can never disagree.
 *
 * Positioned in screen space from the player's world position, mirroring StaminaBar. It
 * sits slightly right of centre so it does not cover the stamina bar, which is force-shown
 * while resting.
 *
 * The glyphs are text today. If a hand-drawn sleep sprite is ever added, swap the spans for
 * an <img> — nothing else here needs to change.
 */

import { TILE_SIZE, PLAYER_SIZE } from '../constants';
import type { RestEffect } from '../utils/furnitureRest';
import { Z_ACTION_PROMPTS } from '../zIndex';

interface RestIndicatorProps {
  /** Which effect the player is resting on, or null when they are not resting. */
  effect: RestEffect | null;
  playerX: number; // world tiles
  playerY: number; // world tiles
  cameraX: number; // pixels
  cameraY: number; // pixels
}

const HALF_PLAYER_PX = Math.round((PLAYER_SIZE * TILE_SIZE) / 2);

/** Sleeping in a bed is a deeper rest than perching on a bench, so the zs are bigger. */
const GLYPH_SIZE: Record<RestEffect, number> = { sleep: 22, rest: 16 };

export function RestIndicator({ effect, playerX, playerY, cameraX, cameraY }: RestIndicatorProps) {
  if (!effect) return null;

  const screenX = playerX * TILE_SIZE - cameraX + 6;
  const screenY = playerY * TILE_SIZE - cameraY - HALF_PLAYER_PX - 30;

  return (
    <div
      className="absolute pointer-events-none select-none"
      style={{ left: screenX, top: screenY, zIndex: Z_ACTION_PROMPTS }}
      aria-hidden="true"
    >
      {[0, 0.8, 1.6].map((delay, i) => (
        <span
          key={i}
          className="animate-rest-drift absolute font-bold"
          style={{
            animationDelay: `${delay}s`,
            fontSize: GLYPH_SIZE[effect] - i * 3,
            color: '#e9d5ff',
            textShadow: '0 1px 3px rgba(0, 0, 0, 0.6)',
          }}
        >
          z
        </span>
      ))}
    </div>
  );
}

export default RestIndicator;
