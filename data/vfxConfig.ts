/**
 * VFX Configuration
 *
 * Defines all visual effect types for potions and magic.
 * Used by the VFX system to render appropriate effects.
 */

export type VFXCategory = 'burst' | 'lightning' | 'aura' | 'overlay' | 'float' | 'ring';

export interface VFXDefinition {
  id: string;
  category: VFXCategory;
  duration: number; // Effect duration in ms
  particles?: number; // Number of particles for burst effects
  colour: string; // Primary colour (hex)
  secondaryColour?: string; // Secondary colour for gradients
  emoji?: string; // For emoji-based effects (hearts)
  scale?: number; // Size multiplier (default 1)
}

/**
 * VFX type definitions mapped to their visual configurations
 */
export const VFX_DEFINITIONS: Record<string, VFXDefinition> = {
  // Lightning effects
  lightning: {
    id: 'lightning',
    category: 'lightning',
    duration: 700,
    colour: '#FFFFFF',
    secondaryColour: '#87CEEB',
  },

  // Burst effects - particles radiate outward
  sparkle: {
    id: 'sparkle',
    category: 'burst',
    duration: 800,
    particles: 12,
    colour: '#FFD700', // Gold
    secondaryColour: '#FFF8DC',
  },
  heal: {
    id: 'heal',
    category: 'burst',
    duration: 1000,
    particles: 10,
    colour: '#4a6741', // Sage green
    secondaryColour: '#90EE90',
  },
  energy_burst: {
    id: 'energy_burst',
    category: 'burst',
    duration: 600,
    particles: 16,
    colour: '#FFD700', // Yellow
    secondaryColour: '#FFA500',
  },
  shrink: {
    id: 'shrink',
    category: 'burst',
    duration: 800,
    particles: 12,
    colour: '#9370DB', // Purple
    secondaryColour: '#DDA0DD',
  },
  grow: {
    id: 'grow',
    category: 'burst',
    duration: 800,
    particles: 12,
    colour: '#32CD32', // Lime green
    secondaryColour: '#98FB98',
  },
  teleport: {
    id: 'teleport',
    category: 'burst',
    duration: 1000,
    particles: 20,
    colour: '#9370DB', // Purple
    secondaryColour: '#EE82EE',
  },
  life_burst: {
    id: 'life_burst',
    category: 'burst',
    duration: 900,
    particles: 14,
    colour: '#228B22', // Forest green
    secondaryColour: '#00FF00',
  },
  nature_burst: {
    id: 'nature_burst',
    category: 'burst',
    duration: 900,
    particles: 14,
    colour: '#228B22', // Forest green
    secondaryColour: '#8FBC8F',
  },
  seed_burst: {
    id: 'seed_burst',
    category: 'burst',
    duration: 700,
    particles: 8,
    colour: '#8B4513', // Brown
    secondaryColour: '#DEB887',
  },
  water_sparkle: {
    id: 'water_sparkle',
    category: 'ring',
    duration: 600,
    particles: 8,
    colour: '#4169E1', // Royal blue
    secondaryColour: '#87CEEB',
  },
  sea_magic: {
    id: 'sea_magic',
    category: 'ring',
    duration: 800,
    particles: 7,
    colour: '#00CED1', // Dark turquoise
    secondaryColour: '#87CEEB',
  },
  splash: {
    id: 'splash',
    category: 'ring',
    duration: 500,
    particles: 6,
    colour: '#38bdf8', // Light blue
    secondaryColour: '#7dd3fc',
  },
  golden_sparkle: {
    id: 'golden_sparkle',
    category: 'burst',
    duration: 800,
    particles: 12,
    colour: '#FFD700', // Gold
    secondaryColour: '#FFFACD',
  },
  harvest_glow: {
    id: 'harvest_glow',
    category: 'burst',
    duration: 1000,
    particles: 10,
    colour: '#DAA520', // Goldenrod
    secondaryColour: '#FFD700',
  },
  reveal: {
    id: 'reveal',
    category: 'burst',
    duration: 800,
    particles: 8,
    colour: '#E6E6FA', // Lavender
    secondaryColour: '#DDA0DD',
  },
  reset_size: {
    id: 'reset_size',
    category: 'burst',
    duration: 500,
    particles: 8,
    colour: '#C0C0C0', // Silver
    secondaryColour: '#FFFFFF',
  },

  // Float effects - particles rise upward
  hearts: {
    id: 'hearts',
    category: 'float',
    duration: 1500,
    particles: 8,
    colour: '#FF69B4', // Hot pink
    emoji: '💕',
  },

  // Aura effects - glow around player
  dark_aura: {
    id: 'dark_aura',
    category: 'aura',
    duration: 1200,
    colour: '#4B0082', // Indigo
    secondaryColour: '#800080',
  },
  shield: {
    id: 'shield',
    category: 'aura',
    duration: 1500,
    colour: '#00FFFF', // Cyan
    secondaryColour: '#E0FFFF',
  },
  aura_glow: {
    id: 'aura_glow',
    category: 'aura',
    duration: 1000,
    colour: '#FFD700', // Gold
    secondaryColour: '#FFFACD',
  },

  // Overlay effects - full screen or large area
  smoke_puff: {
    id: 'smoke_puff',
    category: 'overlay',
    duration: 1000,
    colour: '#9370DB', // Purple
    secondaryColour: '#DDA0DD',
  },
  rain_summon: {
    id: 'rain_summon',
    category: 'overlay',
    duration: 1500,
    colour: '#4A4A4A', // Dark grey
    secondaryColour: '#4169E1',
  },
  sun_rays: {
    id: 'sun_rays',
    category: 'overlay',
    duration: 1200,
    colour: '#FFD700', // Gold
    secondaryColour: '#FFA500',
  },
  snow_summon: {
    id: 'snow_summon',
    category: 'overlay',
    duration: 1200,
    colour: '#FFFFFF',
    secondaryColour: '#B0E0E6',
  },
  petal_burst: {
    id: 'petal_burst',
    category: 'overlay',
    duration: 1500,
    colour: '#FFB7C5', // Cherry blossom pink
    secondaryColour: '#FFC0CB',
  },
  fog_summon: {
    id: 'fog_summon',
    category: 'overlay',
    duration: 1500,
    colour: '#DCDCDC', // Gainsboro
    secondaryColour: '#F5F5F5',
  },
  time_warp: {
    id: 'time_warp',
    category: 'overlay',
    duration: 1000,
    colour: '#9370DB', // Purple
    secondaryColour: '#4B0082',
  },
  dawn_light: {
    id: 'dawn_light',
    category: 'overlay',
    duration: 1200,
    colour: '#FFA500', // Orange
    secondaryColour: '#FFD700',
  },
  twilight: {
    id: 'twilight',
    category: 'overlay',
    duration: 1200,
    colour: '#4B0082', // Indigo
    secondaryColour: '#9370DB',
  },
};

/**
 * Get a VFX definition by type, with fallback to sparkle
 */
export function getVFXDefinition(vfxType: string): VFXDefinition {
  return VFX_DEFINITIONS[vfxType] || VFX_DEFINITIONS.sparkle;
}
