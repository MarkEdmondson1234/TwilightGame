/**
 * Transition Icons
 *
 * Maps transition types and destinations to themed icons for the cottage-core UI.
 * Used by TransitionIndicators and NPCInteractionIndicators for visual styling.
 */

import { TileType } from '../types/core';
import { type Transition } from '../types/maps';
import { type NPC } from '../types/npc';

// Cottage-core colour palette (matches RadialMenu, Toast, etc.)
export const COTTAGE_COLOURS = {
  warmBrown: '#5c4a3d',
  warmBrownHover: '#6b5344',
  warmBrownBorder: '#8b7355',
  parchmentLight: '#f5f0e1',
  parchmentDark: '#e8dcc8',
  sageGreen: '#4a6741',
  sageGreenLight: '#7a9970',
  creamText: '#f5efe8',
  darkBrownText: '#4a3228',
} as const;

export const COTTAGE_FONTS = {
  body: 'Georgia, "Times New Roman", serif',
  heading: '"Palatino Linotype", "Book Antiqua", Palatino, serif',
} as const;

export interface TransitionIconConfig {
  icon: string;
  colour: string; // Accent colour for the icon background
}

/**
 * Get the appropriate icon and colour for a map transition
 */
export function getTransitionIcon(transition: Transition): TransitionIconConfig {
  // Priority 1: Check tileType for specific transition types
  switch (transition.tileType) {
    case TileType.DOOR:
    case TileType.EXIT_DOOR:
    case TileType.BUILDING_DOOR:
      return { icon: '🚪', colour: '#8b7355' }; // Brown for doors

    case TileType.SHOP:
    case TileType.SHOP_DOOR:
      return { icon: '🛒', colour: '#E6A847' }; // Gold for shops

    case TileType.MINE_ENTRANCE:
      return { icon: '⛏️', colour: '#6B6B6B' }; // Grey for mines

    case TileType.COTTAGE:
    case TileType.COTTAGE_STONE:
      return { icon: '🏠', colour: '#C47849' }; // Terracotta for cottages

    case TileType.CHIMNEY:
      return { icon: '🍳', colour: '#C47849' }; // Kitchen/cooking

    case TileType.WITCH_HUT:
      return { icon: '✨', colour: '#6B5B95' }; // Purple for magical

    case TileType.BEAR_HOUSE:
      return { icon: '🐻', colour: '#7D5A50' }; // Brown for bear

    default:
      break;
  }

  // Priority 2: Check toMapId for destination-based icons
  const mapId = transition.toMapId.toLowerCase();

  if (mapId.includes('forest') || mapId === 'random_forest') {
    return { icon: '🌲', colour: '#4a6741' }; // Sage green for forest
  }
  if (mapId.includes('cave') || mapId === 'random_cave') {
    return { icon: '⛏️', colour: '#6B6B6B' };
  }
  if (mapId.includes('shop')) {
    return { icon: '🛒', colour: '#E6A847' };
  }
  if (mapId.includes('kitchen') || mapId.includes('mum')) {
    return { icon: '🍳', colour: '#C47849' };
  }
  if (mapId.includes('home') || mapId.includes('house') || mapId.includes('interior')) {
    return { icon: '🏡', colour: '#8b7355' };
  }
  if (mapId.includes('farm')) {
    return { icon: '🌾', colour: '#8b7355' }; // Brown for farm
  }
  if (mapId.includes('witch') || mapId.includes('magical') || mapId.includes('mushroom')) {
    return { icon: '✨', colour: '#6B5B95' }; // Purple for magical
  }
  if (mapId.includes('upstairs') || mapId.includes('stairs')) {
    return { icon: '🪜', colour: '#8b7355' }; // Stairs
  }
  if (mapId.includes('lake') || mapId.includes('pond') || mapId.includes('water')) {
    return { icon: '🌊', colour: '#1F4B5F' }; // Teal for water
  }
  if (mapId.includes('bear')) {
    return { icon: '🐻', colour: '#7D5A50' }; // Brown for bear
  }
  if (mapId.includes('village')) {
    return { icon: '🏘️', colour: '#8b7355' }; // Village
  }
  if (mapId.includes('garden') || mapId.includes('shed')) {
    return { icon: '🌻', colour: '#5C6B3D' }; // Garden
  }

  // Default: generic transition arrow
  return { icon: '➡️', colour: '#8b7355' };
}

/**
 * Get the appropriate icon for an NPC interaction
 */
export function getNPCIcon(npc: NPC): string {
  const id = npc.id.toLowerCase();
  const name = (npc.name || '').toLowerCase();

  // Check for shop-related NPCs
  if (id.includes('shop') || id.includes('merchant') || name.includes('shop')) {
    return '🛍️';
  }

  // Animal NPCs
  if (id.includes('cat') || name.includes('cat')) return '🐱';
  if (id.includes('dog') || name.includes('dog')) return '🐕';
  if (id.includes('fox') || name.includes('fox')) return '🦊';
  if (id.includes('bear') || name.includes('bear')) return '🐻';
  if (id.includes('owl') || name.includes('owl')) return '🦉';
  if (id.includes('rabbit') || name.includes('rabbit')) return '🐰';
  if (id.includes('possum') || name.includes('possum')) return '🐾';

  // Default: speech bubble for dialogue
  return '💬';
}
