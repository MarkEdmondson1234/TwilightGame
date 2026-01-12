/**
 * MagicEffects - Handles potion and spell effects
 *
 * This module defines what happens when each potion is used.
 * Effects integrate with game systems: weather, time, farming, player state.
 *
 * Usage:
 *   import { usePotionEffect, MagicEffectCallbacks } from './MagicEffects';
 *   usePotionEffect('potion_raincaller', callbacks);
 */

import { WeatherType } from '../data/weatherConfig';
import { TimeManager, TimeOfDay } from './TimeManager';
import { farmManager } from './farmManager';
import { friendshipManager } from './FriendshipManager';
import { Position, FarmPlotState } from '../types';

// ============================================================================
// Types
// ============================================================================

export type MagicEffectType =
  // Size effects
  | 'shrink'
  | 'grow'
  | 'reset_size'
  // Weather effects
  | 'weather_rain'
  | 'weather_clear'
  | 'weather_snow'
  | 'weather_cherry_blossom'
  | 'weather_fog'
  | 'weather_mist'
  // Time effects
  | 'time_skip_day'
  | 'time_to_dawn'
  | 'time_to_dusk'
  // Farming effects
  | 'grow_all_crops'
  | 'water_all_crops'
  | 'revive_crops'
  | 'quality_boost'
  | 'abundant_harvest'
  | 'replenish_bushes'
  // Social effects
  | 'friendship_boost'
  | 'friendship_reduce'
  | 'reveal_gift_preference'
  // Player effects
  | 'teleport_home'
  | 'open_character_creator'
  | 'beast_ward'
  | 'beast_tongue'
  | 'healing'
  | 'wakefulness';

export interface MagicEffectResult {
  success: boolean;
  message: string;
  effectType: MagicEffectType;
  vfxType?: string; // For triggering visual effects
  duration?: number; // How long effect lasts (ms), if applicable
}

/**
 * Callbacks that App.tsx (or other components) provide to handle effects
 * that need access to React state or game systems.
 */
export interface MagicEffectCallbacks {
  // Weather
  setWeather: (weather: WeatherType) => void;

  // Time
  refreshTime: () => void;

  // Player state
  setPlayerScale: (scale: number) => void;
  getPlayerScale: () => number;
  teleportPlayer: (mapId: string, position: Position) => void;

  // UI
  openCharacterCreator: () => void;
  showToast: (message: string, type?: 'success' | 'info' | 'warning') => void;

  // Farm
  refreshFarmPlots: () => void;

  // Current context
  getCurrentMapId: () => string;
  getPlayerPosition: () => Position;

  // VFX (optional - for spell casting animations)
  triggerVFX?: (vfxType: string, position?: Position) => void;
}

// ============================================================================
// Effect Definitions
// ============================================================================

interface PotionEffectDefinition {
  potionId: string;
  effectType: MagicEffectType;
  execute: (callbacks: MagicEffectCallbacks, targetNpcId?: string) => MagicEffectResult;
}

const POTION_EFFECTS: Record<string, PotionEffectDefinition> = {
  // ===== LEVEL 1: NOVICE =====

  potion_drink_me: {
    potionId: 'potion_drink_me',
    effectType: 'shrink',
    execute: (callbacks) => {
      const currentScale = callbacks.getPlayerScale();
      const newScale = currentScale * 0.5;
      callbacks.setPlayerScale(newScale);
      callbacks.showToast('You shrink down to half size!', 'info');
      callbacks.triggerVFX?.('shrink', callbacks.getPlayerPosition());
      return {
        success: true,
        message: 'Shrunk to 50% size',
        effectType: 'shrink',
        vfxType: 'shrink',
        duration: 60000, // 1 minute
      };
    },
  },

  potion_eat_me: {
    potionId: 'potion_eat_me',
    effectType: 'grow',
    execute: (callbacks) => {
      const currentScale = callbacks.getPlayerScale();
      const newScale = currentScale * 1.5;
      callbacks.setPlayerScale(newScale);
      callbacks.showToast('You grow to 1.5x your normal size!', 'info');
      callbacks.triggerVFX?.('grow', callbacks.getPlayerPosition());
      return {
        success: true,
        message: 'Grew to 150% size',
        effectType: 'grow',
        vfxType: 'grow',
        duration: 60000,
      };
    },
  },

  potion_friendship: {
    potionId: 'potion_friendship',
    effectType: 'friendship_boost',
    execute: (callbacks, targetNpcId) => {
      if (!targetNpcId) {
        callbacks.showToast('Select an NPC to use this on!', 'warning');
        return {
          success: false,
          message: 'No target NPC selected',
          effectType: 'friendship_boost',
        };
      }
      friendshipManager.addPoints(targetNpcId, 50, 'friendship potion');
      callbacks.showToast(`Friendship with ${targetNpcId} increased!`, 'success');
      callbacks.triggerVFX?.('hearts', callbacks.getPlayerPosition());
      return {
        success: true,
        message: `+50 friendship with ${targetNpcId}`,
        effectType: 'friendship_boost',
        vfxType: 'hearts',
      };
    },
  },

  potion_bitter_grudge: {
    potionId: 'potion_bitter_grudge',
    effectType: 'friendship_reduce',
    execute: (callbacks, targetNpcId) => {
      if (!targetNpcId) {
        callbacks.showToast('Select an NPC to use this on!', 'warning');
        return {
          success: false,
          message: 'No target NPC selected',
          effectType: 'friendship_reduce',
        };
      }
      friendshipManager.addPoints(targetNpcId, -50, 'bitter grudge potion');
      callbacks.showToast(`Friendship with ${targetNpcId} decreased...`, 'warning');
      callbacks.triggerVFX?.('dark_aura', callbacks.getPlayerPosition());
      return {
        success: true,
        message: `-50 friendship with ${targetNpcId}`,
        effectType: 'friendship_reduce',
        vfxType: 'dark_aura',
      };
    },
  },

  potion_glamour: {
    potionId: 'potion_glamour',
    effectType: 'open_character_creator',
    execute: (callbacks) => {
      callbacks.openCharacterCreator();
      callbacks.triggerVFX?.('sparkle', callbacks.getPlayerPosition());
      return {
        success: true,
        message: 'Opening character creator...',
        effectType: 'open_character_creator',
        vfxType: 'sparkle',
      };
    },
  },

  potion_beastward: {
    potionId: 'potion_beastward',
    effectType: 'beast_ward',
    execute: (callbacks) => {
      // TODO: Set a flag that makes animals ignore player
      callbacks.showToast('Animals will ignore you for a day.', 'success');
      callbacks.triggerVFX?.('shield', callbacks.getPlayerPosition());
      return {
        success: true,
        message: 'Animals will ignore you',
        effectType: 'beast_ward',
        vfxType: 'shield',
        duration: 86400000, // 1 game day
      };
    },
  },

  potion_wakefulness: {
    potionId: 'potion_wakefulness',
    effectType: 'wakefulness',
    execute: (callbacks) => {
      // TODO: Remove tiredness/fatigue debuff if exists
      callbacks.showToast('You feel wide awake and full of energy!', 'success');
      callbacks.triggerVFX?.('energy_burst', callbacks.getPlayerPosition());
      return {
        success: true,
        message: 'Tiredness removed',
        effectType: 'wakefulness',
        vfxType: 'energy_burst',
      };
    },
  },

  potion_revealing: {
    potionId: 'potion_revealing',
    effectType: 'reveal_gift_preference',
    execute: (callbacks, targetNpcId) => {
      if (!targetNpcId) {
        callbacks.showToast('Select an NPC to reveal their preferences!', 'warning');
        return {
          success: false,
          message: 'No target NPC selected',
          effectType: 'reveal_gift_preference',
        };
      }
      // TODO: Show NPC's favourite gift in UI
      callbacks.showToast(`${targetNpcId}'s favourite gift revealed!`, 'success');
      callbacks.triggerVFX?.('reveal', callbacks.getPlayerPosition());
      return {
        success: true,
        message: `Revealed ${targetNpcId}'s preferences`,
        effectType: 'reveal_gift_preference',
        vfxType: 'reveal',
      };
    },
  },

  potion_healing: {
    potionId: 'potion_healing',
    effectType: 'healing',
    execute: (callbacks) => {
      // TODO: Restore health/energy if those systems exist
      callbacks.showToast('You feel refreshed and restored!', 'success');
      callbacks.triggerVFX?.('heal', callbacks.getPlayerPosition());
      return {
        success: true,
        message: 'Health and energy restored',
        effectType: 'healing',
        vfxType: 'heal',
      };
    },
  },

  // ===== LEVEL 2: JOURNEYMAN =====

  potion_raincaller: {
    potionId: 'potion_raincaller',
    effectType: 'weather_rain',
    execute: (callbacks) => {
      callbacks.setWeather('rain');
      callbacks.showToast('Dark clouds gather... rain begins to fall.', 'info');
      callbacks.triggerVFX?.('rain_summon', callbacks.getPlayerPosition());
      return {
        success: true,
        message: 'Rain summoned',
        effectType: 'weather_rain',
        vfxType: 'rain_summon',
      };
    },
  },

  potion_sunburst: {
    potionId: 'potion_sunburst',
    effectType: 'weather_clear',
    execute: (callbacks) => {
      callbacks.setWeather('clear');
      callbacks.showToast('The clouds part and warm sunshine breaks through!', 'success');
      callbacks.triggerVFX?.('sun_rays', callbacks.getPlayerPosition());
      return {
        success: true,
        message: 'Weather cleared',
        effectType: 'weather_clear',
        vfxType: 'sun_rays',
      };
    },
  },

  potion_snowglobe: {
    potionId: 'potion_snowglobe',
    effectType: 'weather_snow',
    execute: (callbacks) => {
      callbacks.setWeather('snow');
      callbacks.showToast('Snowflakes begin to drift down from the sky!', 'info');
      callbacks.triggerVFX?.('snow_summon', callbacks.getPlayerPosition());
      return {
        success: true,
        message: 'Snow summoned',
        effectType: 'weather_snow',
        vfxType: 'snow_summon',
      };
    },
  },

  potion_cherry_blossom: {
    potionId: 'potion_cherry_blossom',
    effectType: 'weather_cherry_blossom',
    execute: (callbacks) => {
      callbacks.setWeather('cherry_blossoms');
      callbacks.showToast('Pink petals dance through the air...', 'success');
      callbacks.triggerVFX?.('petal_burst', callbacks.getPlayerPosition());
      return {
        success: true,
        message: 'Cherry blossoms summoned',
        effectType: 'weather_cherry_blossom',
        vfxType: 'petal_burst',
      };
    },
  },

  potion_mistweaver: {
    potionId: 'potion_mistweaver',
    effectType: 'weather_fog',
    execute: (callbacks) => {
      callbacks.setWeather('fog');
      callbacks.showToast('A thick, mysterious fog rolls in...', 'info');
      callbacks.triggerVFX?.('fog_summon', callbacks.getPlayerPosition());
      return {
        success: true,
        message: 'Fog summoned',
        effectType: 'weather_fog',
        vfxType: 'fog_summon',
      };
    },
  },

  potion_verdant_surge: {
    potionId: 'potion_verdant_surge',
    effectType: 'replenish_bushes',
    execute: (callbacks) => {
      // TODO: Reset all bush cooldowns on current map
      callbacks.showToast('All forage bushes burst with fresh growth!', 'success');
      callbacks.triggerVFX?.('nature_burst', callbacks.getPlayerPosition());
      return {
        success: true,
        message: 'Bushes replenished',
        effectType: 'replenish_bushes',
        vfxType: 'nature_burst',
      };
    },
  },

  potion_beast_tongue: {
    potionId: 'potion_beast_tongue',
    effectType: 'beast_tongue',
    execute: (callbacks) => {
      // TODO: Enable special animal dialogue
      callbacks.showToast('You can now understand the speech of beasts!', 'success');
      callbacks.triggerVFX?.('aura_glow', callbacks.getPlayerPosition());
      return {
        success: true,
        message: 'Beast tongue activated',
        effectType: 'beast_tongue',
        vfxType: 'aura_glow',
        duration: 300000, // 5 minutes
      };
    },
  },

  // ===== LEVEL 3: MASTER =====

  potion_time_skip: {
    potionId: 'potion_time_skip',
    effectType: 'time_skip_day',
    execute: (callbacks) => {
      const currentTime = TimeManager.getCurrentTime();
      TimeManager.setTimeOverride({
        day: currentTime.day + 1,
      });
      callbacks.refreshTime();
      callbacks.showToast('A day passes in the blink of an eye...', 'info');
      callbacks.triggerVFX?.('time_warp', callbacks.getPlayerPosition());
      return {
        success: true,
        message: 'Skipped one day',
        effectType: 'time_skip_day',
        vfxType: 'time_warp',
      };
    },
  },

  potion_dawns_herald: {
    potionId: 'potion_dawns_herald',
    effectType: 'time_to_dawn',
    execute: (callbacks) => {
      TimeManager.setTimeOverride({
        hour: 6,
        minute: 0,
      });
      callbacks.refreshTime();
      callbacks.showToast('The sun rises on a new morning!', 'success');
      callbacks.triggerVFX?.('dawn_light', callbacks.getPlayerPosition());
      return {
        success: true,
        message: 'Time set to dawn',
        effectType: 'time_to_dawn',
        vfxType: 'dawn_light',
      };
    },
  },

  potion_twilight_call: {
    potionId: 'potion_twilight_call',
    effectType: 'time_to_dusk',
    execute: (callbacks) => {
      TimeManager.setTimeOverride({
        hour: 19,
        minute: 0,
      });
      callbacks.refreshTime();
      callbacks.showToast('Shadows lengthen as dusk approaches...', 'info');
      callbacks.triggerVFX?.('twilight', callbacks.getPlayerPosition());
      return {
        success: true,
        message: 'Time set to dusk',
        effectType: 'time_to_dusk',
        vfxType: 'twilight',
      };
    },
  },

  potion_harvest_moon: {
    potionId: 'potion_harvest_moon',
    effectType: 'grow_all_crops',
    execute: (callbacks) => {
      const mapId = callbacks.getCurrentMapId();
      const plots = farmManager.getPlotsForMap(mapId);
      const growingPlots = plots.filter(
        (plot) => plot.cropType && plot.state !== FarmPlotState.READY
      );
      const grownCount = growingPlots.length;

      if (grownCount > 0) {
        // Advance time by 7 days (604800000 ms) to mature all crops
        farmManager.debugAdvanceTime(604800000);
      }

      callbacks.refreshFarmPlots();
      callbacks.showToast(`${grownCount} crops instantly matured!`, 'success');
      callbacks.triggerVFX?.('harvest_glow', callbacks.getPlayerPosition());
      return {
        success: true,
        message: `Grew ${grownCount} crops`,
        effectType: 'grow_all_crops',
        vfxType: 'harvest_glow',
      };
    },
  },

  potion_dewfall: {
    potionId: 'potion_dewfall',
    effectType: 'water_all_crops',
    execute: (callbacks) => {
      const mapId = callbacks.getCurrentMapId();
      const plots = farmManager.getPlotsForMap(mapId);
      let wateredCount = 0;

      plots.forEach((plot) => {
        if (plot.cropType && plot.state === FarmPlotState.PLANTED) {
          farmManager.waterPlot(mapId, plot.position);
          wateredCount++;
        }
      });

      callbacks.refreshFarmPlots();
      callbacks.showToast(`${wateredCount} crops watered by magical dew!`, 'success');
      callbacks.triggerVFX?.('water_sparkle', callbacks.getPlayerPosition());
      return {
        success: true,
        message: `Watered ${wateredCount} crops`,
        effectType: 'water_all_crops',
        vfxType: 'water_sparkle',
      };
    },
  },

  potion_quality_blessing: {
    potionId: 'potion_quality_blessing',
    effectType: 'quality_boost',
    execute: (callbacks) => {
      // TODO: Set all growing crops to excellent quality
      callbacks.showToast('Your crops shimmer with golden light!', 'success');
      callbacks.triggerVFX?.('golden_sparkle', callbacks.getPlayerPosition());
      return {
        success: true,
        message: 'Crop quality boosted',
        effectType: 'quality_boost',
        vfxType: 'golden_sparkle',
      };
    },
  },

  potion_homeward: {
    potionId: 'potion_homeward',
    effectType: 'teleport_home',
    execute: (callbacks) => {
      callbacks.teleportPlayer('home_interior', { x: 5, y: 5 });
      callbacks.showToast('You are whisked away home...', 'info');
      callbacks.triggerVFX?.('teleport', callbacks.getPlayerPosition());
      return {
        success: true,
        message: 'Teleported home',
        effectType: 'teleport_home',
        vfxType: 'teleport',
      };
    },
  },

  potion_root_revival: {
    potionId: 'potion_root_revival',
    effectType: 'revive_crops',
    execute: (callbacks) => {
      const mapId = callbacks.getCurrentMapId();
      const plots = farmManager.getPlotsForMap(mapId);
      let revivedCount = 0;

      plots.forEach((plot) => {
        if (plot.state === FarmPlotState.WILTING || plot.state === FarmPlotState.DEAD) {
          // Water the wilting crop to revive it
          farmManager.waterPlot(mapId, plot.position);
          revivedCount++;
        }
      });

      callbacks.refreshFarmPlots();
      callbacks.showToast(`${revivedCount} crops brought back to life!`, 'success');
      callbacks.triggerVFX?.('life_burst', callbacks.getPlayerPosition());
      return {
        success: true,
        message: `Revived ${revivedCount} crops`,
        effectType: 'revive_crops',
        vfxType: 'life_burst',
      };
    },
  },

  potion_abundant_harvest: {
    potionId: 'potion_abundant_harvest',
    effectType: 'abundant_harvest',
    execute: (callbacks) => {
      // TODO: Set flag for max seed drops on next harvest
      callbacks.showToast('Your next harvest will be bountiful!', 'success');
      callbacks.triggerVFX?.('seed_burst', callbacks.getPlayerPosition());
      return {
        success: true,
        message: 'Abundant harvest blessing active',
        effectType: 'abundant_harvest',
        vfxType: 'seed_burst',
        duration: 86400000, // Until next harvest
      };
    },
  },
};

// ============================================================================
// Public API
// ============================================================================

/**
 * Use a potion and trigger its effect
 * @param potionId The potion item ID (e.g., 'potion_drink_me')
 * @param callbacks Callbacks for interacting with game state
 * @param targetNpcId Optional NPC ID for targeted effects
 * @returns Result of the effect
 */
export function usePotionEffect(
  potionId: string,
  callbacks: MagicEffectCallbacks,
  targetNpcId?: string
): MagicEffectResult {
  const effect = POTION_EFFECTS[potionId];

  if (!effect) {
    console.warn(`[MagicEffects] Unknown potion: ${potionId}`);
    return {
      success: false,
      message: `Unknown potion: ${potionId}`,
      effectType: 'healing', // Default
    };
  }

  console.log(`[MagicEffects] Using ${potionId}...`);
  const result = effect.execute(callbacks, targetNpcId);
  console.log(`[MagicEffects] Effect result:`, result);

  return result;
}

/**
 * Check if a potion has a defined effect
 */
export function hasPotionEffect(potionId: string): boolean {
  return potionId in POTION_EFFECTS;
}

/**
 * Get all VFX types used by potion effects (for preloading)
 */
export function getAllVFXTypes(): string[] {
  const vfxTypes = new Set<string>();

  Object.values(POTION_EFFECTS).forEach((effect) => {
    // Execute with dummy callbacks to get vfxType
    // This is a bit hacky, but works for getting static vfx types
  });

  // Manually list all VFX types for now
  return [
    'shrink',
    'grow',
    'hearts',
    'dark_aura',
    'sparkle',
    'shield',
    'energy_burst',
    'reveal',
    'heal',
    'rain_summon',
    'sun_rays',
    'snow_summon',
    'petal_burst',
    'fog_summon',
    'nature_burst',
    'aura_glow',
    'time_warp',
    'dawn_light',
    'twilight',
    'harvest_glow',
    'water_sparkle',
    'golden_sparkle',
    'teleport',
    'life_burst',
    'seed_burst',
  ];
}

/**
 * Get effect type for a potion
 */
export function getPotionEffectType(potionId: string): MagicEffectType | undefined {
  return POTION_EFFECTS[potionId]?.effectType;
}
