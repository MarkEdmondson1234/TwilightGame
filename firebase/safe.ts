/**
 * Safe Firebase Wrapper
 *
 * Provides the same API as firebase/index.ts but handles the case
 * where the `firebase` npm package is not installed. All exports are
 * lazy-loaded via dynamic import — if import fails, stub no-ops are used.
 *
 * Usage: Import from 'firebase/safe' instead of 'firebase/index' in
 * any component that needs to work without Firebase installed.
 */

// Re-export types that don't need the package at runtime
export type { AuthState } from './authService';
export type { AlbumEntry } from './sharedAlbumService';
import type { PresenceEvent, LocalPresenceState } from '../multiplayer/types';
import type { PresenceStatus } from '../multiplayer/presenceStatus';
import type { ChatMessage } from '../multiplayer/chat';
import type { PlacedItem } from '../types';
import type { Photo } from '../types/photography';
import type { AlbumEntry } from './sharedAlbumService';

/** Stub authService when Firebase is not available */
const stubAuthService = {
  initialize: () => {},
  destroy: () => {},
  onAuthStateChange: (_cb: (state: any) => void) => {
    // Immediately notify with "not loaded" state
    _cb({ user: null, isLoading: false, isAuthenticated: false, isAnonymous: false });
    return () => {};
  },
  getState: () => ({ user: null, isLoading: false, isAuthenticated: false, isAnonymous: false }),
  signIn: async () => {
    throw new Error('Firebase not available');
  },
  signUp: async () => {
    throw new Error('Firebase not available');
  },
  signInWithGoogle: async () => {
    throw new Error('Firebase not available');
  },
  signInAnonymously: async () => {
    throw new Error('Firebase not available');
  },
  signOut: async () => {},
};

/** Stub sharedDataService when Firebase is not available */
const stubSharedDataService = {
  getNPCGossip: async () => null,
  addConversationSummary: async () => {},
  getWorldEvents: async () => [] as any[],
  addWorldEvent: async () => false,
  getRecentDiscoveries: async () => [] as string[],
  getConversationSummaries: async () => [] as any[],
  getRemainingContributions: () => 0,
  // Admin methods
  getAllConversationSummaries: async () => [] as any[],
  getWorldEventsWithIds: async () => [] as any[],
  deleteConversationSummary: async () => false,
  deleteWorldEvent: async () => false,
};

/** SyncState type for UI components */
export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';
export interface SyncState {
  status: SyncStatus;
  lastSyncTime: number | null;
  pendingChanges: boolean;
  error: string | null;
}

/** Stub syncManager when Firebase is not available */
const stubSyncManager = {
  initialize: () => {},
  syncNow: async () => {},
  syncBeforeSignOut: async () => {},
  getState: (): SyncState => ({
    status: 'offline',
    lastSyncTime: null,
    pendingChanges: false,
    error: null,
  }),
  onStateChange: (cb: (state: SyncState) => void) => {
    cb({ status: 'offline', lastSyncTime: null, pendingChanges: false, error: null });
    return () => {};
  },
  markPendingChanges: () => {},
  destroy: () => {},
};

/** Stub paintingStorageService when Firebase is not available */
const stubPaintingStorage = {
  saveImage: async () => false as boolean,
  loadImage: async () => null as string | null,
  deleteImage: async () => {},
  loadAllImages: async () => new Map<string, string>(),
};

/** Stub communityGardenService when Firebase is not available */
const stubCommunityGardenService = {
  startListening: () => {},
  stopListening: () => {},
  onPlotsChanged: (_cb: (plots: Map<string, unknown>) => void) => () => {},
  writePlot: async () => false as boolean,
  clearPlot: async () => false as boolean,
  // Local-only play has nobody to lose a race to, so every claim succeeds.
  claimPlot: async () => true as boolean,
  docToFarmPlot: (_doc: unknown) => null as any,
  getPlotId: (mapId: string, x: number, y: number) => `${mapId}:${x}:${y}`,
  getRemotePlots: () => new Map<string, unknown>(),
  isActive: () => false,
  destroy: () => {},
};

/**
 * Stub presenceService when Firebase is not available.
 * Every method must exist here or the game crashes only in the no-Firebase
 * configuration — tests/multiplayerSafeStubs.test.ts guards the parity.
 */
const stubPresenceService = {
  isAvailable: () => false,
  getStatus: (): PresenceStatus => ({
    available: false,
    reason: 'firebase-not-initialised',
    uid: null,
    room: null,
  }),
  getUid: () => null as string | null,
  getCurrentRoom: () => null as string | null,
  onPresence: (_cb: (event: PresenceEvent) => void) => () => {},
  enterRoom: async (_mapId: string) => false as boolean,
  leaveRoom: async () => {},
  publish: async (_state: LocalPresenceState) => false as boolean,
  destroy: async () => {},
};

/**
 * Stub chatService when Firebase is not available.
 * Parity with the real service is asserted by tests/multiplayerSafeStubs.test.ts.
 */
const stubChatService = {
  isAvailable: () => false,
  getCurrentRoom: () => null as string | null,
  onMessage: (_cb: (message: ChatMessage) => void) => () => {},
  enterRoom: async (_mapId: string) => false as boolean,
  leaveRoom: async () => {},
  send: async (_text: string, _name: string) => false as boolean,
  destroy: async () => {},
};

/**
 * Stub sharedPlacedItemsService when Firebase is not available.
 * Parity asserted by tests/multiplayerSafeStubs.test.ts.
 */
const stubSharedPlacedItemsService = {
  isAvailable: () => false,
  getListeningMap: () => null as string | null,
  onChange: (_cb: () => void) => () => {},
  startListening: (_mapId: string) => false,
  stopListening: () => {},
  getPublishedIds: () => [] as string[],
  writeItem: async (_item: PlacedItem) => false as boolean,
  deleteItem: async (_itemId: string) => false as boolean,
  destroy: () => {},
};

/**
 * Stub sharedAlbumService when Firebase is not available.
 * Parity asserted by tests/multiplayerSafeStubs.test.ts.
 */
const stubSharedAlbumService = {
  isAvailable: () => false,
  onChange: (_cb: () => void) => () => {},
  startListening: () => false,
  stopListening: () => {},
  getEntries: () => [] as AlbumEntry[],
  publish: async (_photo: Photo, _byName: string) => false as boolean,
  remove: async (_photoId: string) => false as boolean,
  destroy: () => {},
};

/** Stub cloudSaveService when Firebase is not available */
const stubCloudSaveService = {
  getSaveSlots: async () => [] as any[],
  getSaveMetadata: async () => null,
  saveGame: async () => {},
  loadGame: async () => null,
  deleteSave: async () => {},
  saveExists: async () => false,
  getNextAvailableSlot: async () => null as string | null,
  migrateLocalSave: async () => {},
};

/** Stub initializeFirebase when Firebase is not available */
const stubInitializeFirebase = async () => null;

// Cache the loaded module
let firebaseModule: typeof import('./index') | null = null;
let loadPromise: Promise<typeof import('./index') | null> | null = null;
let initPromise: Promise<Awaited<
  ReturnType<typeof import('./index').initializeFirebase>
> | null> | null = null;

/**
 * Try to load the real Firebase module.
 *
 * The in-flight *promise* is what gets shared, not a "we already started"
 * boolean. That distinction was a production outage: a boolean made the second
 * concurrent caller return the module variable while it was still null, so
 * safeInitializeFirebase() saw "no Firebase" and returned without a word —
 * initializeFirebase() was never called, and for the rest of the session
 * signing in threw "Firebase not initialized", cloud saves were off and
 * multiplayer was invisible. Whether it happened at all came down to which of
 * the two startup callers won a race against a chunk download.
 */
async function loadFirebase(): Promise<typeof import('./index') | null> {
  if (firebaseModule) return firebaseModule;

  if (!loadPromise) {
    loadPromise = import('./index')
      .then((mod) => {
        firebaseModule = mod;
        return mod;
      })
      .catch(() => {
        console.log('[Firebase] Package not installed - cloud saves disabled');
        loadPromise = null; // a chunk that failed to download may succeed later
        return null;
      });
  }

  return loadPromise;
}

/**
 * Get authService (real or stub).
 * Returns the stub synchronously; call loadFirebase() first for real one.
 */
export function getAuthService() {
  return firebaseModule?.authService ?? stubAuthService;
}

/**
 * Get sharedDataService (real or stub).
 */
export function getSharedDataService() {
  return firebaseModule?.sharedDataService ?? stubSharedDataService;
}

/**
 * Safe Firebase initialization.
 * Dynamically imports the Firebase module and initializes it.
 * Returns null if Firebase is not available or not configured.
 */
export async function safeInitializeFirebase() {
  // Memoised so concurrent callers share one initialisation rather than racing
  // to call authService.initialize() twice. A *failed* attempt is not cached:
  // pressing "Sign in" after a first-load failure has to be able to retry, and
  // before this it could not — the account screen just kept saying
  // "Firebase not initialized" for the rest of the session.
  if (!initPromise) {
    initPromise = (async () => {
      const mod = await loadFirebase();
      if (!mod) return null;

      try {
        const result = await mod.initializeFirebase();
        if (result) {
          mod.authService.initialize();
          mod.syncManager.initialize();
          console.log('[App] Firebase, auth, and sync manager initialized');
        } else {
          console.log('[App] Firebase not configured or disabled - cloud saves disabled');
        }
        return result;
      } catch (error) {
        console.warn(
          '[App] Firebase initialization failed - continuing without cloud saves',
          error
        );
        return null;
      }
    })().then((result) => {
      if (!result) initPromise = null; // allow a retry
      return result;
    });
  }
  return initPromise;
}

/**
 * Get paintingStorageService (real or stub).
 */
export function getPaintingStorageService() {
  return firebaseModule?.paintingStorageService ?? stubPaintingStorage;
}

/**
 * Get cloudSaveService (real or stub).
 */
export function getCloudSaveService() {
  return firebaseModule?.cloudSaveService ?? stubCloudSaveService;
}

/**
 * Get syncManager (real or stub).
 */
export function getSyncManager() {
  return firebaseModule?.syncManager ?? stubSyncManager;
}

/**
 * Get presenceService (real or stub).
 * Returns the stub until loadFirebase() has resolved, which is exactly right:
 * before then there is nothing to publish to.
 */
export function getPresenceService() {
  return firebaseModule?.presenceService ?? stubPresenceService;
}

/**
 * Get chatService (real or stub).
 * Same rule as presence: never cache the result, it is a stub until the
 * dynamic Firebase import has settled.
 */
export function getChatService() {
  return firebaseModule?.chatService ?? stubChatService;
}

/**
 * Get sharedPlacedItemsService (real or stub).
 * Never cache the result — it is a stub until Firebase has settled.
 */
export function getSharedPlacedItemsService() {
  return firebaseModule?.sharedPlacedItemsService ?? stubSharedPlacedItemsService;
}

/**
 * Get sharedAlbumService (real or stub).
 * Never cache — it is a stub until Firebase has settled.
 */
export function getSharedAlbumService() {
  return firebaseModule?.sharedAlbumService ?? stubSharedAlbumService;
}

/**
 * Get communityGardenService (real or stub).
 */
export function getCommunityGardenService() {
  return firebaseModule?.communityGardenService ?? stubCommunityGardenService;
}

/**
 * Check if Firebase was successfully loaded (package exists)
 */
export function isFirebaseLoaded(): boolean {
  return firebaseModule !== null;
}

/**
 * Resolve once the Firebase module load has been *attempted*, and report whether
 * it succeeded.
 *
 * Every getter above returns its stub while the dynamic import is still in
 * flight. That is correct for one-shot calls, but a caller that caches the
 * result — or subscribes to it — latches onto the stub permanently and silently
 * does nothing forever after. Await this first when you intend to hold on to a
 * service. Idempotent: the underlying load runs at most once.
 */
export async function whenFirebaseSettled(): Promise<boolean> {
  // Awaiting only the *import* was not enough: presence asks whether the
  // Realtime Database is up the instant the player steps onto a shared map,
  // and initializeFirebase() may still have been in flight — so multiplayer
  // read "unavailable" and stayed that way. Wait for real initialisation.
  await safeInitializeFirebase();
  return firebaseModule !== null;
}
