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
  docToFarmPlot: (_doc: unknown) => null as any,
  getPlotId: (mapId: string, x: number, y: number) => `${mapId}:${x}:${y}`,
  getRemotePlots: () => new Map<string, unknown>(),
  isActive: () => false,
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
let loadAttempted = false;

/** Try to load the real Firebase module */
async function loadFirebase(): Promise<typeof import('./index') | null> {
  if (loadAttempted) return firebaseModule;
  loadAttempted = true;
  try {
    firebaseModule = await import('./index');
    return firebaseModule;
  } catch {
    console.log('[Firebase] Package not installed - cloud saves disabled');
    return null;
  }
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
    console.log('[App] Firebase initialization failed - continuing without cloud saves');
    return null;
  }
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
