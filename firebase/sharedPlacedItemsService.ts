/**
 * Shared placed items transport — Firestore.
 *
 * Furniture, wreaths, snow angels and every other placed item are *durable*
 * shared state: they must still be there tomorrow. That puts them on Firestore
 * alongside the community garden, not on the Realtime Database with presence
 * and chat, which are ephemeral by design.
 *
 * Writes are rare — a player putting something down is a deliberate act, not a
 * per-frame event — so there is no batching here. The one thing worth being
 * careful about is deletes: anyone may remove anyone's item, so a delete is a
 * plain document removal with no ownership check.
 *
 * Nothing here throws to callers.
 */

import { doc, setDoc, deleteDoc, collection, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { getFirebaseDb, isFirebaseInitialized } from './config';
import { authService } from './authService';
import { DEBUG } from '../constants';
import { reportError } from '../utils/errorReporting';
import {
  decodeSharedPlacedItem,
  sharedPlacedItemsManager,
  toPublishablePayload,
} from '../multiplayer/sharedPlacedItems';
import type { PlacedItem } from '../types';

const PLACED_ITEMS_COLLECTION = 'shared/world/placedItems';

class SharedPlacedItemsService {
  private unsubscribe: Unsubscribe | null = null;
  private listeningMapId: string | null = null;
  private listeners = new Set<() => void>();
  private reportedWriteFailure = false;
  /**
   * Ids Firestore actually holds, straight from the snapshots and never touched
   * by the optimistic removals sharedPlacedItemsManager applies. Reconciling
   * deletions needs to know what is really out there, not what we have decided
   * to stop drawing.
   */
  private publishedIds = new Set<string>();

  /** True when shared placement can run — Firebase up and signed in. */
  isAvailable(): boolean {
    return isFirebaseInitialized() && authService.isAuthenticated();
  }

  getListeningMap(): string | null {
    return this.listeningMapId;
  }

  /** Notified whenever the mirrored set changes, so the renderer can refresh. */
  onChange(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  #emit(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (error) {
        console.warn('[SharedItems] Listener threw:', error);
      }
    }
  }

  /**
   * Mirror one map's placed items into sharedPlacedItemsManager.
   *
   * The whole collection is watched and filtered client-side rather than
   * queried by mapId: the collection is small (tens of items across a family's
   * world), and a `where` clause would be one more thing to keep in step with a
   * Firestore index.
   */
  startListening(mapId: string): boolean {
    if (this.listeningMapId === mapId) return true;
    this.stopListening();

    if (!this.isAvailable()) return false;

    try {
      const db = getFirebaseDb();
      this.listeningMapId = mapId;
      sharedPlacedItemsManager.setMap(mapId);

      this.unsubscribe = onSnapshot(
        collection(db, PLACED_ITEMS_COLLECTION),
        (snapshot) => {
          for (const change of snapshot.docChanges()) {
            if (change.type === 'removed') {
              this.publishedIds.delete(change.doc.id);
              sharedPlacedItemsManager.remove(change.doc.id);
              continue;
            }
            const item = decodeSharedPlacedItem(change.doc.data());
            if (!item) {
              if (DEBUG.MULTIPLAYER) {
                console.warn(`[SharedItems] Dropped malformed item ${change.doc.id}`);
              }
              continue;
            }
            if (item.mapId !== mapId) continue;

            // Only ids for the mirrored map, as getPublishedIds() promises.
            //
            // This add used to sit above the map check, so publishedIds accumulated every
            // document in the collection while the mirror held only the current map. The
            // deletion pass in useSharedPlacedItemsController treats "published but not in
            // the mirror and not ours" as "picked up" — so placing anything on one shared
            // map deleted every shared item on all the others. A malformed document is
            // likewise left out: we cannot read its map, so we must not conclude it is
            // ours to delete.
            this.publishedIds.add(change.doc.id);
            sharedPlacedItemsManager.apply(item);
          }
          this.#emit();
        },
        (error) => {
          console.warn('[SharedItems] Listener failed:', error);
          reportError(error, 'shared_farm', { map: mapId, feature: 'placed_items' });
        }
      );

      if (DEBUG.MULTIPLAYER) console.log(`[SharedItems] Mirroring "${mapId}"`);
      return true;
    } catch (error) {
      console.warn(`[SharedItems] Failed to start listening on "${mapId}":`, error);
      reportError(error, 'shared_farm', { map: mapId, feature: 'placed_items' });
      this.listeningMapId = null;
      return false;
    }
  }

  stopListening(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.listeningMapId = null;
    this.publishedIds.clear();
    sharedPlacedItemsManager.setMap(null);
  }

  /** What Firestore holds for the mirrored map, for reconciling deletions. */
  getPublishedIds(): string[] {
    return [...this.publishedIds];
  }

  /** Publish (or update) one item. */
  async writeItem(item: PlacedItem): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      const db = getFirebaseDb();
      this.publishedIds.add(item.id);

      await setDoc(doc(db, PLACED_ITEMS_COLLECTION, item.id), {
        ...toPublishablePayload(item),
        // Attribution is for curiosity, not permission: anyone may move or
        // remove anyone's furniture. See multiplayer/sharedPlacedItems.ts.
        placedByUid: authService.getUserId(),
      });
      return true;
    } catch (error) {
      this.#reportWriteFailure(error, 'write', item.id);
      return false;
    }
  }

  /** Remove one item, whoever put it there. */
  async deleteItem(itemId: string): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      this.publishedIds.delete(itemId);
      await deleteDoc(doc(getFirebaseDb(), PLACED_ITEMS_COLLECTION, itemId));
      return true;
    } catch (error) {
      this.#reportWriteFailure(error, 'delete', itemId);
      return false;
    }
  }

  #reportWriteFailure(error: unknown, action: string, itemId: string): void {
    // A failed write is visible to the player — they put something down and the
    // other player never saw it — so the first one is always reported.
    if (!this.reportedWriteFailure) {
      this.reportedWriteFailure = true;
      console.warn(`[SharedItems] ${action} failed — other players will not see this:`, error);
      reportError(error, 'shared_farm', { feature: 'placed_items', action, itemId });
    } else if (DEBUG.MULTIPLAYER) {
      console.warn(`[SharedItems] ${action} failed:`, error);
    }
  }

  /** Tear down completely (sign-out, unmount). */
  destroy(): void {
    this.stopListening();
    this.listeners.clear();
  }
}

export const sharedPlacedItemsService = new SharedPlacedItemsService();
