/**
 * Harvest Feast contribution transport — Firestore.
 *
 * One document per year at `shared/world/harvestFeast/{year}`, holding the
 * distinct meal item ids any player has placed on the feast table. Additive
 * only (arrayUnion, never deleted mid-year) — see
 * multiplayer/harvestFeastContributions.ts for why this needs to survive
 * individual food items being eaten off the table.
 *
 * Nothing here throws to callers.
 */

import { doc, setDoc, onSnapshot, arrayUnion, Unsubscribe } from 'firebase/firestore';
import { getFirebaseDb, isFirebaseInitialized } from './config';
import { authService } from './authService';
import { DEBUG } from '../constants';
import { reportError } from '../utils/errorReporting';
import { decodeContributions } from '../multiplayer/harvestFeastContributions';

const HARVEST_FEAST_COLLECTION = 'shared/world/harvestFeast';

class HarvestFeastService {
  private unsubscribe: Unsubscribe | null = null;
  private listeningYear: number | null = null;
  private reportedWriteFailure = false;

  /** True when contributions can be sent/received — Firebase up and signed in. */
  isAvailable(): boolean {
    return isFirebaseInitialized() && authService.isAuthenticated();
  }

  /**
   * Subscribe to one year's contribution record. Returns an unsubscribe.
   * Replaces any existing subscription (only one year is ever relevant at once).
   */
  subscribe(year: number, onChange: (mealIds: string[]) => void): () => void {
    if (!this.isAvailable()) return () => {};

    try {
      const db = getFirebaseDb();
      this.unsubscribe?.();
      this.listeningYear = year;

      this.unsubscribe = onSnapshot(
        doc(db, HARVEST_FEAST_COLLECTION, String(year)),
        (snapshot) => {
          onChange(decodeContributions(snapshot.data()));
        },
        (error) => {
          console.warn('[HarvestFeast] Listener failed:', error);
          reportError(error, 'shared_world', { feature: 'harvest_feast', action: 'listen' });
        }
      );

      if (DEBUG.MULTIPLAYER) console.log(`[HarvestFeast] Watching contributions for ${year}`);
      return () => {
        this.unsubscribe?.();
        this.unsubscribe = null;
        this.listeningYear = null;
      };
    } catch (error) {
      console.warn('[HarvestFeast] Failed to start listening:', error);
      reportError(error, 'shared_world', { feature: 'harvest_feast', action: 'listen' });
      return () => {};
    }
  }

  getListeningYear(): number | null {
    return this.listeningYear;
  }

  /**
   * Record one distinct meal contribution for the year. Firestore's
   * arrayUnion dedupes server-side, so no read-before-write race.
   */
  async contributeMeal(year: number, mealItemId: string): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      const db = getFirebaseDb();
      await setDoc(
        doc(db, HARVEST_FEAST_COLLECTION, String(year)),
        { m: arrayUnion(mealItemId) },
        { merge: true }
      );
      return true;
    } catch (error) {
      if (!this.reportedWriteFailure) {
        this.reportedWriteFailure = true;
        console.warn('[HarvestFeast] Contribution failed to sync:', error);
        reportError(error, 'shared_world', { feature: 'harvest_feast', action: 'contribute' });
      } else if (DEBUG.MULTIPLAYER) {
        console.warn('[HarvestFeast] Contribution failed to sync:', error);
      }
      return false;
    }
  }

  /** Tear down completely (sign-out, unmount). */
  destroy(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.listeningYear = null;
  }
}

export const harvestFeastService = new HarvestFeastService();
