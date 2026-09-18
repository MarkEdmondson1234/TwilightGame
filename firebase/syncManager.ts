import { startDiagnosticOperation } from '../utils/sessionDiagnostics';
/**
 * Sync Manager - Hybrid Save System
 *
 * Coordinates between localStorage (fast, offline) and Firestore (cloud, canonical).
 *
 * Strategy:
 * - localStorage: Primary for speed, always available, immediate saves
 * - Firestore: Cloud backup, sync on login/logout/periodic, canonical on conflicts
 *
 * Sync triggers:
 * - On login: Compare timestamps, download newer cloud save or upload local
 * - On logout: Final backup to cloud
 * - Periodic: Every 5 minutes while playing (if signed in)
 * - Manual: User-triggered save to cloud
 */

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseDb, isFirebaseInitialized } from './config';
import { authService } from './authService';
import { cloudSaveService } from './cloudSaveService';
import { syncDiaryFromFirestore } from '../services/diaryService';
import { gameState } from '../GameState';
import { FIRESTORE_PATHS, SyncMetadata } from './types';
import { eventBus, GameEvent } from '../utils/EventBus';
import { reportError, reportMessageOnce } from '../utils/errorReporting';
import { debugLog } from '../utils/debugLog';

// ============================================
// Constants
// ============================================

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const GAME_VERSION = '1.0.0';
const DEFAULT_SLOT = 'slot_1';

/**
 * Whose game the single local save belongs to: a uid, or `'local'` for play
 * while signed out. The local save is one slot per browser, not per account,
 * so on a shared family laptop it is whoever played last — and "newer than
 * the cloud" then means "someone else's game", not "this player's unsynced
 * progress". Without this tag, signing in on such a machine uploaded the
 * previous player's inventory and garden over your own cloud save.
 */
const LOCAL_SAVE_OWNER_KEY = 'twilight_last_save_owner';
export const LOCAL_SAVE_OWNER_SIGNED_OUT = 'local';

// Generate a unique device ID (persisted in localStorage)
function getDeviceId(): string {
  let deviceId = localStorage.getItem('twilight_device_id');
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('twilight_device_id', deviceId);
  }
  return deviceId;
}

// ============================================
// Sync State
// ============================================

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

export interface SyncState {
  status: SyncStatus;
  lastSyncTime: number | null;
  pendingChanges: boolean;
  error: string | null;
}

export type SignInSyncDecision =
  | 'upload'
  | 'download'
  | 'in-sync'
  /** Local save is someone else's (or signed-out play) and a cloud save exists */
  | 'download-foreign'
  /** Local save is another account's and this account has nothing in the cloud */
  | 'reset-foreign';

/**
 * What to do with the local save when an account signs in. Pure, so the
 * shared-laptop cases can be pinned by tests/localSaveOwner.test.ts.
 *
 * The timestamp race only means anything when the local save is this
 * account's own. Anyone else's game — another account's, or a signed-out
 * session's — never wins on age: the cloud does, or, for a brand-new account,
 * an empty game does. A signed-out session with no cloud save to protect is
 * the one "adopt it" case: that is offline play being signed up to keep.
 */
export function decideSignInSync(input: {
  uid: string;
  localOwner: string | null;
  localTimestamp: number;
  cloudTimestamp: number;
}): SignInSyncDecision {
  const { uid, localOwner, localTimestamp, cloudTimestamp } = input;
  const own = localOwner === null || localOwner === uid;
  if (!own) {
    if (cloudTimestamp > 0) return 'download-foreign';
    if (localOwner === LOCAL_SAVE_OWNER_SIGNED_OUT)
      return localTimestamp > 0 ? 'upload' : 'in-sync';
    return localTimestamp > 0 ? 'reset-foreign' : 'in-sync';
  }
  if (localTimestamp > cloudTimestamp) return 'upload';
  if (cloudTimestamp > localTimestamp) return 'download';
  return 'in-sync';
}

// ============================================
// SyncManager Class
// ============================================

class SyncManager {
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private state: SyncState = {
    status: 'idle',
    lastSyncTime: null,
    pendingChanges: false,
    error: null,
  };
  private listeners: Set<(state: SyncState) => void> = new Set();

  /**
   * Initialize sync manager
   * Call after Firebase and auth are initialized
   */
  initialize(): void {
    // Listen for auth state changes
    authService.onAuthStateChange((authState) => {
      if (authState.isAuthenticated && !authState.isLoading) {
        // User signed in - sync immediately
        this.onSignIn();
      } else if (!authState.isAuthenticated && !authState.isLoading) {
        // User signed out - stop periodic sync. From here on the local save
        // is nobody's: whatever is played signed out must not be mistaken
        // for this account's progress when they next sign in.
        this.stopPeriodicSync();
        this.setLocalSaveOwner(LOCAL_SAVE_OWNER_SIGNED_OUT);
      }
    });

    // Mark pending changes whenever local state is saved, and stamp whose
    // game it is.
    eventBus.on(GameEvent.LOCAL_SAVE_FLUSHED, () => {
      this.markPendingChanges();
      this.setLocalSaveOwner(authService.getUserId() ?? LOCAL_SAVE_OWNER_SIGNED_OUT);
    });

    // Best-effort cloud save when page is hidden (tab switch, close, navigate away)
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && this.state.pendingChanges) {
          this.attemptExitSave();
        }
      });
    }

    debugLog('SyncManager', 'Initialized');
  }

  /**
   * Handle user sign in - compare and sync saves
   */
  private async onSignIn(): Promise<void> {
    debugLog('SyncManager', 'User signed in, checking for sync...');

    try {
      this.updateState({ status: 'syncing' });

      // Get local save timestamp
      const localTimestamp = this.getLocalSaveTimestamp();

      // Get cloud save timestamp
      const cloudMeta = await this.getCloudSyncMeta();
      const cloudTimestamp = cloudMeta?.lastCloudSync || 0;

      debugLog(
        'SyncManager',
        'Local timestamp:',
        localTimestamp,
        'Cloud timestamp:',
        cloudTimestamp
      );

      const decision = decideSignInSync({
        uid: authService.getUserId() ?? '',
        localOwner: this.getLocalSaveOwner(),
        localTimestamp,
        cloudTimestamp,
      });

      if (decision === 'download-foreign') {
        // The local save is another account's (or was played signed out) and
        // this account has a cloud save: the cloud is the truth. Said out
        // loud and reported, because until now this uploaded the other
        // person's game over yours and nothing recorded it.
        console.warn(
          '[SyncManager] The save on this device belongs to someone else — loading your cloud save instead.'
        );
        reportMessageOnce('Local save belonged to another account; cloud save loaded', 'sync', {
          localOwner: this.getLocalSaveOwner() ?? 'unknown',
        });
        await this.downloadFromCloud();
      } else if (decision === 'reset-foreign') {
        // Another account's game on this device, and this account has no
        // cloud save yet: a fresh account must start fresh, not inherit and
        // upload somebody else's inventory. Reload so the game starts from
        // the empty state (character creation) with the session kept.
        console.warn(
          '[SyncManager] The save on this device belongs to another account and you have no cloud save — starting a new game.'
        );
        reportMessageOnce('Local save belonged to another account; new game started', 'sync', {
          localOwner: this.getLocalSaveOwner() ?? 'unknown',
        });
        gameState.resetState();
        gameState.flushSave();
        this.setLocalSaveOwner(authService.getUserId() ?? LOCAL_SAVE_OWNER_SIGNED_OUT);
        window.location.reload();
        return;
      } else if (decision === 'upload') {
        // Local is newer - upload to cloud
        debugLog('SyncManager', 'Local save is newer, uploading to cloud...');
        await this.uploadToCloud();
      } else if (decision === 'download') {
        // Cloud is newer - download to local
        debugLog('SyncManager', 'Cloud save is newer, downloading...');
        await this.downloadFromCloud();
      } else {
        debugLog('SyncManager', 'Saves are in sync');
      }

      // Sync diary entries from Firestore (non-blocking)
      syncDiaryFromFirestore().catch((err) => {
        console.warn('[SyncManager] Diary sync failed:', err);
      });

      this.updateState({
        status: 'idle',
        lastSyncTime: Date.now(),
        error: null,
      });

      // Start periodic sync
      this.startPeriodicSync();
    } catch (error) {
      console.error('[SyncManager] Sync failed:', error);
      this.updateState({
        status: 'error',
        error: error instanceof Error ? error.message : 'Sync failed',
      });
    }
  }

  /**
   * Upload current game state to cloud
   */
  async uploadToCloud(slotId: string = DEFAULT_SLOT): Promise<void> {
    if (!authService.isAuthenticated()) {
      debugLog('SyncManager', 'Not authenticated, skipping upload');
      return;
    }

    const finishDiagnostic = startDiagnosticOperation('cloud_upload');
    this.updateState({ status: 'syncing' });
    eventBus.emit(GameEvent.CLOUD_SYNC_STARTED, {});

    try {
      const state = gameState.getFullState();
      const playTime = state.stats?.totalPlayTime || 0;

      await cloudSaveService.saveGame(slotId, state, playTime);
      await this.updateCloudSyncMeta();

      this.updateState({
        status: 'idle',
        lastSyncTime: Date.now(),
        pendingChanges: false,
        error: null,
      });

      eventBus.emit(GameEvent.CLOUD_SYNC_COMPLETED, { success: true });
      debugLog('SyncManager', 'Uploaded to cloud successfully');
      finishDiagnostic();
    } catch (error) {
      finishDiagnostic(false);
      console.error('[SyncManager] Upload failed:', error);
      this.updateState({
        status: 'error',
        error: error instanceof Error ? error.message : 'Upload failed',
      });
      eventBus.emit(GameEvent.CLOUD_SYNC_COMPLETED, { success: false });
      // Reported once here (not at each caller) since every caller —
      // onSignIn, periodic sync, syncBeforeSignOut, exit-save, manual Save
      // Now — funnels through this one method and either rethrows or
      // swallows the same error.
      reportError(error, 'sync', { action: 'uploadToCloud', slotId });
      throw error;
    }
  }

  /**
   * Download cloud save to local storage
   */
  async downloadFromCloud(slotId: string = DEFAULT_SLOT): Promise<void> {
    if (!authService.isAuthenticated()) {
      debugLog('SyncManager', 'Not authenticated, skipping download');
      return;
    }

    const finishDiagnostic = startDiagnosticOperation('cloud_download');
    this.updateState({ status: 'syncing' });

    try {
      const cloudState = await cloudSaveService.loadGame(slotId);

      // Update local game state
      gameState.loadFromCloud(cloudState);

      // Update local save timestamp to match cloud
      this.setLocalSaveTimestamp(Date.now());
      this.setLocalSaveOwner(authService.getUserId() ?? LOCAL_SAVE_OWNER_SIGNED_OUT);

      this.updateState({
        status: 'idle',
        lastSyncTime: Date.now(),
        pendingChanges: false,
        error: null,
      });

      // Notify game that state was updated
      eventBus.emit(GameEvent.INVENTORY_CHANGED, { action: 'update' });

      // Also sync diary entries (non-blocking)
      syncDiaryFromFirestore().catch((err) => {
        console.warn('[SyncManager] Diary sync during download failed:', err);
      });

      debugLog('SyncManager', 'Downloaded from cloud successfully');
      finishDiagnostic();
    } catch (error) {
      finishDiagnostic(false);
      console.error('[SyncManager] Download failed:', error);
      this.updateState({
        status: 'error',
        error: error instanceof Error ? error.message : 'Download failed',
      });
      reportError(error, 'sync', { action: 'downloadFromCloud', slotId });
      throw error;
    }
  }

  /**
   * Manual sync - force upload current state to cloud + pull diary entries
   */
  async syncNow(): Promise<void> {
    if (!authService.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    await this.uploadToCloud();

    // Also pull diary entries from other devices (non-blocking)
    syncDiaryFromFirestore().catch((err) => {
      console.warn('[SyncManager] Diary sync failed:', err);
    });
  }

  /**
   * Sync before sign-out. Call BEFORE authService.signOut() so auth token is still valid.
   */
  async syncBeforeSignOut(): Promise<void> {
    if (!authService.isAuthenticated() || !this.state.pendingChanges) return;
    try {
      await this.uploadToCloud();
      debugLog('SyncManager', 'Final sync before sign-out completed');
    } catch (error) {
      console.warn('[SyncManager] Final sync before sign-out failed:', error);
    }
  }

  /**
   * Best-effort save on page exit (visibilitychange → hidden).
   * Fire-and-forget — may not complete if page is closed immediately.
   */
  private attemptExitSave(): void {
    if (!authService.isAuthenticated() || !this.state.pendingChanges) return;

    debugLog('SyncManager', 'Attempting exit save...');
    this.uploadToCloud().catch((error) => {
      console.warn('[SyncManager] Exit save failed (expected if page closed):', error);
    });
  }

  /**
   * Mark that local changes exist (for UI indicator)
   */
  markPendingChanges(): void {
    if (this.state.pendingChanges) return;
    this.updateState({ pendingChanges: true });
  }

  /**
   * Get current sync state
   */
  getState(): SyncState {
    return { ...this.state };
  }

  /**
   * Subscribe to sync state changes
   */
  onStateChange(callback: (state: SyncState) => void): () => void {
    this.listeners.add(callback);
    callback(this.state);
    return () => this.listeners.delete(callback);
  }

  // ============================================
  // Periodic Sync
  // ============================================

  private startPeriodicSync(): void {
    if (this.syncInterval) return;

    this.syncInterval = setInterval(async () => {
      if (!authService.isAuthenticated()) return;

      // Upload game state if there are pending changes
      if (this.state.pendingChanges) {
        debugLog('SyncManager', 'Periodic sync triggered');
        try {
          await this.uploadToCloud();
        } catch (error) {
          console.error('[SyncManager] Periodic sync failed:', error);
        }
      }

      // Always pull diary entries (may have entries from other devices)
      syncDiaryFromFirestore().catch((err) => {
        console.warn('[SyncManager] Periodic diary sync failed:', err);
      });
    }, SYNC_INTERVAL_MS);

    debugLog('SyncManager', 'Periodic sync started (every 5 minutes)');
  }

  private stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      debugLog('SyncManager', 'Periodic sync stopped');
    }
  }

  // ============================================
  // Sync Metadata
  // ============================================

  private async getCloudSyncMeta(): Promise<SyncMetadata | null> {
    if (!isFirebaseInitialized() || !authService.isAuthenticated()) {
      return null;
    }

    const userId = authService.getUserId()!;
    const db = getFirebaseDb();
    const metaRef = doc(db, FIRESTORE_PATHS.syncMeta(userId));

    try {
      const metaDoc = await getDoc(metaRef);
      if (metaDoc.exists()) {
        return metaDoc.data() as SyncMetadata;
      }
    } catch (error) {
      console.warn('[SyncManager] Failed to get cloud sync meta:', error);
      // Otherwise-invisible: a failed read here makes onSignIn() treat cloud
      // as if it had never synced (cloudTimestamp 0), which can trigger an
      // upload that overwrites cloud data with a stale local save — worth
      // knowing about even though gameplay isn't blocked.
      reportError(error, 'sync', { action: 'getCloudSyncMeta' });
    }

    return null;
  }

  private async updateCloudSyncMeta(): Promise<void> {
    if (!isFirebaseInitialized() || !authService.isAuthenticated()) {
      return;
    }

    const userId = authService.getUserId()!;
    const db = getFirebaseDb();
    const metaRef = doc(db, FIRESTORE_PATHS.syncMeta(userId));

    const meta: Omit<SyncMetadata, 'lastCloudSave'> & {
      lastCloudSave: ReturnType<typeof serverTimestamp>;
    } = {
      lastLocalSave: this.getLocalSaveTimestamp(),
      lastCloudSync: Date.now(),
      lastCloudSave: serverTimestamp(),
      deviceId: getDeviceId(),
      version: GAME_VERSION,
    };

    await setDoc(metaRef, meta, { merge: true });
  }

  private getLocalSaveTimestamp(): number {
    const saved = localStorage.getItem('twilight_last_save');
    return saved ? parseInt(saved, 10) : 0;
  }

  private setLocalSaveTimestamp(timestamp: number): void {
    localStorage.setItem('twilight_last_save', timestamp.toString());
  }

  /** null on a save written before the owner tag existed. */
  private getLocalSaveOwner(): string | null {
    return localStorage.getItem(LOCAL_SAVE_OWNER_KEY);
  }

  private setLocalSaveOwner(owner: string): void {
    localStorage.setItem(LOCAL_SAVE_OWNER_KEY, owner);
  }

  // ============================================
  // State Management
  // ============================================

  private updateState(partial: Partial<SyncState>): void {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((cb) => cb(this.state));
  }

  /**
   * Clean up (call on app unmount)
   */
  destroy(): void {
    this.stopPeriodicSync();
    this.listeners.clear();
  }
}

// Singleton instance
export const syncManager = new SyncManager();
