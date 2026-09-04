/**
 * Shared Farm Service
 *
 * Manages globally shared farm plots across village and farm_area maps.
 * All authenticated players cooperate on the same plots using real-time
 * `onSnapshot` listeners for instant updates.
 *
 * Design:
 * - Optimistic UI: apply locally first, write to Firestore
 * - Last-write-wins conflict resolution with server timestamps
 * - Graceful fallback: works as local-only farm when Firebase unavailable
 * - Plot document IDs use "mapId:x:y" format
 */

import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  Unsubscribe,
  Timestamp,
} from 'firebase/firestore';
import { getFirebaseDb, isFirebaseInitialized } from './config';
import { authService } from './authService';
import { FarmPlot, FarmPlotState } from '../types';
import { debugLog } from '../utils/debugLog';

// ============================================
// Constants
// ============================================

const SHARED_PLOTS_COLLECTION = 'shared/farming/plots';

/** Firestore document shape for a shared farm plot */
export interface SharedPlotDoc {
  mapId: string;
  x: number;
  y: number;
  state: number; // FarmPlotState enum value
  cropType: string | null;
  plantedBy: string | null; // Display name of player who planted
  plantedByUid: string | null; // Auth UID
  plantedAtTimestamp: number | null;
  lastWateredTimestamp: number | null;
  stateChangedAtTimestamp: number;
  quality: 'normal' | 'good' | 'excellent';
  fertiliserApplied: boolean;
  abundantHarvest?: boolean;
  /** Display name of the player who last harvested this plot */
  claimedBy?: string | null;
  claimedAtTimestamp?: number | null;
  updatedAt: ReturnType<typeof serverTimestamp> | Timestamp;
}

/**
 * Identity of the planting a harvest claim is settling, as the claiming client
 * saw it. Compared against the stored document to tell "somebody picked this
 * first" apart from "this crop simply ripened since its last sync".
 */
export interface HarvestClaim {
  /** The crop standing on the plot when we picked it. */
  cropType: string | null;
  /** When that crop was sown — the identity of this particular planting. */
  plantedAtTimestamp: number | null;
  /** Whether the plot was present in the most recent remote snapshot. */
  knownRemote: boolean;
}

/** States a plot can only be in once this planting has already been harvested. */
const POST_HARVEST_STATES: ReadonlySet<number> = new Set([
  FarmPlotState.FALLOW,
  FarmPlotState.TILLED,
  FarmPlotState.HERB_COOLDOWN,
  FarmPlotState.HERB_DORMANT,
]);

// ============================================
// SharedFarmService Class
// ============================================

class SharedFarmService {
  private unsubscribe: Unsubscribe | null = null;
  private listeners: Set<(plots: Map<string, SharedPlotDoc>) => void> = new Set();
  private remotePlots: Map<string, SharedPlotDoc> = new Map();
  private isListening = false;

  /**
   * Start listening to shared farm plot changes.
   * Call when entering any map with shared farming.
   */
  startListening(): void {
    if (this.isListening) return;
    if (!isFirebaseInitialized() || !authService.isAuthenticated()) {
      debugLog('SharedFarm', 'Firebase not available — running in local-only mode');
      return;
    }

    const db = getFirebaseDb();
    const plotsRef = collection(db, SHARED_PLOTS_COLLECTION);

    this.unsubscribe = onSnapshot(
      plotsRef,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const plotId = change.doc.id;
          if (change.type === 'removed') {
            this.remotePlots.delete(plotId);
          } else {
            this.remotePlots.set(plotId, change.doc.data() as SharedPlotDoc);
          }
        });

        // Notify all listeners
        this.listeners.forEach((cb) => cb(this.remotePlots));
        debugLog('SharedFarm', `Synced ${this.remotePlots.size} plots`);
      },
      (error) => {
        console.error('[SharedFarm] Snapshot error:', error);
      }
    );

    this.isListening = true;
    debugLog('SharedFarm', 'Started real-time listener');
  }

  /**
   * Stop listening to shared farm changes.
   * Call when leaving shared maps.
   */
  stopListening(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.isListening = false;
    debugLog('SharedFarm', 'Stopped real-time listener');
  }

  /**
   * Subscribe to plot changes. Returns unsubscribe function.
   */
  onPlotsChanged(callback: (plots: Map<string, SharedPlotDoc>) => void): () => void {
    this.listeners.add(callback);
    // Immediately send current state
    if (this.remotePlots.size > 0) {
      callback(this.remotePlots);
    }
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Write a plot state change to Firestore.
   * plotId format: "mapId:x:y"
   */
  async writePlot(plotId: string, plot: FarmPlot): Promise<boolean> {
    if (!isFirebaseInitialized() || !authService.isAuthenticated()) {
      return false;
    }

    try {
      const db = getFirebaseDb();
      const plotRef = doc(db, SHARED_PLOTS_COLLECTION, plotId);
      const user = authService.getUser();
      const hasPlanting =
        plot.state !== FarmPlotState.FALLOW && plot.state !== FarmPlotState.TILLED;

      const data: SharedPlotDoc = {
        mapId: plot.mapId,
        x: plot.position.x,
        y: plot.position.y,
        state: plot.state,
        cropType: plot.cropType,
        plantedBy: hasPlanting ? user?.displayName || user?.email || 'Unknown' : null,
        plantedByUid: hasPlanting ? authService.getUserId() || null : null,
        plantedAtTimestamp: plot.plantedAtTimestamp,
        lastWateredTimestamp: plot.lastWateredTimestamp,
        stateChangedAtTimestamp: plot.stateChangedAtTimestamp,
        quality: plot.quality ?? 'normal',
        fertiliserApplied: plot.fertiliserApplied ?? false,
        abundantHarvest: plot.abundantHarvest ?? false,
        updatedAt: serverTimestamp(),
      };

      await setDoc(plotRef, data);
      return true;
    } catch (error) {
      console.error(`[SharedFarm] Failed to write plot ${plotId}:`, error);
      return false;
    }
  }

  /**
   * Remove a plot from Firestore (clear/reset to fallow).
   */
  async clearPlot(plotId: string): Promise<boolean> {
    if (!isFirebaseInitialized() || !authService.isAuthenticated()) {
      return false;
    }

    try {
      const db = getFirebaseDb();
      const plotRef = doc(db, SHARED_PLOTS_COLLECTION, plotId);
      await deleteDoc(plotRef);
      return true;
    } catch (error) {
      console.error(`[SharedFarm] Failed to clear plot ${plotId}:`, error);
      return false;
    }
  }

  /**
   * Atomically claim a harvestable plot.
   *
   * The shared farm is otherwise last-write-wins on a 10s flush, which means two
   * players clicking the same ripe carrot within ten seconds of each other both
   * get a carrot. This is the one genuinely contended action in the game, and a
   * transaction is the only way to settle it.
   *
   * What is compared is the *planting*, not the plot's stored state. Ripening is
   * derived locally from `plantedAtTimestamp` on every client and is deliberately
   * never flushed, so the stored state of a crop that matured after its last sync
   * still reads WATERED while every player sees it standing ripe. Comparing raw
   * states therefore called every ordinary harvest a lost race — including in
   * single player, where there is nobody to lose to.
   *
   * Returns true if we won the plot (or if there is nothing to lose it to).
   * Returns false ONLY when we can prove somebody else got there first — a
   * network failure counts as a win, because confiscating a crop the player
   * legitimately harvested is a far worse outcome than one duplicate carrot.
   */
  async claimPlot(plotId: string, expected: HarvestClaim, resultPlot: FarmPlot): Promise<boolean> {
    if (!isFirebaseInitialized() || !authService.isAuthenticated()) {
      return true; // Local-only play: nobody to race against.
    }

    try {
      const db = getFirebaseDb();
      const plotRef = doc(db, SHARED_PLOTS_COLLECTION, plotId);
      const user = authService.getUser();
      const claimedBy = user?.displayName || user?.email || 'Someone';

      return await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(plotRef);

        if (!snapshot.exists()) {
          // Harvesting an annual crop deletes the document, so a plot that was
          // there in the last snapshot and is gone now was picked by somebody
          // else. A plot we never saw remotely proves nothing — keep the crop.
          return !expected.knownRemote;
        }

        const remote = snapshot.data() as SharedPlotDoc;

        // A different crop, or the same crop from a later sowing, means this
        // planting was already harvested (and the plot replanted) before us.
        if (remote.cropType !== expected.cropType) return false;
        if (
          expected.plantedAtTimestamp != null &&
          remote.plantedAtTimestamp != null &&
          remote.plantedAtTimestamp !== expected.plantedAtTimestamp
        ) {
          return false;
        }

        // Same planting, but already picked — herbs stay in place and drop into
        // cooldown rather than clearing the document.
        if (POST_HARVEST_STATES.has(remote.state)) return false;

        if (resultPlot.state === FarmPlotState.FALLOW) {
          // Matches the flush path, which deletes rather than storing fallow plots.
          transaction.delete(plotRef);
        } else {
          transaction.set(plotRef, {
            mapId: resultPlot.mapId,
            x: resultPlot.position.x,
            y: resultPlot.position.y,
            state: resultPlot.state,
            cropType: resultPlot.cropType,
            plantedBy: remote.plantedBy ?? null,
            plantedByUid: remote.plantedByUid ?? null,
            plantedAtTimestamp: resultPlot.plantedAtTimestamp,
            lastWateredTimestamp: resultPlot.lastWateredTimestamp,
            stateChangedAtTimestamp: resultPlot.stateChangedAtTimestamp,
            quality: resultPlot.quality ?? 'normal',
            fertiliserApplied: resultPlot.fertiliserApplied ?? false,
            abundantHarvest: resultPlot.abundantHarvest ?? false,
            claimedBy,
            claimedAtTimestamp: Date.now(),
            updatedAt: serverTimestamp(),
          });
        }
        return true;
      });
    } catch (error) {
      console.warn(`[SharedFarm] Claim transaction failed for ${plotId} — keeping harvest:`, error);
      return true;
    }
  }

  /**
   * Convert a SharedPlotDoc to a FarmPlot for local use.
   */
  docToFarmPlot(plotDoc: SharedPlotDoc): FarmPlot {
    return {
      mapId: plotDoc.mapId,
      position: { x: plotDoc.x, y: plotDoc.y },
      state: plotDoc.state as FarmPlotState,
      cropType: plotDoc.cropType,
      plantedAtDay: null,
      plantedAtHour: null,
      lastWateredDay: null,
      lastWateredHour: null,
      stateChangedAtDay: 0,
      stateChangedAtHour: 0,
      plantedAtTimestamp: plotDoc.plantedAtTimestamp,
      lastWateredTimestamp: plotDoc.lastWateredTimestamp,
      stateChangedAtTimestamp: plotDoc.stateChangedAtTimestamp,
      quality: plotDoc.quality,
      fertiliserApplied: plotDoc.fertiliserApplied,
      abundantHarvest: plotDoc.abundantHarvest,
    };
  }

  /**
   * Generate plot ID from map and tile position.
   */
  getPlotId(mapId: string, x: number, y: number): string {
    return `${mapId}:${x}:${y}`;
  }

  /**
   * Get current remote plots (for initial load).
   */
  getRemotePlots(): Map<string, SharedPlotDoc> {
    return this.remotePlots;
  }

  /**
   * Check if currently listening.
   */
  isActive(): boolean {
    return this.isListening;
  }

  /**
   * Clean up on service destroy.
   */
  destroy(): void {
    this.stopListening();
    this.listeners.clear();
    this.remotePlots.clear();
  }
}

// Singleton instance
export const communityGardenService = new SharedFarmService();
