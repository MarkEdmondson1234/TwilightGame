/**
 * GiftsController — player-to-player gifts arriving while you play.
 *
 * Owns the whole receive path so App.tsx only wires it: watch the shared gift
 * collection, turn each gift addressed to us into an inventory item, consume
 * the document. Sending lives in GiftModal's player mode; this hook never
 * sends.
 *
 * Quiet without multiplayer: when Firebase is missing or the player is signed
 * out, nothing listens and nothing arrives — the same bargain the chat and
 * presence controllers make.
 */

import { useEffect, useRef } from 'react';
import { MULTIPLAYER_ENABLED } from '../constants';
import { getGiftService, whenFirebaseSettled } from '../firebase/safe';
import { inventoryManager } from '../utils/inventoryManager';
import { decorationManager } from '../utils/DecorationManager';
import { getItem } from '../data/items';
import type { Gift } from '../multiplayer/gifts';

export interface UseGiftsControllerProps {
  /** Show a toast when a gift arrives (or cannot be delivered) */
  onShowToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

/**
 * Heal the artwork for a gifted custom decoration. The giver re-saves the
 * image when sending (see GiftModal), so a miss here is rare — but a gift
 * that arrives while our fetch fails should still become an item rather than
 * nothing. A decoration we already have is returned as-is.
 */
async function ensureArtwork(decorationId: string, itemId: string): Promise<boolean> {
  const name = getItem(itemId)?.displayName ?? 'Gift';
  const entry = await decorationManager.ensureCustomDecoration(decorationId, itemId, name);
  return entry !== null;
}

export function useGiftsController(props: UseGiftsControllerProps): void {
  const { onShowToast } = props;

  // Read at arrival time — a toast function that changes identity between
  // renders must not re-subscribe the Firestore listener.
  const showToastRef = useRef(onShowToast);
  showToastRef.current = onShowToast;

  useEffect(() => {
    if (!MULTIPLAYER_ENABLED) return;

    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    /**
     * Gifts already consumed this session. Firestore hands a document to the
     * snapshot callback again after certain listener restarts, and consume
     * (delete) is not instantaneous — without this guard a slow round trip
     * could deliver one gift twice.
     */
    const consumed = new Set<string>();

    const receive = (gift: Gift) => {
      if (consumed.has(gift.id)) return;
      consumed.add(gift.id);

      const itemDef = getItem(gift.itemId);
      if (!itemDef) {
        // Unknown item — nothing to add, but the document must still go
        // or it will be re-announced forever.
        void getGiftService().consumeGift(gift.id);
        return;
      }

      void (async () => {
        // Link the instance to its artwork only once that artwork is actually
        // registered locally. A decorationId pointing at a decoration this
        // client has never heard of is worse than none: the item would go in
        // the bag carrying an id that resolves to nothing, and hanging it
        // would put an empty frame on the wall. A plain item still places,
        // just with the default picture.
        const hasArtwork = gift.decorationId
          ? await ensureArtwork(gift.decorationId, gift.itemId)
          : false;

        const added =
          gift.decorationId && hasArtwork
            ? inventoryManager.addItemWithDecoration(gift.itemId, gift.decorationId)
            : inventoryManager.addItem(gift.itemId, 1);

        if (added) {
          showToastRef.current(
            `${gift.fromName} sent you a ${itemDef.displayName}! 🎁`,
            'success'
          );
        } else {
          showToastRef.current(
            `${gift.fromName} sent you a ${itemDef.displayName}, but your bag is full.`,
            'warning'
          );
        }

        await getGiftService().consumeGift(gift.id);
      })();
    };

    void (async () => {
      const loaded = await whenFirebaseSettled();
      if (cancelled || !loaded) return;

      const service = getGiftService();
      if (!service.isAvailable()) return;

      if (!service.startListening()) return;
      unsubscribe = service.onGift(receive);
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);
}