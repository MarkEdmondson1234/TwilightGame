/**
 * Icon Map - Central emoji-to-image mapping
 *
 * Maps emoji characters to hand-drawn PNG replacements.
 * Unmapped emojis are returned as-is for backwards compatibility,
 * allowing incremental migration as new icons are drawn.
 */

import { iconAssets } from '../iconAssets';

// Maps emoji characters to their hand-drawn PNG replacements
const EMOJI_TO_ICON: Record<string, string> = {
  '👋': iconAssets.hand,
  '🌿': iconAssets.leaf,
};

/**
 * Resolve an icon string to its hand-drawn replacement if available.
 * Returns the original string if no replacement exists (emoji fallback).
 */
export function resolveIcon(icon: string): string {
  return EMOJI_TO_ICON[icon] ?? icon;
}

/**
 * Check if a string is an image URL (starts with / or http).
 * Used to determine whether to render as <img> or as text.
 */
export function isImageIcon(icon: string): boolean {
  return icon.startsWith('/') || icon.startsWith('http');
}
