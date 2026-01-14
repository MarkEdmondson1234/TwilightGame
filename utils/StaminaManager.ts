/**
 * StaminaManager - Handles player stamina/energy system
 *
 * Manages:
 * - Stamina drain from walking and activities
 * - Stamina restoration from food and home rest
 * - Exhaustion detection and handling
 *
 * Design:
 * - No idle drain (only drains when walking or performing activities)
 * - Being at home slowly restores stamina
 * - Full stamina restore on new session (handled in GameState loadState)
 */

import { STAMINA } from '../constants';

export type ActivityType = 'till' | 'plant' | 'water' | 'harvest' | 'forage' | 'cook';

export interface StaminaCallbacks {
  getStamina: () => number;
  setStamina: (value: number) => void;
  drainStamina: (amount: number) => boolean;
  restoreStamina: (amount: number) => void;
  restoreStaminaFull: () => void;
  isExhausted: () => boolean;
  showToast: (message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
  teleportHome: () => void;
}

class StaminaManagerClass {
  private callbacks: StaminaCallbacks | null = null;
  private hasShownLowWarning = false;
  private isInitialised = false;

  /**
   * Initialise the stamina manager with callbacks
   */
  initialise(callbacks: StaminaCallbacks): void {
    this.callbacks = callbacks;
    this.isInitialised = true;
    this.hasShownLowWarning = false;
    console.log('[StaminaManager] Initialised');
  }

  /**
   * Update stamina based on player state
   * Call this from the game loop each frame
   *
   * @param deltaTime - Time since last frame in seconds
   * @param isWalking - Whether the player is currently walking
   * @param mapId - Current map ID (for home restoration)
   * @returns true if player became exhausted this frame
   */
  update(deltaTime: number, isWalking: boolean, mapId: string): boolean {
    if (!this.callbacks || !this.isInitialised) {
      return false;
    }

    const currentStamina = this.callbacks.getStamina();

    // Home restoration (slow passive restore while at home)
    if (mapId === 'home_interior') {
      const restoreAmount = STAMINA.HOME_RESTORE_PER_SECOND * deltaTime;
      if (currentStamina < STAMINA.MAX) {
        this.callbacks.restoreStamina(restoreAmount);
        // Reset warning when stamina recovers above threshold
        if (this.callbacks.getStamina() > STAMINA.LOW_THRESHOLD) {
          this.hasShownLowWarning = false;
        }
      }
      return false; // Can't exhaust while at home
    }

    // Walking drain (only when moving)
    if (isWalking) {
      const drainAmount = STAMINA.WALKING_DRAIN_PER_SECOND * deltaTime;
      const exhausted = this.callbacks.drainStamina(drainAmount);

      // Check for low stamina warning
      this.checkLowStaminaWarning();

      if (exhausted) {
        this.handleExhaustion();
        return true;
      }
    }

    return false;
  }

  /**
   * Perform an activity that costs stamina
   * @returns true if the activity was performed, false if not enough stamina
   */
  performActivity(activity: ActivityType): boolean {
    if (!this.callbacks || !this.isInitialised) {
      return true; // Allow activity if not initialised
    }

    const cost = this.getActivityCost(activity);
    const currentStamina = this.callbacks.getStamina();

    // Allow activity if we have any stamina (will exhaust after)
    if (currentStamina <= 0) {
      this.callbacks.showToast("You're too tired to do that!", 'warning');
      return false;
    }

    const exhausted = this.callbacks.drainStamina(cost);
    this.checkLowStaminaWarning();

    if (exhausted) {
      this.handleExhaustion();
    }

    return true;
  }

  /**
   * Eat food to restore stamina
   * @returns the amount of stamina restored
   */
  eatFood(foodId: string): number {
    if (!this.callbacks || !this.isInitialised) {
      return 0;
    }

    const restoration = STAMINA.FOOD_RESTORATION[foodId] ?? 10; // Default 10 if unknown food
    this.callbacks.restoreStamina(restoration);

    // Reset warning if stamina recovers
    if (this.callbacks.getStamina() > STAMINA.LOW_THRESHOLD) {
      this.hasShownLowWarning = false;
    }

    return restoration;
  }

  /**
   * Restore stamina from a potion effect
   */
  restoreFromPotion(amount: number): void {
    if (!this.callbacks || !this.isInitialised) {
      return;
    }

    if (amount >= STAMINA.MAX) {
      this.callbacks.restoreStaminaFull();
    } else {
      this.callbacks.restoreStamina(amount);
    }

    // Reset warning if stamina recovers
    if (this.callbacks.getStamina() > STAMINA.LOW_THRESHOLD) {
      this.hasShownLowWarning = false;
    }
  }

  /**
   * Get the stamina cost for an activity
   */
  private getActivityCost(activity: ActivityType): number {
    switch (activity) {
      case 'till':
        return STAMINA.TILL_COST;
      case 'plant':
        return STAMINA.PLANT_COST;
      case 'water':
        return STAMINA.WATER_COST;
      case 'harvest':
        return STAMINA.HARVEST_COST;
      case 'forage':
        return STAMINA.FORAGE_COST;
      case 'cook':
        return STAMINA.COOK_COST;
      default:
        return 1;
    }
  }

  /**
   * Check and show low stamina warning
   */
  private checkLowStaminaWarning(): void {
    if (!this.callbacks || this.hasShownLowWarning) {
      return;
    }

    const currentStamina = this.callbacks.getStamina();
    if (currentStamina <= STAMINA.LOW_THRESHOLD && currentStamina > 0) {
      this.callbacks.showToast("You're feeling tired... find something to eat!", 'warning');
      this.hasShownLowWarning = true;
    }
  }

  /**
   * Handle player exhaustion (teleport home)
   */
  private handleExhaustion(): void {
    if (!this.callbacks) {
      return;
    }

    this.callbacks.showToast('You collapsed from exhaustion...', 'warning');
    this.callbacks.teleportHome();
    this.callbacks.restoreStaminaFull();
    this.hasShownLowWarning = false;
  }

  /**
   * Reset manager state (e.g., on game reset)
   */
  reset(): void {
    this.hasShownLowWarning = false;
  }
}

// Export singleton instance
export const staminaManager = new StaminaManagerClass();
