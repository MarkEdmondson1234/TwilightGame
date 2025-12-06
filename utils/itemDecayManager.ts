import { PlacedItem } from '../types';

/**
 * Item Decay Manager
 *
 * Manages the lifecycle of placed items on the map.
 * Items decay and disappear after a set time period if not picked up.
 */

// Constants
const DECAY_TIME_MS = 2 * 60 * 1000; // 2 minutes in milliseconds
const WARNING_TIME_MS = 30 * 1000; // Start warning 30 seconds before decay

/**
 * Check if a placed item should be removed due to decay
 * @param item - The placed item to check
 * @param currentTime - Current timestamp (Date.now())
 * @returns true if item should be removed
 */
export function shouldDecay(item: PlacedItem, currentTime: number = Date.now()): boolean {
  const age = currentTime - item.timestamp;
  return age >= DECAY_TIME_MS;
}

/**
 * Check if a placed item should show a decay warning (blink/fade effect)
 * @param item - The placed item to check
 * @param currentTime - Current timestamp (Date.now())
 * @returns true if item should show warning visual
 */
export function shouldShowDecayWarning(item: PlacedItem, currentTime: number = Date.now()): boolean {
  const age = currentTime - item.timestamp;
  return age >= (DECAY_TIME_MS - WARNING_TIME_MS) && age < DECAY_TIME_MS;
}

/**
 * Get the remaining time before an item decays
 * @param item - The placed item to check
 * @param currentTime - Current timestamp (Date.now())
 * @returns Remaining time in milliseconds (0 if already decayed)
 */
export function getRemainingTime(item: PlacedItem, currentTime: number = Date.now()): number {
  const age = currentTime - item.timestamp;
  const remaining = DECAY_TIME_MS - age;
  return Math.max(0, remaining);
}

/**
 * Get decay progress as a percentage (0-100)
 * @param item - The placed item to check
 * @param currentTime - Current timestamp (Date.now())
 * @returns Decay percentage (0 = just placed, 100 = fully decayed)
 */
export function getDecayProgress(item: PlacedItem, currentTime: number = Date.now()): number {
  const age = currentTime - item.timestamp;
  const progress = (age / DECAY_TIME_MS) * 100;
  return Math.min(100, Math.max(0, progress));
}

/**
 * Filter out decayed items from an array of placed items
 * @param items - Array of placed items
 * @param currentTime - Current timestamp (Date.now())
 * @returns Filtered array with decayed items removed
 */
export function removeDecayedItems(items: PlacedItem[], currentTime: number = Date.now()): PlacedItem[] {
  return items.filter(item => !shouldDecay(item, currentTime));
}

/**
 * Get decay constants for external use (e.g., UI display)
 */
export const DECAY_CONFIG = {
  DECAY_TIME_MS,
  WARNING_TIME_MS,
  DECAY_TIME_SECONDS: DECAY_TIME_MS / 1000,
  WARNING_TIME_SECONDS: WARNING_TIME_MS / 1000,
} as const;
