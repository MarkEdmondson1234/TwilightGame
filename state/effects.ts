/**
 * GameState — Timed player effects: movement (floating/flying), fairy form, potions, disguise.
 *
 * These methods are attached to GameStateManager.prototype in GameState.ts, so
 * callers keep using `gameState.getMovementMode()`. Add a method here, not there.
 */

import type { GameStateManager } from '../GameState';
import { debugLog } from '../utils/debugLog';

export const effectsMethods = {
  // === Movement Effect Methods ===

  /**
   * Get current movement mode ('normal', 'floating', or 'flying')
   * Fairy form automatically grants flying ability
   */
  getMovementMode(this: GameStateManager): 'normal' | 'floating' | 'flying' {
    // Fairy form grants flying ability
    if (this.isFairyForm()) {
      return 'flying';
    }

    const effect = this.state.movementEffect;
    if (!effect) return 'normal';
    // Check if effect has expired
    if (Date.now() >= effect.expiresAt) {
      this.clearMovementEffect();
      return 'normal';
    }
    return effect.mode;
  },

  /**
   * Set a movement effect (floating or flying) with duration
   */
  setMovementEffect(this: GameStateManager, mode: 'floating' | 'flying', durationMs: number): void {
    this.state.movementEffect = {
      mode,
      expiresAt: Date.now() + durationMs,
    };
    debugLog('GameState', `Movement effect set: ${mode} for ${durationMs}ms`);
    this.saveState();
    this.notify();
  },

  /**
   * Clear the current movement effect
   */
  clearMovementEffect(this: GameStateManager): void {
    if (this.state.movementEffect) {
      debugLog('GameState', 'Movement effect cleared');
      this.state.movementEffect = null;
      this.saveState();
      this.notify();
    }
  },

  /**
   * Check if a movement effect is currently active
   */
  isMovementEffectActive(this: GameStateManager): boolean {
    const effect = this.state.movementEffect;
    if (!effect) return false;
    return Date.now() < effect.expiresAt;
  },

  /**
   * Get remaining time for movement effect in milliseconds
   */
  getMovementEffectRemainingMs(this: GameStateManager): number {
    const effect = this.state.movementEffect;
    if (!effect) return 0;
    return Math.max(0, effect.expiresAt - Date.now());
  },

  /**
   * Get the current movement effect data (for HUD display)
   */
  getMovementEffect(
    this: GameStateManager
  ): { mode: 'floating' | 'flying'; expiresAt: number } | null {
    return this.state.movementEffect;
  },

  // === Fairy Transformation Methods ===

  /**
   * Check if player is currently in fairy form
   */
  isFairyForm(this: GameStateManager): boolean {
    // Check if transformation exists and is active
    if (!this.state.transformations?.isFairyForm) {
      return false;
    }
    // Check if it has expired (if it has an expiration)
    if (
      this.state.transformations.fairyFormExpiresAt &&
      Date.now() >= this.state.transformations.fairyFormExpiresAt
    ) {
      this.clearFairyForm();
      return false;
    }
    return true;
  },

  /**
   * Set fairy form transformation
   * @param active Whether fairy form is active
   * @param durationMs Optional duration in milliseconds (null = permanent until cleared)
   */
  setFairyForm(this: GameStateManager, active: boolean, durationMs: number | null = null): void {
    if (!this.state.transformations) {
      this.state.transformations = {
        isFairyForm: false,
        fairyFormExpiresAt: null,
      };
    }

    this.state.transformations.isFairyForm = active;
    this.state.transformations.fairyFormExpiresAt =
      active && durationMs ? Date.now() + durationMs : null;

    debugLog(
      'GameState',
      `Fairy form ${active ? 'activated' : 'deactivated'}${durationMs ? ` for ${durationMs}ms` : ''}`
    );
    this.saveState();
    this.notify();
  },

  /**
   * Clear fairy form transformation
   */
  clearFairyForm(this: GameStateManager): void {
    if (this.state.transformations?.isFairyForm) {
      debugLog('GameState', 'Fairy form cleared');
      this.state.transformations.isFairyForm = false;
      this.state.transformations.fairyFormExpiresAt = null;
      this.saveState();
      this.notify();
    }
  },

  /**
   * Get remaining time for fairy form in milliseconds
   */
  getFairyFormRemainingMs(this: GameStateManager): number {
    if (!this.state.transformations?.isFairyForm) return 0;
    if (!this.state.transformations.fairyFormExpiresAt) return Infinity; // Permanent
    return Math.max(0, this.state.transformations.fairyFormExpiresAt - Date.now());
  },

  // === Active Potion Effects Methods ===

  /**
   * Set an active potion effect with duration
   * @param effectType The effect type (e.g., 'beast_tongue', 'beastward')
   * @param durationMs Duration in milliseconds
   */
  setActivePotionEffect(this: GameStateManager, effectType: string, durationMs: number): void {
    if (!this.state.activePotionEffects) {
      this.state.activePotionEffects = {};
    }

    const now = Date.now();
    this.state.activePotionEffects[effectType] = {
      startTime: now,
      expiresAt: now + durationMs,
    };

    debugLog('GameState', `Potion effect activated: ${effectType} for ${durationMs}ms`);
    this.saveState();
    this.notify();
  },

  /**
   * Check if a potion effect is currently active
   * @param effectType The effect type to check
   * @returns true if effect is active and not expired
   */
  hasActivePotionEffect(this: GameStateManager, effectType: string): boolean {
    if (!this.state.activePotionEffects) {
      return false;
    }

    const effect = this.state.activePotionEffects[effectType];
    if (!effect) {
      return false;
    }

    // Check if expired
    if (Date.now() >= effect.expiresAt) {
      this.clearActivePotionEffect(effectType);
      return false;
    }

    return true;
  },

  /**
   * Clear an active potion effect
   * @param effectType The effect type to clear
   */
  clearActivePotionEffect(this: GameStateManager, effectType: string): void {
    if (!this.state.activePotionEffects) {
      return;
    }

    if (this.state.activePotionEffects[effectType]) {
      delete this.state.activePotionEffects[effectType];
      debugLog('GameState', `Potion effect cleared: ${effectType}`);
      this.saveState();
      this.notify();
    }
  },

  /**
   * Get remaining time for a potion effect in milliseconds
   * @param effectType The effect type to check
   * @returns Remaining time in ms (0 if not active or expired)
   */
  getPotionEffectRemainingMs(this: GameStateManager, effectType: string): number {
    if (!this.state.activePotionEffects) {
      return 0;
    }

    const effect = this.state.activePotionEffects[effectType];
    if (!effect) {
      return 0;
    }

    return Math.max(0, effect.expiresAt - Date.now());
  },

  /**
   * Get all currently active potion effect types
   * @returns Array of active effect type strings
   */
  getActivePotionEffects(this: GameStateManager): string[] {
    if (!this.state.activePotionEffects) {
      return [];
    }

    const now = Date.now();
    const activeEffects: string[] = [];

    for (const [effectType, effect] of Object.entries(this.state.activePotionEffects)) {
      if (effect.expiresAt > now) {
        activeEffects.push(effectType);
      }
    }

    return activeEffects;
  },

  /**
   * Clean up expired potion effects
   * Called periodically to prevent stale data
   */
  cleanupExpiredPotionEffects(this: GameStateManager): void {
    if (!this.state.activePotionEffects) {
      return;
    }

    const now = Date.now();
    const expiredEffects: string[] = [];

    for (const [effectType, effect] of Object.entries(this.state.activePotionEffects)) {
      if (effect.expiresAt <= now) {
        expiredEffects.push(effectType);
      }
    }

    if (expiredEffects.length > 0) {
      for (const effectType of expiredEffects) {
        delete this.state.activePotionEffects[effectType];
      }
      debugLog('GameState', `Cleaned up ${expiredEffects.length} expired potion effect(s)`);
      this.saveState();
      this.notify();
    }
  },

  // === Player Disguise Methods (Glamour Draught) ===

  /**
   * Set player disguise (from Glamour Draught potion)
   * @param npcId ID of the NPC to disguise as
   * @param npcName Display name of the NPC
   * @param sprite Sprite path for the NPC
   * @param durationMs How long the disguise lasts
   */
  setPlayerDisguise(
    this: GameStateManager,
    npcId: string,
    npcName: string,
    sprite: string,
    durationMs: number
  ): void {
    this.state.playerDisguise = {
      npcId,
      npcName,
      sprite,
      expiresAt: Date.now() + durationMs,
    };

    debugLog('GameState', `Player disguised as ${npcName} for ${durationMs}ms`);
    this.saveState();
    this.notify();
  },

  /**
   * Get current player disguise (if active)
   * @returns Disguise info or null if not disguised/expired
   */
  getPlayerDisguise(this: GameStateManager): {
    npcId: string;
    npcName: string;
    sprite: string;
    expiresAt: number;
  } | null {
    if (!this.state.playerDisguise) {
      return null;
    }

    // Check if expired
    if (Date.now() >= this.state.playerDisguise.expiresAt) {
      this.clearPlayerDisguise();
      return null;
    }

    return this.state.playerDisguise;
  },

  /**
   * Clear player disguise
   */
  clearPlayerDisguise(this: GameStateManager): void {
    if (this.state.playerDisguise) {
      debugLog('GameState', 'Player disguise cleared');
      this.state.playerDisguise = null;
      this.saveState();
      this.notify();
    }
  },

  /**
   * Check if player is currently disguised
   */
  isPlayerDisguised(this: GameStateManager): boolean {
    return this.getPlayerDisguise() !== null;
  },

  /**
   * Get remaining time for player disguise in milliseconds
   */
  getDisguiseRemainingMs(this: GameStateManager): number {
    if (!this.state.playerDisguise) {
      return 0;
    }
    return Math.max(0, this.state.playerDisguise.expiresAt - Date.now());
  },
};
