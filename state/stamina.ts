/**
 * GameState — Stamina, the watering can and feeling sick.
 *
 * These methods are attached to GameStateManager.prototype in GameState.ts, so
 * callers keep using `gameState.setFeelingSick()`. Add a method here, not there.
 */

import type { GameStateManager } from '../GameState';
import { WATERING_CAN } from '../constants';
import { debugLog } from '../utils/debugLog';

export const staminaMethods = {
  // === Status Effects Methods ===

  /**
   * Set feeling sick status (prevents leaving village)
   */
  setFeelingSick(this: GameStateManager, value: boolean): void {
    this.state.statusEffects.feelingSick = value;
    this.notify();
  },

  /**
   * Check if player is feeling sick
   */
  isFeelingSick(this: GameStateManager): boolean {
    return this.state.statusEffects.feelingSick;
  },

  /**
   * Clear feeling sick status
   */
  clearFeelingSickStatus(this: GameStateManager): void {
    this.state.statusEffects.feelingSick = false;
    this.notify();
  },

  // === Stamina Methods ===

  /**
   * Get current stamina value
   */
  getStamina(this: GameStateManager): number {
    return this.state.statusEffects.stamina;
  },

  /**
   * Get maximum stamina value
   */
  getMaxStamina(this: GameStateManager): number {
    return this.state.statusEffects.maxStamina;
  },

  /**
   * Set stamina to a specific value (clamped to 0-max)
   */
  setStamina(this: GameStateManager, value: number): void {
    const max = this.state.statusEffects.maxStamina;
    this.state.statusEffects.stamina = Math.max(0, Math.min(max, value));
    this.state.statusEffects.lastStaminaUpdate = Date.now();
    this.notify();
  },

  /**
   * Set stamina without notifying listeners or scheduling a save.
   *
   * For the per-frame drain in StaminaManager, which commits through
   * setStamina() on its own cadence. Anything else should use setStamina().
   */
  setStaminaQuiet(this: GameStateManager, value: number): void {
    const max = this.state.statusEffects.maxStamina;
    this.state.statusEffects.stamina = Math.max(0, Math.min(max, value));
    this.state.statusEffects.lastStaminaUpdate = Date.now();
  },

  /**
   * Drain stamina by an amount
   * Returns true if player is now exhausted (stamina <= 0)
   */
  drainStamina(this: GameStateManager, amount: number): boolean {
    const newValue = this.state.statusEffects.stamina - amount;
    this.state.statusEffects.stamina = Math.max(0, newValue);
    this.state.statusEffects.lastStaminaUpdate = Date.now();
    this.notify();
    return this.state.statusEffects.stamina <= 0;
  },

  /**
   * Restore stamina by an amount (clamped to max)
   */
  restoreStamina(this: GameStateManager, amount: number): void {
    const max = this.state.statusEffects.maxStamina;
    this.state.statusEffects.stamina = Math.min(max, this.state.statusEffects.stamina + amount);
    this.state.statusEffects.lastStaminaUpdate = Date.now();
    this.notify();
  },

  /**
   * Restore stamina to full
   */
  restoreStaminaFull(this: GameStateManager): void {
    this.state.statusEffects.stamina = this.state.statusEffects.maxStamina;
    this.state.statusEffects.lastStaminaUpdate = Date.now();
    this.notify();
  },

  /**
   * Check if player is exhausted (stamina at or below 0)
   */
  isExhausted(this: GameStateManager): boolean {
    return this.state.statusEffects.stamina <= 0;
  },

  /**
   * Check if stamina is low (below threshold, e.g., 25%)
   */
  isStaminaLow(this: GameStateManager, threshold: number = 25): boolean {
    const percentage =
      (this.state.statusEffects.stamina / this.state.statusEffects.maxStamina) * 100;
    return percentage <= threshold;
  },

  /**
   * Get stamina as a percentage (0-100)
   */
  getStaminaPercentage(this: GameStateManager): number {
    return (this.state.statusEffects.stamina / this.state.statusEffects.maxStamina) * 100;
  },

  // === Watering Can Methods ===

  /**
   * Get current water level in watering can
   */
  getWaterLevel(this: GameStateManager): number {
    return this.state.wateringCan?.currentLevel ?? WATERING_CAN.CAPACITY;
  },

  /**
   * Use water from the watering can (decrements level)
   * Returns false if empty
   */
  useWater(this: GameStateManager): boolean {
    if (!this.state.wateringCan || this.state.wateringCan.currentLevel <= 0) {
      return false;
    }
    this.state.wateringCan.currentLevel -= 1;
    debugLog('GameState', `Water used, ${this.state.wateringCan.currentLevel} remaining`);
    this.notify();
    return true;
  },

  /**
   * Refill watering can to maximum capacity
   */
  refillWaterCan(this: GameStateManager): void {
    if (!this.state.wateringCan) {
      this.state.wateringCan = { currentLevel: WATERING_CAN.CAPACITY };
    } else {
      this.state.wateringCan.currentLevel = WATERING_CAN.CAPACITY;
    }
    debugLog('GameState', 'Watering can refilled');
    this.notify();
  },

  /**
   * Check if watering can needs refilling
   */
  isWaterCanEmpty(this: GameStateManager): boolean {
    return (this.state.wateringCan?.currentLevel ?? 0) <= 0;
  },
};
