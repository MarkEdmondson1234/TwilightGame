/**
 * Shared placed items — the mirror of what everyone has put down in the world.
 *
 * Pure, no Firebase imports, so GameState can read it without dragging the
 * Firestore SDK into the save path. Shaped like RemotePlayerManager: the
 * transport feeds it, everything else asks it what is there.
 *
 * Ownership is deliberately absent. Anyone may move or remove anyone's
 * furniture — the players are two children who are friends, and the friction
 * that would protect them from each other subtracts from the game. Conflicts
 * resolve last-write-wins, which is the same bargain the community garden makes.
 */

import type { PlacedItem } from '../types';

/** Fields a document must have before we will render it. */
function isRenderable(raw: unknown): raw is PlacedItem {
  if (!raw || typeof raw !== 'object') return false;
  const item = raw as Record<string, unknown>;
  if (typeof item.id !== 'string' || !item.id) return false;
  if (typeof item.itemId !== 'string' || !item.itemId) return false;
  if (typeof item.mapId !== 'string' || !item.mapId) return false;
  if (typeof item.image !== 'string') return false;

  const position = item.position as Record<string, unknown> | undefined;
  if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') return false;
  return Number.isFinite(position.x) && Number.isFinite(position.y);
}

/**
 * Validate an inbound document. A malformed record must degrade to "ignore this
 * item", never to a crash mid-frame — the rules can lag a deploy, and a placed
 * item is read by the renderer, the hover layer and every click.
 */
export function decodeSharedPlacedItem(raw: unknown): PlacedItem | null {
  if (!isRenderable(raw)) return null;
  return {
    ...raw,
    timestamp: typeof raw.timestamp === 'number' ? raw.timestamp : Date.now(),
  };
}

/**
 * What actually goes on the wire for one item.
 *
 * A hung painting carries its ~100 KB base64 image in `customImage`. That does
 * not belong in a document every client re-downloads on every snapshot: the
 * image lives in the shared paintings collection, and the receiving client
 * hydrates it from `paintingId`. An item with no `paintingId` — a wreath's
 * generated image, say — keeps its image, because there is nowhere else for it
 * to come from.
 */
/**
 * Firestore rejects `undefined` field values outright — the key must be absent,
 * not present-with-undefined. Any optional field left undefined by a placement
 * flow would otherwise fail the whole shared-world write, so prune them
 * recursively at the boundary (JAVASCRIPT-REACT-9 is the worked example: a
 * wreath carries paintingId but no frameStyle).
 */
function pruneUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => pruneUndefined(entry)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const pruned: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry !== undefined) pruned[key] = pruneUndefined(entry);
    }
    return pruned as T;
  }
  return value;
}

export function toPublishablePayload(item: PlacedItem): PlacedItem {
  if (!item.paintingId) return pruneUndefined(item);
  const { customImage: _omitted, ...withoutImage } = item;
  return pruneUndefined(withoutImage);
}

class SharedPlacedItemsManager {
  /** Every item currently published for the map we are mirroring, keyed by id. */
  private items = new Map<string, PlacedItem>();
  private mapId: string | null = null;

  getMapId(): string | null {
    return this.mapId;
  }

  /**
   * Switch maps. Everything is dropped: placed items are per-map, and what is
   * in the village tells us nothing about the orchard.
   */
  setMap(mapId: string | null): void {
    if (this.mapId === mapId) return;
    this.items.clear();
    this.mapId = mapId;
  }

  /** Apply an inbound item (add or update). */
  apply(item: PlacedItem): void {
    this.items.set(item.id, item);
  }

  /**
   * Forget an item. Called both when a document disappears and when the local
   * player picks something up — the pick-up has to take effect before the
   * round trip, or the item flickers back for a frame.
   */
  remove(id: string): void {
    this.items.delete(id);
  }

  has(id: string): boolean {
    return this.items.has(id);
  }

  get(id: string): PlacedItem | undefined {
    return this.items.get(id);
  }

  clear(): void {
    this.items.clear();
  }

  /** Every published item on a map. */
  getItems(mapId: string): PlacedItem[] {
    if (this.mapId !== mapId) return [];
    return [...this.items.values()].filter((item) => item.mapId === mapId);
  }

  /** Ids of everything published, for reconciling deletions. */
  getIds(): string[] {
    return [...this.items.keys()];
  }
}

export const sharedPlacedItemsManager = new SharedPlacedItemsManager();
