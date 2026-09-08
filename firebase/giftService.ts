/**
 * Gift transport — Firestore.
 *
 * Player-to-player gifts are durable shared state, alongside placed items and
 * the shared album: a gift must survive the recipient being mid-transition or
 * closing the game, and be there the next time they open it. That puts it on
 * Firestore, not on the Realtime Database with chat.
 *
 * One document per gift at `shared/world/gifts/{giftId}`. The recipient
 * consumes (deletes) the document when the item has been added to their
 * inventory, so a gift is delivered exactly once. Anyone signed in may write
 * or delete — the same permissive bargain as placed items: the players are
 * children who are friends, and the friction that would protect them from
 * each other subtracts from the game.
 *
 * Nothing here throws to callers.
 */

import { doc, setDoc, deleteDoc, collection, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { getFirebaseDb, isFirebaseInitialized } from './config';
import { authService } from './authService';
import { DEBUG } from '../constants';
import { reportError } from '../utils/errorReporting';
import { decodeGift, encodeGift } from '../multiplayer/gifts';
import type { Gift } from '../multiplayer/gifts';

const GIFTS_COLLECTION = 'shared/world/gifts';

class GiftService {
  private unsubscribe: Unsubscribe | null = null;
  private listening = false;
  private listeners = new Set<(gift: Gift) => void>();
  private reportedWriteFailure = false;

  /** True when gifts can be sent and received — Firebase up and signed in. */
  isAvailable(): boolean {
    return isFirebaseInitialized() && authService.isAuthenticated();
  }

  /** Subscribe to gifts addressed to the local player. Returns an unsubscribe. */
  onGift(callback: (gift: Gift) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  #emit(gift: Gift): void {
    for (const listener of this.listeners) {
      try {
        listener(gift);
      } catch (error) {
        console.warn('[Gifts] Listener threw:', error);
      }
    }
  }

  /**
   * Start watching the gifts collection. The whole collection is watched and
   * filtered client-side by recipient (decodeGift drops other people's
   * gifts) — the collection is small, and a per-recipient query would be one
   * more index to keep in step with the rules.
   */
  startListening(): boolean {
    if (this.listening) return true;
    if (!this.isAvailable()) return false;

    try {
      const db = getFirebaseDb();
      const uid = authService.getUserId();
      if (!uid) return false;
      this.listening = true;

      this.unsubscribe = onSnapshot(
        collection(db, GIFTS_COLLECTION),
        (snapshot) => {
          for (const change of snapshot.docChanges()) {
            if (change.type !== 'added' && change.type !== 'modified') continue;
            const gift = decodeGift(change.doc.id, change.doc.data(), uid);
            if (!gift) continue;
            this.#emit(gift);
          }
        },
        (error) => {
          console.warn('[Gifts] Listener failed:', error);
          reportError(error, 'shared_world', { feature: 'gifts', action: 'listen' });
        }
      );

      if (DEBUG.MULTIPLAYER) console.log('[Gifts] Watching for incoming gifts');
      return true;
    } catch (error) {
      console.warn('[Gifts] Failed to start listening:', error);
      reportError(error, 'shared_world', { feature: 'gifts', action: 'listen' });
      this.listening = false;
      return false;
    }
  }

  stopListening(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.listening = false;
  }

  /**
   * Send one gift. The document lands first; the giver removes the item from
   * their inventory only after this resolves, so a failed send never loses an
   * item. Returns false when there was nothing to send or the write failed.
   */
  async sendGift(gift: {
    fromName: string;
    toUid: string;
    toName: string;
    itemId: string;
    decorationId?: string;
  }): Promise<boolean> {
    if (!this.isAvailable()) return false;

    const fromUid = authService.getUserId();
    if (!fromUid) return false;

    const wire = encodeGift({
      fromUid,
      fromName: gift.fromName,
      toUid: gift.toUid,
      toName: gift.toName,
      itemId: gift.itemId,
      ...(gift.decorationId ? { decorationId: gift.decorationId } : {}),
    });
    if (!wire) return false;

    try {
      const db = getFirebaseDb();
      // Stamped here rather than with serverTimestamp(): Firestore resolves
      // that to a Timestamp object, and the wire (and its rules) carry `t` as
      // a plain number. Nothing routes on it — it is provenance, not ordering.
      await setDoc(doc(collection(db, GIFTS_COLLECTION)), { ...wire, t: Date.now() });
      return true;
    } catch (error) {
      // A lost gift is visible to the giver — they picked an item and it never
      // arrived — so the first failure is always reported.
      if (!this.reportedWriteFailure) {
        this.reportedWriteFailure = true;
        console.warn('[Gifts] Send failed — the gift was not delivered:', error);
        reportError(error, 'shared_world', { feature: 'gifts', action: 'send' });
      } else if (DEBUG.MULTIPLAYER) {
        console.warn('[Gifts] Send failed:', error);
      }
      return false;
    }
  }

  /**
   * Consume a gift once its item is safely in the recipient's inventory.
   * Deleting is the delivery confirmation — until this succeeds the snapshot
   * may hand the same gift over again, so consumers must tolerate that.
   */
  async consumeGift(giftId: string): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      await deleteDoc(doc(getFirebaseDb(), GIFTS_COLLECTION, giftId));
      return true;
    } catch (error) {
      console.warn('[Gifts] Failed to consume gift:', error);
      reportError(error, 'shared_world', { feature: 'gifts', action: 'consume' });
      return false;
    }
  }

  /** Tear down completely (sign-out, unmount). */
  destroy(): void {
    this.stopListening();
    this.listeners.clear();
  }
}

export const giftService = new GiftService();