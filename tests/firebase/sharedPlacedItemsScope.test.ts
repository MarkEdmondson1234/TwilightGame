/** @vitest-environment node
 *
 * `getPublishedIds()` must only ever report ids for the map being mirrored.
 *
 * The listener watches the whole collection deliberately (it is small, and a `where`
 * clause would need an index to keep in step). The mirror filters by map — but
 * `publishedIds` did not, so it accumulated every document in the world while the mirror
 * held one map's worth.
 *
 * That is quietly destructive, because of what the caller does with it:
 * `useSharedPlacedItemsController` reconciles deletions by treating "published, but
 * neither ours nor in the mirror" as "somebody picked this up". An item on another shared
 * map satisfies both halves — so putting anything down in the village deleted every
 * shared item in the orchard, the farm, the ruins and the rest, for both players and
 * permanently.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

let snapshotHandler: ((snapshot: unknown) => void) | null = null;
const deleted: string[] = [];

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db, _path, id) => ({ id })),
  collection: vi.fn(() => ({})),
  setDoc: vi.fn(async () => {}),
  deleteDoc: vi.fn(async (ref: { id: string }) => {
    deleted.push(ref.id);
  }),
  onSnapshot: vi.fn((_ref, handler) => {
    snapshotHandler = handler as (snapshot: unknown) => void;
    return () => {};
  }),
}));
vi.mock('../../firebase/config', () => ({
  getFirebaseDb: vi.fn(() => ({})),
  isFirebaseInitialized: vi.fn(() => true),
}));
vi.mock('../../firebase/authService', () => ({
  authService: { isAuthenticated: () => true, getUserId: () => 'uid-1' },
}));
vi.mock('../../utils/errorReporting', () => ({ reportError: vi.fn() }));

import { sharedPlacedItemsService } from '../../firebase/sharedPlacedItemsService';

/** One Firestore doc as the snapshot handler sees it. */
function change(id: string, mapId: string) {
  return {
    type: 'added',
    doc: {
      id,
      data: () => ({
        id,
        itemId: 'furniture_garden_bench',
        mapId,
        position: { x: 3, y: 4 },
        image: '/bench.png',
        timestamp: 1,
      }),
    },
  };
}

function emit(...changes: ReturnType<typeof change>[]) {
  snapshotHandler?.({ docChanges: () => changes });
}

beforeEach(() => {
  deleted.length = 0;
  sharedPlacedItemsService.stopListening();
  snapshotHandler = null;
});

describe('published id scope', () => {
  it('reports ids for the mirrored map', () => {
    sharedPlacedItemsService.startListening('village');
    emit(change('bench-1', 'village'));

    expect(sharedPlacedItemsService.getPublishedIds()).toEqual(['bench-1']);
  });

  it('does not report items belonging to another map', () => {
    sharedPlacedItemsService.startListening('village');
    emit(change('bench-1', 'village'), change('bench-2', 'orchard'));

    // 'bench-2' is real and must stay real — it simply is not this map's business.
    expect(sharedPlacedItemsService.getPublishedIds()).toEqual(['bench-1']);
  });

  it('does not report a document it could not decode', () => {
    sharedPlacedItemsService.startListening('village');
    snapshotHandler?.({
      docChanges: () => [{ type: 'added', doc: { id: 'broken', data: () => ({ nonsense: true }) } }],
    });

    // We cannot read its map, so we must not later conclude it is ours to delete.
    expect(sharedPlacedItemsService.getPublishedIds()).toEqual([]);
  });

  it('forgets an id once its document is removed', () => {
    sharedPlacedItemsService.startListening('village');
    emit(change('bench-1', 'village'));
    snapshotHandler?.({
      docChanges: () => [{ type: 'removed', doc: { id: 'bench-1', data: () => ({}) } }],
    });

    expect(sharedPlacedItemsService.getPublishedIds()).toEqual([]);
  });

  it('clears everything when the map changes, so ids never leak across maps', () => {
    sharedPlacedItemsService.startListening('village');
    emit(change('bench-1', 'village'));
    sharedPlacedItemsService.startListening('orchard');

    expect(sharedPlacedItemsService.getPublishedIds()).toEqual([]);
  });
});
