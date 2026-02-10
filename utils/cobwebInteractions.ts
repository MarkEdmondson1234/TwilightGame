/**
 * Cobweb Interactions - Click detection and cleaning logic for Althea's chores quest
 *
 * Handles the hidden-object-style mini-game where players use the feather duster
 * to find and clean 5 cobwebs in Althea's cottage.
 *
 * Click detection uses relative coordinates (0-1 range) that scale with viewport.
 */

import {
  COBWEB_POSITIONS,
  CobwebPosition,
  getCobwebsCleaned,
  getCobwebsRemaining,
  markCobwebCleaned,
  isAltheaChoresActive,
  QUEST_ID,
} from '../data/questHandlers/altheaChoresHandler';
import { gameState } from '../GameState';

/**
 * Result of a cobweb click check
 */
export interface CobwebClickResult {
  /** Whether a cobweb was hit */
  hit: boolean;
  /** Index of the cobweb that was hit (0-4), or -1 if no hit */
  cobwebIndex: number;
  /** Whether the cobweb was already cleaned */
  alreadyCleaned: boolean;
  /** Description of the cobweb location (for debugging) */
  description?: string;
}

/**
 * Check if a screen click hit a cobweb
 *
 * @param screenX - Click X position in screen/canvas coordinates
 * @param screenY - Click Y position in screen/canvas coordinates
 * @param imageLeft - Left edge of the cobweb overlay image in screen coordinates
 * @param imageTop - Top edge of the cobweb overlay image in screen coordinates
 * @param imageWidth - Width of the cobweb overlay image in screen pixels
 * @param imageHeight - Height of the cobweb overlay image in screen pixels
 * @returns CobwebClickResult with hit information
 */
export function checkCobwebClick(
  screenX: number,
  screenY: number,
  imageLeft: number,
  imageTop: number,
  imageWidth: number,
  imageHeight: number
): CobwebClickResult {
  // Convert screen position to relative position within the image (0-1)
  const relativeX = (screenX - imageLeft) / imageWidth;
  const relativeY = (screenY - imageTop) / imageHeight;

  // Check if click is within the image bounds
  if (relativeX < 0 || relativeX > 1 || relativeY < 0 || relativeY > 1) {
    return { hit: false, cobwebIndex: -1, alreadyCleaned: false };
  }

  // Get current cleaned status
  const cleanedStatus = getCobwebsCleaned();

  // Check against each cobweb position
  for (const cobweb of COBWEB_POSITIONS) {
    const dx = relativeX - cobweb.relativeX;
    const dy = relativeY - cobweb.relativeY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= cobweb.radius) {
      // Hit this cobweb!
      const alreadyCleaned = cleanedStatus[cobweb.id];
      return {
        hit: true,
        cobwebIndex: cobweb.id,
        alreadyCleaned,
        description: cobweb.description,
      };
    }
  }

  // No cobweb hit
  return { hit: false, cobwebIndex: -1, alreadyCleaned: false };
}

/**
 * Attempt to clean a cobweb at the given index
 *
 * @param cobwebIndex - Index of the cobweb to clean (0-4)
 * @returns Object with success status and message
 */
export function cleanCobweb(cobwebIndex: number): {
  success: boolean;
  message: string;
  remaining: number;
  allCleaned: boolean;
} {
  // Check if quest is active
  if (!isAltheaChoresActive()) {
    return {
      success: false,
      message: 'The cobweb cleaning quest is not active.',
      remaining: 0,
      allCleaned: false,
    };
  }

  // Check if cobweb is already cleaned
  const cleanedStatus = getCobwebsCleaned();
  if (cleanedStatus[cobwebIndex]) {
    return {
      success: false,
      message: 'This cobweb has already been cleaned.',
      remaining: getCobwebsRemaining(),
      allCleaned: false,
    };
  }

  // Clean the cobweb
  const wasMarked = markCobwebCleaned(cobwebIndex);
  if (!wasMarked) {
    return {
      success: false,
      message: 'Failed to clean cobweb.',
      remaining: getCobwebsRemaining(),
      allCleaned: false,
    };
  }

  const remaining = getCobwebsRemaining();
  const allCleaned = remaining === 0;

  // Generate appropriate message
  let message: string;
  if (allCleaned) {
    message = 'All cobwebs cleaned! The cottage looks much tidier.';
  } else {
    message = `Cobweb cleaned! ${remaining} remaining.`;
  }

  return {
    success: true,
    message,
    remaining,
    allCleaned,
  };
}

/**
 * Check if the player has the feather duster equipped
 *
 * @param currentToolId - The currently selected tool/item ID
 * @returns True if feather duster is equipped
 */
export function isFeatherDusterEquipped(currentToolId: string | undefined): boolean {
  return currentToolId === 'tool_feather_duster';
}

/**
 * Check if we're in the cottage interior where cobwebs can be cleaned
 *
 * @param mapId - Current map ID
 * @returns True if in the cottage interior
 */
export function isInCobwebCleaningArea(mapId: string): boolean {
  return mapId === 'cottage_interior';
}

/**
 * Check if cobweb cleaning is currently possible
 * (quest active + in cottage + has feather duster)
 *
 * @param mapId - Current map ID
 * @param currentToolId - Currently equipped tool ID
 * @returns True if all conditions are met for cleaning
 */
export function canCleanCobwebs(mapId: string, currentToolId: string | undefined): boolean {
  return (
    isAltheaChoresActive() && isInCobwebCleaningArea(mapId) && isFeatherDusterEquipped(currentToolId)
  );
}

/**
 * Get the cobweb positions for rendering/debugging
 * Returns positions with their cleaned status
 */
export function getCobwebPositionsWithStatus(): (CobwebPosition & { cleaned: boolean })[] {
  const cleanedStatus = getCobwebsCleaned();
  return COBWEB_POSITIONS.map((pos) => ({
    ...pos,
    cleaned: cleanedStatus[pos.id],
  }));
}

/**
 * Calculate the overlay image bounds based on the cottage interior layout
 * This matches the cobweb overlay layer settings in cottageInterior.ts
 *
 * @param viewportWidth - Current viewport width
 * @param viewportHeight - Current viewport height
 * @param viewportScale - Current viewport scale factor
 * @returns Bounds of the overlay image in screen coordinates
 */
export function calculateOverlayBounds(
  viewportWidth: number,
  viewportHeight: number,
  viewportScale: number
): {
  left: number;
  top: number;
  width: number;
  height: number;
} {
  // These values match the cottageInterior.ts layer settings
  const baseWidth = 960;
  const baseHeight = 540;
  const layerScale = 1.3;

  const scaledWidth = baseWidth * layerScale * viewportScale;
  const scaledHeight = baseHeight * layerScale * viewportScale;

  // Centered positioning
  const left = (viewportWidth - scaledWidth) / 2;
  const top = (viewportHeight - scaledHeight) / 2;

  return {
    left,
    top,
    width: scaledWidth,
    height: scaledHeight,
  };
}
