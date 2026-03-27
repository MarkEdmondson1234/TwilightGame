/**
 * Mess Interactions - Click detection and cleaning logic for Mr Fox's Picnic quest
 *
 * Handles the hidden-object-style mini-game in the seed shed where players
 * click on mess pile overlays to tidy them up. Each pile costs 30 stamina.
 *
 * The three mess pile overlay images (shed_interior_mess1/2/3.png) are rendered
 * by components/SeedShedOverlay.tsx on top of the shed background.
 *
 * Click detection uses relative coordinates (0–1 range) that scale with viewport,
 * matching the pattern in utils/cobwebInteractions.ts.
 */

import {
  MESS_PILE_POSITIONS,
  MessPilePosition,
  getMessCleaned,
  getMessRemaining,
  markMessCleaned,
  isMrFoxPicnicActive,
  isMrFoxPicnicAtStage,
} from '../data/questHandlers/mrFoxPicnicHandler';

// ============================================================================
// Types
// ============================================================================

export interface MessClickResult {
  /** Whether a mess pile was hit */
  hit: boolean;
  /** Index of the pile that was hit (0–2), or -1 if no hit */
  pileIndex: number;
  /** Whether the pile was already cleaned */
  alreadyCleaned: boolean;
  /** Description of the pile location */
  description?: string;
}

// ============================================================================
// Click Detection
// ============================================================================

/**
 * Check if a screen click hit a mess pile overlay.
 *
 * @param screenX - Click X in screen/canvas coordinates
 * @param screenY - Click Y in screen/canvas coordinates
 * @param imageLeft - Left edge of the shed background image in screen coordinates
 * @param imageTop - Top edge of the shed background image in screen coordinates
 * @param imageWidth - Width of the shed background image in screen pixels
 * @param imageHeight - Height of the shed background image in screen pixels
 */
export function checkMessPileClick(
  screenX: number,
  screenY: number,
  imageLeft: number,
  imageTop: number,
  imageWidth: number,
  imageHeight: number
): MessClickResult {
  // Convert screen position to relative position within the image (0–1)
  const relativeX = (screenX - imageLeft) / imageWidth;
  const relativeY = (screenY - imageTop) / imageHeight;

  // Check if click is within the image bounds
  if (relativeX < 0 || relativeX > 1 || relativeY < 0 || relativeY > 1) {
    return { hit: false, pileIndex: -1, alreadyCleaned: false };
  }

  const cleanedStatus = getMessCleaned();

  for (const pile of MESS_PILE_POSITIONS) {
    const dx = relativeX - pile.relativeX;
    const dy = relativeY - pile.relativeY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= pile.radius) {
      return {
        hit: true,
        pileIndex: pile.id,
        alreadyCleaned: cleanedStatus[pile.id],
        description: pile.description,
      };
    }
  }

  return { hit: false, pileIndex: -1, alreadyCleaned: false };
}

// ============================================================================
// Cleaning
// ============================================================================

/**
 * Attempt to clean a mess pile. Call after deducting stamina.
 *
 * @param pileIndex - Index of the pile to clean (0–2)
 */
export function cleanMessPile(pileIndex: number): {
  success: boolean;
  message: string;
  remaining: number;
  allCleaned: boolean;
} {
  if (!isMrFoxPicnicActive()) {
    return { success: false, message: 'Nothing to tidy here.', remaining: 0, allCleaned: false };
  }

  const cleanedStatus = getMessCleaned();
  if (cleanedStatus[pileIndex]) {
    return {
      success: false,
      message: "You've already tidied that up.",
      remaining: getMessRemaining(),
      allCleaned: false,
    };
  }

  const wasMarked = markMessCleaned(pileIndex);
  if (!wasMarked) {
    return { success: false, message: 'Nothing happened.', remaining: getMessRemaining(), allCleaned: false };
  }

  const remaining = getMessRemaining();
  const allCleaned = remaining === 0;

  const message = allCleaned
    ? 'Phew! That was hard work! But at least you found the blanket.'
    : `Tidied up! ${remaining} ${remaining === 1 ? 'pile' : 'piles'} to go.`;

  return { success: true, message, remaining, allCleaned };
}

// ============================================================================
// Conditions
// ============================================================================

/**
 * Whether mess pile cleaning is currently possible (in shed + quest at right stage).
 */
export function canCleanMessPiles(mapId: string): boolean {
  return (
    mapId === 'seed_shed' &&
    isMrFoxPicnicActive() &&
    isMrFoxPicnicAtStage('shed_cleaning')
  );
}

// ============================================================================
// Rendering Helpers
// ============================================================================

/**
 * Get mess pile positions with their current cleaned status.
 * Used by SeedShedOverlay to know which overlay images to render.
 */
export function getMessPilePositionsWithStatus(): (MessPilePosition & { cleaned: boolean })[] {
  const cleanedStatus = getMessCleaned();
  return MESS_PILE_POSITIONS.map((pos) => ({
    ...pos,
    cleaned: cleanedStatus[pos.id],
  }));
}

/**
 * Calculate the bounds of the shed background image in screen coordinates.
 * Matches the layer settings in maps/definitions/seedShed.ts:
 *   width: 960, height: 540, scale: 1.3, centered: true
 */
export function calculateShedOverlayBounds(
  viewportWidth: number,
  viewportHeight: number,
  viewportScale: number
): {
  left: number;
  top: number;
  width: number;
  height: number;
} {
  const baseWidth = 960;
  const baseHeight = 540;
  const layerScale = 1.3;

  const scaledWidth = baseWidth * layerScale * viewportScale;
  const scaledHeight = baseHeight * layerScale * viewportScale;

  const left = (viewportWidth - scaledWidth) / 2;
  const top = (viewportHeight - scaledHeight) / 2;

  return { left, top, width: scaledWidth, height: scaledHeight };
}
