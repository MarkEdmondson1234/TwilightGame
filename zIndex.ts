/**
 * Z-Index System - Single Source of Truth for UI layering
 *
 * This file defines all z-index values used in the game.
 * When adding new UI components, reference these constants.
 *
 * Layer Ranges:
 * ─────────────────────────────────────────────────────────
 *   0-99     Game World (tiles, sprites, player)
 *   100-199  Parallax Backgrounds (behind game world)
 *   200-299  Foreground Elements (trees in front of player)
 *   300-399  Weather & Atmospheric Effects
 *   400-499  Game Overlays (radial menu, action prompts)
 *   500-599  Debug Overlays (tile info, collision boxes)
 *   1000-1099 HUD (wallet, time, inventory bag)
 *   1100-1199 Debug Panels (F3 panel - above HUD)
 *   2000-2099 Modals & Dialogues (above everything)
 *   3000+     Critical Overlays (loading, errors)
 * ─────────────────────────────────────────────────────────
 */

// =============================================================================
// GAME WORLD LAYERS (0-299)
// =============================================================================

/** Base layer below tiles (grass bases under trees) */
export const Z_TILE_BASE = -1;

/** Base tile layer (grass, floor, water) */
export const Z_TILE_BACKGROUND = 0;

/** Tile sprites (stepping stones, furniture) */
export const Z_TILE_SPRITES = 1;

/** Sky decorations (clouds - above background, below game content) */
export const Z_SKY_DECORATIONS = 5;

/** Shadow layer (shadows beneath sprites, above tiles) */
export const Z_SHADOWS = 10;

/** Ground-level decorations (grass tufts, ferns - above shadows, below furniture) */
export const Z_GROUND_DECORATION = 25;

/** Background sprites (beds, sofas - behind player) - DEPRECATED: use depth sorting */
export const Z_SPRITE_BACKGROUND = 50;

/**
 * Interior room foreground - elements that appear in front of NPCs but behind player
 * Example: Shop counter appears in front of fox shopkeeper, but player walks in front of it
 * Use this z-index for image layers in background-image rooms that need to be between NPCs and player
 */
export const Z_INTERIOR_FOREGROUND = 65;

/**
 * Base z-index for all depth-sorted entities (player, NPCs, sprites)
 * Actual z-index = Z_DEPTH_SORTED_BASE + floor(feetY * 10)
 * This gives sub-tile precision with 10 z-levels per tile row
 * Range: 100-599 (supports maps up to 50 tiles tall)
 */
export const Z_DEPTH_SORTED_BASE = 100;

/** Player character - DEPRECATED: now uses Z_DEPTH_SORTED_BASE + feetY */
export const Z_PLAYER = 100;

/** Placed items (food, dropped objects - above player) */
export const Z_PLACED_ITEMS = 150;

/** Foreground sprites (trees, buildings - in front of player) - DEPRECATED: use depth sorting */
export const Z_SPRITE_FOREGROUND = 200;

/** Foreground parallax decorations (edge trees that frame the screen) */
export const Z_FOREGROUND_PARALLAX = 250;

// =============================================================================
// PARALLAX LAYERS (reserved: -100 to -1)
// Use negative values so parallax is always behind the game world
// =============================================================================

/** Distant parallax layer (mountains, sky) */
export const Z_PARALLAX_FAR = -100;

/** Mid parallax layer (hills, clouds) */
export const Z_PARALLAX_MID = -50;

/** Near parallax layer (close decorations) */
export const Z_PARALLAX_NEAR = -10;

// =============================================================================
// WEATHER & ATMOSPHERIC EFFECTS (300-399)
// =============================================================================

/** Weather tint overlay (day/night, fog) */
export const Z_WEATHER_TINT = 300;

/** Particle effects (rain, snow, leaves) */
export const Z_WEATHER_PARTICLES = 350;

// =============================================================================
// GAME OVERLAYS (400-499)
// =============================================================================

/** Radial menu for interactions */
export const Z_RADIAL_MENU = 400;

/** Action prompts (E to interact) */
export const Z_ACTION_PROMPTS = 410;

/** Farm action animations */
export const Z_FARM_ACTIONS = 420;

// =============================================================================
// DEBUG OVERLAYS (500-599)
// =============================================================================

/** Debug tile overlay (collision boxes) */
export const Z_DEBUG_TILES = 500;

/** Debug transition markers (above tiles) */
export const Z_DEBUG_TRANSITIONS = 510;

/** Debug click highlight (above transitions) */
export const Z_DEBUG_CLICK = 520;

// =============================================================================
// HUD ELEMENTS (1000-1099)
// =============================================================================

/** Main HUD (wallet, time, location) */
export const Z_HUD = 1000;

/** Inventory bag */
export const Z_INVENTORY = 1000;

/** Touch controls (mobile) */
export const Z_TOUCH_CONTROLS = 1050;

// =============================================================================
// DEBUG PANELS (1100-1199)
// =============================================================================

/** Debug info panel (F3) - above HUD so it's always visible */
export const Z_DEBUG_PANEL = 1100;

// =============================================================================
// MODALS & DIALOGUES (2000-2099)
// =============================================================================

/** Modal backgrounds (generic) */
export const Z_MODAL = 2000;

/** Inventory modal */
export const Z_INVENTORY_MODAL = 2000;

/** Dialogue boxes */
export const Z_DIALOGUE = 2010;

/** Character creator */
export const Z_CHARACTER_CREATOR = 2020;

/** Help browser (F1) */
export const Z_HELP_BROWSER = 2030;

/** Cooking interface */
export const Z_COOKING = 2040;

/** Recipe book */
export const Z_RECIPE_BOOK = 2050;

/** Bookshelf modal */
export const Z_BOOKSHELF_MODAL = 2060;

/** Shop UI */
export const Z_SHOP = 2070;

/** Shop confirmation dialog (above shop) */
export const Z_SHOP_CONFIRM = 2080;

/** Cutscene player */
export const Z_CUTSCENE = 2090;

/** Cutscene subtitles */
export const Z_CUTSCENE_SUBTITLES = 2095;

// =============================================================================
// CRITICAL OVERLAYS (3000+)
// =============================================================================

/** Item tooltips (above everything except errors) */
export const Z_TOOLTIP = 3000;

/** Toast notifications */
export const Z_TOAST = 3100;

/** Loading screens */
export const Z_LOADING = 3500;

/** Error overlays */
export const Z_ERROR = 4000;

// =============================================================================
// HELPER - Tailwind class generator
// =============================================================================

/**
 * Convert z-index constant to Tailwind class
 * @example zClass(Z_HUD) => "z-[1000]"
 */
export function zClass(zIndex: number): string {
  return `z-[${zIndex}]`;
}

/**
 * Convert z-index constant to inline style
 * @example zStyle(Z_HUD) => { zIndex: 1000 }
 */
export function zStyle(zIndex: number): { zIndex: number } {
  return { zIndex };
}
