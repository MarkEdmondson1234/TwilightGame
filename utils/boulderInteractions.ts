/**
 * Boulder Interactions - Click detection and clearing logic for the Strength Trial
 *
 * Handles the hidden-object-style mini-game in the strength_trial room where
 * players click on boulder overlays to clear them. Costs vary by boulder size
 * (see data/questHandlers/wizardTrialsStrengthHandler.ts BOULDER_TIERS and
 * constants.ts STAMINA.BOULDER_*_COST).
 *
 * The six boulder overlay images (strength_trial_boulder1-6.png) are rendered
 * by utils/pixi/BackgroundImageLayer.ts on top of the room backdrop.
 *
 * Click detection works in GRID TILE SPACE, not screen/image pixels — unlike
 * utils/messInteractions.ts / utils/cobwebInteractions.ts (which hit-test
 * against relative image-fraction coordinates). That approach was tried here
 * first and reverted: it re-derives the artwork's on-screen centering/scale
 * itself, but never accounted for the pan that `centeredPan`/`backgroundRoomPan`
 * apply whenever the cropped artwork doesn't exactly match the viewport's
 * aspect ratio (see utils/backgroundRoomLayout.ts) — which is almost always,
 * so the computed hit circles silently drifted from the actual boulder art
 * depending on window size and where the player stood. Tile space sidesteps
 * this entirely: `clickInfo.tilePos` (from utils/screenToTile.ts) already
 * accounts for pan/zoom/offset the same way collision and the F3 debug
 * overlay do, so a boulder's hitbox can be defined as literally the grid
 * tiles the F3 overlay shows it covering — no coordinate conversion at all.
 */

import {
  getBouldersCleared,
  getBouldersRemaining,
  markBoulderCleared,
  isWizardTrialsStrengthActive,
  isWizardTrialsStrengthAtStage,
  BoulderTier,
} from '../data/questHandlers/wizardTrialsStrengthHandler';

// ============================================================================
// Types
// ============================================================================

export interface BoulderPosition {
  id: number;
  /** Grid tiles (as read straight off the F3 debug overlay) this boulder covers. */
  tiles: Array<{ x: number; y: number }>;
  tier: BoulderTier;
  description: string;
}

export interface BoulderClickResult {
  /** Whether a boulder was hit */
  hit: boolean;
  /** Index of the boulder that was hit (0–5), or -1 if no hit */
  boulderIndex: number;
  /** Whether the boulder was already cleared */
  alreadyCleared: boolean;
  /** Size tier, used to look up the stamina cost */
  tier?: BoulderTier;
  /** Description of the boulder location */
  description?: string;
}

// ============================================================================
// Boulder Positions (grid tiles, from the F3 debug overlay)
// Boulder 0 is the big one covering the door; 1–2 are medium; 3–5 are small.
// ============================================================================

export const BOULDER_POSITIONS: BoulderPosition[] = [
  {
    id: 0,
    tiles: [
      { x: 5, y: 3 },
      { x: 6, y: 3 },
      { x: 7, y: 3 },
      { x: 8, y: 3 },
      { x: 6, y: 4 },
      { x: 7, y: 4 },
      { x: 8, y: 4 },
    ],
    tier: 'large',
    description: 'Boulder blocking the door',
  },
  {
    id: 1,
    tiles: [
      { x: 10, y: 4 },
      { x: 10, y: 5 },
      { x: 10, y: 6 },
      { x: 11, y: 4 },
      { x: 11, y: 5 },
      { x: 11, y: 6 },
    ],
    tier: 'medium',
    description: 'Boulder 2 (medium)',
  },
  {
    id: 2,
    tiles: [
      { x: 3, y: 5 },
      { x: 3, y: 6 },
      { x: 4, y: 5 },
      { x: 4, y: 6 },
      { x: 5, y: 6 },
    ],
    tier: 'medium',
    description: 'Boulder 3 (medium)',
  },
  {
    id: 3,
    tiles: [
      { x: 8, y: 5 },
      { x: 8, y: 6 },
      { x: 9, y: 5 },
      { x: 9, y: 6 },
    ],
    tier: 'small',
    description: 'Boulder 4 (small)',
  },
  {
    id: 4,
    tiles: [
      { x: 1, y: 5 },
      { x: 1, y: 6 },
      { x: 2, y: 5 },
      { x: 2, y: 6 },
    ],
    tier: 'small',
    description: 'Boulder 5 (small)',
  },
  {
    id: 5,
    tiles: [
      { x: 12, y: 5 },
      { x: 13, y: 5 },
      { x: 13, y: 6 },
    ],
    tier: 'small',
    description: 'Boulder 6 (small)',
  },
];

// ============================================================================
// Click Detection
// ============================================================================

/**
 * Check if a clicked grid tile hit a boulder.
 *
 * @param tileX - Floored tile X (clickInfo.tilePos.x from useMouseControls)
 * @param tileY - Floored tile Y (clickInfo.tilePos.y from useMouseControls)
 */
export function checkBoulderClick(tileX: number, tileY: number): BoulderClickResult {
  const clearedStatus = getBouldersCleared();

  for (const boulder of BOULDER_POSITIONS) {
    if (boulder.tiles.some((t) => t.x === tileX && t.y === tileY)) {
      return {
        hit: true,
        boulderIndex: boulder.id,
        alreadyCleared: clearedStatus[boulder.id],
        tier: boulder.tier,
        description: boulder.description,
      };
    }
  }

  return { hit: false, boulderIndex: -1, alreadyCleared: false };
}

// ============================================================================
// Clearing
// ============================================================================

/**
 * Attempt to clear a boulder. Call after deducting stamina.
 *
 * @param boulderIndex - Index of the boulder to clear (0–5)
 */
export function clearBoulder(boulderIndex: number): {
  success: boolean;
  message: string;
  remaining: number;
  allCleared: boolean;
} {
  if (!isWizardTrialsStrengthActive()) {
    return { success: false, message: 'Nothing to clear here.', remaining: 0, allCleared: false };
  }

  const clearedStatus = getBouldersCleared();
  if (clearedStatus[boulderIndex]) {
    return {
      success: false,
      message: "You've already cleared that one.",
      remaining: getBouldersRemaining(),
      allCleared: false,
    };
  }

  const wasMarked = markBoulderCleared(boulderIndex);
  if (!wasMarked) {
    return { success: false, message: 'Nothing happened.', remaining: getBouldersRemaining(), allCleared: false };
  }

  const remaining = getBouldersRemaining();
  const allCleared = remaining === 0;

  const message = allCleared
    ? "The last boulder gives way — the door is clear!"
    : `Boulder cleared! ${remaining} ${remaining === 1 ? 'boulder' : 'boulders'} to go.`;

  return { success: true, message, remaining, allCleared };
}

// ============================================================================
// Conditions
// ============================================================================

/**
 * Whether boulder clearing is currently possible (in the trial room + trial active).
 */
export function canClearBoulders(mapId: string): boolean {
  return (
    mapId === 'strength_trial' &&
    isWizardTrialsStrengthActive() &&
    isWizardTrialsStrengthAtStage('active')
  );
}

// ============================================================================
// Rendering Helpers
// ============================================================================

/**
 * Get boulder positions with their current cleared status.
 */
export function getBoulderPositionsWithStatus(): (BoulderPosition & { cleared: boolean })[] {
  const clearedStatus = getBouldersCleared();
  return BOULDER_POSITIONS.map((pos) => ({
    ...pos,
    cleared: clearedStatus[pos.id],
  }));
}

/**
 * Map a boulder's size tier to the stamina activity type used by
 * staminaManager.performActivity(). Kept here (rather than in
 * StaminaManager) since only the boulder-click call site needs it.
 */
export function boulderTierToActivity(
  tier: BoulderTier
): 'clear_boulder_large' | 'clear_boulder_medium' | 'clear_boulder_small' {
  switch (tier) {
    case 'large':
      return 'clear_boulder_large';
    case 'medium':
      return 'clear_boulder_medium';
    case 'small':
      return 'clear_boulder_small';
  }
}
