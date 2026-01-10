/**
 * DeskManager - Single Source of Truth for desk contents
 *
 * Manages items placed on desk tiles (CollisionType.DESK).
 * Desks can hold up to 4 items at a time.
 *
 * Following the SSoT principle from CLAUDE.md, this is the ONLY place
 * that manages desk item storage.
 */

import { DeskContents, DeskItem, Position } from '../types';
import { gameState } from '../GameState';

// Maximum items per desk tile
const MAX_DESK_ITEMS = 4;

class DeskManager {
  private deskContents: Map<string, DeskContents> = new Map();
  private initialised = false;

  /**
   * Generate a unique key for a desk position
   */
  private getDeskKey(mapId: string, position: Position): string {
    return `${mapId}:${position.x},${position.y}`;
  }

  /**
   * Initialise the manager with saved data from GameState
   */
  initialise(): void {
    if (this.initialised) return;

    const savedDesks = gameState.loadDeskContents();
    this.deskContents.clear();

    for (const desk of savedDesks) {
      const key = this.getDeskKey(desk.mapId, desk.position);
      this.deskContents.set(key, desk);
    }

    this.initialised = true;
    console.log(`[DeskManager] Initialised with ${savedDesks.length} desks`);
  }

  /**
   * Get desk contents at a specific position
   */
  getDeskAt(mapId: string, position: Position): DeskContents | undefined {
    const key = this.getDeskKey(mapId, position);
    return this.deskContents.get(key);
  }

  /**
   * Get all items on a desk
   */
  getItems(mapId: string, position: Position): DeskItem[] {
    const desk = this.getDeskAt(mapId, position);
    return desk?.items || [];
  }

  /**
   * Check if a desk has space for more items
   */
  hasSpace(mapId: string, position: Position): boolean {
    const items = this.getItems(mapId, position);
    return items.length < MAX_DESK_ITEMS;
  }

  /**
   * Get the next available slot index for a desk
   */
  private getNextSlotIndex(items: DeskItem[]): number {
    const usedSlots = new Set(items.map((item) => item.slotIndex));
    for (let i = 0; i < MAX_DESK_ITEMS; i++) {
      if (!usedSlots.has(i)) {
        return i;
      }
    }
    return -1; // No slots available
  }

  /**
   * Add an item to a desk
   * @returns The created DeskItem if successful, undefined if desk is full
   */
  addItem(mapId: string, position: Position, itemId: string, image: string): DeskItem | undefined {
    const key = this.getDeskKey(mapId, position);
    let desk = this.deskContents.get(key);

    // Create desk entry if it doesn't exist
    if (!desk) {
      desk = {
        mapId,
        position: { x: position.x, y: position.y },
        items: [],
      };
      this.deskContents.set(key, desk);
    }

    // Check capacity
    if (desk.items.length >= MAX_DESK_ITEMS) {
      console.warn(`[DeskManager] Desk at ${mapId}:(${position.x},${position.y}) is full`);
      return undefined;
    }

    // Create new desk item
    const slotIndex = this.getNextSlotIndex(desk.items);
    const deskItem: DeskItem = {
      id: `desk_item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      itemId,
      image,
      slotIndex,
      placedAt: Date.now(),
    };

    desk.items.push(deskItem);
    this.persistDesk(desk);

    console.log(
      `[DeskManager] Added ${itemId} to desk at ${mapId}:(${position.x},${position.y}) slot ${slotIndex}`
    );
    return deskItem;
  }

  /**
   * Remove an item from a desk by slot index
   * @returns The removed DeskItem if successful, undefined if not found
   */
  removeItem(mapId: string, position: Position, slotIndex: number): DeskItem | undefined {
    const key = this.getDeskKey(mapId, position);
    const desk = this.deskContents.get(key);

    if (!desk) {
      return undefined;
    }

    const itemIndex = desk.items.findIndex((item) => item.slotIndex === slotIndex);
    if (itemIndex === -1) {
      return undefined;
    }

    const [removedItem] = desk.items.splice(itemIndex, 1);
    this.persistDesk(desk);

    console.log(
      `[DeskManager] Removed ${removedItem.itemId} from desk at ${mapId}:(${position.x},${position.y}) slot ${slotIndex}`
    );
    return removedItem;
  }

  /**
   * Remove an item from a desk by item ID
   * @returns The removed DeskItem if successful, undefined if not found
   */
  removeItemById(mapId: string, position: Position, itemId: string): DeskItem | undefined {
    const key = this.getDeskKey(mapId, position);
    const desk = this.deskContents.get(key);

    if (!desk) {
      return undefined;
    }

    const itemIndex = desk.items.findIndex((item) => item.id === itemId);
    if (itemIndex === -1) {
      return undefined;
    }

    const [removedItem] = desk.items.splice(itemIndex, 1);
    this.persistDesk(desk);

    console.log(
      `[DeskManager] Removed item ${itemId} from desk at ${mapId}:(${position.x},${position.y})`
    );
    return removedItem;
  }

  /**
   * Get all desks for a specific map
   */
  getDesksForMap(mapId: string): DeskContents[] {
    const desks: DeskContents[] = [];
    for (const desk of this.deskContents.values()) {
      if (desk.mapId === mapId) {
        desks.push(desk);
      }
    }
    return desks;
  }

  /**
   * Check if a desk has any items
   */
  hasItems(mapId: string, position: Position): boolean {
    const items = this.getItems(mapId, position);
    return items.length > 0;
  }

  /**
   * Persist desk contents to GameState
   */
  private persistDesk(desk: DeskContents): void {
    gameState.saveDeskContents(desk);
  }

  /**
   * Clear a desk (remove all items)
   */
  clearDesk(mapId: string, position: Position): DeskItem[] {
    const key = this.getDeskKey(mapId, position);
    const desk = this.deskContents.get(key);

    if (!desk || desk.items.length === 0) {
      return [];
    }

    const removedItems = [...desk.items];
    desk.items = [];
    this.persistDesk(desk);

    console.log(
      `[DeskManager] Cleared desk at ${mapId}:(${position.x},${position.y}), removed ${removedItems.length} items`
    );
    return removedItems;
  }

  /**
   * Get total item count across all desks
   */
  getTotalItemCount(): number {
    let count = 0;
    for (const desk of this.deskContents.values()) {
      count += desk.items.length;
    }
    return count;
  }
}

// Singleton instance
export const deskManager = new DeskManager();
