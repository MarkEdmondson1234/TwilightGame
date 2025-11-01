/**
 * WeatherManager - Automatic weather system
 *
 * Manages automatic weather changes based on time of day and season.
 * Integrates with TimeManager for time-based triggers and GameState
 * for weather persistence.
 *
 * Features:
 * - Automatic weather changes at day/night transitions
 * - Seasonal weather probabilities
 * - Random weather duration
 * - Manual override support (DevTools)
 * - Persistence across sessions
 *
 * Usage:
 *   const weatherManager = new WeatherManager(gameState);
 *   weatherManager.setAutomaticMode(true);
 *   // In game loop or time check:
 *   weatherManager.checkWeatherUpdate();
 */

import { TimeManager, TimeOfDay } from './TimeManager';
import { mapManager } from '../maps';
import {
  WeatherType,
  selectRandomWeather,
  getRandomWeatherDuration,
} from '../data/weatherConfig';

export class WeatherManager {
  private gameState: any; // GameState instance
  private lastTimeOfDay: TimeOfDay | null = null;
  private manualOverride: boolean = false;

  constructor(gameState: any) {
    this.gameState = gameState;
  }

  /**
   * Check if weather should be updated
   * Call this regularly (e.g., in game loop or time poll interval)
   */
  checkWeatherUpdate(): void {
    // Skip if automatic mode is disabled
    if (!this.gameState.getAutomaticWeather()) {
      return;
    }

    // Skip if manual override is active
    if (this.manualOverride) {
      return;
    }

    const currentTime = TimeManager.getCurrentTime();
    const now = Date.now();

    // Check if it's time for a weather change
    const nextCheckTime = this.gameState.getNextWeatherCheckTime();

    if (now >= nextCheckTime) {
      this.updateWeather();
    }

    // Also update on day/night transitions (backup check)
    if (this.lastTimeOfDay !== null && this.lastTimeOfDay !== currentTime.timeOfDay) {
      // Day/night changed, possibly trigger weather change
      // 50% chance to change weather on transition
      if (Math.random() < 0.5) {
        this.updateWeather();
      }
    }

    this.lastTimeOfDay = currentTime.timeOfDay;
  }

  /**
   * Update weather based on current season and map zone
   */
  private updateWeather(): void {
    const currentTime = TimeManager.getCurrentTime();
    const currentWeather = this.gameState.getWeather();
    const currentMapId = mapManager.getCurrentMapId();

    // Select new weather based on season and map zone probabilities
    const newWeather = selectRandomWeather(currentTime.season, currentMapId);

    // Only change if different (avoid redundant updates)
    if (newWeather !== currentWeather) {
      console.log(
        `[WeatherManager] Changing weather to ${newWeather} (season: ${currentTime.season}, map: ${currentMapId})`
      );
      this.gameState.setWeather(newWeather);
    }

    // Schedule next weather check
    this.scheduleNextCheck(newWeather);
  }

  /**
   * Schedule the next weather check based on weather duration
   */
  private scheduleNextCheck(weather: WeatherType): void {
    // Get random duration for this weather type (in game hours)
    const durationHours = getRandomWeatherDuration(weather);

    // Convert game hours to real milliseconds
    // From TimeManager: ~0.933 game days per real day
    // So 1 game hour = 1/24 game day = 1/(24 * 0.933) real days
    const gameHoursPerRealDay = 24 * 0.933;
    const realHoursPerGameHour = 24 / gameHoursPerRealDay;
    const durationMs = durationHours * realHoursPerGameHour * 60 * 60 * 1000;

    const nextCheckTime = Date.now() + durationMs;
    this.gameState.setNextWeatherCheckTime(nextCheckTime);

    const durationMinutes = Math.round(durationMs / 60000);
    console.log(
      `[WeatherManager] Next weather check in ${durationMinutes} real minutes (${durationHours} game hours)`
    );
  }

  /**
   * Force an immediate weather update (ignores schedule)
   */
  forceWeatherUpdate(): void {
    console.log('[WeatherManager] Forcing weather update');
    this.updateWeather();
  }

  /**
   * Set manual override mode
   * When true, automatic weather changes are disabled until unset
   */
  setManualOverride(enabled: boolean): void {
    this.manualOverride = enabled;
    console.log(`[WeatherManager] Manual override: ${enabled}`);
  }

  /**
   * Check if manual override is active
   */
  isManualOverride(): boolean {
    return this.manualOverride;
  }

  /**
   * Initialize weather system
   * Call this on game start to setup initial weather
   */
  initialize(): void {
    const automaticMode = this.gameState.getAutomaticWeather();
    const nextCheckTime = this.gameState.getNextWeatherCheckTime();
    const now = Date.now();

    console.log('[WeatherManager] Initializing...');
    console.log(`  Automatic mode: ${automaticMode}`);
    console.log(`  Current weather: ${this.gameState.getWeather()}`);

    // If automatic mode is enabled and no check time is scheduled, schedule one now
    if (automaticMode && (!nextCheckTime || nextCheckTime <= now)) {
      console.log('[WeatherManager] Scheduling initial weather check');
      this.updateWeather();
    }

    // Initialize time of day tracking
    this.lastTimeOfDay = TimeManager.getCurrentTime().timeOfDay;
  }

  /**
   * Get time until next weather check (in milliseconds)
   * Returns 0 if check is due or automatic mode is disabled
   */
  getTimeUntilNextCheck(): number {
    if (!this.gameState.getAutomaticWeather()) {
      return 0;
    }

    const nextCheckTime = this.gameState.getNextWeatherCheckTime();
    const now = Date.now();

    return Math.max(0, nextCheckTime - now);
  }

  /**
   * Get formatted time until next check (for display)
   */
  getTimeUntilNextCheckFormatted(): string {
    const ms = this.getTimeUntilNextCheck();

    if (ms === 0) {
      return 'N/A';
    }

    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }
}
