/**
 * WeatherManager - Deterministic global weather system
 *
 * Weather is globally consistent across all players because it's derived
 * deterministically from the game clock (TimeManager). No network sync needed.
 *
 * Time is divided into fixed "weather slots" (WEATHER_SLOT_HOURS game hours each).
 * Each slot's weather is computed from a seeded PRNG keyed to the slot index + season.
 * Zone filtering (indoor=clear, cave=clear/mist) is applied on top.
 *
 * Features:
 * - Deterministic: all players see the same weather at the same time
 * - Seasonal weather probabilities
 * - Zone-aware (indoor/cave filtering)
 * - Manual override support (DevTools)
 *
 * Usage:
 *   const weatherManager = new WeatherManager(gameState);
 *   // In game loop or time check (every ~10s):
 *   weatherManager.checkWeatherUpdate();
 */

import { TimeManager } from './TimeManager';
import { mapManager } from '../maps';
import {
  WeatherType,
  WEATHER_SLOT_HOURS,
  getWeatherForSlot,
  getEffectiveWeather,
} from '../data/weatherConfig';
import { farmManager } from './farmManager';
import { characterData } from './CharacterData';

/**
 * Interface for GameState methods used by WeatherManager
 * Avoids circular imports while maintaining type safety
 */
export interface IWeatherGameState {
  getAutomaticWeather(): boolean;
  getWeather(): WeatherType;
  setWeather(weather: WeatherType): void;
}

export class WeatherManager {
  private gameState: IWeatherGameState;
  private lastSlotIndex: number = -1;
  private manualOverride: boolean = false;

  constructor(gameState: IWeatherGameState) {
    this.gameState = gameState;
  }

  /**
   * Check if weather should be updated.
   * Call this regularly (e.g., every 10 seconds from useEnvironmentController).
   * Computes the current weather slot and updates gameState if the slot changed.
   */
  checkWeatherUpdate(): void {
    if (!this.gameState.getAutomaticWeather() || this.manualOverride) {
      return;
    }

    const time = TimeManager.getCurrentTime();
    const slotIndex = Math.floor(time.totalHours / WEATHER_SLOT_HOURS);

    // Only update when the slot changes
    if (slotIndex === this.lastSlotIndex) {
      return;
    }
    this.lastSlotIndex = slotIndex;

    const globalWeather = getWeatherForSlot(slotIndex, time.season);
    const currentMapId = mapManager.getCurrentMapId();
    const effectiveWeather = getEffectiveWeather(globalWeather, currentMapId);
    const currentWeather = this.gameState.getWeather();

    if (effectiveWeather !== currentWeather) {
      console.log(
        `[WeatherManager] Slot ${slotIndex}: ${effectiveWeather} (season: ${time.season}, map: ${currentMapId})`
      );
      this.gameState.setWeather(effectiveWeather);
    }

    // Rain and storm water outdoor crops automatically (use global weather, not effective)
    if (globalWeather === 'rain' || globalWeather === 'storm') {
      const wateredCount = farmManager.waterAllOutdoorPlots();
      if (wateredCount > 0) {
        console.log(`[WeatherManager] Rain watered ${wateredCount} crops on outdoor maps`);
        characterData.saveFarmPlots(farmManager.getAllPlots());
      }
    }
  }

  /**
   * Force re-evaluation of weather for the current slot.
   * Useful after map transitions to get zone-correct weather immediately.
   */
  forceWeatherUpdate(): void {
    // Reset lastSlotIndex so the next checkWeatherUpdate() will re-evaluate
    this.lastSlotIndex = -1;
    this.checkWeatherUpdate();
  }

  /**
   * Set manual override mode.
   * When true, automatic weather changes are disabled until unset.
   */
  setManualOverride(enabled: boolean): void {
    this.manualOverride = enabled;
    if (!enabled) {
      // Re-evaluate weather immediately when override is cleared
      this.lastSlotIndex = -1;
    }
    console.log(`[WeatherManager] Manual override: ${enabled}`);
  }

  /**
   * Check if manual override is active
   */
  isManualOverride(): boolean {
    return this.manualOverride;
  }

  /**
   * Initialise weather system.
   * Sets the initial weather based on the current time slot.
   */
  initialize(): void {
    const automaticMode = this.gameState.getAutomaticWeather();

    console.log('[WeatherManager] Initialising (deterministic slot-based)...');
    console.log(`  Automatic mode: ${automaticMode}`);

    if (automaticMode) {
      // Force initial evaluation
      this.forceWeatherUpdate();
    }

    console.log(`  Weather: ${this.gameState.getWeather()}`);
  }

  /**
   * Get the current weather slot index (for debug display)
   */
  getCurrentSlotIndex(): number {
    const time = TimeManager.getCurrentTime();
    return Math.floor(time.totalHours / WEATHER_SLOT_HOURS);
  }

  /**
   * Get time until next slot boundary in milliseconds (for debug display)
   */
  getTimeUntilNextSlot(): number {
    const time = TimeManager.getCurrentTime();
    const msPerGameHour = TimeManager.MS_PER_GAME_DAY / 24;
    const hoursIntoSlot = time.totalHours % WEATHER_SLOT_HOURS;
    const hoursRemaining = WEATHER_SLOT_HOURS - hoursIntoSlot;
    return Math.round(hoursRemaining * msPerGameHour);
  }

  /**
   * Get formatted time until next slot boundary (for debug display)
   */
  getTimeUntilNextSlotFormatted(): string {
    const ms = this.getTimeUntilNextSlot();
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }
}
