/**
 * GameState — Weather state (the shared weather itself is computed by WeatherManager).
 *
 * These methods are attached to GameStateManager.prototype in GameState.ts, so
 * callers keep using `gameState.setWeather()`. Add a method here, not there.
 */

import type { GameStateManager } from '../GameState';

export const weatherMethods = {
  // Weather management
  setWeather(
    this: GameStateManager,
    weather: 'clear' | 'rain' | 'snow' | 'fog' | 'mist' | 'storm' | 'cherry_blossoms'
  ): void {
    this.state.weather = weather;
    this.notify();
  },

  getWeather(
    this: GameStateManager
  ): 'clear' | 'rain' | 'snow' | 'fog' | 'mist' | 'storm' | 'cherry_blossoms' {
    return this.state.weather || 'clear';
  },

  setAutomaticWeather(this: GameStateManager, enabled: boolean): void {
    this.state.automaticWeather = enabled;
    this.notify();
  },

  getAutomaticWeather(this: GameStateManager): boolean {
    return this.state.automaticWeather ?? false;
  },

  setWeatherDriftSpeed(this: GameStateManager, speed: number): void {
    this.state.weatherDriftSpeed = Math.max(0.1, Math.min(5.0, speed)); // Clamp between 0.1x and 5x
    this.notify();
  },

  getWeatherDriftSpeed(this: GameStateManager): number {
    return this.state.weatherDriftSpeed ?? 1.0;
  },

  setNextWeatherCheckTime(this: GameStateManager, timestamp: number): void {
    this.state.nextWeatherCheckTime = timestamp;
    this.saveState(); // Save immediately to persist across sessions
  },

  getNextWeatherCheckTime(this: GameStateManager): number {
    return this.state.nextWeatherCheckTime ?? 0;
  },
};
