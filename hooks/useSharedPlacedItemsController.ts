/**
 * SharedPlacedItemsController — furniture, wreaths and everything else players
 * put down, visible to both of them.
 *
 * Owns the whole lifecycle so App.tsx only wires it: mirror the current shared
 * map, publish what we place, delete what we pick up. GameState merges the
 * mirror into `getPlacedItems()`, so nothing else in the game needs to know
 * this exists.
 *
 * Reconciliation is a diff rather than a per-action write, because a placement
 * can happen in a dozen ways (crafted a wreath, dropped an item, a manager
 * placed a seasonal decoration) and every one of them already emits
 * PLACED_ITEMS_CHANGED. Publishing "everything local that is not yet published,
 * delete everything published that is no longer anywhere" catches all of them
 * without touching a single call site.
 */

import { useEffect, useState } from 'react';
import { MULTIPLAYER, MULTIPLAYER_ENABLED, DEBUG } from '../constants';
import { eventBus, GameEvent } from '../utils/EventBus';
import { gameState } from '../GameState';
import { getSharedPlacedItemsService, whenFirebaseSettled } from '../firebase/safe';
import { sharedPlacedItemsManager } from '../multiplayer/sharedPlacedItems';
import { loadPaintingImage } from '../utils/paintingImageService';
import type { PlacedItem } from '../types';
import { debugLog } from '../utils/debugLog';

export interface UseSharedPlacedItemsControllerProps {
  /** Map the player is currently on */
  currentMapId: string;
}

export interface UseSharedPlacedItemsControllerReturn {
  /** True when placement is being shared on this map */
  isSharingPlacedItems: boolean;
}

/** Placement is shared exactly where players can see each other. */
function isSharedMap(mapId: string): boolean {
  return MULTIPLAYER.SHARED_MAPS.has(mapId);
}

/** Has anything the other player would notice changed? */
function differs(a: PlacedItem, b: PlacedItem): boolean {
  return (
    a.itemId !== b.itemId ||
    a.position.x !== b.position.x ||
    a.position.y !== b.position.y ||
    a.image !== b.image ||
    a.customImage !== b.customImage ||
    a.customScale !== b.customScale ||
    a.rotation !== b.rotation
  );
}

export function useSharedPlacedItemsController(
  props: UseSharedPlacedItemsControllerProps
): UseSharedPlacedItemsControllerReturn {
  const { currentMapId } = props;
  const [isSharingPlacedItems, setIsSharingPlacedItems] = useState(false);

  // Mirror the current map.
  useEffect(() => {
    if (!MULTIPLAYER_ENABLED) return;

    let cancelled = false;

    void (async () => {
      await whenFirebaseSettled();
      const service = getSharedPlacedItemsService();

      if (!isSharedMap(currentMapId) || !service.isAvailable()) {
        service.stopListening();
        sharedPlacedItemsManager.setMap(null);
        if (!cancelled) setIsSharingPlacedItems(false);
        return;
      }

      const listening = service.startListening(currentMapId);
      if (!cancelled) setIsSharingPlacedItems(listening);
    })();

    return () => {
      cancelled = true;
    };
  }, [currentMapId]);

  // Inbound changes → tell the game to re-read. The renderer already listens for
  // PLACED_ITEMS_CHANGED, so another player's bench appears by the same path as
  // one of our own.
  useEffect(() => {
    if (!MULTIPLAYER_ENABLED) return;

    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    // A hung painting arrives as an id, not an image — the picture itself lives
    // in the shared paintings collection so it is not re-downloaded with every
    // snapshot. Fetch each one once; without this the other player sees an
    // empty frame.
    const hydrating = new Set<string>();

    const announce = () => {
      eventBus.emit(GameEvent.PLACED_ITEMS_CHANGED, {
        mapId: sharedPlacedItemsManager.getMapId() ?? '',
        action: 'sync',
      });
    };

    const hydratePaintings = () => {
      const mapId = sharedPlacedItemsManager.getMapId();
      if (!mapId) return;

      for (const item of sharedPlacedItemsManager.getItems(mapId)) {
        if (!item.paintingId) continue;
        if (item.customImage?.startsWith('data:')) continue;
        if (hydrating.has(item.paintingId)) continue;

        hydrating.add(item.paintingId);
        void loadPaintingImage(item.paintingId).then((dataUrl) => {
          if (cancelled || !dataUrl) return;
          // Re-read: the item may have moved or gone while we were fetching.
          const current = sharedPlacedItemsManager.get(item.id);
          if (!current) return;
          sharedPlacedItemsManager.apply({ ...current, customImage: dataUrl });
          announce();
        });
      }
    };

    void (async () => {
      const loaded = await whenFirebaseSettled();
      if (cancelled || !loaded) return;

      unsubscribe = getSharedPlacedItemsService().onChange(() => {
        hydratePaintings();
        announce();
      });
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  // Outbound: publish what we have, delete what nobody has any more.
  useEffect(() => {
    if (!MULTIPLAYER_ENABLED) return;

    const reconcile = (payload: { mapId: string; action?: string }) => {
      // A 'sync' is the mirror telling us about somebody else's change. Acting
      // on it would publish their items straight back and could delete an item
      // mid-flight, so inbound changes never trigger an outbound pass.
      if (payload.action === 'sync') return;
      if (!isSharedMap(currentMapId)) return;

      const service = getSharedPlacedItemsService();
      if (!service.isAvailable()) return;

      const local = gameState.getAllPlacedItems().filter((item) => item.mapId === currentMapId);
      const localIds = new Set(local.map((item) => item.id));

      // Publish anything of ours the world has not seen, or has seen differently.
      for (const item of local) {
        const published = sharedPlacedItemsManager.get(item.id);
        if (!published || differs(item, published)) {
          if (DEBUG.MULTIPLAYER) debugLog('SharedItems', `Publishing ${item.itemId}`);
          void service.writeItem(item);
        }
      }

      // A document that is neither ours nor still in the mirror is one we just
      // picked up: removePlacedItem drops it from the mirror optimistically, and
      // the mirror is the only thing that distinguishes "somebody else's, still
      // there" from "gone". Published ids come from the snapshots directly, so
      // this cannot delete something we have never seen exist.
      for (const id of service.getPublishedIds()) {
        if (localIds.has(id)) continue;
        if (sharedPlacedItemsManager.has(id)) continue;
        if (DEBUG.MULTIPLAYER) debugLog('SharedItems', `Deleting picked-up item ${id}`);
        void service.deleteItem(id);
      }
    };

    return eventBus.on(GameEvent.PLACED_ITEMS_CHANGED, reconcile);
  }, [currentMapId]);

  return { isSharingPlacedItems };
}
