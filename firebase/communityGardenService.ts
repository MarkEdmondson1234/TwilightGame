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
  serverTimestamp,
  Unsubscribe,
  Timestamp,
} from 'firebase/firestore';
import { getFirebaseDb, isFirebaseInitialized } from './config';
import { authService } from './authService';
import { FarmPlot, FarmPlotState } from '../types';

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
  updatedAt: ReturnType<typeof serverTimestamp> | Timestamp;
}

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
      console.log('[SharedFarm] Firebase not available — running in local-only mode');
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
        console.log(`[SharedFarm] Synced ${this.remotePlots.size} plots`);
      },
      (error) => {
        console.error('[SharedFarm] Snapshot error:', error);
      }
    );

    this.isListening = true;
    console.log('[SharedFarm] Started real-time listener');
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
    console.log('[SharedFarm] Stopped real-time listener');
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
        quality: plot.quality,
        fertiliserApplied: plot.fertiliserApplied,
        abundantHarvest: plot.abundantHarvest,
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
