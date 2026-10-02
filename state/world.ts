/**
 * GameState — Things in the world: placed items, desks, wallpaper, daily NPC resources, forage cooldowns.
 *
 * These methods are attached to GameStateManager.prototype in GameState.ts, so
 * callers keep using `gameState.addPlacedItem()`. Add a method here, not there.
 */

import type { GameStateManager } from '../GameState';
import { sharedPlacedItemsManager } from '../multiplayer/sharedPlacedItems';
import { DeskContents, PlacedItem } from '../types';
import { GameEvent, eventBus } from '../utils/EventBus';
import { debugLog } from '../utils/debugLog';
import { shouldDecay } from '../utils/itemDecayManager';

export const worldMethods = {
  // === Placed Items Methods ===

  /**
   * Add a placed item to the current map
   */
  addPlacedItem(this: GameStateManager, item: PlacedItem): void {
    this.state.placedItems.push(item);
    this.notify();
    eventBus.emit(GameEvent.PLACED_ITEMS_CHANGED, { mapId: item.mapId, action: 'add' });
  },

  /**
   * Get all placed items for a specific map — ours *and* everyone else's.
   *
   * This is the single seam where shared placement enters the game. Merging
   * here rather than at each call site means the renderer, the click
   * interactions, the hover layer and `furnitureRest` all see another player's
   * bench without any of them knowing multiplayer exists — including being able
   * to sit on it or pick it up, which is the point.
   *
   * Deliberately *not* merged into `getAllPlacedItems()` or `this.state`: the
   * save path reads those, and another player's furniture must never end up
   * persisted in your save file.
   */
  getPlacedItems(this: GameStateManager, mapId: string): PlacedItem[] {
    const local = this.state.placedItems.filter((item) => item.mapId === mapId);
    const shared = sharedPlacedItemsManager.getItems(mapId);
    if (shared.length === 0) return local;

    // Our own items round-trip back through the shared mirror; local wins, so a
    // placement we have already applied is not drawn twice.
    const localIds = new Set(local.map((item) => item.id));
    return [...local, ...shared.filter((item) => !localIds.has(item.id))];
  },

  /**
   * Get all placed items across every map (e.g. for managers that need to
   * clean up items regardless of which map the player is currently on)
   */
  getAllPlacedItems(this: GameStateManager): PlacedItem[] {
    return this.state.placedItems;
  },

  /**
   * Remove a placed item by ID
   */
  removePlacedItem(this: GameStateManager, itemId: string): void {
    // Find the item first to get its mapId for the event. It may be another
    // player's — anyone may pick up anyone's furniture — in which case it is
    // only in the shared mirror, never in our own state.
    const item =
      this.state.placedItems.find((i) => i.id === itemId) ?? sharedPlacedItemsManager.get(itemId);
    this.state.placedItems = this.state.placedItems.filter((i) => i.id !== itemId);

    // Drop it from the mirror immediately rather than waiting for the delete to
    // round-trip, or the item flickers back for a frame after being picked up.
    sharedPlacedItemsManager.remove(itemId);

    this.notify();
    if (item) {
      eventBus.emit(GameEvent.PLACED_ITEMS_CHANGED, { mapId: item.mapId, action: 'remove' });
    }
  },

  /**
   * Remove all decayed items from all maps
   * Returns the number of items removed
   */
  removeDecayedItems(this: GameStateManager): number {
    const initialCount = this.state.placedItems.length;
    const currentTime = Date.now();

    this.state.placedItems = this.state.placedItems.filter(
      (item) => !shouldDecay(item, currentTime)
    );

    const removedCount = initialCount - this.state.placedItems.length;

    if (removedCount > 0) {
      this.notify();
      debugLog('GameState', `Removed ${removedCount} decayed item(s)`);
      // Emit generic update event (items could be from any map)
      eventBus.emit(GameEvent.PLACED_ITEMS_CHANGED, { mapId: '*', action: 'remove' });
    }

    return removedCount;
  },

  // === Desk Contents Methods ===

  /**
   * Get desk contents at a specific position
   */
  getDeskAt(this: GameStateManager, mapId: string, x: number, y: number): DeskContents | undefined {
    return this.state.deskContents.find(
      (desk) => desk.mapId === mapId && desk.position.x === x && desk.position.y === y
    );
  },

  /**
   * Save or update desk contents at a position
   */
  saveDeskContents(this: GameStateManager, desk: DeskContents): void {
    const existingIndex = this.state.deskContents.findIndex(
      (d) =>
        d.mapId === desk.mapId &&
        d.position.x === desk.position.x &&
        d.position.y === desk.position.y
    );

    if (existingIndex >= 0) {
      this.state.deskContents[existingIndex] = desk;
    } else {
      this.state.deskContents.push(desk);
    }
    this.notify();
  },

  /**
   * Get all desk contents for a specific map
   */
  getDeskContentsForMap(this: GameStateManager, mapId: string): DeskContents[] {
    return this.state.deskContents.filter((desk) => desk.mapId === mapId);
  },

  /**
   * Load all desk contents (for DeskManager initialisation)
   */
  loadDeskContents(this: GameStateManager): DeskContents[] {
    return this.state.deskContents || [];
  },

  /**
   * Replace all desk contents (for CharacterData 'desk' domain saves)
   */
  saveAllDeskContents(this: GameStateManager, desks: DeskContents[]): void {
    this.state.deskContents = desks;
    this.notify();
  },

  /**
   * Remove a desk's contents (when desk is removed from map)
   */
  removeDeskContents(this: GameStateManager, mapId: string, x: number, y: number): void {
    this.state.deskContents = this.state.deskContents.filter(
      (desk) => !(desk.mapId === mapId && desk.position.x === x && desk.position.y === y)
    );
    this.notify();
  },

  // === Daily Resource Collection Methods ===

  /**
   * Check if an NPC's daily resource can still be collected today
   * @param npcId The NPC's unique ID
   * @param maxPerDay Maximum collections allowed per day
   * @param currentDay Current game day (from TimeManager)
   * @returns Number of collections remaining today
   */
  getResourceCollectionsRemaining(
    this: GameStateManager,
    npcId: string,
    maxPerDay: number,
    currentDay: number
  ): number {
    // Migrate old saves that don't have this field
    if (!this.state.dailyResourceCollections) {
      this.state.dailyResourceCollections = {};
    }

    const collection = this.state.dailyResourceCollections[npcId];

    // No previous collections
    if (!collection) {
      return maxPerDay;
    }

    // New day - reset collections
    if (collection.lastCollectedDay !== currentDay) {
      return maxPerDay;
    }

    // Same day - check remaining
    return Math.max(0, maxPerDay - collection.collectionsToday);
  },

  /**
   * Record a resource collection from an NPC
   * @param npcId The NPC's unique ID
   * @param currentDay Current game day (from TimeManager)
   */
  recordResourceCollection(this: GameStateManager, npcId: string, currentDay: number): void {
    // Migrate old saves that don't have this field
    if (!this.state.dailyResourceCollections) {
      this.state.dailyResourceCollections = {};
    }

    const collection = this.state.dailyResourceCollections[npcId];

    // New entry or new day
    if (!collection || collection.lastCollectedDay !== currentDay) {
      this.state.dailyResourceCollections[npcId] = {
        lastCollectedDay: currentDay,
        collectionsToday: 1,
      };
    } else {
      // Same day - increment
      collection.collectionsToday++;
    }

    this.saveState();
    this.notify();
  },

  // === Forage Cooldown Methods ===

  /**
   * Generate a unique key for a forage tile position
   * @param mapId The map ID
   * @param x Tile X coordinate
   * @param y Tile Y coordinate
   * @returns Unique tile key in format "mapId:x,y"
   */
  getForageTileKey(this: GameStateManager, mapId: string, x: number, y: number): string {
    return `${mapId}:${x},${y}`;
  },

  /**
   * Check if a tile is on forage cooldown
   * @param mapId The map ID
   * @param x Tile X coordinate
   * @param y Tile Y coordinate
   * @param cooldownMs Cooldown duration in milliseconds
   * @returns true if tile is still on cooldown, false if ready to forage
   */
  isForageTileOnCooldown(
    this: GameStateManager,
    mapId: string,
    x: number,
    y: number,
    cooldownMs: number
  ): boolean {
    // Migrate old saves
    if (!this.state.forageCooldowns) {
      this.state.forageCooldowns = {};
    }

    const key = this.getForageTileKey(mapId, x, y);
    const lastForageTime = this.state.forageCooldowns[key];

    if (!lastForageTime) {
      return false; // Never foraged, not on cooldown
    }

    const now = Date.now();
    return now - lastForageTime < cooldownMs;
  },

  /**
   * Get remaining cooldown time for a tile
   * @param mapId The map ID
   * @param x Tile X coordinate
   * @param y Tile Y coordinate
   * @param cooldownMs Cooldown duration in milliseconds
   * @returns Remaining cooldown in milliseconds (0 if ready)
   */
  getForageCooldownRemaining(
    this: GameStateManager,
    mapId: string,
    x: number,
    y: number,
    cooldownMs: number
  ): number {
    // Migrate old saves
    if (!this.state.forageCooldowns) {
      this.state.forageCooldowns = {};
    }

    const key = this.getForageTileKey(mapId, x, y);
    const lastForageTime = this.state.forageCooldowns[key];

    if (!lastForageTime) {
      return 0;
    }

    const now = Date.now();
    const elapsed = now - lastForageTime;
    return Math.max(0, cooldownMs - elapsed);
  },

  /**
   * Record that a tile was foraged (starts cooldown)
   * @param mapId The map ID
   * @param x Tile X coordinate
   * @param y Tile Y coordinate
   */
  recordForage(this: GameStateManager, mapId: string, x: number, y: number): void {
    // Migrate old saves
    if (!this.state.forageCooldowns) {
      this.state.forageCooldowns = {};
    }

    const key = this.getForageTileKey(mapId, x, y);
    this.state.forageCooldowns[key] = Date.now();

    this.saveState();
    // Don't notify() here to avoid unnecessary re-renders
  },

  /**
   * Clean up expired cooldowns to prevent state bloat
   * Call periodically (e.g., on map transition)
   * @param cooldownMs Cooldown duration - entries older than this are removed
   */
  cleanupExpiredForageCooldowns(this: GameStateManager, cooldownMs: number): void {
    if (!this.state.forageCooldowns) {
      return;
    }

    const now = Date.now();
    const keysToRemove: string[] = [];

    for (const [key, timestamp] of Object.entries(this.state.forageCooldowns)) {
      if (now - timestamp >= cooldownMs) {
        keysToRemove.push(key);
      }
    }

    if (keysToRemove.length > 0) {
      for (const key of keysToRemove) {
        delete this.state.forageCooldowns[key];
      }
      this.saveState();
      debugLog('GameState', `Cleaned up ${keysToRemove.length} expired forage cooldowns`);
    }
  },

  /**
   * Clear all forage cooldowns on a specific map (for Verdant Surge potion)
   * @param mapId The map ID to clear cooldowns for
   * @returns Number of cooldowns cleared
   */
  clearForageCooldownsOnMap(this: GameStateManager, mapId: string): number {
    if (!this.state.forageCooldowns) {
      return 0;
    }

    const keysToRemove: string[] = [];

    for (const key of Object.keys(this.state.forageCooldowns)) {
      // Key format is "mapId:x,y"
      if (key.startsWith(`${mapId}:`)) {
        keysToRemove.push(key);
      }
    }

    if (keysToRemove.length > 0) {
      for (const key of keysToRemove) {
        delete this.state.forageCooldowns[key];
      }
      this.saveState();
      debugLog('GameState', `Cleared ${keysToRemove.length} forage cooldowns on map ${mapId}`);
    }

    return keysToRemove.length;
  },

  /**
   * Get the currently applied wallpaper item ID for a map, or null if none.
   */
  getAppliedWallpaper(this: GameStateManager, mapId: string): string | null {
    return this.state.appliedWallpapers?.[mapId] ?? null;
  },

  /**
   * Apply a wallpaper to a map. Permanently replaces any previously applied wallpaper.
   */
  applyWallpaper(this: GameStateManager, mapId: string, wallpaperId: string): void {
    if (!this.state.appliedWallpapers) {
      this.state.appliedWallpapers = {};
    }
    this.state.appliedWallpapers[mapId] = wallpaperId;
    this.saveState();
    this.notify();
  },

  removeWallpaper(this: GameStateManager, mapId: string): void {
    if (this.state.appliedWallpapers) {
      delete this.state.appliedWallpapers[mapId];
      this.saveState();
      this.notify();
    }
  },
};
