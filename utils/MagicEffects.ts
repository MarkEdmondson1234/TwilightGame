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
// Size Tier System
// ============================================================================

/**
 * Size tiers for player scale effects.
 * Drink Me moves DOWN one tier, Eat Me moves UP one tier.
 * This creates a balanced system where the potions are opposites.
 */
export const SIZE_TIERS = [
  { tier: -3, scale: 0.25, name: 'Tiny' },
  { tier: -2, scale: 0.5, name: 'Very Small' },
  { tier: -1, scale: 0.7, name: 'Small' },
  { tier: 0, scale: 1.0, name: 'Normal' },
  { tier: 1, scale: 1.4, name: 'Large' },
  { tier: 2, scale: 2.0, name: 'Very Large' },
  { tier: 3, scale: 3.0, name: 'Giant' },
] as const;

export type SizeTier = (typeof SIZE_TIERS)[number]['tier'];

/**
 * Get the tier object for a given tier number
 */
export function getSizeTier(tier: SizeTier) {
  return SIZE_TIERS.find((t) => t.tier === tier) ?? SIZE_TIERS[3]; // Default to normal
}

/**
 * Get the scale value for a tier
 */
export function getScaleForTier(tier: SizeTier): number {
  return getSizeTier(tier).scale;
}

/**
 * Get the tier name for display
 */
export function getTierName(tier: SizeTier): string {
  return getSizeTier(tier).name;
}

/**
 * Clamp tier to valid range (-3 to +3)
 */
export function clampTier(tier: number): SizeTier {
  return Math.max(-3, Math.min(3, tier)) as SizeTier;
}

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
  | 'glamour_disguise'
  | 'beast_ward'
  | 'beast_tongue'
  | 'healing'
  | 'wakefulness'
  // Movement effects
  | 'floating'
  | 'flying'
  // Transformation effects
  | 'fairy_form';

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
  setPlayerSizeTier: (tier: SizeTier) => void;
  getPlayerSizeTier: () => SizeTier;
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

  // Magic effect callbacks (for potion effects that modify game state)
  clearForageCooldowns?: () => number; // For Verdant Surge
  setAllCropsQuality?: (quality: 'normal' | 'good' | 'excellent') => number; // For Quality Blessing
  applyAbundantHarvest?: () => number; // For Abundant Harvest

  // Stamina callbacks (for Healing Salve and Wakefulness Brew)
  restoreStamina?: (amount: number) => void; // Restore partial stamina
  restoreStaminaFull?: () => void; // Restore stamina to full

  // Movement effect callbacks (for Floating and Flying potions)
  setMovementEffect?: (mode: 'floating' | 'flying', durationMs: number) => void;

  // Active potion effect tracking (for Beast Tongue, Beastward, etc.)
  setActivePotionEffect?: (effectType: string, durationMs: number) => void;
  hasActivePotionEffect?: (effectType: string) => boolean;

  // Glamour Draught - opens NPC selection modal
  openGlamourModal?: () => void;

  // Fairy Form transformation (shrinks player to fairy size)
  setFairyForm?: (active: boolean, durationMs?: number) => void;
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
      const currentTier = callbacks.getPlayerSizeTier();
      const newTier = clampTier(currentTier - 1);

      if (newTier === currentTier) {
        callbacks.showToast("You're already as small as you can get!", 'warning');
        return {
          success: false,
          message: 'Already at minimum size',
          effectType: 'shrink',
        };
      }

      const newScale = getScaleForTier(newTier);
      const tierName = getTierName(newTier);
      callbacks.setPlayerSizeTier(newTier);
      callbacks.setPlayerScale(newScale);
      callbacks.showToast(`You shrink down... now ${tierName}!`, 'info');
      callbacks.triggerVFX?.('shrink', callbacks.getPlayerPosition());
      return {
        success: true,
        message: `Shrunk to ${tierName} (tier ${newTier})`,
        effectType: 'shrink',
        vfxType: 'shrink',
      };
    },
  },

  potion_eat_me: {
    potionId: 'potion_eat_me',
    effectType: 'grow',
    execute: (callbacks) => {
      const currentTier = callbacks.getPlayerSizeTier();
      const newTier = clampTier(currentTier + 1);

      if (newTier === currentTier) {
        callbacks.showToast("You're already as big as you can get!", 'warning');
        return {
          success: false,
          message: 'Already at maximum size',
          effectType: 'grow',
        };
      }

      const newScale = getScaleForTier(newTier);
      const tierName = getTierName(newTier);
      callbacks.setPlayerSizeTier(newTier);
      callbacks.setPlayerScale(newScale);
      callbacks.showToast(`You grow larger... now ${tierName}!`, 'info');
      callbacks.triggerVFX?.('grow', callbacks.getPlayerPosition());
      return {
        success: true,
        message: `Grew to ${tierName} (tier ${newTier})`,
        effectType: 'grow',
        vfxType: 'grow',
      };
    },
  },

  // NOTE: Friendship/Grudge potions are now GIVEN to NPCs via GiftModal,
  // not drunk by the player. The effect is handled in FriendshipManager.giveGift().
  // These entries are kept for backwards compatibility but won't be called
  // during normal gameplay - clicking these potions in inventory shows a toast
  // directing the player to give them to NPCs instead.

  potion_friendship: {
    potionId: 'potion_friendship',
    effectType: 'friendship_boost',
    execute: (callbacks) => {
      // This potion should be given to an NPC, not drunk by the player
      callbacks.showToast('Give this to the person you want to befriend.', 'info');
      return {
        success: false,
        message: 'This potion should be given to an NPC',
        effectType: 'friendship_boost',
      };
    },
  },

  potion_bitter_grudge: {
    potionId: 'potion_bitter_grudge',
    effectType: 'friendship_reduce',
    execute: (callbacks) => {
      // This potion should be given to an NPC, not drunk by the player
      callbacks.showToast('Give this to someone to reduce your friendship.', 'info');
      return {
        success: false,
        message: 'This potion should be given to an NPC',
        effectType: 'friendship_reduce',
      };
    },
  },

  potion_glamour: {
    potionId: 'potion_glamour',
    effectType: 'glamour_disguise',
    execute: (callbacks) => {
      // Open the glamour modal for NPC selection
      // Potion is NOT consumed here - it will be consumed when user selects an NPC
      callbacks.openGlamourModal?.();
      return {
        success: false, // Don't consume yet - modal handles consumption
        message: 'Select who to disguise as...',
        effectType: 'glamour_disguise',
      };
    },
  },

  potion_beastward: {
    potionId: 'potion_beastward',
    effectType: 'beast_ward',
    execute: (callbacks) => {
      // 1 game day = 2 real hours = 7,200,000 ms
      const duration = 7200000;
      callbacks.setActivePotionEffect?.('beast_ward', duration);
      callbacks.showToast('Animals will ignore you for a day.', 'success');
      callbacks.triggerVFX?.('shield', callbacks.getPlayerPosition());
      return {
        success: true,
        message: 'Animals will ignore you',
        effectType: 'beast_ward',
        vfxType: 'shield',
        duration,
      };
    },
  },

  potion_wakefulness: {
    potionId: 'potion_wakefulness',
    effectType: 'wakefulness',
    execute: (callbacks) => {
      // Restore stamina to full
      callbacks.restoreStaminaFull?.();
      callbacks.showToast('You feel wide awake and full of energy! (Full stamina)', 'success');
      callbacks.triggerVFX?.('energy_burst', callbacks.getPlayerPosition());
      return {
        success: true,
        message: 'Full stamina restored',
        effectType: 'wakefulness',
        vfxType: 'energy_burst',
      };
    },
  },

  potion_revealing: {
    potionId: 'potion_revealing',
    effectType: 'reveal_gift_preference',
    execute: (callbacks, targetNpcId) => {
      // The Revealing Tonic shows gift preferences - use while talking to an NPC
      callbacks.showToast('Talk to a villager to learn their favourite gifts!', 'info');
      // Don't consume the potion - user needs to give it to an NPC or use it in dialogue
      // TODO: Implement proper NPC targeting for this potion
      return {
        success: false,
        message: 'Use while talking to an NPC',
        effectType: 'reveal_gift_preference',
      };
    },
  },

  potion_healing: {
    potionId: 'potion_healing',
    effectType: 'healing',
    execute: (callbacks) => {
      // Restore 50 stamina (half of max)
      callbacks.restoreStamina?.(50);
      callbacks.showToast('You feel refreshed and restored! (+50 stamina)', 'success');
      callbacks.triggerVFX?.('heal', callbacks.getPlayerPosition());
      return {
        success: true,
        message: '+50 stamina restored',
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
      const cleared = callbacks.clearForageCooldowns?.() ?? 0;
      const message =
        cleared > 0
          ? `${cleared} forage bushes burst with fresh growth!`
          : 'All forage bushes are already fresh!';
      callbacks.showToast(message, 'success');
      callbacks.triggerVFX?.('nature_burst', callbacks.getPlayerPosition());
      return {
        success: true,
        message: `Replenished ${cleared} bushes`,
        effectType: 'replenish_bushes',
        vfxType: 'nature_burst',
      };
    },
  },

  potion_beast_tongue: {
    potionId: 'potion_beast_tongue',
    effectType: 'beast_tongue',
    execute: (callbacks) => {
      const duration = 300000; // 5 minutes real time
      callbacks.setActivePotionEffect?.('beast_tongue', duration);
      callbacks.showToast('You can now understand the speech of beasts!', 'success');
      callbacks.triggerVFX?.('aura_glow', callbacks.getPlayerPosition());
      return {
        success: true,
        message: 'Beast tongue activated',
        effectType: 'beast_tongue',
        vfxType: 'aura_glow',
        duration,
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
      const affected = callbacks.setAllCropsQuality?.('excellent') ?? 0;
      const message =
        affected > 0 ? `${affected} crops shimmer with golden light!` : 'No crops to bless!';
      callbacks.showToast(message, affected > 0 ? 'success' : 'info');
      callbacks.triggerVFX?.('golden_sparkle', callbacks.getPlayerPosition());
      callbacks.refreshFarmPlots();
      return {
        success: true,
        message: `Blessed ${affected} crops with excellent quality`,
        effectType: 'quality_boost',
        vfxType: 'golden_sparkle',
      };
    },
  },

  potion_homeward: {
    potionId: 'potion_homeward',
    effectType: 'teleport_home',
    execute: (callbacks) => {
      callbacks.teleportPlayer('mums_kitchen', { x: 7, y: 6 });
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
      const affected = callbacks.applyAbundantHarvest?.() ?? 0;
      const message =
        affected > 0
          ? `${affected} crops will yield maximum seeds on harvest!`
          : 'No crops to bless!';
      callbacks.showToast(message, affected > 0 ? 'success' : 'info');
      callbacks.triggerVFX?.('seed_burst', callbacks.getPlayerPosition());
      callbacks.refreshFarmPlots();
      return {
        success: true,
        message: `Applied abundant harvest to ${affected} crops`,
        effectType: 'abundant_harvest',
        vfxType: 'seed_burst',
      };
    },
  },

  // ===== MOVEMENT EFFECTS =====

  potion_floating: {
    potionId: 'potion_floating',
    effectType: 'floating',
    execute: (callbacks) => {
      // Duration: 2 game hours = 10 real minutes
      const duration = 2 * TimeManager.MS_PER_GAME_HOUR;
      callbacks.setMovementEffect?.('floating', duration);
      callbacks.showToast('You feel light as a feather... you can float over water!', 'success');
      callbacks.triggerVFX?.('float_aura', callbacks.getPlayerPosition());
      return {
        success: true,
        message: 'Floating for 2 game hours',
        effectType: 'floating',
        vfxType: 'float_aura',
        duration,
      };
    },
  },

  potion_flying: {
    potionId: 'potion_flying',
    effectType: 'flying',
    execute: (callbacks) => {
      // Duration: 2 game hours = 10 real minutes
      const duration = 2 * TimeManager.MS_PER_GAME_HOUR;
      callbacks.setMovementEffect?.('flying', duration);
      callbacks.showToast('You rise into the air... you can fly over anything!', 'success');
      callbacks.triggerVFX?.('flight_aura', callbacks.getPlayerPosition());
      return {
        success: true,
        message: 'Flying for 2 game hours',
        effectType: 'flying',
        vfxType: 'flight_aura',
        duration,
      };
    },
  },

  // ===== QUEST POTIONS =====
  // These are received as gifts from NPCs, not brewed

  potion_fairy_form: {
    potionId: 'potion_fairy_form',
    effectType: 'fairy_form',
    execute: (callbacks) => {
      // Duration: 1 hour real-time (plenty of time to visit the fairy queen)
      const duration = 60 * 60 * 1000;
      callbacks.setFairyForm?.(true, duration);
      callbacks.showToast('You shrink down to fairy size! Time to visit the Fairy Queen.', 'success');
      callbacks.triggerVFX?.('shrink', callbacks.getPlayerPosition());
      return {
        success: true,
        message: 'Transformed into fairy form for 1 hour',
        effectType: 'fairy_form',
        vfxType: 'shrink',
        duration,
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
    'float_aura',
    'flight_aura',
  ];
}

/**
 * Get effect type for a potion
 */
export function getPotionEffectType(potionId: string): MagicEffectType | undefined {
  return POTION_EFFECTS[potionId]?.effectType;
}
