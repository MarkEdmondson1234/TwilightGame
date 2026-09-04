/**
 * RestIndicator — the "z z z" that drift off the player while they rest on furniture.
 *
 * Shown whenever `getRestingFurnitureEffect()` reports the player is inside a bed's or
 * bench's footprint, which is the same test StaminaManager reads to decide whether to
 * restore stamina — so the animation and the stamina gain can never disagree.
 *
 * Positioned in screen space from the player's world position, mirroring StaminaBar —
 * including its use of gridOffset/tileSize (not a camera offset) so it stays pinned to the
 * player in background-image rooms too. It sits slightly right of centre so it does not
 * cover the stamina bar, which is force-shown while resting.
 *
 * The glyphs are text today. If a hand-drawn sleep sprite is ever added, swap the spans for
 * an <img> — nothing else here needs to change.
 *
 * Bed = sleeping (zzz). Bench/armchair = resting upright, so zs would read as literally
 * being asleep (issue #92) — those show musical notes instead, reading as quietly
 * humming while resting.
 */

import { TILE_SIZE, PLAYER_SIZE } from '../constants';
import type { Position } from '../types';
import type { RestEffect } from '../utils/furnitureRest';
import { Z_ACTION_PROMPTS } from '../zIndex';

interface RestIndicatorProps {
  /** Which effect the player is resting on, or null when they are not resting. */
  effect: RestEffect | null;
  playerX: number; // world tiles
  playerY: number; // world tiles
  gridOffset?: Position; // Offset for background-image rooms with centred layers
  tileSize?: number; // Effective tile size (includes viewport scaling for background-image rooms)
  characterScale?: number; // Map's characterScale multiplier — see StaminaBar for why
}

/** Sleeping in a bed is a deeper rest than perching on a bench, so the glyphs are bigger. */
const GLYPH_SIZE: Record<RestEffect, number> = { sleep: 22, rest: 16 };

/** Per-effect glyph set — see the doc comment about issue #92. */
const GLYPHS: Record<RestEffect, string[]> = {
  sleep: ['z', 'z', 'z'],
  rest: ['♪', '♪', '♪'],
};

/** Stagger so the three glyphs drift one after another. */
const DELAYS = [0, 0.8, 1.6];

export function RestIndicator({
  effect,
  playerX,
  playerY,
  gridOffset,
  tileSize = TILE_SIZE,
  characterScale = 1.0,
}: RestIndicatorProps) {
  if (!effect) return null;

  const offsetX = gridOffset?.x ?? 0;
  const offsetY = gridOffset?.y ?? 0;
  const halfPlayerPx = Math.round((PLAYER_SIZE * characterScale * tileSize) / 2);
  const screenX = playerX * tileSize + offsetX + 6;
  const screenY = playerY * tileSize + offsetY - halfPlayerPx - 30;

  return (
    <div
      className="absolute pointer-events-none select-none"
      style={{ left: screenX, top: screenY, zIndex: Z_ACTION_PROMPTS }}
      aria-hidden="true"
    >
      {GLYPHS[effect].map((glyph, i) => (
        <span
          key={i}
          className="animate-rest-drift absolute font-bold"
          style={{
            animationDelay: `${DELAYS[i]}s`,
            fontSize: GLYPH_SIZE[effect] - i * 3,
            color: '#e9d5ff',
            textShadow: '0 1px 3px rgba(0, 0, 0, 0.6)',
          }}
        >
          {glyph}
        </span>
      ))}
    </div>
  );
}

export default RestIndicator;
