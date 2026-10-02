/**
 * GameState — Where the player is: procedural depth (forest/cave/lava), lava entrances, saved location.
 *
 * These methods are attached to GameStateManager.prototype in GameState.ts, so
 * callers keep using `gameState.enterForest()`. Add a method here, not there.
 */

import type { GameStateManager } from '../GameState';
import { debugLog } from '../utils/debugLog';

export const explorationMethods = {
  // === Exploration Methods ===

  enterForest(this: GameStateManager): void {
    this.state.forestDepth += 1;
    debugLog('GameState', `Entered forest depth ${this.state.forestDepth}`);
    this.notify();
  },

  exitForest(this: GameStateManager): void {
    if (this.state.forestDepth > 0) {
      this.state.forestDepth -= 1;
      debugLog('GameState', `Exited forest, now at depth ${this.state.forestDepth}`);
      this.notify();
    }
  },

  enterCave(this: GameStateManager): void {
    this.state.caveDepth += 1;
    debugLog('GameState', `Entered cave depth ${this.state.caveDepth}`);
    this.notify();
  },

  exitCave(this: GameStateManager): void {
    if (this.state.caveDepth > 0) {
      this.state.caveDepth -= 1;
      debugLog('GameState', `Exited cave, now at depth ${this.state.caveDepth}`);
      this.notify();
    }
  },

  getForestDepth(this: GameStateManager): number {
    return this.state.forestDepth;
  },

  getCaveDepth(this: GameStateManager): number {
    return this.state.caveDepth;
  },

  /** Set the destination depth for travel that skips intermediate forest maps. */
  setForestDepth(this: GameStateManager, depth: number): void {
    this.state.forestDepth = Math.max(0, Math.floor(depth));
    this.notify();
  },

  resetForestDepth(this: GameStateManager): void {
    this.state.forestDepth = 0;
    this.notify();
  },

  resetCaveDepth(this: GameStateManager): void {
    this.state.caveDepth = 0;
    this.notify();
  },

  enterLava(this: GameStateManager): void {
    this.state.lavaDepth += 1;
    debugLog('GameState', `Entered lava depth ${this.state.lavaDepth}`);
    this.notify();
  },

  exitLava(this: GameStateManager): void {
    if (this.state.lavaDepth > 0) {
      this.state.lavaDepth -= 1;
      debugLog('GameState', `Exited lava, now at depth ${this.state.lavaDepth}`);
      this.notify();
    }
  },

  getLavaDepth(this: GameStateManager): number {
    return this.state.lavaDepth;
  },

  resetLavaDepth(this: GameStateManager): void {
    this.state.lavaDepth = 0;
    this.notify();
  },

  revealLavaEntrance(
    this: GameStateManager,
    caveMapId: string,
    position: { x: number; y: number }
  ): void {
    this.state.revealedLavaEntrances[caveMapId] = position;
    debugLog(
      'GameState',
      `Revealed lava entrance on ${caveMapId} at (${position.x}, ${position.y})`
    );
    this.notify();
  },

  getLavaEntrance(this: GameStateManager, caveMapId: string): { x: number; y: number } | null {
    return this.state.revealedLavaEntrances[caveMapId] ?? null;
  },

  // === Player Location Methods ===

  updatePlayerLocation(
    this: GameStateManager,
    mapId: string,
    position: { x: number; y: number },
    seed?: number
  ): void {
    this.state.player.currentMapId = mapId;
    this.state.player.position = position;
    this.state.player.currentMapSeed = seed;
    this.notify();
  },

  getPlayerLocation(this: GameStateManager): {
    mapId: string;
    position: { x: number; y: number };
    seed?: number;
  } {
    return {
      mapId: this.state.player.currentMapId,
      position: { ...this.state.player.position },
      seed: this.state.player.currentMapSeed,
    };
  },

  respawnPlayer(this: GameStateManager): void {
    // Reset to village spawn
    this.state.player.currentMapId = 'village';
    this.state.player.position = { x: 15, y: 25 };
    this.state.forestDepth = 0;
    this.state.caveDepth = 0;
    debugLog('GameState', 'Player respawned at village');
    this.notify();
  },
};
