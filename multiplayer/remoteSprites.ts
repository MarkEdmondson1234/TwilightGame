/**
 * Sprite resolution for remote players.
 *
 * A player's whole appearance travels over the wire as one field — the
 * `characterId` — because sprites resolve to static paths under
 * /assets/{characterId}/base/. Nothing has to be composited or transferred.
 *
 * Frame sets are cached per character: they are pure path arrays, and rebuilding
 * them for every remote player every frame would be pointless garbage.
 */

import { Direction } from '../types';
import {
  generateCharacterSprites,
  generateFairySprites,
  getDirectionScale,
  shouldFlipFairySprite,
} from '../utils/characterSprites';
import { getScaleForTier, clampTier } from '../utils/MagicEffects';
import type { CharacterCustomization } from '../GameState';
import type { RemotePlayer } from './types';

type FrameSet = Record<Direction, string[]>;

const frameCache = new Map<string, FrameSet>();
let fairyFrames: FrameSet | null = null;

/**
 * generateCharacterSprites only reads `characterId` (and requires a non-empty
 * `name` to pass its own validity check), so a minimal stand-in is enough — we
 * never have another player's full customisation and do not need it.
 */
function minimalCustomisation(characterId: string): CharacterCustomization {
  return {
    characterId,
    name: 'Remote',
    skin: '',
    hairStyle: '',
    hairColor: '',
    eyeColor: '',
    clothesStyle: '',
    clothesColor: '',
    shoesStyle: '',
    shoesColor: '',
    glasses: 'none',
    weapon: 'sword',
  };
}

function getFrames(characterId: string): FrameSet {
  let frames = frameCache.get(characterId);
  if (!frames) {
    frames = generateCharacterSprites(minimalCustomisation(characterId));
    frameCache.set(characterId, frames);
  }
  return frames;
}

function getFairyFrames(): FrameSet {
  if (!fairyFrames) fairyFrames = generateFairySprites();
  return fairyFrames;
}

export interface RemoteSpriteInfo {
  url: string;
  /** Multiplier on PLAYER_SIZE, before the map's characterScale is applied */
  spriteScale: number;
  shouldFlip: boolean;
}

/**
 * Pick the sprite frame, scale and flip for one remote player this frame.
 *
 * Frame 0 of every direction is the idle pose; frames 1..n-1 are the walk
 * cycle. `animStep` is a monotonic counter derived from distance travelled, so
 * it is wrapped here rather than by the manager, which does not know how many
 * frames a given character has.
 */
export function getRemoteSpriteInfo(player: RemotePlayer): RemoteSpriteInfo {
  const frames = player.fairyForm ? getFairyFrames() : getFrames(player.characterId);
  const directionFrames = frames[player.direction] ?? frames[Direction.Down];

  let url: string;
  if (!player.isMoving || directionFrames.length <= 1) {
    url = directionFrames[0];
  } else {
    const walkFrameCount = directionFrames.length - 1;
    url = directionFrames[1 + (player.animStep % walkFrameCount)];
  }

  // Matches getPlayerSpriteInfo() in hooks/useCharacterSprites.ts: the custom
  // artwork is authored at a higher resolution than the placeholder SVGs.
  const isCustomSprite = url.includes('/assets/character') || url.startsWith('data:image');
  const baseScale = isCustomSprite ? 3.0 : 1.0;
  const directionScale = getDirectionScale(player.characterId, player.direction);
  const sizeScale = getScaleForTier(clampTier(player.sizeTier));

  return {
    url,
    spriteScale: baseScale * directionScale * sizeScale,
    shouldFlip: player.fairyForm && shouldFlipFairySprite(player.direction),
  };
}
